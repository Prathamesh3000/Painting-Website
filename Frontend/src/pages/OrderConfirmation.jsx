import { Link, useLocation, useParams } from 'react-router-dom'
import { inr } from '../data/artworks'
import { useContent } from '../lib/ContentContext'

export default function OrderConfirmation() {
  const { orderNumber } = useParams()
  const order = useLocation().state?.order
  const note = useContent('order.confirmNote')

  return (
    <div className="max-w-2xl mx-auto px-5 py-20 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-terracotta">Thank you</p>
      <h1 className="text-5xl mt-3">Order received</h1>
      <p className="mt-4">Your order number is <strong>{orderNumber}</strong>. Keep it to check your order status.</p>
      {order && <p className="mt-2 text-mut">Total: {inr(order.total)} · Status: {order.status}</p>}
      <p className="mt-2 text-mut">{note}</p>
      <div className="mt-8 flex justify-center gap-4">
        <Link to={`/track?order=${orderNumber}`} className="btn btn-dark">Track order</Link>
        <Link to="/art" className="btn btn-light">Keep browsing</Link>
      </div>
    </div>
  )
}
