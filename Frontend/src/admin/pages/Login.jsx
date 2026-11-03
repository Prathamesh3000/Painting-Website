import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api, sessionHint } from '../adminApi.js'
import { useAuth } from '../ctx.js'
import { usePageTitle } from '../hooks.js'
import { Alert, Field } from '../ui.jsx'
import { fp } from '../util.js'

export default function Login() {
  usePageTitle('Sign in')
  const { user, setUser, bootError } = useAuth()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const from = loc.state?.from
  const dest = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/login') ? from : '/'
  // Once signed in, this single redirect is the only navigation (avoids a race with a second navigate call).
  if (user) return <Navigate to={dest} replace />

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    setBusy(true)
    try {
      const r = await api.post('/auth/login', { email: email.trim(), password }, { noRedirect: true })
      setPassword('')
      sessionHint.set()
      setUser(r.user)
    } catch (err) {
      setPassword('')
      if (err.status === 429) {
        const s = Number(err.retryAfter)
        let wait = 'a few minutes'
        if (Number.isFinite(s) && s > 0) {
          const m = Math.ceil(s / 60)
          wait = s < 60 ? `${Math.ceil(s)} second${Math.ceil(s) === 1 ? '' : 's'}` : `${m} minute${m === 1 ? '' : 's'}`
        }
        setError(`Too many sign-in attempts. Try again in ${wait}.`)
      } else setError(err.message)
      setBusy(false)
    }
  }

  return (
    <main className="adm min-h-screen grid place-items-center px-4 py-10 bg-ivory text-charcoal">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-4xl mb-1">Admin sign in</h1>
        <p className="text-sm text-mut mb-6">Kalpana Jagtap, site administration</p>
        <form onSubmit={submit} noValidate className="space-y-4 border border-sand bg-panel p-5">
          <Alert>{error || bootError}</Alert>
          <Field label="Email" id="login-email">
            <input {...fp('login-email')} className="input" type="email" name="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" id="login-password">
            <input {...fp('login-password')} className="input" type="password" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <button type="submit" className="btn fill w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="mt-4 text-xs text-mut"><a className="tap underline" href="/">Back to the website</a></p>
      </div>
    </main>
  )
}
