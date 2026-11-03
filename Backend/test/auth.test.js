const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { start, PASSWORD } = require('./helpers')
const User = require('../models/User')

let t
before(async () => { t = await start() })
after(async () => { await t.close() })

test('login success sets an HttpOnly SameSite=Strict cookie and never returns the hash', async () => {
  const a = await t.makeAdmin('login-ok@example.com')
  const r = await t.call('POST', '/api/admin/auth/login', { body: { email: 'LOGIN-OK@example.com', password: PASSWORD } })
  assert.equal(r.status, 200)
  assert.deepEqual(Object.keys(r.json.user).sort(), ['email', 'id', 'name', 'role'])
  assert.equal(r.json.user.role, 'admin')
  const c = r.headers.getSetCookie()[0]
  assert.match(c, /^kj_admin=[^;]+\.\d+\.[^;]+;/)
  assert.match(c, /HttpOnly/)
  assert.match(c, /SameSite=Strict/)
  assert.match(c, /Path=\/api/)
  assert.match(c, /Max-Age=28800/)
  assert.ok(!/passwordHash|scrypt/.test(r.text))
  const me = await a.as('GET', '/api/admin/auth/me')
  assert.equal(me.status, 200)
  assert.equal(me.json.user.email, 'login-ok@example.com')
  assert.ok(!/passwordHash|scrypt/.test(me.text))
})

test('login failure: same message for wrong password and unknown email', async () => {
  await t.makeAdmin('login-bad@example.com')
  const a = await t.call('POST', '/api/admin/auth/login', { body: { email: 'login-bad@example.com', password: 'wrong-password-123' } })
  const b = await t.call('POST', '/api/admin/auth/login', { body: { email: 'nobody@example.com', password: 'wrong-password-123' } })
  assert.equal(a.status, 401)
  assert.equal(b.status, 401)
  assert.equal(a.json.error, 'Invalid email or password.')
  assert.deepEqual(a.json, b.json)
})

test('login rate limit: 5 failures per (ip,email) then 429 with Retry-After, even for the right password', async () => {
  await t.makeAdmin('limited@example.com')
  for (let i = 0; i < 5; i++) {
    const r = await t.call('POST', '/api/admin/auth/login', { body: { email: 'limited@example.com', password: 'nope-nope-nope' } })
    assert.equal(r.status, 401)
  }
  const locked = await t.call('POST', '/api/admin/auth/login', { body: { email: 'limited@example.com', password: PASSWORD } })
  assert.equal(locked.status, 429)
  assert.ok(Number(locked.headers.get('retry-after')) > 0)
  assert.ok(locked.json.error)
  // a different e-mail from the same ip is still allowed
  await t.makeAdmin('other-ok@example.com')
})

test('CSRF: missing X-Requested-With and wrong Origin are 403', async () => {
  const a = await t.makeAdmin()
  const noHeader = await t.call('POST', '/api/admin/artworks/reorder', { cookie: a.cookie, body: { ids: [] }, csrf: false, headers: { Origin: 'http://localhost:5173' } })
  assert.equal(noHeader.status, 403)
  const badOrigin = await t.call('POST', '/api/admin/artworks/reorder', { cookie: a.cookie, body: { ids: [] }, headers: { Origin: 'http://evil.example' } })
  assert.equal(badOrigin.status, 403)
  const loginNoHeader = await t.call('POST', '/api/admin/auth/login', { body: { email: 'x@example.com', password: 'y' }, csrf: false })
  assert.equal(loginNoHeader.status, 403)
  const ok = await a.as('POST', '/api/admin/artworks/reorder', { body: { ids: [] } })
  assert.equal(ok.status, 200)
  // no Origin header at all (non-browser client) is accepted when the custom header is present
  const noOrigin = await t.call('POST', '/api/admin/artworks/reorder', { cookie: a.cookie, body: { ids: [] }, csrf: false, headers: { 'X-Requested-With': 'kj-admin' } })
  assert.equal(noOrigin.status, 200)
})

test('every admin route answers 401 without a cookie (and with a forged one)', async () => {
  const id = '64b000000000000000000001'
  const routes = [
    ['GET', '/dashboard'], ['GET', '/artworks'], ['POST', '/artworks'], ['GET', `/artworks/${id}`], ['PUT', `/artworks/${id}`],
    ['DELETE', `/artworks/${id}`], ['POST', '/artworks/reorder'], ['GET', '/poems'], ['POST', '/poems'], ['GET', `/poems/${id}`],
    ['PUT', `/poems/${id}`], ['DELETE', `/poems/${id}`], ['POST', '/poems/reorder'], ['GET', '/orders'], ['GET', `/orders/${id}`],
    ['PATCH', `/orders/${id}`], ['GET', '/enquiries'], ['GET', '/enquiries/export?kind=newsletter'], ['PATCH', `/enquiries/${id}`],
    ['DELETE', `/enquiries/${id}`], ['GET', '/content'], ['PUT', '/content'], ['DELETE', '/content/home.title'], ['GET', '/settings'],
    ['PUT', '/settings'], ['GET', '/media'], ['POST', '/media'], ['PATCH', `/media/${id}`], ['DELETE', `/media/${id}`], ['GET', '/audit'],
    ['GET', '/auth/me'], ['POST', '/auth/logout'], ['POST', '/auth/change-password'], ['GET', '/nonexistent'],
  ]
  for (const [m, p] of routes) {
    const r = await t.call(m, '/api/admin' + p, { body: m === 'GET' || m === 'DELETE' ? undefined : {} })
    assert.equal(r.status, 401, `${m} ${p} -> ${r.status}`)
    const forged = await t.call(m, '/api/admin' + p, { body: m === 'GET' || m === 'DELETE' ? undefined : {}, cookie: `kj_admin=${id}.${Date.now() + 99999999}.AAAA` })
    assert.equal(forged.status, 401, `forged ${m} ${p}`)
  }
})

