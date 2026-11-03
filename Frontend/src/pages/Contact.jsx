import { useState } from 'react'
import { post } from '../api'
import { useContent } from '../lib/ContentContext'

// One form component serves both the general contact page and the custom-art enquiry.
function EnquiryForm({ kind }) {
  const custom = kind === 'custom'
  const [form, setForm] = useState({ name: '', email: '', style: '', size: '', budget: '', message: '' })
  const [state, setState] = useState('idle') // idle | sending | sent
  const [error, setError] = useState('')
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setState('sending'); setError('')
    try {
      await post('/enquiries', { kind, ...form })
      setState('sent')
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Could not reach the server. Please try again shortly.' : err.message)
      setState('idle')
    }
  }

  if (state === 'sent') return <p className="mt-8 text-terracotta text-lg">Thank you — your message has been received. Kalpana will get back to you.</p>

  const f = (name, label, props = {}) => (
    <div>
      <label htmlFor={name} className="text-sm">{label}</label>
      <input id={name} name={name} value={form[name]} onChange={change} className="input mt-1" {...props} />
    </div>
  )
  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      {f('name', 'Name', { required: true })}
      {f('email', 'Email', { type: 'email', required: true })}
      {custom && <>
        {f('style', 'Style or subject (e.g. landscape, abstract, portrait)')}
        {f('size', 'Preferred size')}
        {f('budget', 'Budget range')}
      </>}
      <div>
        <label htmlFor="message" className="text-sm">{custom ? 'Tell us about your idea' : 'Message'}</label>
        <textarea id="message" name="message" rows="5" required value={form.message} onChange={change} className="input mt-1" />
      </div>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <button className="btn btn-dark" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send'}</button>
    </form>
  )
}

export function Contact() {
  const intro = useContent('contact.intro')
  return (
    <div className="max-w-xl mx-auto px-5 py-16">
      <h1 className="text-5xl">Contact</h1>
      <p className="mt-2 text-mut">{intro}</p>
      <EnquiryForm kind="general" />
    </div>
  )
}

export function CustomArt() {
  const intro = useContent('customArt.intro')
  return (
    <div className="max-w-xl mx-auto px-5 py-16">
      <h1 className="text-5xl">Custom art</h1>
      <p className="mt-2 text-mut">{intro}</p>
      <EnquiryForm kind="custom" />
    </div>
  )
}
