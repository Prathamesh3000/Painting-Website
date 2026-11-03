const express = require('express')
const AuditLog = require('../../models/AuditLog')
const { adminAudit } = require('../../lib/serialize')
const { paging } = require('../../lib/validate')

const router = express.Router()

router.get('/', async (req, res) => {
  const { page, pageSize, skip } = paging(req)
  const [items, total] = await Promise.all([
    AuditLog.find().sort({ at: -1, _id: -1 }).skip(skip).limit(pageSize),
    AuditLog.countDocuments(),
  ])
  res.json({ items: items.map(adminAudit), total, page, pageSize })
})

module.exports = router
