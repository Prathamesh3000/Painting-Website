const mongoose = require('mongoose')

const auditSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now, index: true },
  adminEmail: { type: String, default: '' },
  action: { type: String, enum: ['create', 'update', 'delete', 'status', 'login', 'logout', 'password'], required: true },
  entity: { type: String, default: '' },
  entityId: { type: String, default: '' },
  summary: { type: String, default: '' },
})

module.exports = mongoose.model('AuditLog', auditSchema)
