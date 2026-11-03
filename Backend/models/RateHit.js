const mongoose = require('mongoose')

// One row per counted hit (see lib/rateLimit.js). The TTL index removes rows once their window has passed.
const schema = new mongoose.Schema({
  key: { type: String, required: true, index: true },
  at: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
}, { collection: 'ratehits', versionKey: false })

module.exports = mongoose.models.RateHit || mongoose.model('RateHit', schema)
