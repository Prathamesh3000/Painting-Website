const mongoose = require('mongoose')

// key/value store: key 'site' holds { shipping, checkoutEnabled }.
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false })

module.exports = mongoose.model('Setting', settingSchema)
