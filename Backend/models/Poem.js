const mongoose = require('mongoose')

const poemSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  lang: { type: String, enum: ['en', 'mr'], required: true },
  title: { type: String, required: true },
  theme: { type: String, default: '' },
  body: { type: String, required: true },
  published: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true })

module.exports = mongoose.model('Poem', poemSchema)
