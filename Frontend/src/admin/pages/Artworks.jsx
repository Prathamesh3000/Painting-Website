import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, mediaSrc } from '../adminApi.js'
import { useConfirm, useToast } from '../ctx.js'
import { useFetch, usePageTitle } from '../hooks.js'
import { Badge, Empty, ErrorBox, Loading, PageHeader, TableWrap } from '../ui.jsx'
import { formatINR, moveItem } from '../util.js'

export default function Artworks() {
  usePageTitle('Artworks')
  const toast = useToast()
  const confirm = useConfirm()
  const { data, error, loading, reload, setData } = useFetch(() => api.get('/artworks'), [])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const items = data?.items || []
  const term = q.trim().toLowerCase()
  const shown = term ? items.filter((a) => (a.title + ' ' + a.slug + ' ' + a.medium).toLowerCase().includes(term)) : items

  async function move(i, dir) {
    const next = moveItem(items, i, dir)
    if (next === items || busy) return
    setBusy(true)
    setData({ items: next }) // optimistic: easy to undo on failure
    try {
      await api.post('/artworks/reorder', { ids: next.map((a) => a.id) })
      toast.success('Order saved.')
    } catch (e) { toast.error(e.message); reload() }
    setBusy(false)
  }

  async function del(a) {
    if (!(await confirm({ title: `Delete “${a.title}”?`, message: 'The artwork disappears from the website. Existing orders keep their own copy of the item details. This cannot be undone.', confirmLabel: 'Delete artwork', danger: true }))) return
    try { await api.del('/artworks/' + a.id); setData((d) => ({ items: d.items.filter((x) => x.id !== a.id) })); toast.success('Artwork deleted.') } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader title="Artworks" sub="The order here is the order on the website.">
        <Link to="/artworks/new" className="btn fill">Add artwork</Link>
      </PageHeader>
      <div className="mb-4 max-w-sm">
        <label htmlFor="aq" className="block text-sm font-medium mb-1">Search artworks</label>
        <input id="aq" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, slug or medium" />
        {term && <p className="text-xs text-mut mt-1">Reordering is turned off while searching.</p>}
      </div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : items.length === 0 ? <Empty>No artworks yet. Add the first one.</Empty> : shown.length === 0 ? <Empty>No artworks match “{q}”.</Empty> : (
        <TableWrap label="Artworks">
          <thead><tr><th scope="col">#</th><th scope="col"><span className="sr-only">Image</span></th><th scope="col">Title</th><th scope="col">Type</th><th scope="col">Price</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
          <tbody>
            {shown.map((a) => {
              const i = items.indexOf(a)
              return (
                <tr key={a.id}>
                  <td className="text-mut">{i + 1}</td>
                  <td>{a.image ? <img src={mediaSrc(a.image)} alt="" loading="lazy" className="size-12 object-cover bg-panel" /> : <span className="grid size-12 place-items-center bg-panel text-xs text-mut" aria-label="No image">None</span>}</td>
                  <td className="max-w-[16rem]"><Link to={`/artworks/${a.id}`} className="tap font-medium underline break-words">{a.title}</Link><span className="block text-xs text-mut break-all">{a.slug}</span></td>
                  <td>{a.type === 'print' ? 'Print' : 'Original'}</td>
                  <td>{a.price == null ? 'On enquiry' : formatINR(a.price)}</td>
                  <td><span className="flex flex-wrap gap-1"><Badge tone={a.available ? 'strong' : 'plain'}>{a.available ? 'Available' : 'Not available'}</Badge><Badge tone={a.published ? 'accent' : 'plain'}>{a.published ? 'Published' : 'Draft'}</Badge></span></td>
                  <td>
                    <span className="flex flex-wrap gap-1">
                      <button type="button" className="btn" disabled={busy || !!term || i === 0} onClick={() => move(i, -1)} aria-label={`Move ${a.title} up`}>Up</button>
                      <button type="button" className="btn" disabled={busy || !!term || i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${a.title} down`}>Down</button>
                      <Link to={`/artworks/${a.id}`} className="btn" aria-label={`Edit ${a.title}`}>Edit</Link>
                      <button type="button" className="btn danger" onClick={() => del(a)} aria-label={`Delete ${a.title}`}>Delete</button>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
      )}
    </div>
  )
}
