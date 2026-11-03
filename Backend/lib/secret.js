const crypto = require('crypto')

let devSecret
const isProd = () => process.env.NODE_ENV === 'production'

// Called at start-up: refuse to run in production without a strong secret.
function assertConfig() {
  const s = process.env.ADMIN_SECRET
  if (isProd() && (typeof s !== 'string' || s.length < 32)) {
    throw new Error('ADMIN_SECRET (at least 32 characters) is required when NODE_ENV=production.')
  }
}

function getSecret() {
  const s = process.env.ADMIN_SECRET
  if (typeof s === 'string' && s.length >= 32) return s
  if (isProd()) assertConfig()
  if (!devSecret) {
    devSecret = crypto.randomBytes(48).toString('hex')
    console.warn('[security] ADMIN_SECRET not set (or shorter than 32 chars): using a random per-process secret; admin sessions end on restart.')
  }
  return devSecret
}

module.exports = { assertConfig, getSecret, isProd }
