import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, qs } from '../adminApi.js'
import { useFetch, usePageTitle } from '../hooks.js'
import { Badge, Empty, ErrorBox, Loading, PageHeader, Pagination, TableWrap } from '../ui.jsx'
import { formatDate, formatINR, STATUSES, statusLabel } from '../util.js'

const PAGE_SIZE = 20

export default function Orders() {
  usePageTitle('Orders')
  const [sp, setSp] = useSearchParams()
  const status = sp.get('status') || ''
  const q = sp.get('q') || ''
  const page = Math.max(1, Number(sp.get('page')) || 1)
  const [qDraft, setQDraft] = useState(q)
  const { data, error, loading, reload } = useFetch(() => api.get('/orders' + qs({ status, q, page, pageSize: PAGE_SIZE })), [status, q, page])

  const update = (patch) => {
    const n = new URLSearchParams(sp)
    Object.entries(patch).forEach(([k, v]) => { if (v) n.set(k, v); else n.delete(k) })
    setSp(n)
  }

  return (
    <div>
      <PageHeader title="Orders" />
      <form role="search" className="mb-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); update({ q: qDraft.trim(), page: '' }) }}>
        <div>
          <label htmlFor="ostatus" className="block text-sm font-medium mb-1">Status</label>
          <select id="ostatus" className="input" value={status} onChange={(e) => update({ status: e.target.value, page: '' })}>
            <option value="">All statuses</option>
            {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className="grow max-w-sm">
          <label htmlFor="oq" className="block text-sm font-medium mb-1">Search</label>
          <input id="oq" type="search" className="input" placeholder="Order number, name, email or phone" value={qDraft} onChange={(e) => setQDraft(e.target.value)} />
        </div>
        <button type="submit" className="btn fill">Search</button>
        {(q || status) && <button type="button" className="btn" onClick={() => { setQDraft(''); setSp(new URLSearchParams()) }}>Clear filters</button>}
      </form>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : data.items.length === 0 ? <Empty>No orders match.</Empty> : (
        <>
          <TableWrap label="Orders">
            <thead><tr><th scope="col">Order</th><th scope="col">Date</th><th scope="col">Customer</th><th scope="col">Items</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id}>
                  <td><Link className="tap font-medium underline" to={`/orders/${o.id}`}>{o.orderNumber}</Link></td>
                  <td className="whitespace-nowrap">{formatDate(o.createdAt)}</td>
                  <td className="max-w-[14rem]"><span className="block truncate">{o.customer?.name}</span><span className="block text-xs text-mut truncate">{o.customer?.email}</span></td>
                  <td>{o.items?.reduce((n, i) => n + (i.qty || 1), 0)}</td>
                  <td className="whitespace-nowrap">{formatINR(o.total)}</td>
                  <td><Badge tone={o.status === 'cancelled' ? 'danger' : o.status === 'pending-payment' ? 'plain' : 'accent'}>{statusLabel(o.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pagination page={data.page || page} pageSize={data.pageSize || PAGE_SIZE} total={data.total} onPage={(p) => update({ page: p > 1 ? String(p) : '' })} />
        </>
      )}
    </div>
  )
}
