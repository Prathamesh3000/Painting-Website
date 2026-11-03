const User = require('../models/User')
const { COOKIE, parseCookies, readToken, isRevoked } = require('../lib/session')
const { oid } = require('../lib/validate')

const deny = (res) => res.status(401).json({ error: 'Not logged in.' })

async function requireAdmin(req, res, next) {
  const tok = readToken(parseCookies(req.headers.cookie)[COOKIE])
  if (!tok || !oid(tok.id)) return deny(res)
  if (await isRevoked(tok)) return deny(res)
  const user = await User.findById(tok.id)
  if (!user) return deny(res)
  // Sessions issued before the last password change are dead.
  if (tok.issuedAt < new Date(user.passwordChangedAt || 0).getTime()) return deny(res)
  req.admin = user
  next()
}

module.exports = { requireAdmin }
