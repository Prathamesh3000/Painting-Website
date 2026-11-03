import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, mediaSrc } from '../adminApi.js'
import { useToast } from '../ctx.js'
import { clearDirty, useDirty, useFetch, usePageTitle } from '../hooks.js'
import { Alert, Check, Counter, ErrorBox, Field, GuardLink, Loading, PageHeader } from '../ui.jsx'
import { deepEqual, fp, isInt, moveItem, SLUG_RE, slugify } from '../util.js'
import MediaPicker from './MediaPicker.jsx'

const BLANK = {
  slug: '', title: '', type: 'original', medium: '', dimensions: '', price: '', onEnquiry: false, available: true,
  dispatch: '', description: '', ar: '0.8', image: null, imageAlt: '', poemSlug: '', variants: [], published: true,
}

const fromArtwork = (a) => ({
  slug: a.slug, title: a.title, type: a.type, medium: a.medium || '', dimensions: a.dimensions || '',
  price: a.price == null ? '' : String(a.price), onEnquiry: a.price == null, available: !!a.available,
  dispatch: a.dispatch || '', description: a.description || '', ar: String(a.ar ?? 0.8), image: a.image || null,
  imageAlt: a.imageAlt || '', poemSlug: a.poemSlug || '',
  variants: (a.variants || []).map((v) => ({ label: v.label, price: String(v.price) })), published: !!a.published,
})

function validate(f, creating) {
  const e = {}
  const t = f.title.trim()
  if (!t) e.title = 'Enter a title.'; else if (t.length > 120) e.title = 'Keep the title to 120 characters.'
  if (creating) {
    if (!f.slug) e.slug = 'Enter a slug.'
    else if (f.slug.length > 60) e.slug = 'Keep the slug to 60 characters.'
    else if (!SLUG_RE.test(f.slug)) e.slug = 'Use lowercase letters, numbers and single hyphens.'
  }
  if (f.medium.length > 120) e.medium = 'Keep the medium to 120 characters.'
  if (f.dimensions.length > 60) e.dimensions = 'Keep dimensions to 60 characters.'
  if (!f.onEnquiry) {
    if (!isInt(f.price) || Number(f.price) < 0 || Number(f.price) > 10000000) e.price = 'Enter a whole number of rupees from 0 to 1,00,00,000, or tick On enquiry.'
  }
  if (f.dispatch.length > 40) e.dispatch = 'Keep this to 40 characters.'
  if (f.description.length > 2000) e.description = 'Keep the description to 2000 characters.'
  const ar = Number(f.ar)
  if (f.ar === '' || !Number.isFinite(ar) || ar < 0.3 || ar > 3) e.ar = 'Enter a ratio (width ÷ height) between 0.3 and 3.'
  if (f.imageAlt.length > 200) e.imageAlt = 'Keep alt text to 200 characters.'
  if (f.type === 'print') {
    if (f.variants.length === 0) e.variants = 'A print needs at least one variant.'
  }
  if (f.variants.length > 10) e.variants = 'At most 10 variants.'
  f.variants.forEach((v, i) => {
    if (!v.label.trim() || v.label.length > 40) e[`v${i}l`] = 'Label 1 to 40 characters.'
    if (!isInt(v.price) || Number(v.price) < 0 || Number(v.price) > 10000000) e[`v${i}p`] = 'Whole rupees, 0 or more.'
  })
  return e
}

