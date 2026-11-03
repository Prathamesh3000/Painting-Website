const express = require('express')
const Artwork = require('../../models/Artwork')
const Poem = require('../../models/Poem')
const { adminArtwork } = require('../../lib/serialize')
const SeedTombstone = require('../../models/SeedTombstone')
const { loadVariantMap } = require('../../lib/images')
const { audit } = require('../../lib/audit')
const { reorder } = require('../../lib/reorder')
const { HttpError, bad } = require('../../lib/httpError')
const { body, str, int, bool, oid, isObj, SLUG } = require('../../lib/validate')

const router = express.Router()

const EDITABLE = ['title', 'type', 'medium', 'dimensions', 'price', 'available', 'dispatch', 'description', 'ar',
  'image', 'imageAlt', 'poemSlug', 'variants', 'published', 'order']
const DEFAULTS = {
  medium: '', dimensions: '', price: null, available: true, dispatch: '', description: '', ar: 1,
  image: null, imageAlt: '', poemSlug: null, variants: [], published: true,
}
const IMAGE = /^\/(uploads|art)\/[A-Za-z0-9._\-/]*$/

async function validate(src) {
  const out = {}
  out.title = str(src.title, 'title', { min: 1, max: 120 })
  if (src.type !== 'original' && src.type !== 'print') throw bad("type must be 'original' or 'print'.")
  out.type = src.type
  out.medium = str(src.medium, 'medium', { max: 120 })
  out.dimensions = str(src.dimensions, 'dimensions', { max: 60 })
  out.price = src.price === null ? null : int(src.price, 'price', 0, 10000000)
  out.available = bool(src.available, 'available')
  out.dispatch = str(src.dispatch, 'dispatch', { max: 40 })
  out.description = str(src.description, 'description', { max: 2000 })
  if (typeof src.ar !== 'number' || !Number.isFinite(src.ar) || src.ar < 0.3 || src.ar > 3) throw bad('ar must be a number between 0.3 and 3.')
  out.ar = src.ar
  if (src.image === null) out.image = null
  else {
    const img = str(src.image, 'image', { max: 200, trim: false })
    if (!IMAGE.test(img) || img.includes('..')) throw bad("image must be null or a path starting with '/uploads/' or '/art/'.")
    out.image = img
  }
  out.imageAlt = str(src.imageAlt, 'imageAlt', { max: 200 })
  if (src.poemSlug === null) out.poemSlug = null
  else {
    out.poemSlug = str(src.poemSlug, 'poemSlug', { max: 60 })
    if (!(await Poem.exists({ slug: out.poemSlug }))) throw bad('poemSlug does not match an existing poem.')
  }
  if (!Array.isArray(src.variants) || src.variants.length > 10) throw bad('variants must be a list of at most 10 items.')
  out.variants = src.variants.map((v, i) => {
    if (!isObj(v)) throw bad(`variants[${i}] must be an object.`)
    return { label: str(v.label, `variants[${i}].label`, { min: 1, max: 40 }), price: int(v.price, `variants[${i}].price`, 0, 10000000) }
  })
  if (out.type === 'print' && out.variants.length < 1) throw bad('A print needs at least one variant.')
  out.published = bool(src.published, 'published')
  if (src.order !== undefined) out.order = int(src.order, 'order', 0, 1000000)
  return out
}

const pick = (b) => Object.fromEntries(EDITABLE.filter((k) => b[k] !== undefined).map((k) => [k, b[k]]))
const findOr404 = async (id) => {
  const a = oid(id) && (await Artwork.findById(id))
  if (!a) throw new HttpError(404, 'Painting not found.')
  return a
}

router.get('/', async (req, res) => {
  const items = await Artwork.find().sort({ order: 1, createdAt: 1 })
  const map = await loadVariantMap(items)
  res.json({ items: items.map((a) => adminArtwork(a, map)) })
})

// Registered before '/:id' so 'reorder' is not read as an id.
router.post('/reorder', async (req, res) => {
  const b = body(req)
  const items = await reorder(Artwork, b.ids)
  await audit(req.admin, 'update', 'artwork', '', `Reordered ${items.length} paintings`)
  res.json({ items: items.map(adminArtwork) })
})

router.post('/', async (req, res) => {
  const b = body(req)
  const slug = str(b.slug, 'slug', { min: 1, max: 60 })
  if (!SLUG.test(slug)) throw bad('slug may contain only lower-case letters, numbers and single hyphens.')
  const data = await validate({ ...DEFAULTS, ...pick(b) })
  if (await Artwork.exists({ slug })) throw new HttpError(409, 'A painting with this slug already exists.')
  if (data.order === undefined) {
    const last = await Artwork.findOne().sort({ order: -1 }).select('order')
    data.order = last ? (last.order || 0) + 1 : 0
  }
  const art = await Artwork.create({ slug, ...data })
  await SeedTombstone.deleteOne({ kind: 'artwork', slug }) // re-created by hand: no longer "deleted"
  await audit(req.admin, 'create', 'artwork', art._id, `Created painting "${art.title}"`)
  res.status(201).json(adminArtwork(art))
})

router.get('/:id', async (req, res) => {
  const art = await findOr404(req.params.id)
  res.json(adminArtwork(art, await loadVariantMap([art])))
})

router.put('/:id', async (req, res) => {
  const art = await findOr404(req.params.id)
  const b = body(req)
  if (b.slug !== undefined && b.slug !== art.slug) throw bad('slug cannot be changed.')
  const current = Object.fromEntries(EDITABLE.map((k) => [k, art[k]]))
  current.variants = art.variants.map((v) => ({ label: v.label, price: v.price }))
  const data = await validate({ ...current, ...pick(b) })
  art.set(data)
  await art.save()
  await audit(req.admin, 'update', 'artwork', art._id, `Updated painting "${art.title}"`)
  res.json(adminArtwork(art))
})

router.delete('/:id', async (req, res) => {
  const art = await findOr404(req.params.id)
  await art.deleteOne()
  await SeedTombstone.updateOne({ kind: 'artwork', slug: art.slug }, { $setOnInsert: { kind: 'artwork', slug: art.slug } }, { upsert: true }) // seed must not bring it back
  await audit(req.admin, 'delete', 'artwork', art._id, `Deleted painting "${art.title}"`)
  res.status(204).end()
})

module.exports = router
