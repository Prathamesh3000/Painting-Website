import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './admin.css'
import { api, sessionHint, setUnauthorizedHandler } from './adminApi.js'
import { AuthCtx, useAuth, useConfirm, useToast } from './ctx.js'
import { clearDirty, isDirty, usePageTitle } from './hooks.js'
import { ConfirmProvider, ToastProvider } from './ui.jsx'
import Login from './pages/Login.jsx'
import Account from './pages/Account.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Artworks from './pages/Artworks.jsx'
import ArtworkEdit from './pages/ArtworkEdit.jsx'
import Poems from './pages/Poems.jsx'
import PoemEdit from './pages/PoemEdit.jsx'
import Orders from './pages/Orders.jsx'
import OrderDetail from './pages/OrderDetail.jsx'
import Enquiries from './pages/Enquiries.jsx'
import SiteContent from './pages/SiteContent.jsx'
import Media from './pages/Media.jsx'
import Settings from './pages/Settings.jsx'
import Audit from './pages/Audit.jsx'

const NAV = [
  ['/', 'Dashboard', true],
  ['/artworks', 'Artworks'],
  ['/poems', 'Poems'],
  ['/orders', 'Orders'],
  ['/enquiries', 'Enquiries'],
  ['/content', 'Site content'],
  ['/media', 'Media library'],
  ['/settings', 'Settings'],
  ['/audit', 'Audit log'],
  ['/account', 'Account'],
]

function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = checking, null = signed out
  const [bootError, setBootError] = useState('')
  useEffect(() => {
    setUnauthorizedHandler(() => { clearDirty(); setUser(null) })
    // No hint means we were never signed in on this browser (or signed out): skip the probe so no 401 is logged.
    if (!sessionHint.has()) { setTimeout(() => setUser(null), 0); return () => setUnauthorizedHandler(null) }
    api.get('/auth/me', { noRedirect: true }).then(
      (r) => setUser(r?.user || null),
      (e) => { if (e.status !== 401) setBootError(e.message); setUser(null) },
    )
    return () => setUnauthorizedHandler(null)
  }, [])
  const value = useMemo(() => ({ user, setUser, bootError }), [user, bootError])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

function RequireAuth() {
  const { user } = useAuth()
  const loc = useLocation()
  if (user === undefined) return <p role="status" className="p-10 text-center text-mut">Checking your session…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
  return <Shell />
}

function Shell() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const confirm = useConfirm()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const mainRef = useRef(null)
  const prev = useRef(loc.pathname)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (prev.current !== loc.pathname) { prev.current = loc.pathname; mainRef.current?.focus({ preventScroll: false }) }
  }, [loc.pathname])

  async function guardedGo(e, to) {
    setOpen(false)
    if (isDirty()) {
      e.preventDefault()
      const ok = await confirm({ title: 'Discard unsaved changes?', message: 'You have changes that have not been saved. Leaving this page will lose them.', confirmLabel: 'Discard and leave', danger: true })
      if (ok) { clearDirty(); navigate(to) }
    }
  }

  async function logout() {
    setBusy(true)
    try { await api.post('/auth/logout') } catch (e) { toast.error(e.message) }
    sessionHint.clear()
    clearDirty(); setUser(null); setBusy(false)
  }

  const links = (
    <ul className="space-y-0.5">
      {NAV.map(([to, label, end]) => (
        <li key={to}>
          <NavLink to={to} end={!!end} onClick={(e) => guardedGo(e, to)} className="navlink block px-4 py-2 text-sm">{label}</NavLink>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="adm min-h-screen md:flex bg-ivory text-charcoal">
      <a href="#admin-main" className="skip sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[110] focus:bg-ivory focus:text-charcoal focus:border focus:border-terracotta focus:px-3 focus:py-2">Skip to main content</a>

      <header className="adm-top md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-sand bg-panel px-4 py-2">
        <Link to="/" className="tap font-serif text-xl">Admin</Link>
        <button type="button" className="btn" aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen((o) => !o)}>{open ? 'Close menu' : 'Menu'}</button>
      </header>

      <aside className={'adm-side bg-panel border-r border-sand md:w-60 md:shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:flex md:flex-col ' + (open ? 'block' : 'hidden')}>
        <div className="hidden md:block px-4 pt-6 pb-4">
          <p className="font-serif text-2xl leading-tight">Kalpana Jagtap</p>
          <p className="text-xs text-mut">Site administration</p>
        </div>
        <nav id="admin-nav" aria-label="Admin" className="py-2 md:flex-1">{links}</nav>
        <div className="border-t border-sand p-4 space-y-2 text-sm">
          <p className="text-mut break-all">{user.email}</p>
          <div className="flex flex-wrap gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer" className="btn">View site<span className="sr-only"> (opens in a new tab)</span></a>
            <button type="button" className="btn" onClick={logout} disabled={busy}>Log out</button>
          </div>
        </div>
      </aside>

      <main id="admin-main" ref={mainRef} tabIndex={-1} className="adm-main flex-1 min-w-0 px-4 sm:px-8 py-6 md:py-8 max-w-[90rem] outline-none">
        <Outlet />
      </main>
    </div>
  )
}

function NotFound() {
  usePageTitle('Not found')
  return (
    <div>
      <h1 className="font-serif text-3xl mb-2">Page not found</h1>
      <p className="text-mut mb-4">That admin page does not exist.</p>
      <Link className="btn" to="/">Back to dashboard</Link>
    </div>
  )
}

export default function AdminApp() {
  // Keep the admin out of search engines for as long as it is mounted.
  useEffect(() => {
    const m = document.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex,nofollow'
    document.head.appendChild(m)
    return () => m.remove()
  }, [])

  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <Routes>
            <Route path="login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route index element={<Dashboard />} />
              <Route path="account" element={<Account />} />
              <Route path="artworks" element={<Artworks />} />
              <Route path="artworks/new" element={<ArtworkEdit />} />
              <Route path="artworks/:id" element={<ArtworkEdit />} />
              <Route path="poems" element={<Poems />} />
              <Route path="poems/new" element={<PoemEdit />} />
              <Route path="poems/:id" element={<PoemEdit />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="enquiries" element={<Enquiries />} />
              <Route path="content" element={<SiteContent />} />
              <Route path="media" element={<Media />} />
              <Route path="settings" element={<Settings />} />
              <Route path="audit" element={<Audit />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}
