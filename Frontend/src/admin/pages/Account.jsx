import { useState } from 'react'
import { api } from '../adminApi.js'
import { useAuth, useToast } from '../ctx.js'
import { usePageTitle } from '../hooks.js'
import { Alert, Field, PageHeader } from '../ui.jsx'
import { fp, passwordStrength } from '../util.js'

export default function Account() {
  usePageTitle('Account')
  const { user } = useAuth()
  const toast = useToast()
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)
  const strength = passwordStrength(pw)

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const er = {}
    if (!cur) er.cur = 'Enter your current password.'
    if (pw.length < 12) er.pw = 'Use at least 12 characters.'
    else if (pw === cur) er.pw = 'The new password must differ from the current one.'
    if (pw2 !== pw) er.pw2 = 'The passwords do not match.'
    setErrors(er); setServerError('')
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      await api.post('/auth/change-password', { currentPassword: cur, newPassword: pw })
      toast.success('Password changed. Other sessions have been signed out.')
      setCur(''); setPw(''); setPw2('')
    } catch (err) { setServerError(err.message) }
    setBusy(false)
  }

  return (
    <div>
      <PageHeader title="Account" sub={`Signed in as ${user.email}`} />
      <form onSubmit={submit} noValidate className="max-w-md space-y-4">
        <h2 className="font-serif text-2xl">Change password</h2>
        <Alert>{serverError}</Alert>
        <Field label="Current password" id="cur" error={errors.cur}>
          <input {...fp('cur', errors.cur)} className="input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
        </Field>
        <Field label="New password" id="pw" error={errors.pw} help="At least 12 characters. A long passphrase is best.">
          <input {...fp('pw', errors.pw, true)} className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          {pw && (
            <p className="text-xs mt-1" aria-live="polite">
              <span className="inline-block align-middle w-24 h-1.5 bg-sand mr-2"><span className="block h-full bg-terracotta" style={{ width: `${(strength.level / 3) * 100}%` }} /></span>
              {strength.label}
            </p>
          )}
        </Field>
        <Field label="Confirm new password" id="pw2" error={errors.pw2}>
          <input {...fp('pw2', errors.pw2)} className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </Field>
        <button type="submit" className="btn fill" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
      </form>
    </div>
  )
}
