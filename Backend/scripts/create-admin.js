// Usage: npm run create-admin -- --email you@example.com [--name "Your Name"]
// The e-mail may also come from the ADMIN_EMAIL env var. Password comes from the ADMIN_PASSWORD env var, or a
// hidden prompt. Min 12 characters.
// If the user already exists, the password is updated (and all of their sessions are invalidated).
require('dotenv').config()
const readline = require('readline')
const mongoose = require('mongoose')
const User = require('../models/User')
const { hashPassword } = require('../lib/password')

function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (s) => { if (s.includes(question)) process.stdout.write(s) } // hide typed characters
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer) })
  })
}

;(async () => {
  const email = (arg('email') || process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const name = arg('name')
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Usage: npm run create-admin -- --email you@example.com [--name "Name"]')

  let password = process.env.ADMIN_PASSWORD
  if (!password) {
    password = await promptHidden('Password (min 12 characters): ')
    const again = await promptHidden('Repeat password: ')
    if (password !== again) throw new Error('Passwords do not match.')
  }
  if (typeof password !== 'string' || password.length < 12) throw new Error('Password must be at least 12 characters.')

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kalpana')
  const passwordHash = await hashPassword(password)
  const existing = await User.findOne({ email })
  if (existing) {
    existing.passwordHash = passwordHash
    existing.passwordChangedAt = new Date()
    if (name !== undefined) existing.name = name
    await existing.save()
    console.log(`Updated password for ${email}`)
  } else {
    await User.create({ email, name: name || '', passwordHash })
    console.log(`Created admin ${email}`)
  }
  await mongoose.disconnect()
})().catch((e) => { console.error(e.message); process.exit(1) })
