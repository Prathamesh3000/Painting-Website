const express = require('express')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const Media = require('../../models/Media')
const Artwork = require('../../models/Artwork')
const { adminMedia } = require('../../lib/serialize')
const { audit } = require('../../lib/audit')
const { HttpError, bad } = require('../../lib/httpError')
const { body, str, oid } = require('../../lib/validate')
const { processImage } = require('../../lib/images')

const router = express.Router()
const MAX_BYTES = 8 * 1024 * 1024

const uploadDir = () => path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'))

// Detect the real type from magic bytes; the client's filename and mime are ignored.
function sniff(buf) {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: '.jpg' }
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: '.png' }
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: '.webp' }
  if (buf.toString('latin1', 4, 8) === 'ftyp') {
    const boxSize = Math.min(buf.readUInt32BE(0), buf.length, 64)
    const brands = [buf.toString('latin1', 8, 12)]
    for (let i = 16; i + 4 <= boxSize; i += 4) brands.push(buf.toString('latin1', i, i + 4))
    if (brands.includes('avif') || brands.includes('avis')) return { mime: 'image/avif', ext: '.avif' }
  }
  return null
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 4, fieldSize: 2000, parts: 6 },
}).single('file')

function receive(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, 'File too large (max 8 MB).'))
    // Malformed multipart bodies (busboy errors) are the client's fault, not a server error.
    next(bad('Invalid upload.'))
  })
}

router.get('/', async (req, res) => {
  const items = await Media.find().sort({ createdAt: -1, _id: -1 })
  res.json({ items: items.map(adminMedia) })
})

router.post('/', receive, async (req, res) => {
  if (!req.file) throw bad('Choose an image file (field "file").')
  const alt = req.body?.alt === undefined ? '' : str(req.body.alt, 'alt', { max: 200 })
  const kind = sniff(req.file.buffer)
  if (!kind) throw new HttpError(415, 'Only JPEG, PNG, WebP and AVIF images are allowed.')

  const dir = uploadDir()
  await fs.promises.mkdir(dir, { recursive: true })
  const stem = crypto.randomBytes(16).toString('hex')
  const filename = stem + kind.ext
  // Metadata (EXIF/GPS) is stripped and WebP renditions are generated; if processing fails the upload is stored as-is.
  const processed = await processImage(req.file.buffer, kind.mime)
  const stored = processed.original || req.file.buffer
  const written = []
  let doc
  try {
    await fs.promises.writeFile(path.join(dir, filename), stored, { flag: 'wx' })
    written.push(filename)
    const variants = []
    for (const v of processed.variants) {
      const vName = `${stem}-${v.width}.webp`
      await fs.promises.writeFile(path.join(dir, vName), v.data, { flag: 'wx' })
      written.push(vName)
      variants.push({ width: v.width, filename: vName, size: v.data.length })
    }
    doc = await Media.create({
      filename, originalName: String(req.file.originalname || '').slice(0, 200), mime: kind.mime, size: stored.length, alt, variants,
    })
  } catch (err) {
    await Promise.all(written.map((f) => fs.promises.unlink(path.join(dir, f)).catch(() => {})))
    throw err
  }
  await audit(req.admin, 'create', 'media', doc._id, `Uploaded ${doc.filename}`)
  res.status(201).json(adminMedia(doc))
})

const load = async (id) => {
  const m = oid(id) && (await Media.findById(id))
  if (!m) throw new HttpError(404, 'Media not found.')
  return m
}

router.patch('/:id', async (req, res) => {
  const m = await load(req.params.id)
  m.alt = str(body(req).alt, 'alt', { max: 200 })
  await m.save()
  await audit(req.admin, 'update', 'media', m._id, `Edited alt text of ${m.filename}`)
  res.json(adminMedia(m))
})

router.delete('/:id', async (req, res) => {
  const m = await load(req.params.id)
  if (await Artwork.exists({ image: `/uploads/${m.filename}` })) {
    throw new HttpError(409, 'This image is used by a painting. Change the painting image first.')
  }
  await m.deleteOne()
  for (const f of [m.filename, ...(m.variants || []).map((v) => v.filename)]) {
    await fs.promises.unlink(path.join(uploadDir(), f)).catch((e) => { if (e.code !== 'ENOENT') throw e })
  }
  await audit(req.admin, 'delete', 'media', m._id, `Deleted ${m.filename}`)
  res.status(204).end()
})

module.exports = router
module.exports.uploadDir = uploadDir
