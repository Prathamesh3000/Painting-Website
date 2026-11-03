import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { inr } from '../data/artworks'
import { safeUrl } from '../data/shipping'
import { useContent, useSettings } from '../lib/ContentContext'
import { SvgDefs } from './PaintingArt'
import '../site.css'

const links = [
  ['/art', 'Gallery'],
  ['/about', 'About'],
  ['/poetry', 'Art & Poetry'],
  ['/#purpose', 'Our Purpose'],
  ['/contact', 'Contact'],
]

function Nav() {
  const { count, saved, openDrawer } = useCart()
  const [open, setOpen] = useState(false)

  return (
    <nav className="nav" aria-label="Main">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-band focus:text-ivory focus:px-3 focus:py-2">Skip to content</a>
      <Link to="/" className="logo">Kalpana Jagtap</Link>
      <div className={'links' + (open ? ' open' : '')} onClick={(e) => { if (e.target.closest('a')) setOpen(false) }}>
        {links.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
      </div>
      <div className="icons">
        <span className="p-1">Wishlist {saved.length}</span>
        <button onClick={openDrawer}>Cart {count}</button>
        <button className="menu-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>{open ? '✕' : '☰'}</button>
      </div>
    </nav>
  )
}

function CartDrawer() {
  const { items, subtotal, drawerOpen, closeDrawer, remove } = useCart()
  const { checkoutEnabled } = useSettings()
  return (
    <aside className={'drawer' + (drawerOpen ? ' open' : '')} aria-label="Cart" aria-hidden={!drawerOpen}>
      <button className="x" onClick={closeDrawer}>Close</button>
      <h3>Your cart</h3>
      <div className="flex-1 overflow-auto">
        {items.length === 0
          ? <p className="text-mut">No artwork yet. Add a painting from the gallery.</p>
          : items.map((i) => (
            <div key={i.key} className="it">
              <span>{i.title}{i.variant ? ` (${i.variant})` : ''}{i.qty > 1 ? ` × ${i.qty}` : ''}<br />
                <button className="text-sm underline text-mut" onClick={() => remove(i.key)}>Remove</button></span>
              <span>{inr(i.price * i.qty)}</span>
            </div>
          ))}
      </div>
      {items.length > 0 && <p className="flex justify-between font-serif text-xl"><span>Subtotal</span><span>{inr(subtotal)}</span></p>}
      {items.length > 0 && !checkoutEnabled && <p className="text-sm text-mut mt-3">Online ordering is paused for now. Your cart is saved.</p>}
      <Link to={items.length ? '/checkout' : '/art'} onClick={closeDrawer} className="btn fill mt-auto">
        {items.length ? 'Continue to checkout' : 'Browse the gallery'}
      </Link>
    </aside>
  )
}

function FooterCol({ title, links: ls }) {
  return (
    <div>
      <h2 className="text-xs uppercase mb-4 brand font-sans tracking-[0.12em]">{title}</h2>
      <ul className="space-y-2">
        {ls.map(([to, label]) => <li key={to + label}><Link to={to}>{label}</Link></li>)}
      </ul>
    </div>
  )
}

function Footer() {
  const tagline = useContent('global.footerTagline')
  const socials = useContent('global.social').filter((s) => s.name && safeUrl(s.url))
  return (
    <footer className="foot">
      <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-serif text-3xl brand">Kalpana Jagtap</p>
          <p className="mt-2">{tagline}</p>
          <ul className="mt-5 flex flex-wrap gap-4">
            {socials.map((s, i) => <li key={s.name + i}><a href={safeUrl(s.url)} target="_blank" rel="noreferrer">{s.name}</a></li>)}
          </ul>
        </div>
        <FooterCol title="Explore" links={[['/about', 'About Kalpana'], ['/art', 'Explore gallery'], ['/poetry', 'Art & Poetry'], ['/#purpose', 'Children’s care']]} />
        <FooterCol title="Store" links={[['/custom-art', 'Custom commissions'], ['/cart', 'Your bag'], ['/track', 'Order tracking']]} />
        <FooterCol title="Help" links={[['/shipping-returns', 'Shipping & returns'], ['/faqs', 'FAQs'], ['/privacy', 'Privacy policy'], ['/terms', 'Terms & conditions']]} />
      </div>
      <p className="text-center text-xs mt-10">This site is copyright © {new Date().getFullYear()} Kalpana Jagtap.</p>
    </footer>
  )
}

export default function Layout() {
  const { pathname, hash } = useLocation()
  const announcement = useContent('global.announcement')

  // Hash links (e.g. /#purpose) scroll to the section once the page has rendered; other routes start at the top.
  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return }
    const id = hash.slice(1)
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView(), 50)
    return () => clearTimeout(t)
  }, [pathname, hash])

  // One shared, quiet reveal: anything marked data-reveal fades up once as it scrolls into view.
  // Uses IntersectionObserver + CSS transitions (see index.css), so it costs no layout reads and no JS library.
  // Without the `motion` class on <html> (reduced motion, or no JS) nothing is hidden in the first place.
  useEffect(() => {
    if (!document.documentElement.classList.contains('motion')) return
    const io = new IntersectionObserver((entries) => {
      let n = 0
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.style.transitionDelay = `calc(${n++} * 0.12s * var(--motion-speed))`
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      })
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 })
    const watch = (root) => {
      const found = root.matches?.('[data-reveal]') ? [root] : []
      found.push(...root.querySelectorAll('[data-reveal]'))
      found.forEach((el) => { if (!el.classList.contains('is-in')) io.observe(el) })
    }
    watch(document)
    // Content that appears later (lazy route chunk, or API data replacing the bundled fallback) is picked up too,
    // so nothing rendered after the first pass is left hidden.
    const mo = new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) watch(n) })))
    const main = document.getElementById('main')
    if (main) mo.observe(main, { childList: true, subtree: true })
    return () => { io.disconnect(); mo.disconnect() }
  }, [pathname])

  return (
    <>
      <SvgDefs />
      {announcement && <div className="bar" role="region" aria-label="Announcement">{announcement}</div>}
      <Nav />
      <main id="main" className="min-h-[70vh]"><Outlet /></main>
      <Footer />
      <CartDrawer />
    </>
  )
}
