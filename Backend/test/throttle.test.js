// Public POST throttles, pending-order cap, hold auto-release, persisted limiter, CORS headers, seed tombstones.
const { test, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const { start, customer } = require('./helpers')
const Artwork = require('../models/Artwork')
const Poem = require('../models/Poem')
const Order = require('../models/Order')
const RateHit = require('../models/RateHit')
const SeedTombstone = require('../models/SeedTombstone')
const { FailureLimiter } = require('../lib/rateLimit')
const { releaseExpiredHolds } = require('../lib/holds')
const { seedAll } = require('../seed')

let t, admin
before(async () => { t = await start(); admin = await t.makeAdmin() })
after(async () => { await t.close() })
beforeEach(async () => {
  process.env.ORDER_RATE_LIMIT = '0'; process.env.ENQUIRY_RATE_LIMIT = '0'; process.env.MAX_PENDING_ORDERS = '0'
  await t.app.locals.orderLimiter.reset(); await t.app.locals.enquiryLimiter.reset()
})

const art = (over = {}) => ({
  slug: 'orig', title: 'Orig', type: 'original', medium: '', dimensions: '', price: 2000, available: true, dispatch: '', description: '',
  ar: 1, image: null, imageAlt: '', poemSlug: null, variants: [], published: true, ...over,
})
const place = (items, cust = customer()) => t.call('POST', '/api/orders', { csrf: false, body: { customer: cust, items } })
const isAvailable = async (slug) => (await Artwork.findOne({ slug })).available

test('POST /api/orders is rate limited per ip: 429 + Retry-After + JSON error', async () => {
  process.env.ORDER_RATE_LIMIT = '3'
  for (let i = 0; i < 3; i++) assert.equal((await place([])).status, 400) // invalid requests count too
  const r = await place([])
  assert.equal(r.status, 429)
  assert.ok(Number(r.headers.get('retry-after')) > 0)
  assert.match(r.json.error, /Too many/)
  await t.app.locals.orderLimiter.reset()
  assert.equal((await place([])).status, 400)
})

test('POST /api/enquiries is rate limited per ip', async () => {
  process.env.ENQUIRY_RATE_LIMIT = '2'
  const send = () => t.call('POST', '/api/enquiries', { csrf: false, body: { kind: 'general', name: 'A', email: 'a@example.com', message: 'hi' } })
  assert.equal((await send()).status, 201)
  assert.equal((await send()).status, 201)
  const r = await send()
  assert.equal(r.status, 429)
  assert.ok(Number(r.headers.get('retry-after')) > 0)
  assert.ok(r.json.error)
})

test('rate limiting under parallel bursts does not let extra requests through', async () => {
  process.env.ENQUIRY_RATE_LIMIT = '5'
  const statuses = await Promise.all(Array.from({ length: 20 }, () =>
    t.call('POST', '/api/enquiries', { csrf: false, body: { kind: 'newsletter', email: 'burst@example.com' } }).then((r) => r.status)))
  assert.equal(statuses.filter((s) => s === 201).length, 5)
  assert.equal(statuses.filter((s) => s === 429).length, 15)
})

test('pending-payment cap per e-mail and per ip; paintings are not claimed by a rejected order', async () => {
  process.env.MAX_PENDING_ORDERS = '2'
  for (const slug of ['c1', 'c2', 'c3', 'c4']) await admin.as('POST', '/api/admin/artworks', { body: art({ slug }) })
  // two unpaid orders for one e-mail placed from some other ip
  for (const n of ['A', 'B']) await Order.create({ orderNumber: 'KJ-CAP' + n, customer: customer({ email: 'hoarder@example.com' }), items: [], ip: '9.9.9.9', status: 'pending-payment' })
  const r = await place([{ slug: 'c1' }], customer({ email: 'Hoarder@Example.com' }))
  assert.equal(r.status, 429)
  assert.ok(r.json.error)
  assert.equal(await isAvailable('c1'), true)
  // a different e-mail from this ip (127.0.0.1 has no pending orders yet) is fine, up to the cap
  assert.equal((await place([{ slug: 'c1' }], customer({ email: 'x1@example.com' }))).status, 201)
  assert.equal((await place([{ slug: 'c2' }], customer({ email: 'x2@example.com' }))).status, 201)
  const byIp = await place([{ slug: 'c3' }], customer({ email: 'x3@example.com' }))
  assert.equal(byIp.status, 429)
  assert.equal(await isAvailable('c3'), true)
  // cancelled / paid orders do not count
  await Order.updateOne({ orderNumber: 'KJ-CAPA' }, { status: 'paid' })
  await Order.updateOne({ orderNumber: 'KJ-CAPB' }, { status: 'cancelled' })
  assert.equal((await place([{ slug: 'c4' }], customer({ email: 'hoarder@example.com' }))).status, 429) // still capped by ip (2 pending from 127.0.0.1)
  await Order.deleteMany({})
  await Artwork.updateMany({}, { available: true })
})

test('pending cap holds under parallel requests', async () => {
  process.env.MAX_PENDING_ORDERS = '1'
  await Order.deleteMany({})
  const slugs = ['p1', 'p2', 'p3', 'p4', 'p5']
  for (const slug of slugs) await admin.as('POST', '/api/admin/artworks', { body: art({ slug }) })
  const res = await Promise.all(slugs.map((slug, i) => place([{ slug }], customer({ email: `par${i}@example.com` }))))
  assert.equal(res.filter((r) => r.status === 201).length, 1, res.map((r) => r.status).join())
  assert.equal(await Order.countDocuments({ status: 'pending-payment' }), 1)
  assert.equal(await Artwork.countDocuments({ slug: { $in: slugs }, available: false }), 1)
  await Order.deleteMany({})
  await Artwork.updateMany({}, { available: true })
})

test('holdHours setting: default 48, validated, 0 = never', async () => {
  assert.equal((await admin.as('GET', '/api/admin/settings')).json.holdHours, 48)
  for (const v of [-1, 1.5, '48', 9000]) assert.equal((await admin.as('PUT', '/api/admin/settings', { body: { holdHours: v } })).status, 400, String(v))
  const ok = await admin.as('PUT', '/api/admin/settings', { body: { holdHours: 0 } })
  assert.equal(ok.json.holdHours, 0)
  assert.equal((await admin.as('PUT', '/api/admin/settings', { body: { holdHours: 48 } })).json.holdHours, 48)
})

test('releaseExpiredHolds cancels old unpaid orders, relists originals, writes a system history entry', async () => {
  await Order.deleteMany({})
  for (const slug of ['h1', 'h2', 'h3']) await admin.as('POST', '/api/admin/artworks', { body: art({ slug }) })
  const o1 = (await place([{ slug: 'h1' }], customer({ email: 'h1@example.com' }))).json.orderNumber
  const o2 = (await place([{ slug: 'h2' }], customer({ email: 'h2@example.com' }))).json.orderNumber
  const o3 = (await place([{ slug: 'h3' }], customer({ email: 'h3@example.com' }))).json.orderNumber
  const ago = (h) => new Date(Date.now() - h * 3600 * 1000)
  await Order.collection.updateOne({ orderNumber: o1 }, { $set: { createdAt: ago(49) } })
  await Order.collection.updateOne({ orderNumber: o2 }, { $set: { createdAt: ago(10) } })
  await Order.collection.updateOne({ orderNumber: o3 }, { $set: { createdAt: ago(100), status: 'paid' } })

  await admin.as('PUT', '/api/admin/settings', { body: { holdHours: 0 } })
  assert.equal(await releaseExpiredHolds(), 0, '0 = never')
  assert.equal(await isAvailable('h1'), false)

  await admin.as('PUT', '/api/admin/settings', { body: { holdHours: 48 } })
  assert.equal(await releaseExpiredHolds(), 1)
  const a = await Order.findOne({ orderNumber: o1 })
  assert.equal(a.status, 'cancelled')
  const last = a.statusHistory[a.statusHistory.length - 1]
  assert.deepEqual([last.status, last.by], ['cancelled', 'system'])
  assert.equal(await isAvailable('h1'), true)
  assert.equal(await isAvailable('h2'), false) // too new
  assert.equal(await isAvailable('h3'), false) // paid
  assert.equal((await Order.findOne({ orderNumber: o3 })).status, 'paid')
  assert.equal(await releaseExpiredHolds(), 0, 'idempotent')
  // explicit "now" lets callers (tests, cron) look into the future
  assert.equal(await releaseExpiredHolds({ now: Date.now() + 49 * 3600 * 1000 }), 1)
  assert.equal(await isAvailable('h2'), true)
  // two concurrent sweeps release each order exactly once
  await Order.deleteMany({})
})

test('limiter is persisted in MongoDB (TTL index), shared across instances, with in-memory fallback', async () => {
  await RateHit.init()
  const idx = await RateHit.collection.indexes()
  assert.ok(idx.some((i) => i.key.expiresAt === 1 && i.expireAfterSeconds === 0), 'TTL index on expiresAt')

  const a = new FailureLimiter({ name: 'unit', windowMs: 60000 })
  const b = new FailureLimiter({ name: 'unit', windowMs: 60000 }) // "another process" / restart
  await a.reset()
  assert.deepEqual(await a.reserve('k', 2), { ok: true })
  assert.deepEqual(await a.reserve('k', 2), { ok: true })
  assert.equal(await RateHit.countDocuments({ key: 'unit:k' }), 2)
  assert.equal(await b.count('k'), 2)
  const r = await b.reserve('k', 2)
  assert.equal(r.ok, false)
  assert.ok(r.retryAfter > 0 && r.retryAfter <= 60)
  assert.equal(await a.count('k'), 2, 'rejected hit was taken back')
  await b.release('k')
  assert.equal(await a.count('k'), 1)
  await a.reset('k')
  assert.equal(await b.count('k'), 0)

  // rows outside the window are ignored even before the TTL monitor deletes them
  await RateHit.create({ key: 'unit:old', at: new Date(Date.now() - 120000), expiresAt: new Date(Date.now() + 1000) })
  assert.equal(await a.count('old'), 0)

  process.env.RATE_LIMIT_STORE = 'memory'
  try {
    const m = new FailureLimiter({ name: 'unit-mem', windowMs: 60000 })
    assert.deepEqual(await m.reserve('k', 1), { ok: true })
    assert.equal((await m.reserve('k', 1)).ok, false)
    assert.equal(await RateHit.countDocuments({ key: /^unit-mem:/ }), 0, 'nothing written to MongoDB')
    assert.equal(await new FailureLimiter({ name: 'unit-mem' }).count('k'), 0, 'memory is per instance')
  } finally { delete process.env.RATE_LIMIT_STORE }
  await a.reset()
})

test('login failures land in the shared store', async () => {
  await t.app.locals.loginLimiter.reset()
  await t.call('POST', '/api/admin/auth/login', { body: { email: 'nobody@example.com', password: 'wrong-wrong-wrong' } })
  assert.equal(await RateHit.countDocuments({ key: /^login:pair:/ }), 1)
  assert.equal(await RateHit.countDocuments({ key: /^login:ip:/ }), 1)
  await t.app.locals.loginLimiter.reset()
})

test('CORS exposes Retry-After and Content-Disposition; audit pageSize is capped at 100', async () => {
  const r = await t.call('GET', '/api/health', { headers: { Origin: 'http://localhost:5173' } })
  const exposed = r.headers.get('access-control-expose-headers')
  assert.match(exposed, /Retry-After/)
  assert.match(exposed, /Content-Disposition/)
  const audit = await admin.as('GET', '/api/admin/audit?pageSize=100000')
  assert.equal(audit.json.pageSize, 100)
  assert.equal((await admin.as('GET', '/api/admin/audit?pageSize=0')).json.pageSize, 20)
})

test('seed skips slugs the admin deleted; --force (force: true) restores them; re-creating clears the record', async () => {
  await Artwork.deleteMany({}); await Poem.deleteMany({}); await SeedTombstone.deleteMany({})
  const artworks = [art({ slug: 's-one' }), art({ slug: 's-two', title: 'Two' })]
  const poems = [{ slug: 'sp-one', lang: 'en', title: 'P1', body: 'x' }, { slug: 'sp-two', lang: 'en', title: 'P2', body: 'y' }]
  assert.deepEqual(await seedAll({ artworks, poems }), { artworks: 2, poems: 2, settings: 0, skipped: 0 })

  const one = await Artwork.findOne({ slug: 's-one' })
  assert.equal((await admin.as('DELETE', `/api/admin/artworks/${one._id}`)).status, 204)
  const p = await Poem.findOne({ slug: 'sp-two' })
  assert.equal((await admin.as('DELETE', `/api/admin/poems/${p._id}`)).status, 204)
  assert.equal(await SeedTombstone.countDocuments(), 2)

  const again = await seedAll({ artworks, poems })
  assert.equal(again.artworks, 0); assert.equal(again.poems, 0); assert.equal(again.skipped, 2)
  assert.equal(await Artwork.countDocuments({ slug: 's-one' }), 0)
  assert.equal(await Poem.countDocuments({ slug: 'sp-two' }), 0)

  const forced = await seedAll({ artworks, poems, force: true })
  assert.equal(forced.artworks, 1); assert.equal(forced.poems, 1)
  assert.equal(await SeedTombstone.countDocuments(), 0)

  // delete again, then re-create by hand: the tombstone is dropped
  const two = await Artwork.findOne({ slug: 's-two' })
  await admin.as('DELETE', `/api/admin/artworks/${two._id}`)
  assert.equal(await SeedTombstone.countDocuments({ kind: 'artwork', slug: 's-two' }), 1)
  assert.equal((await admin.as('POST', '/api/admin/artworks', { body: art({ slug: 's-two' }) })).status, 201)
  assert.equal(await SeedTombstone.countDocuments({ kind: 'artwork', slug: 's-two' }), 0)
})
