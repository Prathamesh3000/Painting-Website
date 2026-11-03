const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { start } = require('./helpers')

let t, admin
before(async () => { t = await start(); admin = await t.makeAdmin() })
after(async () => { await t.close() })

const art = (over = {}) => ({
  slug: 'sunrise', title: 'Sunrise', type: 'original', medium: 'Oil', dimensions: '10 x 10 in', price: 5000, available: true,
  dispatch: '5 days', description: 'Warm light.', ar: 1, image: null, imageAlt: '', poemSlug: null, variants: [], published: true, ...over,
})
const poem = (over = {}) => ({ slug: 'dawn', lang: 'en', title: 'Dawn', theme: 'Seasons', body: 'line one\r\nline two', published: true, ...over })

test('artwork create + read + public shape', async () => {
  const c = await admin.as('POST', '/api/admin/artworks', { body: art() })
  assert.equal(c.status, 201)
  assert.ok(c.json.id && c.json.createdAt)
  assert.equal(c.json.published, true)
  const list = await admin.as('GET', '/api/admin/artworks')
  assert.equal(list.json.items.length, 1)
  const pub = await t.call('GET', '/api/public/artworks')
  assert.equal(pub.status, 200)
  assert.deepEqual(Object.keys(pub.json.items[0]).sort(), [
    'ar', 'available', 'description', 'dimensions', 'dispatch', 'image', 'imageAlt', 'imageSet', 'medium', 'poemSlug', 'price', 'slug', 'title', 'type', 'variants',
  ])
  assert.equal(pub.headers.get('cache-control'), 'public, max-age=5, stale-while-revalidate=30')
  assert.ok(pub.headers.get('etag'))
})

test('artwork validation errors are 400 with {error}', async () => {
  const cases = [
    { slug: 'Bad Slug' }, { slug: 'a--b' }, { slug: 'x'.repeat(61) }, { title: '' }, { title: 5 }, { type: 'poster' },
    { price: -1 }, { price: 1.5 }, { price: '100' }, { price: 10000001 }, { available: 'yes' }, { ar: 0.1 }, { ar: 4 },
    { image: 'https://evil.example/x.png' }, { image: '/etc/passwd' }, { image: '/uploads/../secret' }, { poemSlug: 'missing-poem' },
    { type: 'print', variants: [] }, { variants: Array.from({ length: 11 }, (_, i) => ({ label: 'v' + i, price: 1 })) },
    { variants: [{ label: '', price: 1 }] }, { variants: [{ label: 'A', price: 'x' }] }, { description: 'd'.repeat(2001) },
    { medium: 'm'.repeat(121) }, { dimensions: 'd'.repeat(61) }, { dispatch: 'd'.repeat(41) },
  ]
  for (const over of cases) {
    const r = await admin.as('POST', '/api/admin/artworks', { body: art({ slug: 'case-' + Math.random().toString(36).slice(2, 8), ...over }) })
    assert.equal(r.status, 400, JSON.stringify(over).slice(0, 80) + ' -> ' + r.status)
    assert.equal(typeof r.json.error, 'string')
  }
  const noSlug = await admin.as('POST', '/api/admin/artworks', { body: { title: 'x', type: 'original' } })
  assert.equal(noSlug.status, 400)
  const arr = await admin.as('POST', '/api/admin/artworks', { body: [] })
  assert.equal(arr.status, 400)
  const dup = await admin.as('POST', '/api/admin/artworks', { body: art() })
  assert.equal(dup.status, 409)
  assert.equal((await admin.as('GET', '/api/admin/artworks/not-an-id')).status, 404)
})

test('print needs a variant; valid print is created', async () => {
  const r = await admin.as('POST', '/api/admin/artworks', {
    body: art({ slug: 'print-one', type: 'print', price: 800, variants: [{ label: 'A4', price: 800 }, { label: 'A3', price: 1500 }] }),
  })
  assert.equal(r.status, 201)
  assert.deepEqual(r.json.variants, [{ label: 'A4', price: 800 }, { label: 'A3', price: 1500 }])
})

