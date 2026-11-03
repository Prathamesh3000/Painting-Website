const express = require('express')
const Poem = require('../../models/Poem')
const Artwork = require('../../models/Artwork')
const { adminPoem } = require('../../lib/serialize')
const SeedTombstone = require('../../models/SeedTombstone')
const { audit } = require('../../lib/audit')
const { reorder } = require('../../lib/reorder')
const { HttpError, bad } = require('../../lib/httpError')
const { body, str, bool, int, oid, SLUG } = require('../../lib/validate')

const router = express.Router()
const EDITABLE = ['lang', 'title', 'theme', 'body', 'published', 'order']
const DEFAULTS = { theme: '', published: true }

function validate(src) {
  const out = {}
  if (src.lang !== 'en' && src.lang !== 'mr') throw bad("lang must be 'en' or 'mr'.")
  out.lang = src.lang
  out.title = str(src.title, 'title', { min: 1, max: 120 })
  out.theme = str(src.theme, 'theme', { max: 40 })
  out.body = str(src.body, 'body', { min: 1, max: 5000, trim: false }).replace(/\r/g, '')
  if (!out.body.trim()) throw bad('body must not be empty.')
  out.published = bool(src.published, 'published')
  if (src.order !== undefined) out.order = int(src.order, 'order', 0, 1000000)
  return out
}

const pick = (b) => Object.fromEntries(EDITABLE.filter((k) => b[k] !== undefined).map((k) => [k, b[k]]))
const findOr404 = async (id) => {
  const p = oid(id) && (await Poem.findById(id))
  if (!p) throw new HttpError(404, 'Poem not found.')
  return p
}

router.get('/', async (req, res) => {
  const items = await Poem.find().sort({ order: 1, createdAt: 1 })
  res.json({ items: items.map(adminPoem) })
})

router.post('/reorder', async (req, res) => {
  const items = await reorder(Poem, body(req).ids)
  await audit(req.admin, 'update', 'poem', '', `Reordered ${items.length} poems`)
  res.json({ items: items.map(adminPoem) })
})

router.post('/', async (req, res) => {
  const b = body(req)
  const slug = str(b.slug, 'slug', { min: 1, max: 60 })
  if (!SLUG.test(slug)) throw bad('slug may contain only lower-case letters, numbers and single hyphens.')
  const data = validate({ ...DEFAULTS, ...pick(b) })
  if (await Poem.exists({ slug })) throw new HttpError(409, 'A poem with this slug already exists.')
  if (data.order === undefined) {
    const last = await Poem.findOne().sort({ order: -1 }).select('order')
    data.order = last ? (last.order || 0) + 1 : 0
  }
  const poem = await Poem.create({ slug, ...data })
  await SeedTombstone.deleteOne({ kind: 'poem', slug })
  await audit(req.admin, 'create', 'poem', poem._id, `Created poem "${poem.title}"`)
  res.status(201).json(adminPoem(poem))
})

router.get('/:id', async (req, res) => res.json(adminPoem(await findOr404(req.params.id))))

router.put('/:id', async (req, res) => {
  const poem = await findOr404(req.params.id)
  const b = body(req)
  if (b.slug !== undefined && b.slug !== poem.slug) throw bad('slug cannot be changed.')
  const current = Object.fromEntries(EDITABLE.map((k) => [k, poem[k]]))
  poem.set(validate({ ...current, ...pick(b) }))
  await poem.save()
  await audit(req.admin, 'update', 'poem', poem._id, `Updated poem "${poem.title}"`)
  res.json(adminPoem(poem))
})

router.delete('/:id', async (req, res) => {
  const poem = await findOr404(req.params.id)
  if (await Artwork.exists({ poemSlug: poem.slug })) {
    throw new HttpError(409, 'This poem is linked to a painting. Unlink it first.')
  }
  await poem.deleteOne()
  await SeedTombstone.updateOne({ kind: 'poem', slug: poem.slug }, { $setOnInsert: { kind: 'poem', slug: poem.slug } }, { upsert: true })
  await audit(req.admin, 'delete', 'poem', poem._id, `Deleted poem "${poem.title}"`)
  res.status(204).end()
})

module.exports = router
