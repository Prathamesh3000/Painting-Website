import { Link } from 'react-router-dom'
import { api } from '../adminApi.js'
import { useFetch, usePageTitle } from '../hooks.js'
import { Badge, Empty, ErrorBox, Loading, PageHeader } from '../ui.jsx'
import { formatDate, formatINR, formatNum, statusLabel, STATUSES } from '../util.js'

function Stat({ label, value, to, sub }) {
  const inner = (
    <>
      <p className="text-xs uppercase tracking-wider text-mut">{label}</p>
      <p className="font-serif text-4xl mt-1 break-words">{value}</p>
      {sub && <p className="text-xs text-mut mt-1">{sub}</p>}
    </>
  )
  const cls = 'block border border-sand bg-panel p-4 '
  return to ? <Link to={to} className={cls + 'hover:border-terracotta'}>{inner}</Link> : <div className={cls}>{inner}</div>
}

export default function Dashboard() {
  usePageTitle('Dashboard')
  const { data: d, error, loading, reload } = useFetch(() => api.get('/dashboard'), [])
  if (loading) return <><PageHeader title="Dashboard" /><Loading /></>
  if (error) return <><PageHeader title="Dashboard" /><ErrorBox message={error} onRetry={reload} /></>
  const o = d.orders, a = d.artworks, e = d.enquiries
  return (
    <div>
      <PageHeader title="Dashboard" sub="A quick look at the studio." />
      <h2 className="font-serif text-2xl mb-3">Orders</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
        <Stat label="Confirmed revenue" value={formatINR(o.confirmedRevenue)} sub="Paid, dispatched and delivered" />
        <Stat label="Awaiting payment" value={formatINR(o.pendingValue)} sub={`${formatNum(o.byStatus['pending-payment'])} orders`} />
        {STATUSES.map(([k, l]) => <Stat key={k} label={l} value={formatNum(o.byStatus[k])} to={`/orders?status=${k}`} />)}
        <Stat label="All orders" value={formatNum(o.total)} to="/orders" />
      </div>
      <h2 className="font-serif text-2xl mb-3">Artworks and audience</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
        <Stat label="Available to buy" value={formatNum(a.available)} to="/artworks" sub={`priced and in stock, of ${formatNum(a.total)} artworks`} />
        <Stat label="Sold" value={formatNum(a.sold)} to="/artworks" />
        <Stat label="Price on enquiry" value={formatNum(a.onEnquiry)} to="/artworks" sub="artworks with no listed price; buyers must contact you" />
        <Stat label="Unhandled enquiries" value={formatNum(e.unhandledGeneral)} to="/enquiries?kind=general" />
        <Stat label="Unhandled custom requests" value={formatNum(e.unhandledCustom)} to="/enquiries?kind=custom" />
        <Stat label="Newsletter subscribers" value={formatNum(e.newsletterSubscribers)} to="/enquiries?kind=newsletter" />
      </div>
      <div className="grid lg:grid-cols-2 gap-8">
        <section aria-labelledby="ro">
          <h2 id="ro" className="font-serif text-2xl mb-3">Recent orders</h2>
          {d.recentOrders.length === 0 ? <Empty>No orders yet.</Empty> : (
            <ul className="border border-sand divide-y divide-sand">
              {d.recentOrders.map((r) => (
                <li key={r.id} className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <Link className="tap underline font-medium" to={`/orders/${r.id}`}>{r.orderNumber}</Link>
                    <span className="block text-mut truncate">{r.customer?.name} · {formatDate(r.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-2"><Badge>{statusLabel(r.status)}</Badge>{formatINR(r.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="re">
          <h2 id="re" className="font-serif text-2xl mb-3">Recent enquiries</h2>
          {d.recentEnquiries.length === 0 ? <Empty>No enquiries yet.</Empty> : (
            <ul className="border border-sand divide-y divide-sand">
              {d.recentEnquiries.map((r) => (
                <li key={r.id} className="p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link className="tap underline font-medium" to={`/enquiries?kind=${r.kind}`}>{r.name || r.email}</Link>
                    <span className="flex gap-2"><Badge>{r.kind}</Badge>{r.kind !== 'newsletter' && <Badge tone={r.handled ? 'plain' : 'accent'}>{r.handled ? 'Handled' : 'New'}</Badge>}</span>
                  </div>
                  <p className="text-mut truncate">{r.message || r.email}</p>
                  <p className="text-xs text-mut">{formatDate(r.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
