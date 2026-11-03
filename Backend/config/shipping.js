// Shipping amounts now live in the database settings (see lib/settings.js); this keeps the pure helpers.
const shippingFor = (subtotal, { flat, freeAbove }) => (subtotal === 0 || subtotal >= freeAbove ? 0 : flat)
const validPin = (pin) => /^[1-9][0-9]{5}$/.test(pin)

module.exports = { shippingFor, validPin }
