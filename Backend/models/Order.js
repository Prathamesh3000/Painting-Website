const mongoose = require('mongoose')

const STATUSES = ['pending-payment', 'paid', 'dispatched', 'delivered', 'cancelled']

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  customer: {
    name: String, email: String, phone: String,
    address: String, city: String, state: String, pin: String,
  },
  // `type` is a reserved key in mongoose schemas, so the item's type must be declared explicitly.
  items: [{ slug: String, title: String, type: { type: String }, variant: String, price: Number, qty: Number }],
  subtotal: Number,
  shipping: Number,
  total: Number,
  // Payment gateway not chosen yet; orders start as pending-payment.
  status: { type: String, enum: STATUSES, default: 'pending-payment' },
  ip: { type: String, default: '' },            // internal: client ip at checkout (pending-order cap)
  note: { type: String, default: '' },          // internal
  trackingNote: { type: String, default: '' },  // shown to the customer
  statusHistory: {
    type: [new mongoose.Schema({ status: String, at: Date, by: String }, { _id: false })],
    default: [],
  },
}, { timestamps: true })

orderSchema.index({ createdAt: -1 })
orderSchema.index({ status: 1, 'customer.email': 1 })
orderSchema.index({ status: 1, ip: 1 })

module.exports = mongoose.model('Order', orderSchema)
module.exports.STATUSES = STATUSES
