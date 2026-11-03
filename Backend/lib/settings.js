const Setting = require('../models/Setting')

const DEFAULTS = { shipping: { flat: 250, freeAbove: 10000 }, checkoutEnabled: true, holdHours: 48 }

async function getSettings() {
  const doc = await Setting.findOne({ key: 'site' }).lean()
  const v = (doc && doc.value) || {}
  return {
    shipping: {
      flat: Number.isInteger(v.shipping?.flat) ? v.shipping.flat : DEFAULTS.shipping.flat,
      freeAbove: Number.isInteger(v.shipping?.freeAbove) ? v.shipping.freeAbove : DEFAULTS.shipping.freeAbove,
    },
    checkoutEnabled: typeof v.checkoutEnabled === 'boolean' ? v.checkoutEnabled : DEFAULTS.checkoutEnabled,
    // Hours an unpaid order may hold its paintings before it is auto-cancelled; 0 = never.
    holdHours: Number.isInteger(v.holdHours) && v.holdHours >= 0 ? v.holdHours : DEFAULTS.holdHours,
  }
}

async function saveSettings(value) {
  await Setting.updateOne({ key: 'site' }, { $set: { value } }, { upsert: true })
}

module.exports = { DEFAULTS, getSettings, saveSettings }
