import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { get } from '../api'

export default function Track() {
  const [params] = useSearchParams()
  const [number, setNumber] = useState(params.get('order') || '')
  const [email, setEmail] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setResult(null)
    try {
      setResult(await get(`/orders/${encodeURIComponent(number.trim())}?email=${encodeURIComponent(email.trim())}`))
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <h1 className="text-5xl">Order tracking</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div><label htmlFor="n" className="text-sm">Order number</label><input id="n" className="input mt-1" value={number} onChange={(e) => setNumber(e.target.value)} required /></div>
        <div><label htmlFor="e" className="text-sm">Email used at checkout</label><input id="e" type="email" className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <button className="btn btn-dark">Check status</button>
      </form>
      {error && <p role="alert" className="mt-6 text-danger">{error}</p>}
      {result && (
        <div className="mt-8 border border-sand p-5">
          <p className="text-sm text-mut">Order {result.orderNumber}</p>
          <p className="font-serif text-3xl capitalize">{result.status}</p>
          {typeof result.trackingNote === 'string' && result.trackingNote.trim() && <p className="mt-3 whitespace-pre-line">{result.trackingNote}</p>}
        </div>
      )}
    </div>
  )
}
