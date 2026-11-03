const express = require('express')
const Enquiry = require('../../models/Enquiry')
const { adminEnquiry } = require('../../lib/serialize')
const { audit } = require('../../lib/audit')
const { HttpError, bad } = require('../../lib/httpError')
const { body, bool, oid, qstr, paging, escapeRegex } = require('../../lib/validate')

const router = express.Router()
const KINDS = ['general', 'custom', 'newsletter']

function buildFilter(req) {
  const filter = {}
  const kind = qstr(req.query.kind)
  if (kind) {
    if (!KINDS.includes(kind)) throw bad('Unknown kind filter.')
    filter.kind = kind
  }
  const handled = qstr(req.query.handled)
  if (handled) {
    if (handled !== 'true' && handled !== 'false') throw bad('handled must be true or false.')
    filter.handled = handled === 'true' ? true : { $ne: true }
  }
  const q = qstr(req.query.q)
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ name: rx }, { email: rx }, { message: rx }]
  }
  return filter
}

router.get('/', async (req, res) => {
  const { page, pageSize, skip } = paging(req)
  const filter = buildFilter(req)
  const [items, total] = await Promise.all([
    Enquiry.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(pageSize),
    Enquiry.countDocuments(filter),
  ])
  res.json({ items: items.map(adminEnquiry), total, page, pageSize })
})

// CSV cell: neutralise spreadsheet formulas, then quote when needed.
function csvCell(v) {
  let s = v instanceof Date ? v.toISOString() : String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Must come before '/:id'.
router.get('/export', async (req, res) => {
  const kind = qstr(req.query.kind) || 'newsletter'
  if (!KINDS.includes(kind)) throw bad('Unknown kind.')
  const rows = await Enquiry.find({ kind }).sort({ createdAt: 1 })
  const cols = kind === 'newsletter' ? ['email', 'createdAt'] : ['kind', 'name', 'email', 'style', 'size', 'budget', 'message', 'handled', 'createdAt']
  const lines = [cols.join(',')]
  for (const r of rows) lines.push(cols.map((c) => csvCell(r[c])).join(','))
  res.set('Content-Type', 'text/csv; charset=utf-8')
  res.set('Content-Disposition', `attachment; filename="${kind}-${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send(lines.join('\r\n') + '\r\n')
})

const load = async (id) => {
  const e = oid(id) && (await Enquiry.findById(id))
  if (!e) throw new HttpError(404, 'Enquiry not found.')
  return e
}

router.patch('/:id', async (req, res) => {
  const e = await load(req.params.id)
  const handled = bool(body(req).handled, 'handled')
  if (handled !== !!e.handled) {
    e.handled = handled
    e.handledAt = handled ? new Date() : null
    await e.save()
    await audit(req.admin, 'update', 'enquiry', e._id, `Marked ${e.kind} enquiry ${handled ? 'handled' : 'unhandled'}`)
  }
  res.json(adminEnquiry(e))
})

router.delete('/:id', async (req, res) => {
  const e = await load(req.params.id)
  await e.deleteOne()
  await audit(req.admin, 'delete', 'enquiry', e._id, `Deleted ${e.kind} enquiry`)
  res.status(204).end()
})

module.exports = router
