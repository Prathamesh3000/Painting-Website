const express = require('express')
const Enquiry = require('../models/Enquiry')

const { FailureLimiter, envInt, perIp } = require('../lib/rateLimit')

const router = express.Router()
// ENQUIRY_RATE_LIMIT per ip per RATE_LIMIT_WINDOW_MINUTES (every POST counts); 0 = off.
const limiter = new FailureLimiter({ name: 'enquiry-create', windowMs: envInt('RATE_LIMIT_WINDOW_MINUTES', 60) * 60 * 1000 })
router.limiter = limiter
const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const KINDS = ['general', 'custom', 'newsletter']

router.post('/', perIp(limiter, () => envInt('ENQUIRY_RATE_LIMIT', 10)), async (req, res, next) => {
  try {
    const b = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}
    const kind = KINDS.includes(b.kind) ? b.kind : 'general'
    const data = {
      kind,
      name: str(b.name, 100), email: str(b.email, 200),
      style: str(b.style, 200), size: str(b.size, 100), budget: str(b.budget, 100),
      message: str(b.message),
    }
    if (!/^\S+@\S+\.\S+$/.test(data.email)) {
      return res.status(400).json({ error: 'Please provide a valid email.' })
    }
    // Newsletter sign-ups need only an email; other enquiries also need a name and message.
    if (kind !== 'newsletter' && (!data.name || !data.message)) {
      return res.status(400).json({ error: 'Please provide your name, a valid email and a message.' })
    }
    if (kind === 'newsletter') {
      // De-duplicated by lower-cased email; repeat sign-ups still succeed.
      const email = data.email.toLowerCase()
      try {
        await Enquiry.updateOne({ kind: 'newsletter', email }, { $setOnInsert: { kind: 'newsletter', email, name: data.name } }, { upsert: true })
      } catch (err) {
        if (err.code !== 11000) throw err // concurrent duplicate: already subscribed
      }
    } else {
      await Enquiry.create(data)
    }
    res.status(201).json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
