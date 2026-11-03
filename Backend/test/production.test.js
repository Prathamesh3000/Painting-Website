// NODE_ENV=production behind a TLS-terminating proxy (TRUST_PROXY): Secure cookie and real-client rate limiting.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('crypto')
const { start, PASSWORD } = require('./helpers')

let t
before(async () => {
  process.env.NODE_ENV = 'production'
  process.env.ADMIN_SECRET = crypto.randomBytes(32).toString('hex')
  process.env.TRUST_PROXY = '1'
  t = await start()
})
after(async () => { await t.close() })

test('production: session cookie is Secure + HttpOnly + SameSite=Strict (https seen via x-forwarded-proto)', async () => {
  const admin = await t.makeAdmin('prod@example.com')
  const r = await t.call('POST', '/api/admin/auth/login', {
    body: { email: admin.email, password: PASSWORD }, headers: { 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '203.0.113.7' },
  })
  assert.equal(r.status, 200)
  const cookie = r.headers.getSetCookie()[0]
  assert.match(cookie, /; Secure/)
  assert.match(cookie, /; HttpOnly/)
  assert.match(cookie, /; SameSite=Strict/)
  assert.match(cookie, /; Path=\/api/)
  const out = await t.call('POST', '/api/admin/auth/logout', { cookie: cookie.split(';')[0], headers: { 'X-Forwarded-Proto': 'https' } })
  assert.equal(out.status, 204)
  const cleared = out.headers.getSetCookie()[0]
  assert.match(cleared, /Max-Age=0/)
  assert.match(cleared, /; Secure/)
})

test('TRUST_PROXY: the rate limiter keys on X-Forwarded-For, not the proxy address', async () => {
  await t.makeAdmin('xff@example.com')
  await t.app.locals.loginLimiter.reset()
  const attempt = (ip) => t.call('POST', '/api/admin/auth/login', { body: { email: 'xff@example.com', password: 'wrong-wrong-wrong' }, headers: { 'X-Forwarded-For': ip } })
  for (let i = 0; i < 5; i++) assert.equal((await attempt('198.51.100.1')).status, 401)
  assert.equal((await attempt('198.51.100.1')).status, 429)
  assert.equal((await attempt('198.51.100.2')).status, 401, 'another client behind the same proxy is unaffected')
  await t.app.locals.loginLimiter.reset()
})

test('production without ADMIN_SECRET refuses to start', () => {
  const { createApp } = require('../app')
  const saved = process.env.ADMIN_SECRET
  delete process.env.ADMIN_SECRET
  try { assert.throws(() => createApp(), /ADMIN_SECRET/) } finally { process.env.ADMIN_SECRET = saved }
})
