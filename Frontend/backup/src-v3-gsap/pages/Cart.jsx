import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { ArtImage } from '../components/ArtCard'
import { inr } from '../data/artworks'
import { shippingFor } from '../data/shipping'

export default function Cart() {
  const { items, remove, setQty, subtotal } = useCart()

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <h1 className="text-5xl">Your bag is empty</h1>
        <Link to="/art" className="btn btn-dark mt-8">Explore Art</Link>
      </div>
    )
  }

  const shipping = shippingFor(subtotal)
  return (
    <div className="max-w-4xl mx-auto px-5 py-16">
      <h1 className="text-5xl">Your bag</h1>
      <ul className="mt-8 divide-y divide-sand border-y border-sand">
        {items.map((i) => (
          <li key={i.key} className="py-5 flex gap-4">
            <div className="w-24 h-28 shrink-0"><ArtImage art={i} /></div>
            <div className="flex-1">
              <Link to={`/art/${i.slug}`} className="font-serif text-2xl hover:text-terracotta">{i.title}</Link>
              <p className="text-sm text-charcoal/70">{i.type === 'original' ? 'Original painting' : `Canvas print · ${i.variant}`}</p>
              <div className="mt-3 flex items-center gap-4 text-sm">
                {i.type === 'print' && (
                  <label className="flex items-center gap-2">Qty
                    <input type="number" min="1" max="10" value={i.qty} onChange={(e) => setQty(i.key, +e.target.value || 1)} className="input !w-16 !py-1" />
                  </label>
                )}
                <button onClick={() => remove(i.key)} className="underline hover:text-terracotta">Remove</button>
              </div>
            </div>
            <p>{inr(i.price * i.qty)}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-8 ml-auto max-w-xs space-y-2">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(subtotal)}</dd></div>
        <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping ? inr(shipping) : 'Free'}</dd></div>
        <div className="flex justify-between text-xl font-serif border-t border-sand pt-2"><dt>Total</dt><dd>{inr(subtotal + shipping)}</dd></div>
      </dl>
      <div className="mt-8 flex justify-end">
        <Link to="/checkout" className="btn btn-dark">Checkout as guest</Link>
      </div>
    </div>
  )
}
