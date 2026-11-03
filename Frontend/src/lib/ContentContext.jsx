// Public-site data layer. Renders at once from bundled data (so first paint never waits for the network), then
// swaps in /api/public/* when it arrives. The last good API response is cached in localStorage so returning
// visitors start from it. If the API is down nothing visible changes: the fallback simply stays.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { artworks as staticArtworks } from '../data/artworks'
import { poems as staticPoems } from '../data/poems'
import { contentDefaults, contentTypes } from '../content/schema'
import { API_BASE } from '../api'

const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '')
const CACHE_KEY = 'kj-public-v1'
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

// Uploaded images live on the API origin; bundled placeholders (/art/…) live on the website origin.
// eslint-disable-next-line react-refresh/only-export-components
export const mediaUrl = (path) => (path && path.startsWith('/uploads/') ? API_ORIGIN + path : path)

// ---- validation ---------------------------------------------------------------------------------------------
const isStr = (v) => typeof v === 'string'
const isInt = (v) => Number.isInteger(v)
const str = (v, d = '') => (isStr(v) ? v : d)

// Optional responsive variants: [{ width, url }]. Bad entries are dropped, widths de-duplicated, sorted ascending.
function cleanImageSet(set) {
  if (set && !Array.isArray(set) && typeof set === 'object') set = set.variants // API shape: { srcset, variants: [{width,url}] }
  if (!Array.isArray(set)) return []
  const byWidth = new Map()
  for (const v of set) {
    if (!v || typeof v !== 'object' || !isInt(v.width) || v.width < 1 || v.width > 10000) continue
    if (!isStr(v.url) || !(v.url.startsWith('/uploads/') || v.url.startsWith('/art/')) || /[\s,]/.test(v.url)) continue
    if (!byWidth.has(v.width)) byWidth.set(v.width, { width: v.width, url: v.url })
  }
  return [...byWidth.values()].sort((x, y) => x.width - y.width)
}

function cleanArtwork(a) {
  if (!a || typeof a !== 'object') return null
  if (!isStr(a.slug) || !SLUG.test(a.slug) || !isStr(a.title) || !a.title) return null
  if (a.type !== 'original' && a.type !== 'print') return null
  if (typeof a.available !== 'boolean') return null
  if (!(a.price === null || (isInt(a.price) && a.price >= 0))) return null
  if (!Number.isFinite(a.ar) || a.ar < 0.3 || a.ar > 3) return null
  const image = isStr(a.image) && (a.image.startsWith('/uploads/') || a.image.startsWith('/art/')) ? a.image : null
  const variants = Array.isArray(a.variants)
    ? a.variants.filter((v) => v && isStr(v.label) && isInt(v.price)).map((v) => ({ label: v.label, price: v.price }))
    : []
  return {
    slug: a.slug, title: a.title, type: a.type, medium: str(a.medium), dimensions: str(a.dimensions),
    price: a.price, available: a.available, dispatch: str(a.dispatch), description: str(a.description),
    ar: a.ar, image, imageSet: image ? cleanImageSet(a.imageSet) : [], imageAlt: str(a.imageAlt),
    poemSlug: isStr(a.poemSlug) && a.poemSlug ? a.poemSlug : null, variants,
  }
}

function cleanPoem(p) {
  if (!p || typeof p !== 'object') return null
  if (!isStr(p.slug) || !SLUG.test(p.slug) || !isStr(p.title) || !p.title || !isStr(p.body)) return null
  if (p.lang !== 'en' && p.lang !== 'mr') return null
  return { slug: p.slug, lang: p.lang, title: p.title, theme: str(p.theme), body: p.body }
}

// Returns a cleaned array (bad items dropped, duplicates ignored) or null if the payload is not a list at all.
function cleanList(items, fn) {
  if (!Array.isArray(items)) return null
  const seen = new Set()
  const out = []
  for (const raw of items) {
    const it = fn(raw)
    if (it && !seen.has(it.slug)) { seen.add(it.slug); out.push(it) }
  }
  return out
}

function cleanContent(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null
  const out = {}
  for (const [key, val] of Object.entries(c)) {
    const type = contentTypes[key]
    if (!type) continue // unknown key: the site has nowhere to show it
    if (type === 'list') {
      if (!Array.isArray(val)) continue
      const rows = val.filter((r) => r && typeof r === 'object' && !Array.isArray(r))
        .map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => isStr(v))))
      out[key] = rows
    } else if (isStr(val)) {
      out[key] = val
    }
  }
  return out
}

