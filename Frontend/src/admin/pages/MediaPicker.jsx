import { api, mediaSrc } from '../adminApi.js'
import { useFetch } from '../hooks.js'
import { Dialog, Empty, ErrorBox, Loading } from '../ui.jsx'
import Uploader from './Uploader.jsx'

// Modal image chooser: pick from the media library or upload a new file and pick it straight away.
export default function MediaPicker({ open, onClose, onPick, selected }) {
  const { data, error, loading, reload, setData } = useFetch(() => (open ? api.get('/media') : Promise.resolve({ items: [] })), [open])
  const items = data?.items || []
  return (
    <Dialog open={open} onClose={onClose} title="Choose an image" wide>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Uploader onUploaded={(m) => setData((d) => ({ items: [m, ...(d?.items || [])] }))} />
        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : items.length === 0 ? <Empty>No images yet. Upload one above.</Empty> : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => onPick(m)} aria-pressed={selected === m.url}
                  className={'block w-full text-left border p-1 hover:border-terracotta ' + (selected === m.url ? 'border-terracotta border-2' : 'border-sand')}>
                  <img src={mediaSrc(m.url)} alt="" loading="lazy" className="w-full aspect-square object-cover bg-panel" />
                  <span className="block text-xs mt-1 truncate">{m.originalName}</span>
                  <span className="block text-xs text-mut truncate">{m.alt || 'No alt text'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 flex justify-end"><button type="button" className="btn" onClick={onClose}>Close</button></div>
    </Dialog>
  )
}
