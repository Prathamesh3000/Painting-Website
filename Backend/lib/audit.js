const AuditLog = require('../models/AuditLog')

// Never lets an audit failure break the request.
async function audit(admin, action, entity, entityId, summary) {
  try {
    await AuditLog.create({
      adminEmail: admin?.email || '', action, entity,
      entityId: entityId ? String(entityId) : '', summary: String(summary || '').slice(0, 300),
    })
  } catch (err) { console.error('audit log failed:', err.message) }
}
module.exports = { audit }