function ArtworkForm({ initial, poems, id }) {
  const creating = !id
  const navigate = useNavigate()
  const toast = useToast()
  const formRef = useRef(null)
  const [f, setF] = useState(initial)
  const [slugTouched, setSlugTouched] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState(false)
  const [nat, setNat] = useState(null)
  const [dim, setDim] = useState({ w: '', h: '' })
  const dirty = !deepEqual(f, initial)
  useDirty(dirty)

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const setVariant = (i, k, v) => setF((p) => ({ ...p, variants: p.variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }))

  async function submit(ev) {
    ev.preventDefault()
    if (busy) return
    const er = validate(f, creating)
    setErrors(er); setServerError('')
    if (Object.keys(er).length) {
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    const body = {
      slug: f.slug, title: f.title.trim(), type: f.type, medium: f.medium.trim(), dimensions: f.dimensions.trim(),
      price: f.onEnquiry ? null : Number(f.price), available: f.available, dispatch: f.dispatch.trim(),
      description: f.description, ar: Number(f.ar), image: f.image || null, imageAlt: f.imageAlt.trim(),
      poemSlug: f.poemSlug || null, published: f.published,
      variants: f.type === 'print' ? f.variants.map((v) => ({ label: v.label.trim(), price: Number(v.price) })) : [],
    }
    setBusy(true)
    try {
      if (creating) await api.post('/artworks', body)
      else await api.put('/artworks/' + id, body)
      clearDirty()
      toast.success(creating ? 'Artwork created.' : 'Artwork saved.')
      navigate('/artworks')
    } catch (err) { setServerError(err.message); setBusy(false); window.scrollTo({ top: 0 }) }
  }

  const arNum = Number(f.ar)
  return (
    <form ref={formRef} onSubmit={submit} noValidate className="max-w-3xl space-y-8">
      <Alert>{serverError}</Alert>
      {Object.keys(errors).length > 0 && <Alert>Please fix the highlighted fields below.</Alert>}

      <fieldset className="space-y-4">
        <legend className="font-serif text-2xl mb-2">Details</legend>
        <Field label="Title" id="title" error={errors.title} counter={<Counter value={f.title} max={120} />}>
          <input {...fp('title', errors.title)} className="input" required maxLength={200} value={f.title}
            onChange={(e) => { set('title', e.target.value); if (creating && !slugTouched) set('slug', slugify(e.target.value)) }} />
        </Field>
        <Field label="Slug (web address)" id="slug" error={errors.slug} help={creating ? 'Generated from the title. It becomes part of the page address and cannot be changed after saving.' : 'Locked: the slug cannot be changed after creation.'}>
          <input {...fp('slug', errors.slug, true)} className="input" value={f.slug} readOnly={!creating} maxLength={60}
            onChange={(e) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase()) }} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Type" id="type">
            <select {...fp('type')} className="input" value={f.type} onChange={(e) => set('type', e.target.value)}>
              <option value="original">Original</option><option value="print">Print</option>
            </select>
          </Field>
          <Field label="Dispatch time" id="dispatch" error={errors.dispatch} help="For example: 5–7 days" counter={<Counter value={f.dispatch} max={40} />}>
            <input {...fp('dispatch', errors.dispatch, true)} className="input" value={f.dispatch} onChange={(e) => set('dispatch', e.target.value)} />
          </Field>
          <Field label="Medium" id="medium" error={errors.medium}>
            <input {...fp('medium', errors.medium)} className="input" value={f.medium} onChange={(e) => set('medium', e.target.value)} />
          </Field>
          <Field label="Dimensions" id="dimensions" error={errors.dimensions} help="For example: 60 × 90 cm">
            <input {...fp('dimensions', errors.dimensions, true)} className="input" value={f.dimensions} onChange={(e) => set('dimensions', e.target.value)} />
          </Field>
        </div>
        <Field label="Description" id="description" error={errors.description} counter={<Counter value={f.description} max={2000} />}>
          <textarea {...fp('description', errors.description)} className="input" rows={5} value={f.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-serif text-2xl mb-2">Price and availability</legend>
        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <Field label="Price (₹)" id="price" error={errors.price} help={f.onEnquiry ? 'Shown as “On enquiry” on the website.' : 'Whole rupees.'}>
            <input {...fp('price', errors.price, true)} className="input" inputMode="numeric" disabled={f.onEnquiry} value={f.onEnquiry ? '' : f.price} onChange={(e) => set('price', e.target.value)} />
          </Field>
          <Check id="onEnquiry" label="On enquiry (no fixed price)" checked={f.onEnquiry} onChange={(v) => set('onEnquiry', v)} />
        </div>
        {f.type === 'print' && (
          <div role="group" aria-labelledby="var-h" className="border border-sand p-3 space-y-3">
            <h3 id="var-h" className="text-lg">Print variants</h3>
            {errors.variants && <p id="variants-err" role="alert" className="text-xs text-danger">{errors.variants}</p>}
            {f.variants.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_7rem] sm:grid-cols-[1fr_9rem_auto] gap-2 items-start">
                <Field label={`Variant ${i + 1} label`} id={`v${i}l`} error={errors[`v${i}l`]}>
                  <input {...fp(`v${i}l`, errors[`v${i}l`])} className="input" maxLength={60} value={v.label} onChange={(e) => setVariant(i, 'label', e.target.value)} />
                </Field>
                <Field label="Price (₹)" id={`v${i}p`} error={errors[`v${i}p`]}>
                  <input {...fp(`v${i}p`, errors[`v${i}p`])} className="input" inputMode="numeric" value={v.price} onChange={(e) => setVariant(i, 'price', e.target.value)} />
                </Field>
                <span className="flex gap-1 col-span-2 sm:col-span-1 sm:mt-6">
                  <button type="button" className="btn" disabled={i === 0} onClick={() => set('variants', moveItem(f.variants, i, -1))} aria-label={`Move variant ${i + 1} up`}>Up</button>
                  <button type="button" className="btn" disabled={i === f.variants.length - 1} onClick={() => set('variants', moveItem(f.variants, i, 1))} aria-label={`Move variant ${i + 1} down`}>Down</button>
                  <button type="button" className="btn danger" onClick={() => set('variants', f.variants.filter((_, j) => j !== i))} aria-label={`Remove variant ${i + 1}`}>Remove</button>
                </span>
              </div>
            ))}
            <button type="button" className="btn" disabled={f.variants.length >= 10} onClick={() => set('variants', [...f.variants, { label: '', price: '' }])}>Add variant</button>
          </div>
        )}
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Check id="available" label="Available to buy" checked={f.available} onChange={(v) => set('available', v)} />
          <Check id="published" label="Published on the website" checked={f.published} onChange={(v) => set('published', v)} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-serif text-2xl mb-2">Image</legend>
        <div className="flex flex-wrap gap-4 items-start">
          <div className="w-40 border border-sand bg-panel overflow-hidden" style={{ aspectRatio: Number.isFinite(arNum) && arNum >= 0.3 && arNum <= 3 ? arNum : 0.8 }}>
            {f.image
              ? <img src={mediaSrc(f.image)} alt={f.imageAlt || ''} className="size-full object-cover" onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
              : <span className="grid size-full place-items-center text-xs text-mut p-2 text-center">No image: the site shows its placeholder</span>}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-mut break-all max-w-xs">{f.image || 'No image chosen'}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={() => setPicker(true)}>Choose or upload image</button>
              <button type="button" className="btn" disabled={!f.image} onClick={() => { set('image', null); setNat(null) }}>Clear image</button>
            </div>
            {f.image && nat && nat.h > 0 && (
              <button type="button" className="btn" onClick={() => set('ar', (nat.w / nat.h).toFixed(3).replace(/\.?0+$/, ''))}>Set ratio from image ({(nat.w / nat.h).toFixed(2)})</button>
            )}
          </div>
        </div>
        <Field label="Image alt text" id="imageAlt" error={errors.imageAlt} help="Describe the painting for people who cannot see it." counter={<Counter value={f.imageAlt} max={200} />}>
          <input {...fp('imageAlt', errors.imageAlt, true)} className="input" value={f.imageAlt} onChange={(e) => set('imageAlt', e.target.value)} />
        </Field>
        <Field label="Aspect ratio (width ÷ height)" id="ar" error={errors.ar} help="Between 0.3 and 3. A portrait 60 × 90 cm painting is 0.667; a square is 1.">
          <input {...fp('ar', errors.ar, true)} className="input max-w-[10rem]" inputMode="decimal" value={f.ar} onChange={(e) => set('ar', e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-end gap-2" role="group" aria-label="Work out the ratio from the size">
          <Field label="Width" id="dw"><input id="dw" className="input w-24" inputMode="decimal" value={dim.w} onChange={(e) => setDim({ ...dim, w: e.target.value })} /></Field>
          <Field label="Height" id="dh"><input id="dh" className="input w-24" inputMode="decimal" value={dim.h} onChange={(e) => setDim({ ...dim, h: e.target.value })} /></Field>
          <button type="button" className="btn" disabled={!(Number(dim.w) > 0 && Number(dim.h) > 0)} onClick={() => set('ar', (Number(dim.w) / Number(dim.h)).toFixed(3).replace(/\.?0+$/, ''))}>Calculate ratio</button>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-serif text-2xl mb-2">Related poem</legend>
        <Field label="Poem shown with this painting" id="poemSlug">
          <select {...fp('poemSlug')} className="input" value={f.poemSlug} onChange={(e) => set('poemSlug', e.target.value)}>
            <option value="">None</option>
            {poems.map((p) => <option key={p.id} value={p.slug}>{p.title} ({p.lang === 'mr' ? 'Marathi' : 'English'})</option>)}
          </select>
        </Field>
      </fieldset>

      <div className="flex flex-wrap gap-2 border-t border-sand pt-4 sticky bottom-0 bg-ivory py-3">
        <button type="submit" className="btn fill" disabled={busy}>{busy ? 'Saving…' : creating ? 'Create artwork' : 'Save changes'}</button>
        <GuardLink to="/artworks" className="btn">Cancel</GuardLink>
        {dirty && <span className="self-center text-xs text-mut">Unsaved changes</span>}
      </div>

      <MediaPicker open={picker} onClose={() => setPicker(false)} selected={f.image}
        onPick={(m) => { setF((p) => ({ ...p, image: m.url, imageAlt: p.imageAlt || m.alt || '' })); setPicker(false) }} />
    </form>
  )
}

export default function ArtworkEdit() {
  const { id } = useParams()
  usePageTitle(id ? 'Edit artwork' : 'New artwork')
  const { data, error, loading, reload } = useFetch(async () => {
    const [art, poems] = await Promise.all([id ? api.get('/artworks/' + id) : null, api.get('/poems')])
    return { art, poems: poems.items }
  }, [id])
  return (
    <div>
      <PageHeader title={id ? 'Edit artwork' : 'New artwork'} />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <ArtworkForm key={id || 'new'} id={id} poems={data.poems} initial={data.art ? fromArtwork(data.art) : BLANK} />
      )}
    </div>
  )
}
