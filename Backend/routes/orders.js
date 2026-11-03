const express = require('express')
const crypto = require('crypto')
const Artwork = require('../models/Artwork')
const Order = require('../models/Order')
const { shippingFor, validPin } = require('../config/shipping')
const { getSettings } = require('../lib/settings')

const router = express.Router()
const { FailureLimiter, envInt, perIp } = require('../lib/rateLimit')
const trackLimiter = new FailureLimiter({ name: 'track' }) // wrong order-number/e-mail lookups per ip
router.limiter = trackLimiter
// Every POST /api/orders counts (valid or not). ORDER_RATE_LIMIT per ip per RATE_LIMIT_WINDOW_MINUTES; 0 = off.
const createLimiter = new FailureLimiter({ name: 'order-create', windowMs: envInt('RATE_LIMIT_WINDOW_MINUTES', 60) * 60 * 1000 })
router.createLimiter = createLimiter
// Unpaid orders one e-mail / one ip may hold at the same time (they keep paintings off sale); 0 = off.
const maxPending = () => envInt('MAX_PENDING_ORDERS', 3)
const MAX_LOOKUP_FAILS = 30
const MAX_LEN = { name: 100, email: 200, phone: 20, address: 300, city: 100, state: 100, pin: 10 }
const fail = (res, status, error) => res.status(status).json({ error })
const str = (v) => (typeof v === 'string' ? v.trim() : '')

router.post('/', perIp(createLimiter, () => envInt('ORDER_RATE_LIMIT', 10)), async (req, res, next) => {
  try {
    const settings = await getSettings()
    if (!settings.checkoutEnabled) return fail(res, 503, 'Online checkout is temporarily unavailable. Please contact us to place your order.')
    const c = req.body?.customer || {}
    const customer = {
      name: str(c.name), email: str(c.email).toLowerCase(), phone: str(c.phone),
      address: str(c.address), city: str(c.city), state: str(c.state), pin: str(c.pin),
    }
    if (Object.keys(MAX_LEN).some((k) => customer[k].length > MAX_LEN[k])) return fail(res, 400, 'One of the delivery details is too long.')
    if (!customer.name || !customer.address || !customer.city || !customer.state) return fail(res, 400, 'Please complete all delivery details.')
    if (!/^\S+@\S+\.\S+$/.test(customer.email)) return fail(res, 400, 'Enter a valid email.')
    if (!/^[6-9][0-9]{9}$/.test(customer.phone)) return fail(res, 400, 'Enter a valid mobile number.')
    if (!validPin(customer.pin)) return fail(res, 400, 'Enter a valid PIN code.')

    const requested = Array.isArray(req.body?.items) ? req.body.items : []
    if (requested.length === 0 || requested.length > 20) return fail(res, 400, 'Your bag is empty.')

    // Prices always come from the database, never from the client.
    const items = []
    for (const r of requested) {
      if (!r || typeof r !== 'object' || typeof r.slug !== 'string') return fail(res, 400, 'An item in your bag is no longer available.')
      const art = await Artwork.findOne({ slug: r.slug.trim() })
      if (!art || art.published === false) return fail(res, 400, 'An item in your bag is no longer available.')
      if (!art.available) return fail(res, 409, `"${art.title}" has already been sold. Please remove it from your bag.`)

      if (art.price == null) return fail(res, 400, `"${art.title}" is available on enquiry only. Please contact us.`)

      let price = art.price
      let variant
      if (art.variants.length) {
        const v = art.variants.find((x) => x.label === r.variant)
        if (!v) return fail(res, 400, `Choose a size for "${art.title}".`)
        price = v.price
        variant = v.label
      }
      const qty = art.type === 'original' ? 1 : Math.min(Math.max(parseInt(r.qty, 10) || 1, 1), 10)
      items.push({ slug: art.slug, title: art.title, type: art.type, variant, price, qty })
    }

    const cap = maxPending()
    const tooManyPending = () => fail(res, 429, 'You already have unpaid orders waiting. Please complete or cancel them before placing another.')
    const pendingNow = (upTo) => Order.countDocuments({ status: 'pending-payment', ...(upTo ? { _id: { $lte: upTo } } : {}), $or: [{ 'customer.email': customer.email }, { ip: req.ip }] })
    if (cap > 0 && (await pendingNow()) >= cap) { res.set('Retry-After', '3600'); return tooManyPending() }

    // Atomically claim originals so two buyers cannot both purchase one painting.
    const claimed = []
    for (const it of items.filter((i) => i.type === 'original')) {
      const got = await Artwork.findOneAndUpdate({ slug: it.slug, available: true }, { available: false })
      if (!got) {
        await Artwork.updateMany({ slug: { $in: claimed } }, { available: true })
        return fail(res, 409, `"${it.title}" has just been sold. Please remove it from your bag.`)
      }
      claimed.push(it.slug)
    }

    const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0)
    const shipping = shippingFor(subtotal, settings.shipping)
    const orderNumber = 'KJ-' + crypto.randomBytes(4).toString('hex').toUpperCase()

    let order
    try {
      order = await Order.create({ orderNumber, customer, items, subtotal, shipping, total: subtotal + shipping, ip: req.ip || '', statusHistory: [{ status: 'pending-payment', at: new Date(), by: 'customer' }] })
    } catch (err) {
      await Artwork.updateMany({ slug: { $in: claimed } }, { available: true })
      throw err
    }
    // Parallel requests can all pass the check above; only the first `cap` (by order id) are kept, the rest are
    // removed and their paintings released.
    if (cap > 0 && (await pendingNow(order._id)) > cap) {
      await Order.deleteOne({ _id: order._id })
      await Artwork.updateMany({ slug: { $in: claimed } }, { available: true })
      res.set('Retry-After', '3600')
      return tooManyPending()
    }
    res.status(201).json({ orderNumber: order.orderNumber, total: order.total, status: order.status })
  } catch (err) { next(err) }
})

// Tracking requires both the order number and the checkout email.
router.get('/:orderNumber', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store')
    const key = `track:${req.ip}`
    const r = await trackLimiter.reserve(key, MAX_LOOKUP_FAILS) // reserved before the lookup so parallel bursts cannot dodge the limit
    if (!r.ok) {
      res.set('Retry-After', String(r.retryAfter))
      return fail(res, 429, 'Too many attempts. Please try again later.')
    }
    const order = await Order.findOne({ orderNumber: str(req.params.orderNumber).toUpperCase() })
    if (!order || order.customer.email !== str(req.query.email).toLowerCase()) return fail(res, 404, 'No order found with those details.')
    await trackLimiter.release(key)
    res.json({ orderNumber: order.orderNumber, status: order.status, trackingNote: order.trackingNote || '' })
  } catch (err) { next(err) }
})

module.exports = router
