import { useState } from 'react'
import { api } from '../adminApi.js'
import { CONTENT_FIELDS } from '../../content/schema.js'
import { useConfirm, useToast } from '../ctx.js'
import { useDirty, useFetch, usePageTitle } from '../hooks.js'
import { Alert, Badge, Counter, ErrorBox, Field, Loading, PageHeader } from '../ui.jsx'
import { deepEqual, moveItem } from '../util.js'

const MAX_TEXT = 20000, MAX_ITEM = 2000, MAX_ITEMS = 30
const slugId = (k) => 'c-' + k.replace(/[^A-Za-z0-9]/g, '-')

function ListEditor({ field, value, onChange, error }) {
  const id = slugId(field.key)
  const items = Array.isArray(value) ? value : []
  const sub = field.itemFields || []
  const setItem = (i, k, v) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  return (
    <div role="group" aria-labelledby={id + '-l'} className="space-y-3">
      {items.length === 0 && <p className="text-sm text-mut">No items.</p>}
      {items.map((it, i) => (
        <div key={i} className="border border-sand p-3 space-y-2">
          <p className="text-xs font-medium text-mut">Item {i + 1}</p>
          {sub.map((sf) => (
            <Field key={sf.key} label={sf.label} id={`${id}-${i}-${sf.key}`} counter={<Counter value={it[sf.key] ?? ''} max={MAX_ITEM} />}>
              {sf.type === 'textarea'
                ? <textarea id={`${id}-${i}-${sf.key}`} className="input" rows={3} value={it[sf.key] ?? ''} onChange={(e) => setItem(i, sf.key, e.target.value)} />
                : <input id={`${id}-${i}-${sf.key}`} className="input" value={it[sf.key] ?? ''} onChange={(e) => setItem(i, sf.key, e.target.value)} />}
            </Field>
          ))}
          <div className="flex flex-wrap gap-1">
            <button type="button" className="btn" disabled={i === 0} onClick={() => onChange(moveItem(items, i, -1))} aria-label={`Move item ${i + 1} up`}>Up</button>
            <button type="button" className="btn" disabled={i === items.length - 1} onClick={() => onChange(moveItem(items, i, 1))} aria-label={`Move item ${i + 1} down`}>Down</button>
            <button type="button" className="btn danger" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove item ${i + 1}`}>Remove</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn" disabled={items.length >= MAX_ITEMS} onClick={() => onChange([...items, Object.fromEntries(sub.map((s) => [s.key, '']))])}>Add item</button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

function validateValue(field, v) {
  if (field.type === 'list') {
    if (!Array.isArray(v)) return 'Invalid list.'
    if (v.length > MAX_ITEMS) return `At most ${MAX_ITEMS} items.`
    if (v.some((it) => Object.values(it).some((x) => String(x).length > MAX_ITEM))) return `Each value must be ${MAX_ITEM} characters or fewer.`
    return ''
  }
  return String(v).length > MAX_TEXT ? `Keep this to ${MAX_TEXT} characters.` : ''
}

function Editor({ saved, onSaved, onReset }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [drafts, setDrafts] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const base = (f) => (f.key in saved ? saved[f.key] : f.default)
  const val = (f) => (f.key in drafts ? drafts[f.key] : base(f))
  const changedKeys = Object.keys(drafts)
  const problems = Object.fromEntries(CONTENT_FIELDS.map((f) => [f.key, validateValue(f, val(f))]).filter(([, m]) => m))
  useDirty(changedKeys.length > 0)

  const change = (f, v) => setDrafts((d) => {
    const n = { ...d }
    if (deepEqual(v, base(f))) delete n[f.key]; else n[f.key] = v
    return n
  })

  async function save() {
    if (busy || !changedKeys.length) return
    if (Object.keys(problems).length) { setErr('Fix the highlighted fields first.'); return }
    setBusy(true); setErr('')
    try {
      for (let i = 0; i < changedKeys.length; i += 50) {
        const part = Object.fromEntries(changedKeys.slice(i, i + 50).map((k) => [k, drafts[k]]))
        await api.put('/content', part)
        onSaved(part)
        setDrafts((d) => { const n = { ...d }; Object.keys(part).forEach((k) => delete n[k]); return n })
      }
      toast.success('Content saved. The website now shows your changes.')
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }

  async function reset(f) {
    if (!(await confirm({ title: `Reset “${f.label}”?`, message: 'Your edited text is removed and the website goes back to its built-in default.', confirmLabel: 'Reset to default', danger: true }))) return
    try {
      await api.del('/content/' + encodeURIComponent(f.key))
      onReset(f.key)
      setDrafts((d) => { const n = { ...d }; delete n[f.key]; return n })
      toast.success('Reset to default.')
    } catch (e) { toast.error(e.message) }
  }

  const groups = []
  CONTENT_FIELDS.forEach((f) => {
    let g = groups.find((x) => x.name === f.group)
    if (!g) { g = { name: f.group || 'Other', fields: [] }; groups.push(g) }
    g.fields.push(f)
  })

  return (
    <div>
      <nav aria-label="Content groups" className="mb-6 flex flex-wrap gap-2 text-sm">
        {groups.map((g) => <a key={g.name} href={'#g-' + g.name.replace(/\W+/g, '-')} className="tap underline">{g.name}</a>)}
      </nav>
      <Alert>{err}</Alert>
      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.name} id={'g-' + g.name.replace(/\W+/g, '-')} aria-labelledby={'gh-' + g.name.replace(/\W+/g, '-')}>
            <h2 id={'gh-' + g.name.replace(/\W+/g, '-')} className="font-serif text-2xl mb-3 border-b border-sand pb-1">{g.name}</h2>
            <div className="space-y-6 max-w-3xl">
              {g.fields.map((f) => {
                const id = slugId(f.key)
                const edited = f.key in saved
                const v = val(f)
                return (
                  <div key={f.key} className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span id={id + '-l'} className="text-sm font-medium">{f.type === 'list' ? f.label : <label htmlFor={id}>{f.label}</label>}</span>
                      {edited && <Badge tone="accent">Edited</Badge>}
                      {f.key in drafts && <Badge tone="strong">Unsaved</Badge>}
                      {edited && <button type="button" className="btn ml-auto" onClick={() => reset(f)}>Reset to default</button>}
                    </div>
                    {f.help && <p id={id + '-help'} className="text-xs text-mut">{f.help}</p>}
                    {f.type === 'list' ? <ListEditor field={f} value={v} onChange={(nv) => change(f, nv)} error={problems[f.key]} />
                      : (
                        <>
                          {f.type === 'textarea'
                            ? <textarea id={id} className="input" rows={5} aria-describedby={f.help ? id + '-help' : undefined} aria-invalid={problems[f.key] ? true : undefined} value={String(v ?? '')} onChange={(e) => change(f, e.target.value)} />
                            : <input id={id} className="input" aria-describedby={f.help ? id + '-help' : undefined} aria-invalid={problems[f.key] ? true : undefined} value={String(v ?? '')} onChange={(e) => change(f, e.target.value)} />}
                          <div className="flex justify-between gap-2">
                            <span className="text-xs text-danger">{problems[f.key]}</span>
                            <Counter value={String(v ?? '')} max={MAX_TEXT} />
                          </div>
                        </>
                      )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="sticky bottom-0 mt-8 flex flex-wrap items-center gap-3 border-t border-sand bg-ivory py-3">
        <button type="button" className="btn fill" disabled={busy || !changedKeys.length} onClick={save}>{busy ? 'Saving…' : `Save ${changedKeys.length || ''} change${changedKeys.length === 1 ? '' : 's'}`}</button>
        <button type="button" className="btn" disabled={busy || !changedKeys.length} onClick={() => setDrafts({})}>Discard changes</button>
        <span className="text-xs text-mut" aria-live="polite">{changedKeys.length ? `${changedKeys.length} unsaved` : 'All changes saved'}</span>
      </div>
    </div>
  )
}

export default function SiteContent() {
  usePageTitle('Site content')
  const { data, error, loading, reload, setData } = useFetch(() => api.get('/content'), [])
  return (
    <div>
      <PageHeader title="Site content" sub="Edit the words on the public website. Text only; no formatting or HTML." />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Editor saved={data.content || {}}
          onSaved={(part) => setData((d) => ({ ...d, content: { ...(d.content || {}), ...part } }))}
          onReset={(key) => setData((d) => { const c = { ...(d.content || {}) }; delete c[key]; return { ...d, content: c } })} />
      )}
    </div>
  )
}
