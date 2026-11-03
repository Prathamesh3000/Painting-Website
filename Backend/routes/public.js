const express = require('express')
const Artwork = require('../models/Artwork')
const Poem = require('../models/Poem')
const SiteContent = require('../models/SiteContent')
const { publicArtwork, publicPoem } = require('../lib/serialize')
const { getSettings } = require('../lib/settings')
const { loadVariantMap } = require('../lib/images')

const router = express.Router()

// Very short cache so admin edits and sold-out changes show up quickly. Express adds a weak ETag to every
// JSON response, so revalidation after the 5 s is a cheap 304; stale copies may be served while revalidating.
router.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=5, stale-while-revalidate=30')
  next()
})

router.get('/artworks', async (req, res) => {
  const items = await Artwork.find({ published: { $ne: false } }).sort({ order: 1, createdAt: 1 }).lean()
  const map = await loadVariantMap(items)
  res.json({ items: items.map((a) => publicArtwork(a, map)) })
})

router.get('/poems', async (req, res) => {
  const items = await Poem.find({ published: { $ne: false } }).sort({ order: 1, createdAt: 1 }).lean()
  res.json({ items: items.map(publicPoem) })
})

router.get('/content', async (req, res) => {
  const rows = await SiteContent.find().lean()
  res.json({ content: Object.fromEntries(rows.map((r) => [r.key, r.value])) })
})

router.get('/settings', async (req, res) => res.json(await getSettings()))

module.exports = router
