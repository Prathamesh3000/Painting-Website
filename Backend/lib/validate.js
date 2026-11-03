const mongoose = require('mongoose')
const { bad } = require('./httpError')

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

// Rejects keys starting with '$' or containing '.' anywhere in a parsed JSON body (NoSQL operator injection).
function hasBadKeys(value, { allowDotsTopLevel = false } = {}, depth = 0) {
  if (depth > 8) return true
  if (Array.isArray(value)) return value.some((v) => hasBadKeys(v, {}, depth + 1))
  if (isObj(value)) {
    for (const k of Object.keys(value)) {
      if (k.startsWith('$')) return true
      if (k.includes('.') && !(allowDotsTopLevel && depth === 0)) return true
      if (hasBadKeys(value[k], {}, depth + 1)) return true
    }
  }
  return false
}

const body = (req) => {
  const b = req.body === undefined ? {} : req.body
  if (!isObj(b)) throw bad('Request body must be a JSON object.')
  return b
}

const str = (v, name, { min = 0, max = 200, trim = true } = {}) => {
  if (typeof v !== 'string') throw bad(`${name} must be a string.`)
  const s = trim ? v.trim() : v
  if (s.length < min || s.length > max) {
    throw bad(min > 0 ? `${name} must be ${min}-${max} characters.` : `${name} must be at most ${max} characters.`)
  }
  return s
}

const int = (v, name, min, max) => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw bad(`${name} must be a whole number between ${min} and ${max}.`)
  return v
}

const bool = (v, name) => {
  if (typeof v !== 'boolean') throw bad(`${name} must be true or false.`)
  return v
}

const oid = (v) => (typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v) && mongoose.isValidObjectId(v) ? v : null)

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Query-string helper: only plain strings are accepted.
const qstr = (v, max = 100) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const paging = (req) => {
  const p = parseInt(qstr(req.query.page, 8), 10)
  const s = parseInt(qstr(req.query.pageSize, 8), 10)
  const page = Number.isInteger(p) && p > 0 ? Math.min(p, 100000) : 1
  const pageSize = Number.isInteger(s) && s > 0 ? Math.min(s, 100) : 20
  return { page, pageSize, skip: (page - 1) * pageSize }
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

module.exports = { isObj, hasBadKeys, body, str, int, bool, oid, escapeRegex, qstr, paging, SLUG }
