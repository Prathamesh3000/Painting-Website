import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmCtx, ToastCtx } from './ctx.js'
import { useGuardedNav } from './hooks.js'

/* ── Toasts (aria-live) ── */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const idRef = useRef(0)
  const push = useCallback((type, msg) => {
    const id = ++idRef.current
    setItems((l) => [...l.slice(-3), { id, type, msg }])
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), type === 'error' ? 9000 : 4500)
  }, [])
  const api = useMemo(() => ({ success: (m) => push('success', m), info: (m) => push('info', m), error: (m) => push('error', m) }), [push])
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div aria-live="polite" aria-atomic="false" role="status" className="no-print fixed bottom-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 sm:w-96 pointer-events-none">
        {items.map((t) => (
          <div key={t.id} className={'pointer-events-auto border bg-panel px-4 py-3 text-sm shadow-lg flex gap-3 items-start ' + (t.type === 'error' ? 'border-danger text-danger' : 'border-terracotta text-charcoal')}>
            <span className="flex-1 break-words">{t.type === 'error' ? 'Error: ' : ''}{t.msg}</span>
            <button type="button" className="underline text-xs" onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))}>Dismiss</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ── Native <dialog> modal: focus is trapped by the browser, Esc closes ── */
export function Dialog({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      className={'m-auto p-0 bg-ivory text-charcoal border border-sand backdrop:bg-black/60 w-[calc(100vw-2rem)] max-h-[90vh] ' + (wide ? 'max-w-4xl' : 'max-w-md')}>
      {open && (
        <div className="p-5 sm:p-6">
          <h2 id={titleId} className="font-serif text-2xl mb-3">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ opts, resolve })), [])
  const finish = (v) => { if (state) state.resolve(v); setState(null) }
  const o = state?.opts
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Dialog open={!!state} onClose={() => finish(false)} title={o?.title || ''}>
        <p className="text-sm text-mut whitespace-pre-line">{o?.message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn" autoFocus onClick={() => finish(false)}>Cancel</button>
          <button type="button" className={'btn fill' + (o?.danger ? ' danger' : '')} onClick={() => finish(true)}>{o?.confirmLabel || 'Confirm'}</button>
        </div>
      </Dialog>
    </ConfirmCtx.Provider>
  )
}

/* ── Layout bits ── */
export function PageHeader({ title, children, sub }) {
  return (
    <header className="no-print mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-sand pb-4">
      <div className="min-w-0">
        <h1 className="font-serif text-3xl sm:text-4xl break-words">{title}</h1>
        {sub && <p className="text-sm text-mut mt-1">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}

export function Loading({ label = 'Loading…' }) {
  return <p role="status" className="py-10 text-center text-mut">{label}</p>
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div role="alert" className="border border-danger text-danger p-4 text-sm flex flex-wrap items-center gap-3">
      <span className="flex-1 min-w-0 break-words">{message}</span>
      {onRetry && <button type="button" className="btn" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function Empty({ children }) {
  return <p className="border border-dashed border-sand py-10 px-4 text-center text-mut text-sm">{children}</p>
}

export function Badge({ children, tone = 'plain' }) {
  const t = tone === 'accent' ? 'bg-terracotta text-ivory border-terracotta'
    : tone === 'danger' ? 'border-danger text-danger'
      : tone === 'strong' ? 'border-charcoal text-charcoal' : 'border-sand text-mut'
  return <span className={'inline-block border px-2 py-0.5 text-xs leading-5 whitespace-nowrap ' + t}>{children}</span>
}

export function TableWrap({ label, children }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="relative overflow-x-auto border border-sand">
      <table className="w-full text-sm text-left min-w-[36rem]">{children}</table>
    </div>
  )
}

export function Alert({ children }) {
  if (!children) return null
  return <div role="alert" className="border border-danger text-danger p-3 text-sm mb-4 break-words">{children}</div>
}

export function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <nav aria-label="Pagination" className="no-print mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-mut" aria-live="polite">{total} result{total === 1 ? '' : 's'} · page {page} of {pages}</span>
      <span className="flex gap-2">
        <button type="button" className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button type="button" className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </span>
    </nav>
  )
}

export function Counter({ value, max, id }) {
  const n = (value || '').length
  return <span id={id} className={'text-xs ' + (n > max ? 'text-danger font-medium' : 'text-mut')}>{n} / {max}</span>
}

export function Check({ label, checked, onChange, id, help, disabled }) {
  return (
    <label className="tap-check inline-flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" id={id} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-describedby={help} className="size-5 accent-terracotta" />
      <span>{label}</span>
    </label>
  )
}

// A Link that asks before abandoning unsaved changes.
export function GuardLink({ to, children, className, ...rest }) {
  const go = useGuardedNav()
  return (
    <Link to={to} className={className} {...rest} onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault(); go(to)
    }}>{children}</Link>
  )
}

export function Field({ label, id, error, help, children, className = '', counter }) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-medium mb-1">{label}</label>
        {counter}
      </div>
      {children}
      {help && <p id={id + '-help'} className="text-xs text-mut mt-1">{help}</p>}
      {error && <p id={id + '-err'} className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
}
