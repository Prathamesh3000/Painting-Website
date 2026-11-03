// Loads the starter catalogue into MongoDB. Run: npm run seed
// INSERT-ONLY: a painting/poem is created only when its slug does not exist yet (every field is written with
// $setOnInsert). Existing documents are never modified, so re-running this can never overwrite anything an
// admin edited, re-list a sold original, or change published/order/images. Default settings are also
// insert-if-absent. Content overrides are not seeded (the site has built-in default text).
// A slug the admin deleted is remembered (SeedTombstone) and skipped. `npm run seed -- --force` ignores
// and clears those records, so deleted starter items are inserted again (existing ones are still untouched).
const mongoose = require('mongoose')
const Artwork = require('./models/Artwork')
const Poem = require('./models/Poem')
const Setting = require('./models/Setting')
const SeedTombstone = require('./models/SeedTombstone')
const { DEFAULTS } = require('./lib/settings')

async function seedAll({ artworks = require('./data/artworks.json'), poems = require('./data/poems.json'), force = false } = {}) {
  const out = { artworks: 0, poems: 0, settings: 0, skipped: 0 }
  if (force) await SeedTombstone.deleteMany({})
  const dead = new Set((await SeedTombstone.find().lean()).map((t) => `${t.kind}:${t.slug}`))
  artworks = artworks.filter((a) => !dead.has(`artwork:${a.slug}`) || (out.skipped++, false))
  poems = poems.filter((p) => !dead.has(`poem:${p.slug}`) || (out.skipped++, false))
  for (const a of artworks) {
    const r = await Artwork.updateOne({ slug: a.slug }, { $setOnInsert: { ...a, image: a.image || null } }, { upsert: true })
    out.artworks += r.upsertedCount || 0
  }
  for (const p of poems) {
    const r = await Poem.updateOne({ slug: p.slug }, { $setOnInsert: p }, { upsert: true })
    out.poems += r.upsertedCount || 0
  }
  const s = await Setting.updateOne({ key: 'site' }, { $setOnInsert: { value: DEFAULTS } }, { upsert: true })
  out.settings = s.upsertedCount || 0
  return out
}

module.exports = { seedAll }

if (require.main === module) {
  require('dotenv').config()
  ;(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kalpana')
    const n = await seedAll({ force: process.argv.includes('--force') })
    console.log(`Inserted ${n.artworks} artworks, ${n.poems} poems, ${n.settings} settings; skipped ${n.skipped} previously deleted (existing documents are never modified)`)
    await mongoose.disconnect()
  })().catch((e) => { console.error(e); process.exit(1) })
}
