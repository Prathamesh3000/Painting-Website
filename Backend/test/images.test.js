// Real image files generated with sharp: format acceptance, WebP variants, EXIF stripping, graceful failure.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
sharp.cache(false)
const { start } = require('./helpers')

let t, admin
before(async () => { t = await start(); admin = await t.makeAdmin() })
after(async () => { await t.close() })

const raw = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 60, b: 40 } } })
const send = (buf, name, mime) => {
  const fd = new FormData()
  fd.append('file', new Blob([buf], { type: mime }), name)
  return admin.as('POST', '/api/admin/media', { form: fd })
}
const onDisk = (name) => path.join(process.env.UPLOAD_DIR, name)
const BROKEN_JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]), Buffer.alloc(300, 7)])

test('JPEG, PNG, WebP and AVIF made by sharp are accepted and get 800/1600 WebP variants', async () => {
  const files = [
    ['jpg', 'image/jpeg', await raw(2000, 1000).jpeg().toBuffer()],
    ['png', 'image/png', await raw(1700, 850).png().toBuffer()],
    ['webp', 'image/webp', await raw(1700, 850).webp().toBuffer()],
    ['avif', 'image/avif', await raw(1700, 850).avif({ effort: 0 }).toBuffer()],
  ]
  for (const [ext, mime, buf] of files) {
    const r = await send(buf, `pic.${ext}`, mime)
    assert.equal(r.status, 201, ext + ' ' + r.text)
    assert.equal(r.json.mime, mime)
    assert.ok(r.json.filename.endsWith('.' + ext))
    assert.deepEqual(r.json.variants.map((v) => v.width), [800, 1600], ext)
    for (const v of r.json.variants) {
      assert.match(v.url, /^\/uploads\/[0-9a-f]{32}-(800|1600)\.webp$/)
      const meta = await sharp(onDisk(v.url.slice('/uploads/'.length))).metadata()
      assert.equal(meta.format, 'webp')
      assert.equal(meta.width, v.width)
      const served = await fetch(t.base + v.url)
      assert.equal(served.status, 200)
      assert.equal(served.headers.get('content-type'), 'image/webp')
    }
    assert.equal((await sharp(onDisk(r.json.filename)).metadata()).format, ext === 'jpg' ? 'jpeg' : ext === 'avif' ? 'heif' : ext)
  }
})

test('small images get one variant at their own width (never enlarged)', async () => {
  const r = await send(await raw(500, 300).png().toBuffer(), 's.png', 'image/png')
  assert.equal(r.status, 201)
  assert.deepEqual(r.json.variants.map((v) => v.width), [500])
})

test('EXIF/GPS is stripped from the stored original and the variants', async () => {
  const withExif = await raw(1800, 900).jpeg().withExif({ IFD0: { Copyright: 'SECRET-OWNER', ImageDescription: 'GPS-HOME' } }).toBuffer()
  assert.ok((await sharp(withExif).metadata()).exif, 'fixture really has EXIF')
  const r = await send(withExif, 'exif.jpg', 'image/jpeg')
  assert.equal(r.status, 201)
  for (const f of [r.json.filename, ...r.json.variants.map((v) => v.url.slice('/uploads/'.length))]) {
    const bytes = fs.readFileSync(onDisk(f))
    assert.ok(!bytes.includes('SECRET-OWNER') && !bytes.includes('GPS-HOME'), f)
    assert.equal((await sharp(bytes).metadata()).exif, undefined, f)
  }
  assert.equal(r.json.size, fs.statSync(onDisk(r.json.filename)).size)
})

test('undecodable-but-sniffable files still upload (original served, no variants)', async () => {
  const r = await send(BROKEN_JPEG, 'broken.jpg', 'image/jpeg')
  assert.equal(r.status, 201)
  assert.deepEqual(r.json.variants, [])
  assert.deepEqual(fs.readFileSync(onDisk(r.json.filename)), BROKEN_JPEG)
  assert.equal((await fetch(t.base + r.json.url)).status, 200)
})

test('public artwork exposes imageSet (srcset-ready) only when variants exist; deleting media removes variant files', async () => {
  const up = await send(await raw(2000, 1000).jpeg().toBuffer(), 'art.jpg', 'image/jpeg')
  const plain = await send(BROKEN_JPEG, 'plain.jpg', 'image/jpeg')
  const base = { type: 'original', medium: '', dimensions: '', price: 100, available: true, dispatch: '', description: '', ar: 2, imageAlt: '', poemSlug: null, variants: [], published: true }
  const a = await admin.as('POST', '/api/admin/artworks', { body: { ...base, slug: 'with-set', title: 'A', image: up.json.url } })
  await admin.as('POST', '/api/admin/artworks', { body: { ...base, slug: 'no-set', title: 'B', image: plain.json.url } })
  await admin.as('POST', '/api/admin/artworks', { body: { ...base, slug: 'bundled', title: 'C', image: '/art/x.jpg' } })

  const pub = (await t.call('GET', '/api/public/artworks')).json.items
  const bySlug = Object.fromEntries(pub.map((x) => [x.slug, x]))
  const [v800, v1600] = up.json.variants
  assert.equal(bySlug['with-set'].imageSet.srcset, `${v800.url} 800w, ${v1600.url} 1600w`)
  assert.deepEqual(bySlug['with-set'].imageSet.variants, [{ width: 800, url: v800.url }, { width: 1600, url: v1600.url }])
  assert.equal(bySlug['with-set'].image, up.json.url, 'original still referenced')
  assert.equal(bySlug['no-set'].imageSet, null)
  assert.equal(bySlug.bundled.imageSet, null)
  assert.ok((await admin.as('GET', `/api/admin/artworks/${a.json.id}`)).json.imageSet)

  await admin.as('PUT', `/api/admin/artworks/${a.json.id}`, { body: { image: null } })
  assert.equal((await admin.as('DELETE', `/api/admin/media/${up.json.id}`)).status, 204)
  for (const f of [up.json.filename, ...up.json.variants.map((v) => v.url.slice('/uploads/'.length))]) assert.ok(!fs.existsSync(onDisk(f)), f)
})
