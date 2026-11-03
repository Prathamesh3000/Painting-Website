const mongoose = require('mongoose')

// Sliding-window counter keyed by string. Stored in MongoDB (collection `ratehits`, TTL-indexed) when mongoose
// is connected, so limits survive restarts and are shared by every process; otherwise (or if MongoDB errors,
// or RATE_LIMIT_STORE=memory) it falls back to an in-memory Map for this process.
// All methods are async. Use reserve() for check-and-count: it records the hit first and then checks, so a
// burst of parallel requests cannot all slip under the limit.
class FailureLimiter {
  constructor({ name = 'default', windowMs = 15 * 60 * 1000, maxKeys = 20000, persist = true } = {}) {
    this.name = name
    this.windowMs = windowMs
    this.maxKeys = maxKeys
    this.persist = persist
    this.hits = new Map()
  }

  _db() {
    if (!this.persist || process.env.RATE_LIMIT_STORE === 'memory') return null
    if (mongoose.connection.readyState !== 1) return null
    return require('../models/RateHit')
  }
  _k(key) { return `${this.name}:${key}` }

  // ---- in-memory implementation
  _recent(key, now = Date.now()) {
    const arr = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs)
    if (arr.length) this.hits.set(key, arr)
    else this.hits.delete(key)
    return arr
  }
  _memAdd(key) {
    if (this.hits.size >= this.maxKeys) this.hits.delete(this.hits.keys().next().value)
    const arr = this._recent(key)
    const t = Date.now()
    arr.push(t)
    this.hits.set(key, arr)
    return t
  }
  _memRetry(key) {
    const arr = this._recent(key)
    return arr.length ? Math.max(1, Math.ceil((arr[0] + this.windowMs - Date.now()) / 1000)) : 0
  }
  _memRelease(key) {
    const arr = this._recent(key)
    arr.pop()
    if (arr.length) this.hits.set(key, arr)
    else this.hits.delete(key)
  }

  // ---- public API (persisted when possible)
  async _try(dbFn, memFn) {
    const M = this._db()
    if (M) {
      try { return await dbFn(M) } catch (err) { console.error('rate limiter store failed, using memory:', err.message) }
    }
    return memFn()
  }

  async count(key) {
    return this._try(
      (M) => M.countDocuments({ key: this._k(key), at: { $gt: new Date(Date.now() - this.windowMs) } }),
      () => this._recent(key).length,
    )
  }
  // Seconds until the oldest hit leaves the window.
  async retryAfter(key) {
    return this._try(async (M) => {
      const first = await M.findOne({ key: this._k(key), at: { $gt: new Date(Date.now() - this.windowMs) } }).sort({ at: 1 }).lean()
      return first ? Math.max(1, Math.ceil((first.at.getTime() + this.windowMs - Date.now()) / 1000)) : 0
    }, () => this._memRetry(key))
  }
  async fail(key) {
    return this._try(async (M) => {
      const now = Date.now()
      await M.create({ key: this._k(key), at: new Date(now), expiresAt: new Date(now + this.windowMs) })
    }, () => { this._memAdd(key) })
  }
  // Records a hit, then checks it against `max`. If over the limit the hit is taken back and
  // { ok: false, retryAfter } is returned. { ok: true } keeps the hit (release() undoes it).
  async reserve(key, max) {
    const M = this._db()
    if (M) {
      try {
        // Insert first, then rank: only hits ordered before (or equal to) this one count against it, so a
        // parallel burst admits exactly `max` requests instead of rejecting all of them.
        const now = Date.now()
        const mine = await M.create({ key: this._k(key), at: new Date(now), expiresAt: new Date(now + this.windowMs) })
        const rank = await M.countDocuments({
          key: this._k(key), at: { $gt: new Date(now - this.windowMs) },
          $or: [{ at: { $lt: mine.at } }, { at: mine.at, _id: { $lte: mine._id } }],
        })
        if (rank <= max) return { ok: true }
        const retryAfter = await this.retryAfter(key)
        await M.deleteOne({ _id: mine._id })
        return { ok: false, retryAfter }
      } catch (err) { console.error('rate limiter store failed, using memory:', err.message) }
    }
    if ((await this.count(key)) >= max) return { ok: false, retryAfter: this._memRetry(key) }
    this._memAdd(key)
    return { ok: true }
  }
  // Undo the most recent fail()/reserve() for a key (releases a reservation after a successful attempt).
  async release(key) {
    return this._try(async (M) => {
      await M.findOneAndDelete({ key: this._k(key) }, { sort: { at: -1 } })
    }, () => this._memRelease(key))
  }
  async reset(key) {
    this._memReset(key)
    const M = this._db()
    if (!M) return
    try {
      await M.deleteMany(key === undefined ? { key: new RegExp(`^${this.name}:`) } : { key: this._k(key) })
    } catch (err) { console.error('rate limiter reset failed:', err.message) }
  }
  _memReset(key) { if (key === undefined) this.hits.clear(); else this.hits.delete(key) }
}

const envInt = (name, def) => {
  const n = parseInt(process.env[name], 10)
  return Number.isInteger(n) && n >= 0 ? n : def
}

// Middleware factory: at most `max()` POSTs per window per ip. Every request counts (not only failures).
function perIp(limiter, max) {
  return async (req, res, next) => {
    try {
      const limit = max()
      if (limit === 0) return next() // 0 disables
      const r = await limiter.reserve(`ip:${req.ip}`, limit)
      if (r.ok) return next()
      res.set('Retry-After', String(r.retryAfter))
      return res.status(429).json({ error: 'Too many requests. Please try again later.' })
    } catch (err) { next(err) }
  }
}

module.exports = { FailureLimiter, envInt, perIp }
