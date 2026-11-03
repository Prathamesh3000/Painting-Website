import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../adminApi.js'
import { useToast } from '../ctx.js'
import { clearDirty, useDirty, useFetch, usePageTitle } from '../hooks.js'
import { Alert, Check, Counter, ErrorBox, Field, GuardLink, Loading, PageHeader } from '../ui.jsx'
import { deepEqual, fp, SLUG_RE, slugify } from '../util.js'

const BLANK = { slug: '', lang: 'en', title: '', theme: '', body: '', published: true }

function validate(f, creating) {
  const e = {}
  if (!f.title.trim()) e.title = 'Enter a title.'; else if (f.title.length > 120) e.title = 'Keep the title to 120 characters.'
  if (creating) {
    if (!f.slug) e.slug = 'Enter a slug.'
    else if (f.slug.length > 60) e.slug = 'Keep the slug to 60 characters.'
    else if (!SLUG_RE.test(f.slug)) e.slug = 'Use lowercase letters, numbers and single hyphens.'
  }
  if (f.theme.length > 40) e.theme = 'Keep the theme to 40 characters.'
  if (!f.body.trim()) e.body = 'Enter the poem text.'; else if (f.body.length > 5000) e.body = 'Keep the poem to 5000 characters.'
  return e
}

function PoemForm({ initial, id }) {
  const creating = !id
  const navigate = useNavigate()
  const toast = useToast()
  const formRef = useRef(null)
  const [f, setF] = useState(initial)
  const [slugTouched, setSlugTouched] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)
  const dirty = !deepEqual(f, initial)
  useDirty(dirty)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  async function submit(ev) {
    ev.preventDefault()
    if (busy) return
    const er = validate(f, creating)
    setErrors(er); setServerError('')
    if (Object.keys(er).length) { requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus()); return }
    const body = { slug: f.slug, lang: f.lang, title: f.title.trim(), theme: f.theme.trim(), body: f.body.replace(/\r/g, ''), published: f.published }
    setBusy(true)
    try {
      if (creating) await api.post('/poems', body); else await api.put('/poems/' + id, body)
      clearDirty()
      toast.success(creating ? 'Poem created.' : 'Poem saved.')
      navigate('/poems')
    } catch (err) { setServerError(err.message); setBusy(false); window.scrollTo({ top: 0 }) }
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid xl:grid-cols-2 gap-8 items-start">
      <div className="space-y-4 min-w-0">
        <Alert>{serverError}</Alert>
        <Field label="Title" id="title" error={errors.title} counter={<Counter value={f.title} max={120} />}>
          <input {...fp('title', errors.title)} lang={f.lang} className="input" value={f.title}
            onChange={(e) => { set('title', e.target.value); if (creating && !slugTouched) set('slug', slugify(e.target.value)) }} />
        </Field>
        <Field label="Slug (web address)" id="slug" error={errors.slug} help={creating ? 'Lowercase letters, numbers and hyphens. Cannot be changed after saving.' : 'Locked: the slug cannot be changed after creation.'}>
          <input {...fp('slug', errors.slug, true)} className="input" readOnly={!creating} maxLength={60} value={f.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase()) }} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Language" id="lang">
            <select {...fp('lang')} className="input" value={f.lang} onChange={(e) => set('lang', e.target.value)}>
              <option value="en">English</option><option value="mr">Marathi</option>
            </select>
          </Field>
          <Field label="Theme" id="theme" error={errors.theme} counter={<Counter value={f.theme} max={40} />}>
            <input {...fp('theme', errors.theme)} className="input" value={f.theme} onChange={(e) => set('theme', e.target.value)} />
          </Field>
        </div>
        <Field label="Poem text" id="body" error={errors.body} help="Each line break is kept exactly as you type it." counter={<Counter value={f.body} max={5000} />}>
          <textarea {...fp('body', errors.body, true)} lang={f.lang} className="input" rows={14} value={f.body} onChange={(e) => set('body', e.target.value)} />
        </Field>
        <Check id="published" label="Published on the website" checked={f.published} onChange={(v) => set('published', v)} />
        <div className="flex flex-wrap gap-2 border-t border-sand pt-4">
          <button type="submit" className="btn fill" disabled={busy}>{busy ? 'Saving…' : creating ? 'Create poem' : 'Save changes'}</button>
          <GuardLink to="/poems" className="btn">Cancel</GuardLink>
          {dirty && <span className="self-center text-xs text-mut">Unsaved changes</span>}
        </div>
      </div>
      <section aria-labelledby="prev-h" className="min-w-0 xl:sticky xl:top-4">
        <h2 id="prev-h" className="font-serif text-2xl mb-2">Preview</h2>
        <div className="border border-sand bg-ivory p-6 overflow-hidden">
          <div style={{ maxWidth: 'var(--measure-poem)' }} className="mx-auto" lang={f.lang}>
            <h3 className="font-serif text-3xl mb-1 break-words">{f.title || 'Untitled'}</h3>
            {f.theme && <p className="text-xs uppercase tracking-widest text-mut mb-4">{f.theme}</p>}
            <p className="poem-text whitespace-pre-wrap break-words">{f.body || 'The poem will appear here as you type.'}</p>
          </div>
        </div>
      </section>
    </form>
  )
}

export default function PoemEdit() {
  const { id } = useParams()
  usePageTitle(id ? 'Edit poem' : 'New poem')
  const { data, error, loading, reload } = useFetch(() => (id ? api.get('/poems/' + id) : Promise.resolve(null)), [id])
  const initial = data ? { slug: data.slug, lang: data.lang, title: data.title, theme: data.theme || '', body: data.body, published: !!data.published } : BLANK
  return (
    <div>
      <PageHeader title={id ? 'Edit poem' : 'New poem'} />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : <PoemForm key={id || 'new'} id={id} initial={initial} />}
    </div>
  )
}
