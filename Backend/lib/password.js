const crypto = require('crypto')

const N = 16384, R = 8, P = 1, KEYLEN = 64

const scrypt = (password, salt, n, r, p, keylen) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, { N: n, r, p }, (err, key) => (err ? reject(err) : resolve(key)))
  })

// Format: scrypt$N$r$p$saltHex$hashHex
async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(password, salt, N, R, P, KEYLEN)
  return ['scrypt', N, R, P, salt.toString('hex'), key.toString('hex')].join('$')
}

async function verifyPassword(password, stored) {
  const parts = typeof stored === 'string' ? stored.split('$') : []
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, n, r, p, saltHex, hashHex] = parts
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), +n, +r, +p, expected.length)
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

// Used so unknown e-mails cost the same time as known ones.
// Computed once at start-up so the very first unknown-e-mail login is not measurably slower.
const dummy = hashPassword('dummy-password-not-used')
dummy.catch(() => {})
async function verifyDummy(password) {
  await verifyPassword(password, await dummy)
  return false
}

module.exports = { hashPassword, verifyPassword, verifyDummy }
