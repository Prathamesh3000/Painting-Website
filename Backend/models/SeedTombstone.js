const mongoose = require('mongoose')

// Remembers slugs an admin deleted so `npm run seed` does not bring them back (use `seed --force` to override).
const schema = new mongoose.Schema({
  kind: { type: String, enum: ['artwork', 'poem'], required: true },
  slug: { type: String, required: true },
}, { timestamps: true })
schema.index({ kind: 1, slug: 1 }, { unique: true })

module.exports = mongoose.model('SeedTombstone', schema)
