import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, qs } from '../adminApi.js'
import { useConfirm, useToast } from '../ctx.js'
import { useFetch, usePageTitle } from '../hooks.js'
import { Badge, Check, Empty, ErrorBox, Loading, PageHeader, Pagination, TableWrap } from '../ui.jsx'
import { formatDate } from '../util.js'

const TABS = [['general', 'General'], ['custom', 'Custom art'], ['newsletter', 'Newsletter']]
const PAGE_SIZE = 20

export default function Enquiries() {
  usePageTitle('Enquiries')
  const toast = useToast()
  const confirm = useConfirm()
  const [sp, setSp] = useSearchParams()
  const kind = TABS.some(([k]) => k === sp.get('kind')) ? sp.get('kind') : 'general'
  const handled = sp.get('handled') || ''
  const q = sp.get('q') || ''
  const page = Math.max(1, Number(sp.get('page')) || 1)
  const [qDraft, setQDraft] = useState(q)
  const [busyId, setBusyId] = useState('')
  const [exporting, setExporting] = useState(false)
  const tabRefs = useRef([])
  const { data, error, loading, reload, setData } = useFetch(() => api.get('/enquiries' + qs({ kind, handled: kind === 'newsletter' ? '' : handled, q, page, pageSize: PAGE_SIZE })), [kind, handled, q, page])

  const update = (patch) => {
    const n = new URLSearchParams(sp)
    Object.entries(patch).forEach(([k, v]) => { if (v) n.set(k, v); else n.delete(k) })
    setSp(n)
  }
  const switchTab = (k) => { setQDraft(''); setSp(new URLSearchParams({ kind: k })) }

  function onTabKey(e, i) {
    let j = null
    if (e.key === 'ArrowRight') j = (i + 1) % TABS.length
    if (e.key === 'ArrowLeft') j = (i + TABS.length - 1) % TABS.length
    if (j !== null) { e.preventDefault(); tabRefs.current[j]?.focus(); switchTab(TABS[j][0]) }
  }

  async function toggle(en, v) {
    setBusyId(en.id)
    try {
      const r = await api.patch('/enquiries/' + en.id, { handled: v })
      setData((d) => ({ ...d, items: d.items.map((x) => (x.id === en.id ? { ...x, ...(r || {}), handled: v } : x)) }))
    } catch (e) { toast.error(e.message) }
    setBusyId('')
  }
  async function del(en) {
    if (!(await confirm({ title: 'Delete this entry?', message: `${en.name || en.email} (${en.email}) will be permanently removed.`, confirmLabel: 'Delete', danger: true }))) return
    try { await api.del('/enquiries/' + en.id); toast.success('Deleted.'); reload() } catch (e) { toast.error(e.message) }
  }
  async function exportCsv() {
    setExporting(true)
    try {
      const blob = await api.blob('/enquiries/export?kind=newsletter')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'newsletter-subscribers.csv'
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (e) { toast.error(e.message) }
    setExporting(false)
  }

  return (
    <div>
      <PageHeader title="Enquiries">
        {kind === 'newsletter' && <button type="button" className="btn" onClick={exportCsv} disabled={exporting}>{exporting ? 'Preparing…' : 'Export CSV'}</button>}
      </PageHeader>

      <div role="tablist" aria-label="Enquiry type" className="mb-4 flex flex-wrap gap-1 border-b border-sand">
        {TABS.map(([k, l], i) => (
          <button key={k} ref={(el) => { tabRefs.current[i] = el }} type="button" role="tab" id={`tab-${k}`} aria-selected={kind === k} aria-controls="enq-panel"
            tabIndex={kind === k ? 0 : -1} onKeyDown={(e) => onTabKey(e, i)} onClick={() => switchTab(k)}
            className={'px-4 py-2 text-sm border-b-2 -mb-px ' + (kind === k ? 'border-terracotta font-semibold text-terracotta' : 'border-transparent text-mut hover:text-charcoal')}>{l}</button>
        ))}
      </div>

      <div id="enq-panel" role="tabpanel" aria-labelledby={`tab-${kind}`}>
        <form role="search" className="mb-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); update({ q: qDraft.trim(), page: '' }) }}>
          {kind !== 'newsletter' && (
            <div>
              <label htmlFor="eh" className="block text-sm font-medium mb-1">Show</label>
              <select id="eh" className="input" value={handled} onChange={(e) => update({ handled: e.target.value, page: '' })}>
                <option value="">All</option><option value="false">Not handled</option><option value="true">Handled</option>
              </select>
            </div>
          )}
          <div className="grow max-w-sm">
            <label htmlFor="eq" className="block text-sm font-medium mb-1">Search</label>
            <input id="eq" type="search" className="input" value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder="Name, email or message" />
          </div>
          <button type="submit" className="btn fill">Search</button>
        </form>

        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : data.items.length === 0 ? <Empty>Nothing here.</Empty> : (
          <>
            {kind === 'newsletter' ? (
              <TableWrap label="Newsletter subscribers">
                <thead><tr><th scope="col">Email</th><th scope="col">Signed up</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {data.items.map((en) => (
                    <tr key={en.id}>
                      <td className="break-all">{en.email}</td><td className="whitespace-nowrap">{formatDate(en.createdAt)}</td>
                      <td><button type="button" className="btn danger" onClick={() => del(en)} aria-label={`Delete ${en.email}`}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ) : (
              <ul className="space-y-3">
                {data.items.map((en) => (
                  <li key={en.id} className="border border-sand p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium break-words">{en.name}</p>
                        <p className="text-sm"><a className="tap underline break-all" href={`mailto:${en.email}`}>{en.email}</a></p>
                        <p className="text-xs text-mut">{formatDate(en.createdAt)}</p>
                      </div>
                      <Badge tone={en.handled ? 'plain' : 'accent'}>{en.handled ? 'Handled' : 'New'}</Badge>
                    </div>
                    {kind === 'custom' && (en.style || en.size || en.budget) && (
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
                        {en.style && <><dt className="text-mut">Style</dt><dd className="break-words">{en.style}</dd></>}
                        {en.size && <><dt className="text-mut">Size</dt><dd className="break-words">{en.size}</dd></>}
                        {en.budget && <><dt className="text-mut">Budget</dt><dd className="break-words">{en.budget}</dd></>}
                      </dl>
                    )}
                    <p className="mt-2 text-sm whitespace-pre-wrap break-words">{en.message}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <Check id={`h-${en.id}`} label={`Handled${en.handledAt ? ` (${formatDate(en.handledAt, false)})` : ''}`} checked={!!en.handled} disabled={busyId === en.id} onChange={(v) => toggle(en, v)} />
                      <button type="button" className="btn danger" onClick={() => del(en)}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Pagination page={data.page || page} pageSize={data.pageSize || PAGE_SIZE} total={data.total} onPage={(p) => update({ page: p > 1 ? String(p) : '' })} />
          </>
        )}
      </div>
    </div>
  )
}
