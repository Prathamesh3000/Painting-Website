// scripts/create-admin.js run as a real child process against the in-memory MongoDB.
// Not testable here: a real TTY (raw-mode hidden typing). The prompt test below pipes stdin (no pty), which
// exercises the prompt/mismatch/validation logic but not terminal echo suppression.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { spawn } = require('child_process')
const { start, PASSWORD } = require('./helpers')
const User = require('../models/User')

let t
before(async () => { t = await start() })
after(async () => { await t.close() })

const SCRIPT = path.join(__dirname, '..', 'scripts', 'create-admin.js')

// Runs the script; `input` is a function (child, onStdout) driving stdin, or undefined for no stdin.
function run(args, env = {}, drive) {
  return new Promise((resolve, reject) => {
    const clean = { ...process.env, MONGODB_URI: t.dbUri }
    delete clean.ADMIN_PASSWORD; delete clean.ADMIN_EMAIL
    const child = spawn(process.execPath, [SCRIPT, ...args], { env: { ...clean, ...env }, stdio: ['pipe', 'pipe', 'pipe'], cwd: path.join(__dirname, '..') })
    let stdout = '', stderr = ''
    const timer = setTimeout(() => { child.kill(); reject(new Error('timeout\n' + stdout + stderr)) }, 60000)
    child.stdout.on('data', (d) => { stdout += d; if (drive) drive(child, stdout) })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }) })
    if (!drive) child.stdin.end()
  })
}

const login = (email, password) => t.call('POST', '/api/admin/auth/login', { body: { email, password } })

test('creates an admin from --email/--name and ADMIN_PASSWORD, then updates the password and ends old sessions', async () => {
  const r = await run(['--email', 'Boss@Example.com', '--name', 'The Boss'], { ADMIN_PASSWORD: PASSWORD })
  assert.equal(r.code, 0, r.stderr)
  assert.match(r.stdout, /Created admin boss@example.com/)
  const u = await User.findOne({ email: 'boss@example.com' })
  assert.equal(u.name, 'The Boss')
  const ok = await login('boss@example.com', PASSWORD)
  assert.equal(ok.status, 200)
  const oldCookie = ok.headers.getSetCookie()[0].split(';')[0]
  assert.equal((await t.call('GET', '/api/admin/auth/me', { cookie: oldCookie })).status, 200)

  await new Promise((res) => setTimeout(res, 20))
  const again = await run(['--email', 'boss@example.com'], { ADMIN_PASSWORD: 'a brand new password' })
  assert.equal(again.code, 0, again.stderr)
  assert.match(again.stdout, /Updated password for boss@example.com/)
  assert.equal(await User.countDocuments({ email: 'boss@example.com' }), 1)
  assert.equal((await User.findOne({ email: 'boss@example.com' })).name, 'The Boss', 'name kept when not given')
  assert.equal((await login('boss@example.com', PASSWORD)).status, 401)
  assert.equal((await login('boss@example.com', 'a brand new password')).status, 200)
  assert.equal((await t.call('GET', '/api/admin/auth/me', { cookie: oldCookie })).status, 401, 'old session invalidated')
})

test('ADMIN_EMAIL env var works instead of --email', async () => {
  const r = await run([], { ADMIN_EMAIL: 'env@example.com', ADMIN_PASSWORD: PASSWORD })
  assert.equal(r.code, 0, r.stderr)
  assert.equal((await login('env@example.com', PASSWORD)).status, 200)
})

test('rejects a missing/invalid e-mail and a short password with exit code 1 and creates nothing', async () => {
  const noEmail = await run([], { ADMIN_PASSWORD: PASSWORD })
  assert.equal(noEmail.code, 1)
  assert.match(noEmail.stderr, /Usage/)
  const badEmail = await run(['--email', 'not-an-email'], { ADMIN_PASSWORD: PASSWORD })
  assert.equal(badEmail.code, 1)
  const short = await run(['--email', 'short@example.com'], { ADMIN_PASSWORD: 'too short' })
  assert.equal(short.code, 1)
  assert.match(short.stderr, /at least 12/)
  assert.equal(await User.countDocuments({ email: 'short@example.com' }), 0)
})

test('without ADMIN_PASSWORD it prompts twice on stdin (piped, no tty) and does not echo the password', async () => {
  const pw = 'typed-at-the-prompt-1'
  let step = 0
  const r = await run(['--email', 'prompt@example.com'], {}, (child, out) => {
    if (step === 0 && out.includes('Password (min 12 characters): ')) { step = 1; child.stdin.write(pw + '\n') }
    else if (step === 1 && out.includes('Repeat password: ')) { step = 2; child.stdin.write(pw + '\n'); child.stdin.end() }
  })
  assert.equal(r.code, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /Created admin prompt@example.com/)
  assert.ok(!r.stdout.includes(pw), 'typed password must not be echoed')
  assert.equal((await login('prompt@example.com', pw)).status, 200)
})

test('prompt: mismatching repeat is rejected', async () => {
  let step = 0
  const r = await run(['--email', 'mismatch@example.com'], {}, (child, out) => {
    if (step === 0 && out.includes('Password (min 12 characters): ')) { step = 1; child.stdin.write('first-password-123\n') }
    else if (step === 1 && out.includes('Repeat password: ')) { step = 2; child.stdin.write('different-password-123\n'); child.stdin.end() }
  })
  assert.equal(r.code, 1)
  assert.match(r.stderr, /do not match/)
  assert.equal(await User.countDocuments({ email: 'mismatch@example.com' }), 0)
})
