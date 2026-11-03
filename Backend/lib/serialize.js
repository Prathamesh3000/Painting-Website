const { mediaVariants, imageSetFor } = require('./images')

// Explicit field whitelists: nothing internal ever leaks through these.
// `variantMap` (optional, from loadVariantMap) adds `imageSet` for uploaded images that have resized renditions.
const publicArtwork = (a, variantMap) => ({
  slug: a.slug, title: a.title, type: a.type, medium: a.medium || '', dimensions: a.dimensions || '',
  price: a.price ?? null, available: a.available !== false, dispatch: a.dispatch || '',
  description: a.description || '', ar: a.ar ?? 1, image: a.image || null, imageAlt: a.imageAlt || '',
  poemSlug: a.poemSlug || null, imageSet: imageSetFor(a, variantMap),
  variants: (a.variants || []).map((v) => ({ label: v.label, price: v.price })),
})

const adminArtwork = (a, variantMap) => ({
  ...publicArtwork(a, variantMap), id: String(a._id), published: a.published !== false, order: a.order || 0,
  createdAt: a.createdAt, updatedAt: a.updatedAt,
})

const publicPoem = (p) => ({ slug: p.slug, lang: p.lang, title: p.title, theme: p.theme || '', body: p.body })

const adminPoem = (p) => ({
  ...publicPoem(p), id: String(p._id), published: p.published !== false, order: p.order || 0,
  createdAt: p.createdAt, updatedAt: p.updatedAt,
})

const adminOrder = (o) => ({
  id: String(o._id), orderNumber: o.orderNumber,
  customer: {
    name: o.customer?.name || '', email: o.customer?.email || '', phone: o.customer?.phone || '',
    address: o.customer?.address || '', city: o.customer?.city || '', state: o.customer?.state || '', pin: o.customer?.pin || '',
  },
  items: (o.items || []).map((i) => ({ slug: i.slug, title: i.title, type: i.type, variant: i.variant || '', price: i.price, qty: i.qty })),
  subtotal: o.subtotal, shipping: o.shipping, total: o.total, status: o.status,
  note: o.note || '', trackingNote: o.trackingNote || '',
  statusHistory: (o.statusHistory || []).map((h) => ({ status: h.status, at: h.at, by: h.by })),
  createdAt: o.createdAt, updatedAt: o.updatedAt,
})

const adminEnquiry = (e) => ({
  id: String(e._id), kind: e.kind, name: e.name || '', email: e.email, style: e.style || '', size: e.size || '',
  budget: e.budget || '', message: e.message || '', handled: !!e.handled, handledAt: e.handledAt || null, createdAt: e.createdAt,
})

const adminMedia = (m) => ({
  id: String(m._id), filename: m.filename, url: `/uploads/${m.filename}`, originalName: m.originalName,
  mime: m.mime, size: m.size, alt: m.alt || '', variants: mediaVariants(m), createdAt: m.createdAt,
})

const adminAudit = (a) => ({
  at: a.at, adminEmail: a.adminEmail, action: a.action, entity: a.entity, entityId: a.entityId, summary: a.summary,
})

module.exports = { publicArtwork, adminArtwork, publicPoem, adminPoem, adminOrder, adminEnquiry, adminMedia, adminAudit }
