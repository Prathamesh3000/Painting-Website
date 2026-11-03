const Media = require('../models/Media')

// sharp is optional at runtime: if it cannot be loaded, uploads are stored as-is and no variants exist.
let sharp = null
try { sharp = require('sharp'); sharp.cache(false) } catch { /* optional */ } // no cache: libvips would keep files open (breaks deleting on Windows)

const TARGET_WIDTHS = [800, 1600]
const MAX_PIXELS = 60e6

// Re-encodes the validated upload without metadata (EXIF/GPS, applying the orientation first) and builds
// WebP variants. Never throws: on any failure returns { original: null, variants: [] } and the caller keeps
// the untouched original.
async function processImage(buf, mime) {
  if (!sharp) return { original: null, variants: [] }
  try {
    const base = () => sharp(buf, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).rotate()
    const meta = await sharp(buf, { limitInputPixels: MAX_PIXELS }).metadata()
    if (!meta.width || !meta.height) return { original: null, variants: [] }
    const flipped = meta.orientation && meta.orientation >= 5 // 90/270 degree rotations swap width and height
    const width = flipped ? meta.height : meta.width

    let original = null
    if (meta.exif || meta.icc || meta.xmp || meta.orientation > 1) {
      const enc = { jpeg: ['jpeg', { quality: 95 }], png: ['png', {}], webp: ['webp', { quality: 95 }], avif: ['avif', { quality: 80 }] }[mime.split('/')[1]]
      original = await base().toFormat(enc[0], enc[1]).toBuffer()
    }
    const widths = [...new Set(TARGET_WIDTHS.map((w) => Math.min(w, width)))]
    const variants = []
    for (const w of widths) {
      const data = await base().resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
      variants.push({ width: w, data })
    }
    return { original, variants }
  } catch (err) {
    console.error('image processing failed, keeping the original only:', err.message)
    return { original: null, variants: [] }
  }
}

const mediaVariants = (m) => (m.variants || []).map((v) => ({ width: v.width, url: `/uploads/${v.filename}` }))

// For a list of artworks: { '<upload filename>': [{width,url}] } for the ones whose image has variants.
async function loadVariantMap(artworks) {
  const names = [...new Set(artworks.map((a) => a.image).filter((i) => typeof i === 'string' && i.startsWith('/uploads/')).map((i) => i.slice('/uploads/'.length)))]
  if (!names.length) return {}
  const rows = await Media.find({ filename: { $in: names }, 'variants.0': { $exists: true } }).select('filename variants').lean()
  return Object.fromEntries(rows.map((r) => [r.filename, mediaVariants(r)]))
}

// srcset-ready description of an artwork's image, or null.
function imageSetFor(artwork, map = {}) {
  const img = artwork.image
  if (typeof img !== 'string' || !img.startsWith('/uploads/')) return null
  const list = map[img.slice('/uploads/'.length)]
  if (!list || !list.length) return null
  const sorted = [...list].sort((a, b) => a.width - b.width)
  return { srcset: sorted.map((v) => `${v.url} ${v.width}w`).join(', '), variants: sorted }
}

module.exports = { processImage, mediaVariants, loadVariantMap, imageSetFor, TARGET_WIDTHS }
