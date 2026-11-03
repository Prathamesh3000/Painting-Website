const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { start } = require('./helpers')

let t
before(async () => { t = await start() })
after(async () => { await t.close() })

test('per-ip limit: 20 failures across different e-mails then 429', async () => {
  await t.app.locals.loginLimiter.reset()
  for (let i = 0; i < 20; i++) {
    const r = await t.call('POST', '/api/admin/auth/login', { body: { email: `user${i}@example.com`, password: 'wrong-wrong-wrong' } })
    assert.equal(r.status, 401, `attempt ${i}`)
  }
  const r = await t.call('POST', '/api/admin/auth/login', { body: { email: 'user99@example.com', password: 'wrong-wrong-wrong' } })
  assert.equal(r.status, 429)
  assert.ok(Number(r.headers.get('retry-after')) > 0)
})
