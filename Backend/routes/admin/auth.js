const express = require('express')
const User = require('../../models/User')
const { hashPassword, verifyPassword, verifyDummy } = require('../../lib/password')
const { COOKIE, makeToken, setCookie, clearCookie, parseCookies, readToken, revoke } = require('../../lib/session')
const { FailureLimiter } = require('../../lib/rateLimit')
const { audit } = require('../../lib/audit')
const { body, str } = require('../../lib/validate')
const { bad, HttpError } = require('../../lib/httpError')
const { requireAdmin } = require('../../middleware/auth')

const MAX_PER_EMAIL = 5
const MAX_PER_IP = 20

// Public part (login) and protected part (logout/me/change-password) are separate routers
// so that app-level auth can be applied to everything else under /api/admin.
const publicRouter = express.Router()
const protectedRouter = express.Router()

const limiter = new FailureLimiter({ name: 'login' })
publicRouter.limiter = limiter

const tooMany = (res, seconds) => {
  res.set('Retry-After', String(seconds))
  return res.status(429).json({ error: 'Too many failed attempts. Please try again later.' })
}

publicRouter.post('/login', async (req, res) => {
  const b = body(req)
  if (typeof b.email !== 'string' || typeof b.password !== 'string' || !b.email || !b.password
    || b.email.length > 200 || b.password.length > 500) {
    throw bad('Email and password are required.')
  }
  const email = b.email.trim().toLowerCase()
  const ipKey = `ip:${req.ip}`
  const pairKey = `pair:${req.ip}|${email}`
  // Reserve the attempt BEFORE verifying the password: otherwise a burst of parallel requests all pass the
  // check and the 5/20 limits are bypassed. A successful login gives the reservation back.
  const pair = await limiter.reserve(pairKey, MAX_PER_EMAIL)
  if (!pair.ok) return tooMany(res, pair.retryAfter)
  const byIp = await limiter.reserve(ipKey, MAX_PER_IP)
  if (!byIp.ok) { await limiter.release(pairKey); return tooMany(res, byIp.retryAfter) }
  const user = await User.findOne({ email }).select('+passwordHash')
  const ok = user ? await verifyPassword(b.password, user.passwordHash) : await verifyDummy(b.password)
  if (!ok) return res.status(401).json({ error: 'Invalid email or password.' })
  await limiter.reset(pairKey)
  await limiter.release(ipKey)
  setCookie(res, makeToken(String(user._id)))
  await audit(user, 'login', 'session', user._id, 'Logged in')
  res.json({ user: user.toPublic() })
})

protectedRouter.post('/logout', async (req, res) => {
  // Server-side revocation: a copy of the cookie (stolen/replayed) must stop working too.
  const tok = readToken(parseCookies(req.headers.cookie)[COOKIE])
  if (tok) await revoke(tok)
  clearCookie(res)
  await audit(req.admin, 'logout', 'session', req.admin._id, 'Logged out')
  res.status(204).end()
})

protectedRouter.get('/me', (req, res) => res.json({ user: req.admin.toPublic() }))

protectedRouter.post('/change-password', async (req, res) => {
  const b = body(req)
  const current = str(b.currentPassword, 'Current password', { min: 1, max: 500, trim: false })
  const next = str(b.newPassword, 'New password', { min: 12, max: 500, trim: false })
  if (next === current) throw bad('New password must differ from the current one.')

  const key = `pw:${req.ip}|${req.admin._id}`
  const pw = await limiter.reserve(key, MAX_PER_EMAIL) // reserved before verifying (see login); cleared on success
  if (!pw.ok) return tooMany(res, pw.retryAfter)
  const user = await User.findById(req.admin._id).select('+passwordHash')
  if (!(await verifyPassword(current, user.passwordHash))) throw new HttpError(400, 'Current password is incorrect.')
  await limiter.reset(key)
  user.passwordHash = await hashPassword(next)
  user.passwordChangedAt = new Date()
  await user.save()
  // Re-issue this session's cookie; every older cookie is now invalid.
  setCookie(res, makeToken(String(user._id), Date.now() + 1))
  await audit(user, 'password', 'user', user._id, 'Password changed')
  res.status(204).end()
})

module.exports = { publicRouter, protectedRouter, requireAdmin }
