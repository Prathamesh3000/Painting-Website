const mongoose = require('mongoose')

// Logged-out session cookies (sha256 of the HMAC part). Rows expire on their own when the cookie would have.
const schema = new mongoose.Schema({
  digest: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
})

module.exports = mongoose.model('RevokedSession', schema)
