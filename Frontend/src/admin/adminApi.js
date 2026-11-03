// Admin API client. Cookie session (HttpOnly) + the X-Requested-With header the backend requires on every call.
// Nothing sensitive is ever kept in localStorage.
const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '')
const ADMIN = BASE + '/admin'

export const apiOrigin = (() => {
  try { return new URL(BASE).origin } catch { return '' }
})()

// Public paths: /uploads/* live on the API origin, /art/* on the website origin.
export function mediaSrc(path) {
  if (!path) return ''
  return path.startsWith('/uploads/') ? apiOrigin + path : path
}

export class ApiError extends Error {
  constructor(message, status = 0, retryAfter = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

// A non-secret "you probably have a session" hint. The real session is the HttpOnly cookie, which the server checks on
// every call; the hint only lets the logged-out login page skip a /auth/me request that would just log a 401 in the console.
const HINT = 'kj_admin_hint'
export const sessionHint = {
  has: () => { try { return localStorage.getItem(HINT) === '1' } catch { return true } },
  set: () => { try { localStorage.setItem(HINT, '1') } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(HINT) } catch { /* storage unavailable */ } },
}

let onUnauthorized = null
export function setUnauthorizedHandler(fn) { onUnauthorized = fn }

export function qs(params) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') sp.set(k, String(v)) })
  const s = sp.toString()
  return s ? '?' + s : ''
}

async function request(path, { method = 'GET', body, form, noRedirect = false, raw = false } = {}) {
  const headers = { 'X-Requested-With': 'kj-admin' }
  let payload
  if (form) payload = form
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }
  let res
  try {
    res = await fetch(ADMIN + path, { method, headers, body: payload, credentials: 'include' })
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0)
  }
  if (res.status === 401) sessionHint.clear()
  if (res.status === 401 && !noRedirect && onUnauthorized) onUnauthorized()
  if (!res.ok) {
    let msg = ''
    try { msg = (await res.json()).error } catch { /* not JSON */ }
    throw new ApiError(msg || `Request failed (${res.status}).`, res.status, res.headers.get('Retry-After'))
  }
  if (raw) return res
  if (res.status === 204) return null
  try { return await res.json() } catch { return null }
}

export const api = {
  get: (path, opts) => request(path, opts),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  upload: (path, form) => request(path, { method: 'POST', form }),
  // Fetches a file through fetch so the cookie and header apply, returns a Blob.
  blob: async (path) => (await request(path, { raw: true })).blob(),
}
