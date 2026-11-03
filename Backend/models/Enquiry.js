const mongoose = require('mongoose')

const enquirySchema = new mongoose.Schema({
  kind: { type: String, enum: ['general', 'custom', 'newsletter'], required: true },
  name: { type: String, default: '' },
  email: { type: String, required: true },
  style: String,
  size: String,
  budget: String,
  message: { type: String, default: '' },
  handled: { type: Boolean, default: false },
  handledAt: { type: Date, default: null },
}, { timestamps: true })

// One newsletter sign-up per (lower-cased) e-mail, even under concurrent requests.
enquirySchema.index({ email: 1 }, { unique: true, partialFilterExpression: { kind: 'newsletter' } })
enquirySchema.index({ createdAt: -1 })

module.exports = mongoose.model('Enquiry', enquirySchema)
