const express = require('express')
const Order = require('../../models/Order')
const Artwork = require('../../models/Artwork')
const { adminOrder } = require('../../lib/serialize')
const { audit } = require('../../lib/audit')
const { HttpError, bad } = require('../../lib/httpError')
const { body, str, oid, qstr, paging, escapeRegex } = require('../../lib/validate')

const router = express.Router()
const { STATUSES } = Order

router.get('/', async (req, res) => {
  const { page, pageSize, skip } = paging(req)
  const filter = {}
  const status = qstr(req.query.status)
  if (status) {
    if (!STATUSES.includes(status)) throw bad('Unknown status filter.')
    filter.status = status
  }
  const q = qstr(req.query.q)
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ orderNumber: rx }, { 'customer.name': rx }, { 'customer.email': rx }, { 'customer.phone': rx }]
  }
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(pageSize),
    Order.countDocuments(filter),
  ])
  res.json({ items: items.map(adminOrder), total, page, pageSize })
})

const load = async (id) => {
  const o = oid(id) && (await Order.findById(id))
  if (!o) throw new HttpError(404, 'Order not found.')
  return o
}

router.get('/:id', async (req, res) => res.json(adminOrder(await load(req.params.id))))

const originalsOf = (order) => [...new Set(order.items.filter((i) => i.type === 'original').map((i) => i.slug))]

// Atomically re-claims every original; rolls back and returns the failing title if one is gone.
async function claimAll(slugs) {
  const claimed = []
  for (const slug of slugs) {
    const got = await Artwork.findOneAndUpdate({ slug, available: true }, { available: false })
    if (!got) {
      if (claimed.length) await Artwork.updateMany({ slug: { $in: claimed } }, { available: true })
      return slug
    }
    claimed.push(slug)
  }
  return null
}

router.patch('/:id', async (req, res) => {
  const order = await load(req.params.id)
  const b = body(req)
  const set = {}
  if (b.note !== undefined) set.note = str(b.note, 'note', { max: 2000 })
  if (b.trackingNote !== undefined) set.trackingNote = str(b.trackingNote, 'trackingNote', { max: 500 })
  let newStatus
  if (b.status !== undefined) {
    if (typeof b.status !== 'string' || !STATUSES.includes(b.status)) throw bad(`status must be one of: ${STATUSES.join(', ')}.`)
    newStatus = b.status
  }
  if (newStatus === undefined && !Object.keys(set).length) throw bad('Nothing to update.')

  const from = order.status
  const changing = newStatus !== undefined && newStatus !== from
  if (!changing) {
    if (Object.keys(set).length) await Order.updateOne({ _id: order._id }, { $set: set })
    if (Object.keys(set).length) await audit(req.admin, 'update', 'order', order._id, `Updated notes on ${order.orderNumber}`)
    return res.json(adminOrder(await load(req.params.id)))
  }

  const slugs = originalsOf(order)
  let claimedHere = false
  if (from === 'cancelled' && slugs.length) {
    const missing = await claimAll(slugs)
    if (missing) throw new HttpError(409, `"${missing}" is no longer available, so this order cannot be reinstated.`)
    claimedHere = true
  }

  // The status guard makes the transition (and therefore restock/re-claim) happen at most once.
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: from },
    { $set: { ...set, status: newStatus }, $push: { statusHistory: { status: newStatus, at: new Date(), by: req.admin.email } } },
    { returnDocument: 'after' },
  )
  if (!updated) {
    if (claimedHere) await Artwork.updateMany({ slug: { $in: slugs } }, { available: true })
    throw new HttpError(409, 'The order was changed by someone else. Reload and try again.')
  }
  if (newStatus === 'cancelled' && slugs.length) {
    await Artwork.updateMany({ slug: { $in: slugs } }, { available: true })
  }
  await audit(req.admin, 'status', 'order', order._id, `${updated.orderNumber}: ${from} -> ${newStatus}`)
  res.json(adminOrder(updated))
})

module.exports = router
