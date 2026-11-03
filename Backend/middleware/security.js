const { hasBadKeys, isObj } = require('../lib/validate')

const clientOrigin = () => process.env.CLIENT_ORIGIN || 'http://localhost:5173'

// Tiny hand-written security headers.
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  if (req.path.startsWith('/api/admin')) {
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Cache-Control', 'no-store')
  }
  next()
}

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])

// CSRF: custom header (forces a CORS preflight) + exact Origin match when the browser sends one.
function csrf(req, res, next) {
  if (SAFE.has(req.method)) return next()
  if (req.get('X-Requested-With') !== 'kj-admin') return res.status(403).json({ error: 'Missing required request header.' })
  const origin = req.get('Origin')
  if (origin !== undefined && origin !== clientOrigin()) return res.status(403).json({ error: 'Origin not allowed.' })
  next()
}

// NoSQL operator injection guard for any parsed JSON body. The content editor legitimately uses dotted
// top-level keys (they are only ever stored as values, and are checked against a strict regex).
function rejectBadKeys(req, res, next) {
  if (isObj(req.body) || Array.isArray(req.body)) {
    const allowDots = req.method === 'PUT' && req.baseUrl + req.path === '/api/admin/content'
    if (hasBadKeys(req.body, { allowDotsTopLevel: allowDots })) {
      return res.status(400).json({ error: 'Request contains invalid keys.' })
    }
  }
  next()
}

module.exports = { securityHeaders, csrf, rejectBadKeys, clientOrigin }
