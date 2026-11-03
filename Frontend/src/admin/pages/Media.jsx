import { useState } from 'react'
import { api, apiOrigin, mediaSrc } from '../adminApi.js'
import { useConfirm, useToast } from '../ctx.js'
import { useFetch, usePageTitle } from '../hooks.js'
import { Empty, ErrorBox, Loading, PageHeader } from '../ui.jsx'
import { formatBytes, formatDate } from '../util.js'
import Uploader from './Uploader.jsx'

function Card({ m, onDeleted, onChanged }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [alt, setAlt] = useState(m.alt || '')
  const [busy, setBusy] = useState(false)
  const altId = 'alt-' + m.id

  async function saveAlt() {
    setBusy(true)
    try { const r = await api.patch('/media/' + m.id, { alt: alt.trim() }); onChanged(r || { ...m, alt: alt.trim() }); toast.success('Alt text saved.') } catch (e) { toast.error(e.message) }
    setBusy(false)
  }
  async function copy() {
    const full = apiOrigin + m.url
    try { await navigator.clipboard.writeText(full); toast.success('URL copied.') } catch { toast.error('Could not copy. The URL is ' + full) }
  }
  async function del() {
    if (!(await confirm({ title: 'Delete this image?', message: `${m.originalName} will be permanently removed from the server.`, confirmLabel: 'Delete', danger: true }))) return
    setBusy(true)
    try { await api.del('/media/' + m.id); onDeleted(m.id); toast.success('Image deleted.') } catch (e) { toast.error(e.message); setBusy(false) }
  }
  return (
    <li className="border border-sand bg-panel p-2 flex flex-col gap-2">
      <img src={mediaSrc(m.url)} alt={m.alt || ''} loading="lazy" className="w-full aspect-square object-cover bg-ivory" />
      <p className="text-xs break-all"><span className="font-medium">{m.originalName}</span><br /><span className="text-mut">{formatBytes(m.size)} · {formatDate(m.createdAt, false)}</span></p>
      <div>
        <label htmlFor={altId} className="block text-xs font-medium mb-1">Alt text</label>
        <input id={altId} className="input" maxLength={200} value={alt} onChange={(e) => setAlt(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={busy || alt.trim() === (m.alt || '')} onClick={saveAlt}>Save alt</button>
        <button type="button" className="btn" onClick={copy}>Copy URL</button>
        <button type="button" className="btn danger" disabled={busy} onClick={del}>Delete</button>
      </div>
    </li>
  )
}

export default function Media() {
  usePageTitle('Media library')
  const { data, error, loading, reload, setData } = useFetch(() => api.get('/media'), [])
  const items = data?.items || []
  return (
    <div>
      <PageHeader title="Media library" sub="Images used for artworks. Files in use cannot be deleted." />
      <div className="mb-6"><Uploader onUploaded={(m) => setData((d) => ({ items: [m, ...(d?.items || [])] }))} /></div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : items.length === 0 ? <Empty>No images uploaded yet.</Empty> : (
        <ul className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((m) => (
            <Card key={m.id} m={m}
              onDeleted={(id) => setData((d) => ({ items: d.items.filter((x) => x.id !== id) }))}
              onChanged={(n) => setData((d) => ({ items: d.items.map((x) => (x.id === n.id ? n : x)) }))} />
          ))}
        </ul>
      )}
    </div>
  )
}
