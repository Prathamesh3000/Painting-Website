import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { inr } from '../data/artworks'
import { shippingFor, validPin } from '../data/shipping'
import { useContent, useSettings } from '../lib/ContentContext'
import { post } from '../api'

const PAUSED = 'Online ordering is paused for the moment, so your order was not placed. Your bag is saved — please try again later.'
const empty = { name: '', email: '', phone: '', address: '', city: '', state: '', pin: '' }

export default function Checkout() {
  const { items, subtotal, clear } = useCart()
  const navigate = useNavigate()
  const { shipping: rules, checkoutEnabled } = useSettings()
  const intro = useContent('checkout.intro')
  const payment = useContent('checkout.payment')
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  if (items.length === 0) {
    return <div className="max-w-3xl mx-auto px-5 py-24 text-center"><h1 className="text-4xl">Nothing to check out</h1><Link to="/art" className="btn btn-dark mt-8">Explore Art</Link></div>
  }

  const shipping = shippingFor(subtotal, rules)
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!/^[6-9][0-9]{9}$/.test(form.phone)) e.phone = 'Enter a 10-digit Indian mobile number'
    if (!form.address.trim()) e.address = 'Required'
    if (!form.city.trim()) e.city = 'Required'
    if (!form.state.trim()) e.state = 'Required'
    if (!validPin(form.pin)) e.pin = 'Enter a valid 6-digit PIN code'
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!checkoutEnabled) { setServerError(PAUSED); return }
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setSubmitting(true)
    setServerError('')
    try {
      // The cart is kept until the order succeeds, so a failure is safe to retry.
      const order = await post('/orders', {
        customer: form,
        items: items.map((i) => ({ slug: i.slug, variant: i.variant, qty: i.qty })),
      })
      clear()
      navigate(`/order/${order.orderNumber}`, { state: { order } })
    } catch (err) {
      setServerError(err.status === 503 ? PAUSED
        : err.message === 'Failed to fetch' ? 'Could not reach the server. Your bag is saved — please try again.' : err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const field = (name, label, props = {}) => (
    <div className={props.wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={name} className="text-sm">{label}</label>
      <input id={name} name={name} value={form[name]} onChange={change} className="input mt-1" aria-invalid={!!errors[name]} {...props.input} />
      {errors[name] && <p className="text-sm text-danger mt-1">{errors[name]}</p>}
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-5 py-16 grid md:grid-cols-[1fr_20rem] gap-12">
      <form onSubmit={submit} noValidate>
        <h1 className="text-5xl">Checkout</h1>
        <p className="text-sm text-mut mt-1">{intro}</p>
        <div className="mt-8 grid sm:grid-cols-2 gap-5">
          {field('name', 'Full name', { wide: true, input: { autoComplete: 'name' } })}
          {field('email', 'Email', { input: { type: 'email', autoComplete: 'email' } })}
          {field('phone', 'Mobile number', { input: { inputMode: 'numeric', maxLength: 10, autoComplete: 'tel' } })}
          {field('address', 'Address', { wide: true, input: { autoComplete: 'street-address' } })}
          {field('city', 'City', { input: { autoComplete: 'address-level2' } })}
          {field('state', 'State', { input: { autoComplete: 'address-level1' } })}
          {field('pin', 'PIN code', { input: { inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code' } })}
        </div>

        <div className="mt-8 border border-sand p-4 text-sm">
          <p className="font-medium">Payment</p>
          <p className="text-mut mt-1">{payment}</p>
        </div>

        {!checkoutEnabled && <p role="status" className="mt-5 border border-sand p-4 text-sm">Online ordering is paused for the moment, so orders cannot be placed right now. Your bag is saved — please check back soon, or <Link to="/contact" className="underline">contact us</Link>.</p>}
        {serverError && <p role="alert" className="mt-5 text-danger">{serverError}</p>}
        <button className="btn btn-dark mt-6" disabled={submitting || !checkoutEnabled}>{submitting ? 'Placing order…' : 'Place order'}</button>
      </form>

      <aside className="bg-panel p-5 h-fit">
        <h2 className="text-2xl mb-3">Order summary</h2>
        <ul className="space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.key} className="flex justify-between gap-3">
              <span>{i.title}{i.variant ? ` (${i.variant})` : ''} × {i.qty}</span><span>{inr(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 pt-3 border-t border-sand space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping ? inr(shipping) : 'Free'}</dd></div>
          <div className="flex justify-between font-serif text-xl pt-1"><dt>Total</dt><dd>{inr(subtotal + shipping)}</dd></div>
        </dl>
      </aside>
    </div>
  )
}
