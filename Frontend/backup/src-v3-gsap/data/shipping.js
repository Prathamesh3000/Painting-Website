// Placeholder shipping rules (India only) — confirm real charges with the owner / shipping provider.
// The backend recomputes the same values; keep both in sync (Backend/config/shipping.js).
export const SHIPPING_FLAT = 250
export const FREE_SHIPPING_ABOVE = 10000
export const shippingFor = (subtotal) => (subtotal === 0 || subtotal >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FLAT)
export const validPin = (pin) => /^[1-9][0-9]{5}$/.test(pin)