test('slug is immutable on PUT; other fields update; unknown/readonly fields are ignored', async () => {
  const list = await admin.as('GET', '/api/admin/artworks')
  const a = list.json.items.find((x) => x.slug === 'sunrise')
  const bad = await admin.as('PUT', `/api/admin/artworks/${a.id}`, { body: { ...a, slug: 'renamed' } })
  assert.equal(bad.status, 400)
  const ok = await admin.as('PUT', `/api/admin/artworks/${a.id}`, { body: { ...a, title: 'Sunrise II', price: null, bogus: 'x' } })
  assert.equal(ok.status, 200)
  assert.equal(ok.json.title, 'Sunrise II')
  assert.equal(ok.json.price, null)
  assert.equal(ok.json.slug, 'sunrise')
  assert.equal(ok.json.bogus, undefined)
})

test('poems: CRUD, \\r stripped, slug immutable, delete 409 while referenced', async () => {
  const bads = [{ lang: 'fr' }, { title: '' }, { body: '' }, { body: 'x'.repeat(5001) }, { theme: 't'.repeat(41) }, { slug: 'Bad_Slug' }]
  for (const over of bads) {
    const r = await admin.as('POST', '/api/admin/poems', { body: poem({ slug: 'p-' + Math.random().toString(36).slice(2, 8), ...over }) })
    assert.equal(r.status, 400, JSON.stringify(over))
  }
  const c = await admin.as('POST', '/api/admin/poems', { body: poem() })
  assert.equal(c.status, 201)
  assert.equal(c.json.body, 'line one\nline two')
  const noChange = await admin.as('PUT', `/api/admin/poems/${c.json.id}`, { body: { ...c.json, slug: 'other' } })
  assert.equal(noChange.status, 400)
  const upd = await admin.as('PUT', `/api/admin/poems/${c.json.id}`, { body: { ...c.json, title: 'Dawn II' } })
  assert.equal(upd.json.title, 'Dawn II')

  const link = await admin.as('POST', '/api/admin/artworks', { body: art({ slug: 'linked', poemSlug: 'dawn' }) })
  assert.equal(link.status, 201)
  const del = await admin.as('DELETE', `/api/admin/poems/${c.json.id}`)
  assert.equal(del.status, 409)
  assert.ok(del.json.error)
  await admin.as('PUT', `/api/admin/artworks/${link.json.id}`, { body: { poemSlug: null } })
  assert.equal((await admin.as('DELETE', `/api/admin/poems/${c.json.id}`)).status, 204)
  assert.equal((await admin.as('GET', `/api/admin/poems/${c.json.id}`)).status, 404)
})

test('public endpoints hide unpublished artworks and poems', async () => {
  const p = await admin.as('POST', '/api/admin/poems', { body: poem({ slug: 'hidden-poem', published: false }) })
  const a = await admin.as('POST', '/api/admin/artworks', { body: art({ slug: 'hidden-art', published: false }) })
  assert.equal(p.status, 201)
  assert.equal(a.status, 201)
  const pubArt = await t.call('GET', '/api/public/artworks')
  assert.ok(!pubArt.json.items.some((x) => x.slug === 'hidden-art'))
  const pubPoems = await t.call('GET', '/api/public/poems')
  assert.ok(!pubPoems.json.items.some((x) => x.slug === 'hidden-poem'))
  assert.ok(!pubPoems.text.includes('"published"'))
  // admin still sees them
  const adm = await admin.as('GET', '/api/admin/artworks')
  assert.ok(adm.json.items.some((x) => x.slug === 'hidden-art'))
  // and they cannot be bought
  const order = await t.call('POST', '/api/orders', { csrf: false, body: {
    customer: { name: 'A', email: 'a@b.co', phone: '9876543210', address: 'x', city: 'y', state: 'z', pin: '411001' },
    items: [{ slug: 'hidden-art' }],
  } })
  assert.equal(order.status, 400)
})

test('reorder sets order by position and the public list follows', async () => {
  const list = (await admin.as('GET', '/api/admin/artworks')).json.items
  const ids = list.map((x) => x.id).reverse()
  const r = await admin.as('POST', '/api/admin/artworks/reorder', { body: { ids } })
  assert.equal(r.status, 200)
  assert.deepEqual(r.json.items.map((x) => x.id), ids)
  assert.deepEqual(r.json.items.map((x) => x.order), ids.map((_, i) => i))
  const pub = (await t.call('GET', '/api/public/artworks')).json.items.map((x) => x.slug)
  const expected = r.json.items.filter((x) => x.published).map((x) => x.slug)
  assert.deepEqual(pub, expected)
  assert.equal((await admin.as('POST', '/api/admin/artworks/reorder', { body: { ids: ['64b000000000000000000001'] } })).status, 400)
  assert.equal((await admin.as('POST', '/api/admin/artworks/reorder', { body: { ids: [ids[0], ids[0]] } })).status, 400)
  assert.equal((await admin.as('POST', '/api/admin/artworks/reorder', { body: { ids: 'x' } })).status, 400)
})

