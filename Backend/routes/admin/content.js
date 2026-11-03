const express = require('express')
const SiteContent = require('../../models/SiteContent')
const { audit } = require('../../lib/audit')
const { bad } = require('../../lib/httpError')
const { body, str, isObj } = require('../../lib/validate')

const router = express.Router()
const KEY = /^[a-z0-9]+(\.[A-Za-z0-9]+)*$/
const FIELD = /^[A-Za-z0-9_]{1,40}$/
const MAX_KEYS_TOTAL = 300

function checkKey(k) {
  if (typeof k !== 'string' || k.length > 80 || !KEY.test(k)) throw bad(`Invalid content key: ${String(k).slice(0, 40)}`)
}

function checkValue(k, v) {
  if (typeof v === 'string') {
    if (v.length > 20000) throw bad(`${k}: text is too long (max 20000 characters).`)
    return v
  }
  if (Array.isArray(v)) {
    if (v.length > 30) throw bad(`${k}: too many list items (max 30).`)
    return v.map((item, i) => {
      if (!isObj(item)) throw bad(`${k}[${i}] must be an object of text fields.`)
      const out = {}
      for (const [f, fv] of Object.entries(item)) {
        if (!FIELD.test(f)) throw bad(`${k}[${i}]: invalid field name.`)
        out[f] = str(fv, `${k}[${i}].${f}`, { max: 2000, trim: false })
      }
      return out
    })
  }
  throw bad(`${k}: value must be text or a list of text objects.`)
}

router.get('/', async (req, res) => {
  const rows = await SiteContent.find().lean()
  res.json({ content: Object.fromEntries(rows.map((r) => [r.key, r.value])) })
})

router.put('/', async (req, res) => {
  const b = body(req)
  const keys = Object.keys(b)
  if (!keys.length) throw bad('Nothing to update.')
  if (keys.length > 50) throw bad('At most 50 keys per request.')
  const clean = {}
  for (const k of keys) {
    checkKey(k)
    clean[k] = checkValue(k, b[k])
  }
  const existing = new Set((await SiteContent.find().select('key').lean()).map((r) => r.key))
  const total = new Set([...existing, ...keys]).size
  if (total > MAX_KEYS_TOTAL) throw bad(`At most ${MAX_KEYS_TOTAL} content keys in total.`)

  await SiteContent.bulkWrite(keys.map((k) => ({
    updateOne: { filter: { key: k }, update: { $set: { value: clean[k] } }, upsert: true },
  })))
  await audit(req.admin, 'update', 'content', '', `Edited content: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '…' : ''}`)
  const rows = await SiteContent.find().lean()
  res.json({ content: Object.fromEntries(rows.map((r) => [r.key, r.value])) })
})

router.delete('/:key', async (req, res) => {
  checkKey(req.params.key)
  const r = await SiteContent.deleteOne({ key: req.params.key })
  if (r.deletedCount) await audit(req.admin, 'delete', 'content', req.params.key, `Reset content "${req.params.key}" to default`)
  res.status(204).end()
})

module.exports = router
