// Regression tests for the findings of the adversarial security review.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { start, customer, PASSWORD } = require('./helpers')
const Artwork = require('../models/Artwork')
const Poem = require('../models/Poem')
const Setting = require('../models/Setting')
const { seedAll } = require('../seed')

let t
before(async () => { t = await start() })
after(async () => { await t.close() })

test('logout revokes the cookie server-side: a replayed copy gets 401', async () => {
  const a = await t.makeAdmin('replay@example.com')
  assert.equal((await a.as('GET', '/api/admin/auth/me')).status, 200)
  const second = await t.call('POST', '/api/admin/auth/login', { body: { email: a.email, password: PASSWORD } })
  const other = second.headers.getSetCookie()[0].split(';')[0]
  assert.equal((await t.call('POST', '/api/admin/auth/logout', { cookie: a.cookie })).status, 204)
  assert.equal((await a.as('GET', '/api/admin/auth/me')).status, 401, 'replayed cookie must be dead')
  assert.equal((await t.call('GET', '/api/admin/auth/me', { cookie: other })).status, 200, 'other sessions stay valid')
})

test('login limiter cannot be dodged with parallel requests', async () => {
  await t.makeAdmin('burst@example.com')
  await t.app.locals.loginLimiter.reset()
  const statuses = await Promise.all(Array.from({ length: 40 }, (_, i) =>
    t.call('POST', '/api/admin/auth/login', { body: { email: 'burst@example.com', password: 'wrong-guess-' + i } }).then((r) => r.status)))
  assert.ok(statuses.filter((s) => s === 401).length <= 5, `got ${statuses.filter((s) => s === 401).length} x 401`)
  assert.ok(statuses.includes(429))
  await t.app.locals.loginLimiter.reset()
  assert.equal((await t.call('POST', '/api/admin/auth/login', { body: { email: 'burst@example.com', password: PASSWORD } })).status, 200)
  // a successful login does not consume the per-ip allowance
  for (let i = 0; i < 25; i++) assert.equal((await t.call('POST', '/api/admin/auth/login', { body: { email: 'burst@example.com', password: PASSWORD } })).status, 200)
})

test('parser internals are not echoed; anonymous admin bodies are small; malformed multipart is a 400', async () => {
  const a = await t.makeAdmin('parse@example.com')
  const bad = await a.as('PUT', '/api/admin/settings', { body: '{bad' })
  assert.equal(bad.status, 400)
  assert.deepEqual(bad.json, { error: 'Invalid JSON.' })
  const big = await t.call('POST', '/api/admin/auth/login', { body: { email: 'x@example.com', password: 'p', pad: 'x'.repeat(20000) } })
  assert.equal(big.status, 413)
  const mp = await fetch(t.base + '/api/admin/media', {
    method: 'POST',
    headers: { Cookie: a.cookie, 'X-Requested-With': 'kj-admin', Origin: 'http://localhost:5173', 'Content-Type': 'multipart/form-data; boundary=xx' },
    body: '--xx\r\nContent-Disposition: form-data; name="file"; filename="a\0.png"\r\nbad header line\r\n\r\n',
  })
  assert.equal(mp.status, 400)
  // large authenticated bodies still work (content editor)
  const ok = await a.as('PUT', '/api/admin/content', { body: { 'about.body': 'x'.repeat(20000), 'about.intro': 'y'.repeat(20000), 'about.more': 'z'.repeat(20000) } })
  assert.equal(ok.status, 200)
})

test('checkout: over-long customer fields are rejected; tracking lookups are throttled and not cacheable', async () => {
  const a = await t.makeAdmin('track@example.com')
  await a.as('POST', '/api/admin/artworks', { body: { slug: 'sec-o', title: 'S', type: 'original', price: 100, available: true, ar: 1, image: null, poemSlug: null, variants: [], published: true, medium: '', dimensions: '', dispatch: '', description: '', imageAlt: '' } })
  const long = await t.call('POST', '/api/orders', { csrf: false, body: { customer: customer({ name: 'N'.repeat(5000) }), items: [{ slug: 'sec-o' }] } })
  assert.equal(long.status, 400)
  assert.equal((await Artwork.findOne({ slug: 'sec-o' })).available, true, 'nothing may be claimed by a rejected order')
  const o = await t.call('POST', '/api/orders', { csrf: false, body: { customer: customer(), items: [{ slug: 'sec-o' }] } })
  assert.equal(o.status, 201)
  const good = await t.call('GET', `/api/orders/${o.json.orderNumber}?email=asha@example.com`)
  assert.equal(good.status, 200)
  assert.match(good.headers.get('cache-control'), /no-store/)
  await t.app.locals.trackLimiter.reset()
  const codes = await Promise.all(Array.from({ length: 60 }, (_, i) => t.call('GET', `/api/orders/KJ-0000000${i % 10}?email=nobody${i}@example.com`).then((r) => r.status)))
  assert.ok(codes.filter((c) => c === 404).length <= 30)
  assert.ok(codes.includes(429))
  await t.app.locals.trackLimiter.reset()
})

test('seed is insert-only: it never modifies documents an admin edited and never re-lists a sold original', async () => {
  const art = { slug: 'seed-a', title: 'Seed A', type: 'original', price: 500, available: true, published: true, order: 3, description: 'orig', ar: 1, image: null, variants: [] }
  const poem = { slug: 'seed-p', lang: 'en', title: 'Seed P', body: 'line', published: true, order: 1 }
  let r = await seedAll({ artworks: [art], poems: [poem] })
  assert.deepEqual([r.artworks, r.poems], [1, 1])
  await Artwork.updateOne({ slug: 'seed-a' }, { title: 'Edited', price: 999, description: 'mine', available: false, published: false, order: 42, image: '/uploads/x.png' })
  await Poem.updateOne({ slug: 'seed-p' }, { title: 'Edited poem', body: 'mine', published: false })
  await Setting.updateOne({ key: 'site' }, { $set: { value: { shipping: { flat: 7, freeAbove: 8 }, checkoutEnabled: false } } })
  r = await seedAll({ artworks: [art, { ...art, slug: 'seed-b', title: 'Seed B' }], poems: [poem] })
  assert.deepEqual([r.artworks, r.poems, r.settings], [1, 0, 0])
  const a = await Artwork.findOne({ slug: 'seed-a' }).lean()
  assert.deepEqual([a.title, a.price, a.description, a.available, a.published, a.order, a.image], ['Edited', 999, 'mine', false, false, 42, '/uploads/x.png'])
  const p = await Poem.findOne({ slug: 'seed-p' }).lean()
  assert.deepEqual([p.title, p.body, p.published], ['Edited poem', 'mine', false])
  assert.deepEqual((await Setting.findOne({ key: 'site' }).lean()).value, { shipping: { flat: 7, freeAbove: 8 }, checkoutEnabled: false })
  assert.equal(await Artwork.countDocuments({ slug: 'seed-b' }), 1)
})
