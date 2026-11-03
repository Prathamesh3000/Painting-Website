const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { start } = require('./helpers')
const Artwork = require('../models/Artwork')

let t
before(async () => { t = await start() })
after(async () => { await t.close() })

const base = { slug: 'race', title: 'Start', type: 'original', medium: 'Oil', dimensions: '', price: 100, available: true, dispatch: '', description: 'start', ar: 1, image: null, imageAlt: '', poemSlug: null, variants: [], published: true }
const fields = ({ title, description, price, medium }) => JSON.stringify({ title, description, price, medium })

test('concurrent PUTs to one artwork from two sessions: last write wins, never a mix', async () => {
  const s1 = await t.makeAdmin()
  const s2 = await t.makeAdmin()
  const id = (await s1.as('POST', '/api/admin/artworks', { body: base })).json.id
  const A = { title: 'From A', description: 'desc A', price: 111, medium: 'Medium A' }
  const B = { title: 'From B', description: 'desc B', price: 222, medium: 'Medium B' }
  for (let round = 0; round < 15; round++) {
    const [ra, rb] = await Promise.all([
      s1.as('PUT', `/api/admin/artworks/${id}`, { body: A }),
      s2.as('PUT', `/api/admin/artworks/${id}`, { body: B }),
    ])
    assert.equal(ra.status, 200, ra.text)
    assert.equal(rb.status, 200, rb.text)
    const doc = await Artwork.findById(id).lean()
    const got = fields(doc)
    assert.ok(got === fields(A) || got === fields(B), `mixed document in round ${round}: ${got}`)
    assert.equal(doc.slug, 'race')
    assert.equal(doc.type, 'original')
    assert.equal(await Artwork.countDocuments({ slug: 'race' }), 1)
  }
  // sequential writes: the later one wins
  await s1.as('PUT', `/api/admin/artworks/${id}`, { body: A })
  await s2.as('PUT', `/api/admin/artworks/${id}`, { body: B })
  assert.equal((await s1.as('GET', `/api/admin/artworks/${id}`)).json.title, 'From B')
})

test('concurrent PUTs touching different fields both survive (PUT merges)', async () => {
  const s1 = await t.makeAdmin()
  const s2 = await t.makeAdmin()
  const id = (await s1.as('POST', '/api/admin/artworks', { body: { ...base, slug: 'race2' } })).json.id
  const [ra, rb] = await Promise.all([
    s1.as('PUT', `/api/admin/artworks/${id}`, { body: { title: 'T2' } }),
    s2.as('PUT', `/api/admin/artworks/${id}`, { body: { description: 'D2' } }),
  ])
  assert.equal(ra.status, 200)
  assert.equal(rb.status, 200)
  const doc = await Artwork.findById(id).lean()
  assert.equal(doc.title, 'T2')
  assert.equal(doc.description, 'D2')
})