test('password change invalidates other sessions, keeps the current one, enforces rules', async () => {
  const a = await t.makeAdmin('pw@example.com')
  const other = await t.call('POST', '/api/admin/auth/login', { body: { email: 'pw@example.com', password: PASSWORD } })
  const otherCookie = other.headers.getSetCookie()[0].split(';')[0]
  assert.equal((await t.call('GET', '/api/admin/auth/me', { cookie: otherCookie })).status, 200)

  assert.equal((await a.as('POST', '/api/admin/auth/change-password', { body: { currentPassword: PASSWORD, newPassword: 'short' } })).status, 400)
  assert.equal((await a.as('POST', '/api/admin/auth/change-password', { body: { currentPassword: PASSWORD, newPassword: PASSWORD } })).status, 400)
  assert.equal((await a.as('POST', '/api/admin/auth/change-password', { body: { currentPassword: 'wrong-wrong-wrong', newPassword: 'a-brand-new-password' } })).status, 400)

  const ch = await a.as('POST', '/api/admin/auth/change-password', { body: { currentPassword: PASSWORD, newPassword: 'a-brand-new-password' } })
  assert.equal(ch.status, 204)
  assert.equal((await t.call('GET', '/api/admin/auth/me', { cookie: otherCookie })).status, 401)
  assert.equal((await t.call('GET', '/api/admin/auth/me', { cookie: a.cookie })).status, 401)
  const fresh = ch.headers.getSetCookie()[0].split(';')[0]
  assert.equal((await t.call('GET', '/api/admin/auth/me', { cookie: fresh })).status, 200)
  const relog = await t.call('POST', '/api/admin/auth/login', { body: { email: 'pw@example.com', password: 'a-brand-new-password' } })
  assert.equal(relog.status, 200)
  // the stored value is a salted scrypt hash
  const u = await User.findOne({ email: 'pw@example.com' }).select('+passwordHash')
  assert.match(u.passwordHash, /^scrypt\$16384\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
})

test('logout clears the cookie and returns 204; tampered cookies are rejected', async () => {
  const a = await t.makeAdmin()
  const tampered = a.cookie.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'))
  assert.equal((await t.call('GET', '/api/admin/auth/me', { cookie: tampered })).status, 401)
  const out = await a.as('POST', '/api/admin/auth/logout')
  assert.equal(out.status, 204)
  assert.match(out.headers.getSetCookie()[0], /Max-Age=0/)
})

test('NoSQL operator injection is rejected', async () => {
  const login = await t.call('POST', '/api/admin/auth/login', { body: { email: { $ne: null }, password: { $ne: null } } })
  assert.equal(login.status, 400)
  const order = await t.call('POST', '/api/orders', { csrf: false, body: { customer: { name: { $gt: '' } }, items: [{ slug: { $ne: 'x' } }] } })
  assert.equal(order.status, 400)
  const nested = await t.call('POST', '/api/enquiries', { csrf: false, body: { kind: 'general', name: 'a', email: 'a@b.co', message: 'm', extra: { $where: '1' } } })
  assert.equal(nested.status, 400)
  const dotted = await t.call('POST', '/api/enquiries', { csrf: false, body: { kind: 'general', name: 'a', email: 'a@b.co', message: 'm', 'a.b': 1 } })
  assert.equal(dotted.status, 400)
  const a = await t.makeAdmin()
  const art = await a.as('POST', '/api/admin/artworks', { body: { slug: 'x', title: 'X', type: 'original', 'a.b': 1 } })
  assert.equal(art.status, 400)
  // tracking lookup with an operator-shaped query must not match anything
  const track = await t.call('GET', '/api/orders/KJ-00000000?email[$ne]=x')
  assert.equal(track.status, 404)
})

test('security headers and error shape', async () => {
  const r = await t.call('GET', '/api/health')
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer')
  assert.equal(r.headers.get('x-powered-by'), null)
  const adm = await t.call('GET', '/api/admin/auth/me')
  assert.equal(adm.headers.get('x-frame-options'), 'DENY')
  const bad = await t.call('POST', '/api/enquiries', { csrf: false, headers: { 'Content-Type': 'application/json' }, body: '{not json' })
  assert.equal(bad.status, 400)
  assert.ok(typeof bad.json.error === 'string' && !/at .*\.js/.test(bad.text))
  const big = await t.call('POST', '/api/enquiries', { csrf: false, body: { message: 'x'.repeat(70000) } })
  assert.equal(big.status, 413)
  // CORS: only CLIENT_ORIGIN, with credentials
  const cors = await fetch(t.base + '/api/admin/auth/me', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' } })
  assert.equal(cors.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  assert.equal(cors.headers.get('access-control-allow-credentials'), 'true')
})
