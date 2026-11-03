export const STATUSES = [
  ['pending-payment', 'Pending payment'],
  ['paid', 'Paid'],
  ['dispatched', 'Dispatched'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
]
export const statusLabel = (s) => (STATUSES.find(([k]) => k === s) || [s, s])[1]

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const formatINR = (n) => (typeof n === 'number' && Number.isFinite(n) ? inr.format(n) : '—')
export const formatNum = (n) => new Intl.NumberFormat('en-IN').format(n ?? 0)

export function formatDate(iso, withTime = true) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' })
}

export function slugify(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '')
}
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function formatBytes(n) {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

// Props for a labelled form control with accessible error + help text.
export function fp(id, error, help) {
  const ids = [help ? id + '-help' : null, error ? id + '-err' : null].filter(Boolean).join(' ')
  return { id, 'aria-describedby': ids || undefined, 'aria-invalid': error ? true : undefined }
}

export function moveItem(list, index, dir) {
  const j = index + dir
  if (j < 0 || j >= list.length) return list
  const next = list.slice()
  ;[next[index], next[j]] = [next[j], next[index]]
  return next
}

export const isInt = (v) => /^-?\d+$/.test(String(v).trim())

export function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b) }

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const MAX_UPLOAD = 8 * 1024 * 1024

// Returns { error } (blocking) and { warnings } (advisory) for a file chosen for upload.
export function checkFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) return { error: `${file.name}: only JPEG, PNG, WebP or AVIF images are accepted.`, warnings: [] }
  if (file.size > MAX_UPLOAD) return { error: `${file.name}: ${formatBytes(file.size)} is over the 8 MB limit.`, warnings: [] }
  const warnings = []
  if (file.size > 1024 * 1024) warnings.push(`${file.name} is ${formatBytes(file.size)}; files over 1 MB slow the site down. Consider compressing it.`)
  return { error: null, warnings }
}

export function readDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

export function passwordStrength(pw) {
  let score = 0
  if (pw.length >= 12) score++
  if (pw.length >= 16) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (pw.length < 12) return { level: 0, label: 'Too short: use at least 12 characters.' }
  if (score <= 2) return { level: 1, label: 'Weak: add length, mixed case, numbers or symbols.' }
  if (score <= 3) return { level: 2, label: 'Fair: a longer passphrase would be stronger.' }
  return { level: 3, label: 'Strong.' }
}
