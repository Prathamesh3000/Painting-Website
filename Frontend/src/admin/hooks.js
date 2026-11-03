import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfirm } from './ctx.js'

// Data loading without synchronous setState in effects: "loading" is derived from which request the result belongs to.
export function useFetch(fetcher, deps) {
  const [tick, setTick] = useState(0)
  const [res, setRes] = useState({ id: null })
  const ref = useRef(fetcher)
  const id = JSON.stringify(deps) + ':' + tick
  useEffect(() => { ref.current = fetcher })
  useEffect(() => {
    let off = false
    ref.current().then(
      (data) => { if (!off) setRes({ id, data }) },
      (e) => { if (!off) setRes({ id, error: e.message || 'Something went wrong.' }) },
    )
    return () => { off = true }
  }, [id])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  const setData = useCallback((updater) => setRes((r) => ({ ...r, data: typeof updater === 'function' ? updater(r.data) : updater })), [])
  return { data: res.data, error: res.id === id ? res.error : undefined, loading: res.id !== id, reload, setData }
}

export function usePageTitle(title) {
  useEffect(() => {
    document.title = `${title} · Admin · Kalpana Jagtap`
  }, [title])
}

// Unsaved-changes tracking: browser unload warning + a flag the in-app navigation guard reads.
let dirtyFlag = false
export const isDirty = () => dirtyFlag
export const clearDirty = () => { dirtyFlag = false }

export function useDirty(dirty) {
  useEffect(() => {
    dirtyFlag = dirty
    if (!dirty) return undefined
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])
  useEffect(() => () => { dirtyFlag = false }, [])
}

// Navigate, but ask first if the current screen has unsaved changes.
export function useGuardedNav() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  return useCallback(async (to) => {
    if (isDirty()) {
      const ok = await confirm({ title: 'Discard unsaved changes?', message: 'You have changes that have not been saved. Leaving this page will lose them.', confirmLabel: 'Discard and leave', danger: true })
      if (!ok) return
      clearDirty()
    }
    navigate(to)
  }, [navigate, confirm])
}
