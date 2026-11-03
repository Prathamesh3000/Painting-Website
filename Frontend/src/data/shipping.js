// Shipping rules (India only) now come from the API via useSettings() (flat, freeAbove); the backend recomputes
// the same values when an order is placed. Bundled defaults live in lib/ContentContext.jsx.
export const shippingFor = (subtotal, { flat, freeAbove }) => (subtotal === 0 || subtotal >= freeAbove ? 0 : flat)
export const validPin = (pin) => /^[1-9][0-9]{5}$/.test(pin)

// Only plain web links are rendered from editable content (blocks javascript: and similar).
export const safeUrl = (url) => (typeof url === 'string' && /^https?:\/\//i.test(url.trim()) ? url.trim() : null)
