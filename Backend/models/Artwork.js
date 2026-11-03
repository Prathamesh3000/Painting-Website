const mongoose = require('mongoose')

const artworkSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['original', 'print'], required: true },
  medium: { type: String, default: '' },
  dimensions: { type: String, default: '' },
  // null price = "on enquiry": the painting is shown but cannot be ordered online.
  price: { type: Number, default: null },
  available: { type: Boolean, default: true },
  dispatch: { type: String, default: '' },
  description: { type: String, default: '' },
  ar: { type: Number, default: 1 },
  image: { type: String, default: null },
  imageAlt: { type: String, default: '' },
  poemSlug: { type: String, default: null },
  variants: { type: [new mongoose.Schema({ label: String, price: Number }, { _id: false })], default: [] },
  published: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true })

module.exports = mongoose.model('Artwork', artworkSchema)
