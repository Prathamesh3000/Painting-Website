const express = require('express')
const { getSettings, saveSettings } = require('../../lib/settings')
const { audit } = require('../../lib/audit')
const { bad } = require('../../lib/httpError')
const { body, int, bool, isObj } = require('../../lib/validate')

const router = express.Router()

router.get('/', async (req, res) => res.json(await getSettings()))

router.put('/', async (req, res) => {
  const b = body(req)
  const next = await getSettings()
  if (b.shipping !== undefined) {
    if (!isObj(b.shipping)) throw bad('shipping must be an object.')
    if (b.shipping.flat !== undefined) next.shipping.flat = int(b.shipping.flat, 'shipping.flat', 0, 100000)
    if (b.shipping.freeAbove !== undefined) next.shipping.freeAbove = int(b.shipping.freeAbove, 'shipping.freeAbove', 0, 10000000)
  }
  if (b.checkoutEnabled !== undefined) next.checkoutEnabled = bool(b.checkoutEnabled, 'checkoutEnabled')
  if (b.holdHours !== undefined) next.holdHours = int(b.holdHours, 'holdHours', 0, 8760)
  await saveSettings(next)
  await audit(req.admin, 'update', 'settings', 'site',
    `Settings: shipping ${next.shipping.flat} (free above ${next.shipping.freeAbove}), checkout ${next.checkoutEnabled ? 'on' : 'off'}, hold ${next.holdHours}h`)
  res.json(next)
})

module.exports = router
