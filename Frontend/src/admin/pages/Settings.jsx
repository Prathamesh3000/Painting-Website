import { useState } from 'react'
import { api } from '../adminApi.js'
import { useConfirm, useToast } from '../ctx.js'
import { useDirty, useFetch, usePageTitle } from '../hooks.js'
import { Alert, Check, ErrorBox, Field, Loading, PageHeader } from '../ui.jsx'
import { deepEqual, fp, isInt } from '../util.js'

function SettingsForm({ initial, onSaved }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [f, setF] = useState(initial)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)
  const dirty = !deepEqual(f, initial)
  useDirty(dirty)

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const er = {}
    if (!isInt(f.flat) || Number(f.flat) < 0 || Number(f.flat) > 100000) er.flat = 'Whole rupees from 0 to 1,00,000.'
    if (!isInt(f.freeAbove) || Number(f.freeAbove) < 0 || Number(f.freeAbove) > 10000000) er.freeAbove = 'Whole rupees from 0 to 1,00,00,000.'
    if (!isInt(f.holdHours) || Number(f.holdHours) < 0 || Number(f.holdHours) > 8760) er.holdHours = 'Whole hours from 0 to 8,760 (0 means never).'
    setErrors(er); setServerError('')
    if (Object.keys(er).length) return
    if (!f.checkoutEnabled && initial.checkoutEnabled) {
      const ok = await confirm({ title: 'Turn checkout off?', message: 'Nobody will be able to place an order on the website until you turn it back on. Existing orders are not affected.', confirmLabel: 'Turn checkout off', danger: true })
      if (!ok) return
    }
    setBusy(true)
    try {
      const r = await api.put('/settings', { shipping: { flat: Number(f.flat), freeAbove: Number(f.freeAbove) }, checkoutEnabled: f.checkoutEnabled, holdHours: Number(f.holdHours) })
      toast.success('Settings saved.')
      onSaved(r)
    } catch (err) { setServerError(err.message); setBusy(false) }
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-xl space-y-6">
      <Alert>{serverError}</Alert>
      <fieldset className="space-y-4">
        <legend className="font-serif text-2xl mb-2">Shipping</legend>
        <Field label="Flat shipping charge (₹)" id="flat" error={errors.flat}>
          <input {...fp('flat', errors.flat)} className="input max-w-[12rem]" inputMode="numeric" value={f.flat} onChange={(e) => setF({ ...f, flat: e.target.value })} />
        </Field>
        <Field label="Free shipping above (₹)" id="freeAbove" error={errors.freeAbove} help="Orders with a subtotal above this amount ship free.">
          <input {...fp('freeAbove', errors.freeAbove, true)} className="input max-w-[12rem]" inputMode="numeric" value={f.freeAbove} onChange={(e) => setF({ ...f, freeAbove: e.target.value })} />
        </Field>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="font-serif text-2xl mb-2">Checkout</legend>
        <Check id="checkout" label="Checkout is enabled" checked={f.checkoutEnabled} onChange={(v) => setF({ ...f, checkoutEnabled: v })} />
        <Field label="Cancel unpaid orders after (hours)" id="holdHours" error={errors.holdHours} help="An order still awaiting payment after this many hours is cancelled automatically and its original paintings go back on sale. Enter 0 to never cancel automatically.">
          <input {...fp('holdHours', errors.holdHours, true)} className="input max-w-[12rem]" inputMode="numeric" value={f.holdHours} onChange={(e) => setF({ ...f, holdHours: e.target.value })} />
        </Field>
        {!f.checkoutEnabled && (
          <p role="alert" className="border border-danger text-danger p-3 text-sm">Warning: with checkout off, visitors cannot place orders. Use this only when you are away or the shop is paused.</p>
        )}
      </fieldset>
      <div className="flex items-center gap-3 border-t border-sand pt-4">
        <button type="submit" className="btn fill" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save settings'}</button>
        {dirty && <span className="text-xs text-mut">Unsaved changes</span>}
      </div>
    </form>
  )
}

export default function Settings() {
  usePageTitle('Settings')
  const { data, error, loading, reload, setData } = useFetch(() => api.get('/settings'), [])
  const initial = data && { flat: String(data.shipping.flat), freeAbove: String(data.shipping.freeAbove), checkoutEnabled: !!data.checkoutEnabled, holdHours: String(data.holdHours ?? 0) }
  return (
    <div>
      <PageHeader title="Settings" />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : <SettingsForm key={JSON.stringify(initial)} initial={initial} onSaved={(r) => setData(r)} />}
    </div>
  )
}
