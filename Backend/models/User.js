const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  role: { type: String, enum: ['admin'], default: 'admin' },
  // scrypt$N$r$p$salt$hash — never selected by default, never serialised.
  passwordHash: { type: String, required: true, select: false },
  passwordChangedAt: { type: Date, default: () => new Date(0) },
}, { timestamps: true })

userSchema.methods.toPublic = function toPublic() {
  return { id: String(this._id), email: this.email, name: this.name, role: this.role }
}

module.exports = mongoose.model('User', userSchema)
