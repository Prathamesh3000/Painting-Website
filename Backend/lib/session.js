const crypto = require('crypto')
const { getSecret, isProd } = require('./secret')
const RevokedSession = require('../models/RevokedSession')

const COOKIE = 'kj_admin'
const MAX_AGE_S = 28800
const MAX_AGE_MS = MAX_AGE_S * 1000

const mac = (payload) => crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')

// Cookie value: <userId>.<expiresMs>.<hmac>; issued-at is derived as expires - MAX_AGE_MS.
function makeToken(userId, now = Date.now()) {
  const payload = `${userId}.${now + MAX_AGE_MS}`
  return `${payload}.${mac(payload)}`
}

function readToken(token) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [id, exp, sig] = parts
  const expected = Buffer.from(mac(`${id}.${exp}`))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null
  const expires = Number(exp)
  if (!Number.isFinite(expires) || expires <= Date.now()) return null
  return { id, issuedAt: expires - MAX_AGE_MS, expires, sig }
}

const digest = (tok) => crypto.createHash('sha256').update(tok.sig).digest('hex')

// Logout revokes the exact cookie (kept until it would have expired anyway; a TTL index removes it).
async function revoke(tok) {
  try { await RevokedSession.updateOne({ digest: digest(tok) }, { $setOnInsert: { expiresAt: new Date(tok.expires) } }, { upsert: true }) } catch (e) { if (e.code !== 11000) throw e }
}
const isRevoked = async (tok) => !!(await RevokedSession.exists({ digest: digest(tok) }))

const attrs = () => `Path=/api; HttpOnly; SameSite=Strict${isProd() ? '; Secure' : ''}`
const setCookie = (res, token) => res.append('Set-Cookie', `${COOKIE}=${token}; ${attrs()}; Max-Age=${MAX_AGE_S}`)
const clearCookie = (res) => res.append('Set-Cookie', `${COOKIE}=; ${attrs()}; Max-Age=0`)

// Small hand-written cookie parser.
function parseCookies(header) {
  const out = {}
  if (typeof header !== 'string') return out
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    const k = part.slice(0, i).trim()
    let v = part.slice(i + 1).trim()
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
    try { v = decodeURIComponent(v) } catch { /* keep raw */ }
    if (k && !(k in out)) out[k] = v
  }
  return out
}

module.exports = { COOKIE, makeToken, readToken, revoke, isRevoked, setCookie, clearCookie, parseCookies }
