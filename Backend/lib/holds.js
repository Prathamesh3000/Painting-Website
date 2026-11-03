const Order = require('../models/Order')
const Artwork = require('../models/Artwork')
const { getSettings } = require('./settings')

// Cancels pending-payment orders older than the `holdHours` setting (0 = never) and puts their originals back
// on sale. Safe to run concurrently / repeatedly: the status guard makes each order transition exactly once.
// Returns the number of orders released.
async function releaseExpiredHolds({ now = Date.now() } = {}) {
  const { holdHours } = await getSettings()
  if (!holdHours) return 0
  const cutoff = new Date(now - holdHours * 3600 * 1000)
  const stale = await Order.find({ status: 'pending-payment', createdAt: { $lt: cutoff } }).select('_id').lean()
  let released = 0
  for (const { _id } of stale) {
    const order = await Order.findOneAndUpdate(
      { _id, status: 'pending-payment' },
      { $set: { status: 'cancelled' }, $push: { statusHistory: { status: 'cancelled', at: new Date(now), by: 'system' } } },
      { returnDocument: 'after' },
    )
    if (!order) continue
    const slugs = [...new Set(order.items.filter((i) => i.type === 'original').map((i) => i.slug))]
    if (slugs.length) await Artwork.updateMany({ slug: { $in: slugs } }, { available: true })
    released++
  }
  return released
}

module.exports = { releaseExpiredHolds }
