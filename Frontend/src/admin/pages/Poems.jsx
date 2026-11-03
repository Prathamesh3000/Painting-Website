import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../adminApi.js'
import { useConfirm, useToast } from '../ctx.js'
import { useFetch, usePageTitle } from '../hooks.js'
import { Badge, Empty, ErrorBox, Loading, PageHeader, TableWrap } from '../ui.jsx'
import { moveItem } from '../util.js'

export default function Poems() {
  usePageTitle('Poems')
  const toast = useToast()
  const confirm = useConfirm()
  const { data, error, loading, reload, setData } = useFetch(() => api.get('/poems'), [])
  const [busy, setBusy] = useState(false)
  const items = data?.items || []

  async function move(i, dir) {
    const next = moveItem(items, i, dir)
    if (next === items || busy) return
    setBusy(true)
    setData({ items: next })
    try { await api.post('/poems/reorder', { ids: next.map((p) => p.id) }); toast.success('Order saved.') } catch (e) { toast.error(e.message); reload() }
    setBusy(false)
  }

  async function del(p) {
    if (!(await confirm({ title: `Delete “${p.title}”?`, message: 'The poem is removed from the website. This cannot be undone.', confirmLabel: 'Delete poem', danger: true }))) return
    try { await api.del('/poems/' + p.id); setData((d) => ({ items: d.items.filter((x) => x.id !== p.id) })); toast.success('Poem deleted.') } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader title="Poems" sub="The order here is the order on the website.">
        <Link to="/poems/new" className="btn fill">Add poem</Link>
      </PageHeader>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : items.length === 0 ? <Empty>No poems yet. Add the first one.</Empty> : (
        <TableWrap label="Poems">
          <thead><tr><th scope="col">#</th><th scope="col">Title</th><th scope="col">Language</th><th scope="col">Theme</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
          <tbody>
            {items.map((p, i) => (
              <tr key={p.id}>
                <td className="text-mut">{i + 1}</td>
                <td className="max-w-[18rem]"><Link to={`/poems/${p.id}`} lang={p.lang} className="tap font-medium underline break-words">{p.title}</Link><span className="block text-xs text-mut break-all">{p.slug}</span></td>
                <td>{p.lang === 'mr' ? 'Marathi' : 'English'}</td>
                <td>{p.theme || '—'}</td>
                <td><Badge tone={p.published ? 'accent' : 'plain'}>{p.published ? 'Published' : 'Draft'}</Badge></td>
                <td>
                  <span className="flex flex-wrap gap-1">
                    <button type="button" className="btn" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Move ${p.title} up`}>Up</button>
                    <button type="button" className="btn" disabled={busy || i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${p.title} down`}>Down</button>
                    <Link to={`/poems/${p.id}`} className="btn" aria-label={`Edit ${p.title}`}>Edit</Link>
                    <button type="button" className="btn danger" onClick={() => del(p)} aria-label={`Delete ${p.title}`}>Delete</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  )
}
