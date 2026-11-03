const express = require('express')
const Order = require('../../models/Order')
const Artwork = require('../../models/Artwork')
const Enquiry = require('../../models/Enquiry')
const { adminOrder, adminEnquiry } = require('../../lib/serialize')

const router = express.Router()

router.get('/', async (req, res) => {
  const [byStatusRows, revenueRows, artworkRows, unhandledGeneral, unhandledCustom, newsletterSubscribers, recentOrders, recentEnquiries] =
    await Promise.all([
      Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 }, value: { $sum: '$total' } } }]),
      Order.aggregate([{ $match: { status: { $in: ['paid', 'dispatched', 'delivered'] } } }, { $group: { _id: null, v: { $sum: '$total' } } }]),
      Artwork.find().select('price available').lean(),
      Enquiry.countDocuments({ kind: 'general', handled: { $ne: true } }),
      Enquiry.countDocuments({ kind: 'custom', handled: { $ne: true } }),
      Enquiry.countDocuments({ kind: 'newsletter' }),
      Order.find().sort({ createdAt: -1, _id: -1 }).limit(5),
      Enquiry.find({ kind: { $ne: 'newsletter' } }).sort({ createdAt: -1, _id: -1 }).limit(5),
    ])
  const byStatus = { 'pending-payment': 0, paid: 0, dispatched: 0, delivered: 0, cancelled: 0 }
  let total = 0, pendingValue = 0
  for (const r of byStatusRows) {
    if (r._id in byStatus) byStatus[r._id] = r.n
    total += r.n
    if (r._id === 'pending-payment') pendingValue = r.value
  }
  const sold = artworkRows.filter((a) => a.available === false).length
  const onEnquiry = artworkRows.filter((a) => a.available !== false && a.price == null).length
  res.json({
    orders: { total, byStatus, confirmedRevenue: revenueRows[0]?.v || 0, pendingValue },
    artworks: { total: artworkRows.length, available: artworkRows.length - sold - onEnquiry, sold, onEnquiry },
    enquiries: { unhandledGeneral, unhandledCustom, newsletterSubscribers },
    recentOrders: recentOrders.map(adminOrder),
    recentEnquiries: recentEnquiries.map(adminEnquiry),
  })
})

module.exports = router
