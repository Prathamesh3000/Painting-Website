const fs = require('fs')
const express = require('express')
const cors = require('cors')
const { assertConfig } = require('./lib/secret')
const { HttpError } = require('./lib/httpError')
const { securityHeaders, rejectBadKeys, clientOrigin } = require('./middleware/security')
const { uploadDir } = require('./routes/admin/media')

// Builds the Express app (no DB connection, no listening) so tests can run it in-process.
function createApp() {
  assertConfig()
  const app = express()
  app.disable('x-powered-by')
  // Behind a reverse proxy set TRUST_PROXY (e.g. 1) so req.ip, and with it the rate limiters, sees the real client.
  if (process.env.TRUST_PROXY) {
    const t = process.env.TRUST_PROXY
    app.set('trust proxy', /^\d+$/.test(t) ? Number(t) : t === 'true' ? true : t === 'false' ? false : t)
  }

  app.use(securityHeaders)
  app.use(cors({
    origin: clientOrigin(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
    exposedHeaders: ['Retry-After', 'Content-Disposition'],
  }))

  // Uploaded images: static, immutable (random names), never sniffed or executed.
  const dir = uploadDir()
  fs.mkdirSync(dir, { recursive: true })
  app.use('/uploads', express.static(dir, {
    index: false, dotfiles: 'ignore', maxAge: '365d', immutable: true, fallthrough: true,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
    },
  }))

  // Public bodies are small. /api/admin parses its own bodies (routes/admin/index.js) so that anonymous
  // callers can never make the server parse a large body: 10 kb for auth, 1 MB only after authentication.
  const publicJson = express.json({ limit: '50kb' })
  app.use((req, res, next) => (req.path.startsWith('/api/admin') ? next() : publicJson(req, res, next)))
  app.use(rejectBadKeys)

  app.get('/api/health', (req, res) => res.json({ ok: true }))
  app.use('/api/public', require('./routes/public'))
  const orders = require('./routes/orders')
  app.use('/api/orders', orders)
  app.locals.trackLimiter = orders.limiter
  app.locals.orderLimiter = orders.createLimiter
  const enquiries = require('./routes/enquiries')
  app.use('/api/enquiries', enquiries)
  app.locals.enquiryLimiter = enquiries.limiter
  const admin = require('./routes/admin')
  app.use('/api/admin', admin)
  app.locals.loginLimiter = admin.loginLimiter

  app.use((req, res) => res.status(404).json({ error: 'Not found' }))
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    // Body-parser errors first: their messages are parser internals and must not reach the client.
    if (err.type === 'entity.too.large' || err.status === 413) return res.status(413).json({ error: 'Request too large.' })
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' })
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: 'Invalid request.' })
    if (err.code === 11000) return res.status(409).json({ error: 'Already exists.' })
    if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: 'Invalid request.' })
    console.error(err)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  })
  return app
}

module.exports = { createApp }
