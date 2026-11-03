import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../adminApi.js'
import { useConfirm, useToast } from '../ctx.js'
import { useDirty, useFetch, usePageTitle } from '../hooks.js'
import { Alert, Badge, Counter, ErrorBox, Field, Loading, PageHeader, TableWrap } from '../ui.jsx'
import { formatDate, formatINR, fp, STATUSES, statusLabel } from '../util.js'

function Controls({ order, onUpdated }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [status, setStatus] = useState(order.status)
  const [note, setNote] = useState(order.note || '')
  const [track, setTrack] = useState(order.trackingNote || '')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const notesDirty = note !== (order.note || '') || track !== (order.trackingNote || '')
  useDirty(notesDirty)

  async function changeStatus() {
    if (busy || status === order.status) return
    if (status === 'cancelled') {
      const ok = await confirm({
        title: 'Cancel this order?',
        message: 'Every original painting in this order will be put back on sale (marked available again). The customer is not emailed automatically.\n\nThis is recorded in the status history.',
        confirmLabel: 'Cancel order', danger: true,
      })
      if (!ok) return
    } else if (order.status === 'cancelled') {
      const ok = await confirm({ title: 'Reopen this order?', message: 'The original paintings will be reserved for this order again. If any has been sold to someone else in the meantime the change will be refused.', confirmLabel: 'Reopen order' })
      if (!ok) return
    }
    setBusy('status'); setErr('')
    try { onUpdated(await api.patch('/orders/' + order.id, { status })); toast.success(`Status changed to ${statusLabel(status)}.`) } catch (e) { setErr(e.message); toast.error(e.message) }
    setBusy('')
  }
  async function saveNotes(ev) {
    ev.preventDefault()
    if (busy) return
    if (note.length > 2000 || track.length > 500) { setErr('A note is too long.'); return }
    setBusy('notes'); setErr('')
    try { onUpdated(await api.patch('/orders/' + order.id, { note, trackingNote: track })); toast.success('Notes saved.') } catch (e) { setErr(e.message) }
    setBusy('')
  }

  return (
    <div className="no-print space-y-8">
      <Alert>{err}</Alert>
      <section aria-labelledby="st-h" className="border border-sand p-4 space-y-3">
        <h2 id="st-h" className="font-serif text-2xl">Status</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Change status to" id="status">
            <select {...fp('status')} className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <button type="button" className="btn fill" disabled={!!busy || status === order.status} onClick={changeStatus}>{busy === 'status' ? 'Updating…' : 'Update status'}</button>
        </div>
        <p className="text-xs text-mut">Cancelling re-lists any original paintings in the order for sale.</p>
      </section>
      <form onSubmit={saveNotes} className="border border-sand p-4 space-y-4" noValidate>
        <h2 className="font-serif text-2xl">Notes</h2>
        <Field label="Internal note (only you can see this)" id="note" counter={<Counter value={note} max={2000} />}>
          <textarea {...fp('note')} className="input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field label="Tracking note (shown to the customer)" id="track" help="For example a courier name and tracking number." counter={<Counter value={track} max={500} />}>
          <textarea {...fp('track', null, true)} className="input" rows={3} value={track} onChange={(e) => setTrack(e.target.value)} />
        </Field>
        <button type="submit" className="btn fill" disabled={!!busy || !notesDirty}>{busy === 'notes' ? 'Saving…' : 'Save notes'}</button>
      </form>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const { data: order, error, loading, reload, setData } = useFetch(() => api.get('/orders/' + id), [id])
  usePageTitle(order ? `Order ${order.orderNumber}` : 'Order')
  if (loading) return <><PageHeader title="Order" /><Loading /></>
  if (error) return <><PageHeader title="Order" /><ErrorBox message={error} onRetry={reload} /></>
  const c = order.customer || {}
  return (
    <div>
      <PageHeader title={`Order ${order.orderNumber}`} sub={`Placed ${formatDate(order.createdAt)}`}>
        <Link to="/orders" className="btn">All orders</Link>
        <button type="button" className="btn" onClick={() => window.print()}>Print packing slip</button>
      </PageHeader>

      <div className="no-print grid xl:grid-cols-[1fr_24rem] gap-8 items-start">
        <div className="space-y-8 min-w-0">
          <p><Badge tone={order.status === 'cancelled' ? 'danger' : 'accent'}>{statusLabel(order.status)}</Badge></p>
          <section aria-labelledby="cu-h" className="grid sm:grid-cols-2 gap-6">
            <div>
              <h2 id="cu-h" className="font-serif text-2xl mb-2">Customer</h2>
              <p className="font-medium">{c.name}</p>
              <p><a className="tap underline break-all" href={`mailto:${c.email}`}>{c.email}</a></p>
              <p><a className="tap underline" href={`tel:${c.phone}`}>{c.phone}</a></p>
            </div>
            <div>
              <h2 className="font-serif text-2xl mb-2">Ship to</h2>
              <address className="not-italic whitespace-pre-line break-words">{c.address}{'\n'}{c.city}, {c.state} {c.pin}</address>
            </div>
          </section>
          <section aria-labelledby="it-h">
            <h2 id="it-h" className="font-serif text-2xl mb-2">Items</h2>
            <TableWrap label="Order items">
              <thead><tr><th scope="col">Item</th><th scope="col">Type</th><th scope="col">Qty</th><th scope="col">Price</th></tr></thead>
              <tbody>
                {order.items.map((i, n) => (
                  <tr key={n}><td>{i.title}{i.variant ? <span className="block text-xs text-mut">{i.variant}</span> : null}</td><td>{i.type}</td><td>{i.qty}</td><td>{formatINR(i.price * i.qty)}</td></tr>
                ))}
              </tbody>
              <tfoot className="order-foot">
                <tr className="border-t border-sand"><th scope="row" colSpan={3} className="text-right">Subtotal</th><td>{formatINR(order.subtotal)}</td></tr>
                <tr className="border-t border-sand"><th scope="row" colSpan={3} className="text-right">Shipping</th><td>{formatINR(order.shipping)}</td></tr>
                <tr className="border-t border-sand"><th scope="row" colSpan={3} className="text-right">Total</th><td className="font-semibold">{formatINR(order.total)}</td></tr>
              </tfoot>
            </TableWrap>
          </section>
          <section aria-labelledby="hi-h">
            <h2 id="hi-h" className="font-serif text-2xl mb-2">Status history</h2>
            {order.statusHistory?.length ? (
              <ol className="border-l-2 border-sand ml-2 space-y-3">
                {order.statusHistory.map((h, n) => (
                  <li key={n} className="pl-4 relative">
                    <span aria-hidden="true" className="absolute -left-[7px] top-1.5 size-3 rounded-full bg-terracotta" />
                    <p className="font-medium">{statusLabel(h.status)}</p>
                    <p className="text-xs text-mut">{formatDate(h.at)}{h.by ? ` · ${h.by}` : ''}</p>
                  </li>
                ))}
              </ol>
            ) : <p className="text-mut text-sm">No history recorded.</p>}
          </section>
        </div>
        <Controls key={order.id} order={order} onUpdated={setData} />
      </div>

      <div className="print-only" aria-hidden="true">
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>Packing slip: {order.orderNumber}</h1>
        <p>Kalpana Jagtap · {formatDate(order.createdAt, false)}</p>
        <h2 style={{ fontSize: '1.1rem', margin: '1rem 0 0.2rem' }}>Ship to</h2>
        <p style={{ whiteSpace: 'pre-line' }}>{c.name}{'\n'}{c.address}{'\n'}{c.city}, {c.state} {c.pin}{'\n'}Phone: {c.phone}</p>
        <table style={{ width: '100%', marginTop: '1rem' }}>
          <thead><tr><th style={{ textAlign: 'left' }}>Item</th><th style={{ textAlign: 'left' }}>Type</th><th>Qty</th></tr></thead>
          <tbody>{order.items.map((i, n) => <tr key={n}><td>{i.title}{i.variant ? ` (${i.variant})` : ''}</td><td>{i.type}</td><td style={{ textAlign: 'center' }}>{i.qty}</td></tr>)}</tbody>
        </table>
        {order.trackingNote && <p style={{ marginTop: '1rem' }}>Note: {order.trackingNote}</p>}
        <p style={{ marginTop: '1.5rem' }}>Thank you for supporting children’s care and education.</p>
      </div>
    </div>
  )
}
