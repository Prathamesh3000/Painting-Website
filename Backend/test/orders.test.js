const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { start, customer } = require('./helpers')
const Artwork = require('../models/Artwork')

let t, admin
before(async () => { t = await start(); admin = await t.makeAdmin() })
after(async () => { await t.close() })

const art = (over = {}) => ({
  slug: 'orig', title: 'Orig', type: 'original', medium: '', dimensions: '', price: 2000, available: true, dispatch: '', description: '',
  ar: 1, image: null, imageAlt: '', poemSlug: null, variants: [], published: true, ...over,
})
const place = (items, cust = customer()) => t.call('POST', '/api/orders', { csrf: false, body: { customer: cust, items } })
const adminOrder = async (orderNumber) => (await admin.as('GET', `/api/admin/orders?q=${orderNumber}`)).json.items[0]
const isAvailable = async (slug) => (await Artwork.findOne({ slug })).available

test('orders: server-side prices, enquiry-only 400, sold 409, tracking with trackingNote', async () => {
  await admin.as('POST', '/api/admin/artworks', { body: art({ slug: 'o1', price: 2000 }) })
  await admin.as('POST', '/api/admin/artworks', { body: art({ slug: 'enq', price: null }) })
  await admin.as('POST', '/api/admin/artworks', { body: art({ slug: 'pr', type: 'print', price: 500, variants: [{ label: 'A4', price: 500 }] }) })

  assert.equal((await place([{ slug: 'enq' }])).status, 400)
  assert.equal((await place([{ slug: 'pr' }])).status, 400) // variant required
  const r = await place([{ slug: 'o1', price: 1 }, { slug: 'pr', variant: 'A4', qty: 2, price: 1 }])
  assert.equal(r.status, 201)
  assert.equal(r.json.total, 2000 + 1000 + 250)
  assert.equal(await isAvailable('o1'), false)
  assert.equal((await place([{ slug: 'o1' }])).status, 409)

  const o = await adminOrder(r.json.orderNumber)
  assert.deepEqual(o.statusHistory.map((h) => h.status), ['pending-payment'])
  assert.equal(o.shipping, 250)
  assert.equal(o.items.length, 2)

  const note = await admin.as('PATCH', `/api/admin/orders/${o.id}`, { body: { trackingNote: 'Courier AB123', note: 'internal only' } })
  assert.equal(note.status, 200)
  assert.equal(note.json.status, 'pending-payment')
  const track = await t.call('GET', `/api/orders/${r.json.orderNumber}?email=ASHA@example.com`)
  assert.equal(track.status, 200)
  assert.deepEqual(track.json, { orderNumber: r.json.orderNumber, status: 'pending-payment', trackingNote: 'Courier AB123' })
  assert.ok(!track.text.includes('internal only'))
  assert.equal((await t.call('GET', `/api/orders/${r.json.orderNumber}?email=other@example.com`)).status, 404)
})

test('order PATCH validation', async () => {
  const r = await place([{ slug: 'pr', variant: 'A4' }], customer({ email: 'v@example.com' }))
  const o = await adminOrder(r.json.orderNumber)
  for (const b of [{}, { status: 'shipped' }, { status: 5 }, { note: 'x'.repeat(2001) }, { trackingNote: 'x'.repeat(501) }, { note: 4 }]) {
    assert.equal((await admin.as('PATCH', `/api/admin/orders/${o.id}`, { body: b })).status, 400, JSON.stringify(b))
  }
  assert.equal((await admin.as('PATCH', '/api/admin/orders/64b000000000000000000001', { body: { note: 'x' } })).status, 404)
})