test('artwork delete returns 204 and audit log records mutations', async () => {
  const c = await admin.as('POST', '/api/admin/artworks', { body: art({ slug: 'temp-art' }) })
  assert.equal((await admin.as('DELETE', `/api/admin/artworks/${c.json.id}`)).status, 204)
  assert.equal((await admin.as('DELETE', `/api/admin/artworks/${c.json.id}`)).status, 404)
  const log = await admin.as('GET', '/api/admin/audit?pageSize=100')
  assert.equal(log.status, 200)
  assert.ok(log.json.total >= 5 && log.json.page === 1 && log.json.pageSize === 100)
  const actions = new Set(log.json.items.map((x) => x.action))
  for (const a of ['create', 'update', 'delete', 'login']) assert.ok(actions.has(a), a)
  assert.ok(log.json.items.every((x) => x.adminEmail && 'summary' in x && 'entityId' in x))
})

test('content: validation, merge, public exposure, delete resets', async () => {
  const bad = [{ 'Bad Key': 'x' }, { 'home.title': 5 }, { 'home.title': 'x'.repeat(20001) }, { 'home.list': [{ a: 5 }] },
    { 'home.list': ['str'] }, { 'home.list': Array.from({ length: 31 }, () => ({ a: 'b' })) }, { 'home..x': 'a' }, { [`k${'x'.repeat(80)}`]: 'a' }]
  for (const b of bad) assert.equal((await admin.as('PUT', '/api/admin/content', { body: b })).status, 400, JSON.stringify(b).slice(0, 60))
  assert.equal((await admin.as('PUT', '/api/admin/content', { body: {} })).status, 400)
  const tooMany = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`k${i}`, 'v']))
  assert.equal((await admin.as('PUT', '/api/admin/content', { body: tooMany })).status, 400)

  const ok = await admin.as('PUT', '/api/admin/content', { body: { 'home.heroTitle': '<b>Hello</b>', 'about.pillars': [{ name: 'Craft', desc: 'Slow work' }] } })
  assert.equal(ok.status, 200)
  const pub = await t.call('GET', '/api/public/content')
  assert.equal(pub.json.content['home.heroTitle'], '<b>Hello</b>')
  assert.deepEqual(pub.json.content['about.pillars'], [{ name: 'Craft', desc: 'Slow work' }])
  await admin.as('PUT', '/api/admin/content', { body: { 'home.other': 'x' } })
  assert.equal((await admin.as('GET', '/api/admin/content')).json.content['home.heroTitle'], '<b>Hello</b>')
  assert.equal((await admin.as('DELETE', '/api/admin/content/home.heroTitle')).status, 204)
  assert.equal((await t.call('GET', '/api/public/content')).json.content['home.heroTitle'], undefined)
  assert.equal((await admin.as('DELETE', '/api/admin/content/bad%20key')).status, 400)
})

test('settings: defaults, validation, public view', async () => {
  const d = await admin.as('GET', '/api/admin/settings')
  assert.deepEqual(d.json, { shipping: { flat: 250, freeAbove: 10000 }, checkoutEnabled: true, holdHours: 48 })
  for (const b of [{ shipping: { flat: -1 } }, { shipping: { flat: 100001 } }, { shipping: { freeAbove: 1.5 } }, { checkoutEnabled: 'no' }, { shipping: 'x' }]) {
    assert.equal((await admin.as('PUT', '/api/admin/settings', { body: b })).status, 400, JSON.stringify(b))
  }
  const u = await admin.as('PUT', '/api/admin/settings', { body: { shipping: { flat: 300, freeAbove: 9000 }, checkoutEnabled: true } })
  assert.deepEqual(u.json, { shipping: { flat: 300, freeAbove: 9000 }, checkoutEnabled: true, holdHours: 48 })
  assert.deepEqual((await t.call('GET', '/api/public/settings')).json, u.json)
  await admin.as('PUT', '/api/admin/settings', { body: { shipping: { flat: 250, freeAbove: 10000 } } })
})
