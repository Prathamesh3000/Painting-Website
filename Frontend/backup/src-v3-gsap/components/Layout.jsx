import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { inr } from '../data/artworks'
import { SvgDefs } from './PaintingArt'
import BrushTrail from './BrushTrail'
import '../site.css'

const links = [
  ['/art', 'Gallery'],
  ['/about', 'About'],
  ['/poetry', 'Art & Poetry'],
  ['/#purpose', 'Our Purpose'],
  ['/contact', 'Contact'],
]

const socials = [
  ['Instagram', 'https://www.instagram.com/'],
  ['Facebook', 'https://www.facebook.com/'],
  ['YouTube', 'https://www.youtube.com/'],
  ['Pinterest', 'https://www.pinterest.com/'],
]

function Nav({ isHome }) {
  const { count, saved, openDrawer } = useCart()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > (isHome ? innerHeight * 0.2 : 20))
    onScroll()
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [isHome])

  return (
    <nav className={'nav' + (scrolled ? ' solid' : '')} aria-label="Main">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-olive focus:text-white focus:px-3 focus:py-2">Skip to content</a>
      <Link to="/" className="logo">Kalpana Jagtap</Link>
      <div className={'links' + (open ? ' open' : '')} onClick={(e) => { if (e.target.closest('a')) setOpen(false) }}>
        {links.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
      </div>
      <div className="icons">
        <span className="p-1" aria-label={`${saved.length} saved`}>Wishlist {saved.length}</span>
        <button onClick={openDrawer} aria-label="Open cart">Cart {count}</button>
        <button className="menu-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>{open ? '✕' : '☰'}</button>
      </div>
    </nav>
  )
}

function CartDrawer() {
  const { items, subtotal, drawerOpen, closeDrawer, remove } = useCart()
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
      <Link to={items.length ? '/checkout' : '/art'} onClick={closeDrawer} className="btn fill mt-auto">
        {items.length ? 'Continue to checkout' : 'Browse the gallery'}
      </Link>
    </aside>
  )
}

function FooterCol({ title, links: ls }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-widest text-sand mb-4 font-sans">{title}</h4>
      <ul className="space-y-2">
        {ls.map(([to, label]) => <li key={to + label}><Link to={to}>{label}</Link></li>)}
      </ul>
    </div>
  )
}

function Footer() {
  return (
    <footer className="foot">
      <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-serif text-3xl text-[#f1ebe0]">Kalpana Jagtap</p>
          <p className="mt-2">Where art meets purpose.</p>
          <ul className="mt-5 flex flex-wrap gap-4">
            {socials.map(([name, href]) => <li key={name}><a href={href} target="_blank" rel="noreferrer">{name}</a></li>)}
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
  const isHome = pathname === '/'

  // Hash links (e.g. /#purpose) scroll to the section once the page has rendered; other routes start at the top.
  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return }
    const id = hash.slice(1)
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView(), 50)
    return () => clearTimeout(t)
  }, [pathname, hash])

  // The announcement bar wraps on narrow screens, so the fixed nav measures it rather than assuming a height.
  const barRef = useRef(null)
  useEffect(() => {
    const set = () => document.documentElement.style.setProperty('--bar-h', barRef.current.offsetHeight + 'px')
    set()
    addEventListener('resize', set)
    return () => removeEventListener('resize', set)
  }, [])

  return (
    <>
      <SvgDefs />
      <div className="bar" ref={barRef}>100% of artwork proceeds support children’s care and education</div>
      <Nav isHome={isHome} />
      <main id="main" className={isHome ? '' : 'pt-36 min-h-[70vh]'}><Outlet /></main>
      <Footer />
      <CartDrawer />
      <BrushTrail />
    </>
  )
}