test('cancel re-lists originals once, is idempotent; un-cancel re-claims or 409; status history', async () => {
  await admin.as('POST', '/api/admin/artworks', { body: art({ slug: 'solo', price: 3000 }) })
  const first = await place([{ slug: 'solo' }], customer({ email: 'first@example.com' }))
  assert.equal(first.status, 201)
  const o1 = await adminOrder(first.json.orderNumber)
  assert.equal(await isAvailable('solo'), false)

  const c1 = await admin.as('PATCH', `/api/admin/orders/${o1.id}`, { body: { status: 'cancelled' } })
  assert.equal(c1.status, 200)
  assert.equal(await isAvailable('solo'), true)
  assert.deepEqual(c1.json.statusHistory.map((h) => h.status), ['pending-payment', 'cancelled'])
  assert.equal(c1.json.statusHistory[1].by, admin.email)

  // someone else buys it
  const second = await place([{ slug: 'solo' }], customer({ email: 'second@example.com' }))
  assert.equal(second.status, 201)
  assert.equal(await isAvailable('solo'), false)

  // idempotent cancel: a repeat must not re-list the painting now owned by order 2
  const c2 = await admin.as('PATCH', `/api/admin/orders/${o1.id}`, { body: { status: 'cancelled', note: 'again' } })
  assert.equal(c2.status, 200)
  assert.equal(c2.json.statusHistory.length, 2)
  assert.equal(c2.json.note, 'again')
  assert.equal(await isAvailable('solo'), false)

  // un-cancel conflicts
  const un = await admin.as('PATCH', `/api/admin/orders/${o1.id}`, { body: { status: 'paid' } })
  assert.equal(un.status, 409)
  assert.ok(un.json.error)
  const still = await admin.as('GET', `/api/admin/orders/${o1.id}`)
  assert.equal(still.json.status, 'cancelled')
  assert.equal(still.json.statusHistory.length, 2)

  // cancel order 2, then order 1 can be reinstated and re-claims the painting
  const o2 = await adminOrder(second.json.orderNumber)
  await admin.as('PATCH', `/api/admin/orders/${o2.id}`, { body: { status: 'cancelled' } })
  assert.equal(await isAvailable('solo'), true)
  const back = await admin.as('PATCH', `/api/admin/orders/${o1.id}`, { body: { status: 'paid' } })
  assert.equal(back.status, 200)
  assert.deepEqual(back.json.statusHistory.map((h) => h.status), ['pending-payment', 'cancelled', 'paid'])
  assert.equal(await isAvailable('solo'), false)

  // normal progression
  const d = await admin.as('PATCH', `/api/admin/orders/${o1.id}`, { body: { status: 'dispatched' } })
  assert.equal(d.json.statusHistory.length, 4)
  assert.equal(await isAvailable('solo'), false)

  const log = await admin.as('GET', '/api/admin/audit?pageSize=100')
  assert.ok(log.json.items.some((x) => x.action === 'status' && x.entity === 'order'))
})

test('orders list: filter by status, search, paging, newest first', async () => {
  for (let i = 0; i < 3; i++) await place([{ slug: 'pr', variant: 'A4' }], customer({ name: `Bulk Buyer ${i}`, email: `bulk${i}@example.com`, phone: '9000000000' }))
  const all = await admin.as('GET', '/api/admin/orders?pageSize=2&page=1')
  assert.equal(all.json.pageSize, 2)
  assert.equal(all.json.items.length, 2)
  assert.ok(all.json.total >= 5)
  assert.ok(new Date(all.json.items[0].createdAt) >= new Date(all.json.items[1].createdAt))
  const p2 = await admin.as('GET', '/api/admin/orders?pageSize=2&page=2')
  assert.notEqual(p2.json.items[0].id, all.json.items[0].id)
  const q = await admin.as('GET', '/api/admin/orders?q=bulk%20buyer')
  assert.equal(q.json.total, 3)
  const byEmail = await admin.as('GET', '/api/admin/orders?q=bulk1@')
  assert.equal(byEmail.json.total, 1)
  const noRegex = await admin.as('GET', '/api/admin/orders?q=.*')
  assert.equal(noRegex.json.total, 0) // regex metacharacters are escaped
  const cancelled = await admin.as('GET', '/api/admin/orders?status=cancelled')
  assert.ok(cancelled.json.items.every((o) => o.status === 'cancelled') && cancelled.json.total >= 1)
  assert.equal((await admin.as('GET', '/api/admin/orders?status=bogus')).status, 400)
})

test('settings drive shipping on real orders; checkoutEnabled=false gives 503', async () => {
  await admin.as('POST', '/api/admin/artworks', { body: art({ slug: 'ship-a', type: 'print', price: 1000, variants: [{ label: 'S', price: 1000 }] }) })
  const base = await place([{ slug: 'ship-a', variant: 'S' }])
  assert.equal(base.json.total, 1250)

  await admin.as('PUT', '/api/admin/settings', { body: { shipping: { flat: 400, freeAbove: 5000 } } })
  const flat = await place([{ slug: 'ship-a', variant: 'S' }])
  assert.equal(flat.json.total, 1400)
  const free = await place([{ slug: 'ship-a', variant: 'S', qty: 5 }])
  assert.equal(free.json.total, 5000) // subtotal 5000 >= freeAbove -> free
  assert.equal((await adminOrder(free.json.orderNumber)).shipping, 0)

  await admin.as('PUT', '/api/admin/settings', { body: { checkoutEnabled: false } })
  const off = await place([{ slug: 'ship-a', variant: 'S' }])
  assert.equal(off.status, 503)
  assert.ok(off.json.error)
  assert.equal((await t.call('GET', '/api/public/settings')).json.checkoutEnabled, false)
  await admin.as('PUT', '/api/admin/settings', { body: { checkoutEnabled: true } })
  assert.equal((await place([{ slug: 'ship-a', variant: 'S' }])).status, 201)
})