const DEFAULT_SETTINGS = { shipping: { flat: 250, freeAbove: 10000 }, checkoutEnabled: true }

function cleanSettings(s) {
  if (!s || typeof s !== 'object') return null
  const sh = s.shipping
  if (!sh || !isInt(sh.flat) || sh.flat < 0 || !isInt(sh.freeAbove) || sh.freeAbove < 0) return null
  if (typeof s.checkoutEnabled !== 'boolean') return null
  return { shipping: { flat: sh.flat, freeAbove: sh.freeAbove }, checkoutEnabled: s.checkoutEnabled }
}

const FALLBACK = {
  artworks: cleanList(staticArtworks, cleanArtwork),
  poems: cleanList(staticPoems, cleanPoem),
  content: {},
  settings: DEFAULT_SETTINGS,
}

// ---- cache --------------------------------------------------------------------------------------------------
function readCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY))
    if (!raw || typeof raw !== 'object') return {}
    return {
      artworks: cleanList(raw.artworks, cleanArtwork), poems: cleanList(raw.poems, cleanPoem),
      content: cleanContent(raw.content), settings: cleanSettings(raw.settings),
    }
  } catch { return {} }
}
function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* storage unavailable or full */ }
}

function initial() {
  const c = readCache()
  return {
    artworks: c.artworks ?? FALLBACK.artworks, poems: c.poems ?? FALLBACK.poems,
    content: c.content ?? FALLBACK.content, settings: c.settings ?? FALLBACK.settings,
  }
}

async function fetchJson(path, signal) {
  const res = await fetch(API_BASE + path, { signal })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}

// ---- provider -----------------------------------------------------------------------------------------------
const Ctx = createContext(null)

export function ContentProvider({ children }) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 10000)
    Promise.allSettled([
      fetchJson('/public/artworks', ctrl.signal), fetchJson('/public/poems', ctrl.signal),
      fetchJson('/public/content', ctrl.signal), fetchJson('/public/settings', ctrl.signal),
    ]).then(([a, p, c, s]) => {
      clearTimeout(timer)
      if (ctrl.signal.aborted && ctrl.signal.reason === 'unmount') return
      const next = {
        artworks: a.status === 'fulfilled' ? cleanList(a.value?.items, cleanArtwork) : null,
        poems: p.status === 'fulfilled' ? cleanList(p.value?.items, cleanPoem) : null,
        content: c.status === 'fulfilled' ? cleanContent(c.value?.content) : null,
        settings: s.status === 'fulfilled' ? cleanSettings(s.value) : null,
      }
      // One state update for everything that arrived, so the page swaps once. Sections that failed keep their
      // current (cached or bundled) value.
      if (Object.values(next).some(Boolean)) {
        const cached = readCache()
        writeCache({
          artworks: next.artworks ?? cached.artworks, poems: next.poems ?? cached.poems,
          content: next.content ?? cached.content, settings: next.settings ?? cached.settings,
        })
        setData((prev) => ({
          artworks: next.artworks ?? prev.artworks, poems: next.poems ?? prev.poems,
          content: next.content ?? prev.content, settings: next.settings ?? prev.settings,
        }))
      }
      setLoading(false)
    })
    return () => { clearTimeout(timer); ctrl.abort('unmount') }
  }, [])

  const value = useMemo(() => ({ ...data, loading }), [data, loading])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

const use = () => useContext(Ctx)
// eslint-disable-next-line react-refresh/only-export-components
export const useArtworks = () => { const c = use(); return { artworks: c.artworks, loading: c.loading } }
// eslint-disable-next-line react-refresh/only-export-components
export const useArtwork = (slug) => use().artworks.find((a) => a.slug === slug)
// eslint-disable-next-line react-refresh/only-export-components
export const usePoems = () => { const c = use(); return { poems: c.poems, loading: c.loading } }
// eslint-disable-next-line react-refresh/only-export-components
export const usePoem = (slug) => use().poems.find((p) => p.slug === slug)
// eslint-disable-next-line react-refresh/only-export-components
export const useContent = (key) => { const c = use(); return c.content[key] ?? contentDefaults[key] }
// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => use().settings
