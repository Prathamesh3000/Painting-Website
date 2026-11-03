const mongoose = require('mongoose')

// One document per edited text key (string or array of flat objects). Absent = site default text.
const siteContentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true, minimize: false })

module.exports = mongoose.model('SiteContent', siteContentSchema)