test('dashboard aggregates', async () => {
  const d = await admin.as('GET', '/api/admin/dashboard')
  assert.equal(d.status, 200)
  const o = d.json.orders
  assert.equal(Object.values(o.byStatus).reduce((a, b) => a + b, 0), o.total)
  assert.ok(o.total > 0 && o.pendingValue > 0)
  assert.equal(d.json.artworks.total, d.json.artworks.available + d.json.artworks.sold + d.json.artworks.onEnquiry)
  assert.ok(d.json.recentOrders.length <= 5 && d.json.recentOrders.length > 0)
  assert.deepEqual(Object.keys(d.json.enquiries).sort(), ['newsletterSubscribers', 'unhandledCustom', 'unhandledGeneral'])
})

test('enquiries: newsletter dedupe by lower-cased email, handled toggle, filters, delete', async () => {
  for (const e of ['Reader@Example.com', 'reader@example.com', 'READER@example.com']) {
    const r = await t.call('POST', '/api/enquiries', { csrf: false, body: { kind: 'newsletter', email: e } })
    assert.equal(r.status, 201)
  }
  await Promise.all(Array.from({ length: 5 }, () => t.call('POST', '/api/enquiries', { csrf: false, body: { kind: 'newsletter', email: 'race@example.com' } })))
  const news = await admin.as('GET', '/api/admin/enquiries?kind=newsletter&pageSize=100')
  assert.equal(news.json.items.filter((x) => x.email === 'reader@example.com').length, 1)
  assert.equal(news.json.items.filter((x) => x.email === 'race@example.com').length, 1)

  const g = await t.call('POST', '/api/enquiries', { csrf: false, body: { kind: 'general', name: 'Mira', email: 'mira@example.com', message: 'Hello there' } })
  assert.equal(g.status, 201)
  const list = await admin.as('GET', '/api/admin/enquiries?kind=general&handled=false')
  assert.equal(list.json.total, 1)
  const e = list.json.items[0]
  assert.equal(e.handled, false)
  const h = await admin.as('PATCH', `/api/admin/enquiries/${e.id}`, { body: { handled: true } })
  assert.equal(h.json.handled, true)
  assert.ok(h.json.handledAt)
  assert.equal((await admin.as('GET', '/api/admin/enquiries?kind=general&handled=false')).json.total, 0)
  assert.equal((await admin.as('GET', '/api/admin/enquiries?q=mira')).json.total, 1)
  assert.equal((await admin.as('PATCH', `/api/admin/enquiries/${e.id}`, { body: { handled: 'yes' } })).status, 400)
  assert.equal((await admin.as('PATCH', `/api/admin/enquiries/${e.id}`, { body: { handled: false } })).json.handledAt, null)
  assert.equal((await admin.as('DELETE', `/api/admin/enquiries/${e.id}`)).status, 204)
  assert.equal((await admin.as('DELETE', `/api/admin/enquiries/${e.id}`)).status, 404)
})

test('CSV export neutralises formulas and escapes quotes/commas/newlines', async () => {
  await t.call('POST', '/api/enquiries', { csrf: false, body: { kind: 'newsletter', email: '=1+1@evil.com' } })
  await t.call('POST', '/api/enquiries', { csrf: false, body: { kind: 'newsletter', email: '+cmd@evil.com' } })
  await t.call('POST', '/api/enquiries', { csrf: false, body: { kind: 'newsletter', email: '@sum@evil.com' } })
  const r = await admin.as('GET', '/api/admin/enquiries/export?kind=newsletter')
  assert.equal(r.status, 200)
  assert.match(r.headers.get('content-type'), /^text\/csv/)
  assert.match(r.headers.get('content-disposition'), /attachment/)
  const lines = r.text.trim().split(/\r?\n/)
  assert.equal(lines[0], 'email,createdAt')
  assert.ok(lines.some((l) => l.startsWith("'=1+1@evil.com,")))
  assert.ok(lines.some((l) => l.startsWith("'+cmd@evil.com,")))
  assert.ok(lines.some((l) => l.startsWith("'@sum@evil.com,")))
  assert.ok(!lines.some((l) => /^[=+\-@]/.test(l.split(',')[0]) && l !== lines[0]))

  await t.call('POST', '/api/enquiries', { csrf: false, body: { kind: 'general', name: 'Q "Quote", Co', email: 'q@example.com', message: '=HYPERLINK("x")\nsecond line' } })
  const g = await admin.as('GET', '/api/admin/enquiries/export?kind=general')
  assert.ok(g.text.includes('"Q ""Quote"", Co"'))
  assert.ok(g.text.includes(`"'=HYPERLINK(""x"")\nsecond line"`))
  assert.equal((await admin.as('GET', '/api/admin/enquiries/export?kind=bogus')).status, 400)
})
