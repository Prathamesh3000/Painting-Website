const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function request(path, options) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

export const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) })
export const get = (path) => request(path)
