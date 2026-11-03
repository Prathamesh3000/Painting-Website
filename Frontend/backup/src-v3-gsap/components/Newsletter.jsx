import { useState } from 'react'
import { post } from '../api'

// Saves the address through the enquiries endpoint (kind: newsletter) so sign-ups are not silently lost.
export default function Newsletter() {
  const [state, setState] = useState('idle') // idle | sending | done
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    const email = new FormData(e.currentTarget).get('email')
    setState('sending'); setError('')
    try {
      await post('/enquiries', { kind: 'newsletter', email })
      setState('done')
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Could not reach the server. Please try again shortly.' : err.message)
      setState('idle')
    }
  }

  if (state === 'done') return <p>Thank you. You are on the list.</p>
  return (
    <div>
      <form onSubmit={submit}>
        <input type="email" name="email" required placeholder="Your email" aria-label="Email" />
        <button className="btn" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Subscribe'}</button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm">{error}</p>}
    </div>
  )
}
