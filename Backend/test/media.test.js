const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { start } = require('./helpers')

let t, admin
before(async () => { t = await start(); admin = await t.makeAdmin() })
after(async () => { await t.close() })

const pad = (head, total = 200) => Buffer.concat([head, Buffer.alloc(total - head.length, 1)])
const PNG = pad(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
const JPEG = pad(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]))
const WEBP = pad(Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x20, 0, 0, 0]), Buffer.from('WEBPVP8 ')]))
const AVIF = pad(Buffer.concat([Buffer.from([0, 0, 0, 0x1c]), Buffer.from('ftypavif'), Buffer.from([0, 0, 0, 0]), Buffer.from('avifmif1')]))
const GIF = pad(Buffer.from('GIF89a'))
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
const HTML = Buffer.from('<!doctype html><html><script>alert(1)</script></html>')
const TEXT = Buffer.from('this is definitely not a png, just text pretending to be one')

const send = (buf, name, mime = 'image/png', alt) => {
  const fd = new FormData()
  if (alt !== undefined) fd.append('alt', alt)
  fd.append('file', new Blob([buf], { type: mime }), name)
  return admin.as('POST', '/api/admin/media', { form: fd })
}

test('accepts JPEG, PNG, WebP, AVIF by magic bytes with random names', async () => {
  const seen = new Set()
  for (const [buf, name, mime, ext] of [[PNG, 'a.png', 'image/png', '.png'], [JPEG, 'b.jpg', 'image/jpeg', '.jpg'], [WEBP, 'c.webp', 'image/webp', '.webp'], [AVIF, 'd.avif', 'image/avif', '.avif']]) {
    const r = await send(buf, name, mime, 'alt text')
    assert.equal(r.status, 201, name + ' ' + r.text)
    assert.match(r.json.filename, new RegExp(`^[0-9a-f]{32}\\${ext}$`))
    assert.equal(r.json.url, '/uploads/' + r.json.filename)
    assert.equal(r.json.mime, mime)
    assert.equal(r.json.alt, 'alt text')
    assert.equal(r.json.originalName, name)
    assert.equal(r.json.size, buf.length)
    assert.ok(!seen.has(r.json.filename)); seen.add(r.json.filename)
    assert.ok(fs.existsSync(path.join(process.env.UPLOAD_DIR, r.json.filename)))
  }
})

test('the client-declared filename and mime do not matter: content decides', async () => {
  const r = await send(JPEG, 'weird.svg', 'image/svg+xml')
  assert.equal(r.status, 201)
  assert.equal(r.json.mime, 'image/jpeg')
  assert.match(r.json.filename, /\.jpg$/)
})

test('rejects SVG, GIF, HTML, text renamed .png and empty input with 415/400', async () => {
  for (const [buf, name, mime] of [[SVG, 'x.svg', 'image/svg+xml'], [SVG, 'x.png', 'image/png'], [GIF, 'x.gif', 'image/gif'], [GIF, 'x.png', 'image/png'],
    [HTML, 'x.html', 'text/html'], [HTML, 'x.png', 'image/png'], [TEXT, 'fake.png', 'image/png'], [Buffer.from('abc'), 'tiny.png', 'image/png']]) {
    const r = await send(buf, name, mime)
    assert.equal(r.status, 415, `${name} (${mime}) -> ${r.status}`)
    assert.ok(r.json.error)
  }
  assert.equal((await admin.as('POST', '/api/admin/media', { form: new FormData() })).status, 400)
  const before = fs.readdirSync(process.env.UPLOAD_DIR).length
  await send(TEXT, 'again.png')
  assert.equal(fs.readdirSync(process.env.UPLOAD_DIR).length, before) // nothing written for rejected files
})

test('files over 8 MB are rejected with 413', async () => {
  const big = Buffer.concat([PNG, Buffer.alloc(9 * 1024 * 1024, 2)])
  const r = await send(big, 'big.png')
  assert.equal(r.status, 413)
  assert.ok(r.json.error)
})

test('alt validation; list, patch, static serving headers, delete', async () => {
  assert.equal((await send(PNG, 'a.png', 'image/png', 'x'.repeat(201))).status, 400)
  const up = await send(PNG, 'serve.png', 'image/png', 'first')
  const patched = await admin.as('PATCH', `/api/admin/media/${up.json.id}`, { body: { alt: 'second' } })
  assert.equal(patched.json.alt, 'second')
  assert.equal((await admin.as('PATCH', `/api/admin/media/${up.json.id}`, { body: { alt: 5 } })).status, 400)
  const list = await admin.as('GET', '/api/admin/media')
  assert.equal(list.json.items[0].id, up.json.id) // newest first

  const file = await fetch(t.base + up.json.url)
  assert.equal(file.status, 200)
  assert.equal(file.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(file.headers.get('cross-origin-resource-policy'), 'cross-origin')
  assert.match(file.headers.get('cache-control'), /max-age=31536000/)
  assert.equal(file.headers.get('content-type'), 'image/png')
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), PNG)
  assert.equal((await fetch(t.base + '/uploads/../package.json')).status, 404)
  assert.equal((await fetch(t.base + '/uploads/nope.png')).status, 404)

  // in-use media cannot be deleted
  const use = await admin.as('POST', '/api/admin/artworks', { body: {
    slug: 'with-image', title: 'With image', type: 'original', price: 100, available: true, ar: 1, image: up.json.url, variants: [],
  } })
  assert.equal(use.status, 201)
  assert.equal((await admin.as('DELETE', `/api/admin/media/${up.json.id}`)).status, 409)
  await admin.as('PUT', `/api/admin/artworks/${use.json.id}`, { body: { image: null } })
  assert.equal((await admin.as('DELETE', `/api/admin/media/${up.json.id}`)).status, 204)
  assert.ok(!fs.existsSync(path.join(process.env.UPLOAD_DIR, up.json.filename)))
  assert.equal((await fetch(t.base + up.json.url)).status, 404)
  assert.equal((await admin.as('DELETE', `/api/admin/media/${up.json.id}`)).status, 404)
})

test('upload requires auth and CSRF header', async () => {
  const fd = new FormData(); fd.append('file', new Blob([PNG]), 'a.png')
  assert.equal((await t.call('POST', '/api/admin/media', { form: fd })).status, 401)
  const fd2 = new FormData(); fd2.append('file', new Blob([PNG]), 'a.png')
  assert.equal((await t.call('POST', '/api/admin/media', { form: fd2, cookie: admin.cookie, csrf: false })).status, 403)
})
