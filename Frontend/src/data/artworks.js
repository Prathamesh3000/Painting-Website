// Catalogue from the client's v3 design. Backend/data/artworks.json mirrors price/availability — keep in sync.
// price: null  → "On enquiry" (cannot be added to the bag).  available: false → sold.
// ar / hv: frame aspect ratio and height (vh) used in the walk-through gallery.
// `image`, when set, is a real photo; otherwise the painting is drawn by PaintingArt.jsx.
export const artworks = [
  {
    slug: 'butterflies', title: 'Butterflies', type: 'original', medium: 'Acrylic & oil on canvas',
    dimensions: '36 × 48 in', price: 90000, available: true, dispatch: '5–7 days',
    description: 'Butterflies drift across a warm, golden field — a study in lightness and transformation.',
    ar: 0.8, hv: 58, poemSlug: null,
  },
  {
    slug: 'calm-waters', title: 'Calm Waters', type: 'original', medium: 'Placeholder image',
    dimensions: 'Size to be confirmed', price: null, available: true, dispatch: '—',
    description: 'Placeholder entry — replace with the real painting details.',
    ar: 0.842, hv: 58, image: '/art/calm-waters.jpg', gold: true, poemSlug: 'nadi',
  },
  {
    slug: 'birds', title: 'Birds', type: 'original', medium: 'Acrylic & oil on canvas',
    dimensions: '24 × 24 in', price: 50000, available: false, dispatch: '—',
    description: 'A flock crosses a pale sky above dark water. This original has found a home.',
    ar: 0.8, hv: 58, poemSlug: null,
  },
  {
    slug: 'village-lane', title: 'Village Lane', type: 'original', medium: 'Placeholder image',
    dimensions: 'Size to be confirmed', price: null, available: true, dispatch: '—',
    description: 'Placeholder entry — replace with the real painting details.',
    ar: 1.2392, hv: 46, image: '/art/village-lane.jpg', gold: true, poemSlug: null,
  },
  {
    slug: 'spiritual', title: 'Spiritual', type: 'original', medium: 'Oil on canvas',
    dimensions: '18 × 24 in', price: 60000, available: true, dispatch: '5–7 days',
    description: 'Concentric rings of light radiate from a quiet centre.',
    ar: 0.8, hv: 58, poemSlug: null,
  },
  {
    slug: 'lotus-pond', title: 'Lotus Pond', type: 'original', medium: 'Oil on canvas',
    dimensions: 'Size to be confirmed', price: null, available: true, dispatch: '—',
    description: 'A lotus opens above still green water.',
    ar: 0.8, hv: 58, poemSlug: 'unfinished-colours',
  },
  {
    slug: 'banaras-dawn', title: 'Banaras Dawn', type: 'original', medium: 'Acrylic on canvas',
    dimensions: 'Size to be confirmed', price: null, available: true, dispatch: '—',
    description: 'First light over the ghats.',
    ar: 0.8, hv: 58, poemSlug: null,
  },
]
export const inr = (n) => '₹' + n.toLocaleString('en-IN')
// Prints are priced per variant (size); originals carry a single price.
export const isPrint = (a) => a.type === 'print' && Array.isArray(a.variants) && a.variants.length > 0
const fromPrice = (a) => Math.min(...a.variants.map((v) => v.price))
export const priceLabel = (a) => {
  if (!a.available) return 'Sold'
  if (isPrint(a)) return 'From ' + inr(fromPrice(a))
  return a.price == null ? 'On enquiry' : inr(a.price)
}
export const canBuy = (a) => a.available && (isPrint(a) || a.price != null)
