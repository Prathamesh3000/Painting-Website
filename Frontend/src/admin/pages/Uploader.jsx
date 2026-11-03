import { useId, useRef, useState } from 'react'
import { api } from '../adminApi.js'
import { useToast } from '../ctx.js'
import { checkFile, readDimensions } from '../util.js'

// Drag-and-drop + file button. Checks type/size on the client (the server re-checks by magic bytes).
export default function Uploader({ onUploaded }) {
  const toast = useToast()
  const inputRef = useRef(null)
  const id = useId()
  const [alt, setAlt] = useState('')
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState([])

  async function handle(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length || busy) return
    setBusy(true)
    setLog([])
    for (const file of files) {
      const { error, warnings } = checkFile(file)
      if (error) { toast.error(error); setLog((l) => [...l, `Skipped: ${error}`]); continue }
      const dims = await readDimensions(file)
      if (dims && Math.max(dims.w, dims.h) > 2000) warnings.push(`${file.name} is ${dims.w}×${dims.h}px. About 2000px on the long edge is plenty for the web.`)
      warnings.forEach((w) => toast.info('Warning: ' + w))
      try {
        const form = new FormData()
        form.append('file', file)
        if (alt.trim()) form.append('alt', alt.trim().slice(0, 200))
        const media = await api.upload('/media', form)
        setLog((l) => [...l, `Uploaded ${file.name}`])
        onUploaded?.(media)
      } catch (e) {
        toast.error(`${file.name}: ${e.message}`)
        setLog((l) => [...l, `Failed: ${file.name}`])
      }
    }
    if (inputRef.current) inputRef.current.value = ''
    setBusy(false)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files) }}
      className={'border-2 border-dashed p-4 ' + (over ? 'border-terracotta bg-panel' : 'border-sand')}>
      <p className="text-sm mb-3">Drag images here, or choose files. JPEG, PNG, WebP or AVIF, up to 8 MB each. Aim for 2000px or less on the long edge and under 1 MB.</p>
      <div className="grid sm:grid-cols-2 gap-3 items-end">
        <div>
          <label htmlFor={id + '-alt'} className="block text-sm font-medium mb-1">Alt text for these uploads (optional)</label>
          <input id={id + '-alt'} className="input" maxLength={200} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image for screen readers" />
        </div>
        <div>
          <label htmlFor={id + '-file'} className="block text-sm font-medium mb-1">Choose images</label>
          <input ref={inputRef} id={id + '-file'} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy}
            onChange={(e) => handle(e.target.files)} className="block w-full text-sm file:mr-3 file:border file:border-sand file:bg-panel file:px-3 file:py-1.5 file:text-charcoal" />
        </div>
      </div>
      <div aria-live="polite" className="mt-2 text-xs text-mut">
        {busy && <p>Uploading…</p>}
        {log.map((l, i) => <p key={i}>{l}</p>)}
      </div>
    </div>
  )
}
