const mongoose = require('mongoose')

const mediaSchema = new mongoose.Schema({
  filename: { type: String, required: true, unique: true },
  originalName: { type: String, default: '' },
  mime: { type: String, required: true },
  size: { type: Number, required: true },
  alt: { type: String, default: '' },
  // Generated WebP renditions of the image (see lib/images.js); empty when sharp is unavailable or failed.
  variants: { type: [new mongoose.Schema({ width: Number, filename: String, size: Number }, { _id: false })], default: [] },
}, { timestamps: true })

module.exports = mongoose.model('Media', mediaSchema)
