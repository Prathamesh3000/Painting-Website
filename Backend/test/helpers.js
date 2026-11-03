// Test harness: runs the real Express app in-process on an ephemeral port against a throwaway database.
// Uses mongodb-memory-server (random port, never 5000) unless MONGODB_URI is set; a random database name is used per test file.
const os = require('os')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

process.env.CLIENT_ORIGIN = 'http://localhost:5173'
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'kj-uploads-'))
delete process.env.ADMIN_SECRET
delete process.env.NODE_ENV
// Public-POST throttles are off by default so unrelated tests can create many orders; the throttle tests turn them on.
process.env.ORDER_RATE_LIMIT = '0'
process.env.ENQUIRY_RATE_LIMIT = '0'
process.env.MAX_PENDING_ORDERS = '0'

const mongoose = require('mongoose')
const { createApp } = require('../app')
const User = require('../models/User')
const { hashPassword } = require('../lib/password')

const ORIGIN = process.env.CLIENT_ORIGIN
const PASSWORD = 'correct horse battery'

async function start() {
  let mem = null
  let uri = process.env.MONGODB_URI
  if (!uri) {
    mem = await require('mongodb-memory-server').MongoMemoryServer.create()
    uri = mem.getUri()
  }
  const dbName = 'kj_test_' + crypto.randomBytes(5).toString('hex')
  await mongoose.connect(uri, { dbName })
  await mongoose.connection.db.dropDatabase()
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()))
  const app = createApp()
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`

  const call = async (method, p, { body, cookie, headers = {}, form, csrf = true } = {}) => {
    const h = { ...headers }
    if (cookie) h.Cookie = cookie
    if (csrf && method !== 'GET') { h['X-Requested-With'] = 'kj-admin'; if (!h.Origin) h.Origin = ORIGIN }
    let payload
    if (form) payload = form
    else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = typeof body === 'string' ? body : JSON.stringify(body) }
    const res = await fetch(base + p, { method, headers: h, body: payload })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch { /* not json */ }
    return { status: res.status, headers: res.headers, json, text }
  }

  let n = 0
  const makeAdmin = async (email = `admin${++n}@example.com`, password = PASSWORD) => {
    await User.create({ email, name: 'Test Admin', passwordHash: await hashPassword(password) })
    const r = await call('POST', '/api/admin/auth/login', { body: { email, password } })
    if (r.status !== 200) throw new Error('login failed in helper: ' + r.text)
    const cookie = r.headers.getSetCookie()[0].split(';')[0]
    return { email, password, cookie, as: (m, p, o = {}) => call(m, p, { ...o, cookie }) }
  }

  const close = async () => {
    await new Promise((r) => server.close(r))
    await mongoose.connection.db.dropDatabase()
    await mongoose.disconnect()
    try { fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch { /* temp dir; OS cleans up */ }
    if (mem) await mem.stop()
  }
  const dbUri = uri.replace(/\/[^/]*$/, '/') + dbName // connection string including this run's database
  return { base, call, makeAdmin, close, app, mongoose, dbUri }
}

const customer = (over = {}) => ({
  name: 'Asha Rao', email: 'asha@example.com', phone: '9876543210', address: '12 MG Road', city: 'Pune', state: 'Maharashtra', pin: '411001', ...over,
})

module.exports = { start, customer, PASSWORD, ORIGIN }
