export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function request(path, options = {}) {
  // Only requests with a body send a Content-Type header, so plain GETs stay "simple" CORS requests (no preflight).
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.')
    err.status = res.status
    throw err
  }
  return data
}

export const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) })
export const get = (path) => request(path)
