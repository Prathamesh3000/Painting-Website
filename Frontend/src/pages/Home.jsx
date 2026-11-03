import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { canBuy, isPrint, priceLabel } from '../data/artworks'
import { useArtwork, useArtworks, useContent } from '../lib/ContentContext'
import PaintingArt from '../components/PaintingArt'
import Newsletter from '../components/Newsletter'
import { useCart } from '../context/CartContext'
import '../home.css'

function GalleryLabel({ art }) {
  const { items, add, saved, toggleSaved } = useCart()
  const inCart = items.some((i) => i.slug === art.slug)
  const isSaved = saved.includes(art.slug)
  const save = <button className="btn" onClick={() => toggleSaved(art.slug)}>{isSaved ? 'Saved' : 'Save'}</button>

  return (
    <div className="lab">
      <b>{art.title}</b>
      <span>{art.medium} · {art.dimensions}</span>
      <em>{priceLabel(art)}</em>
      <div className="row">
        {isPrint(art) && <Link className="btn fill" to={`/art/${art.slug}`}>Choose a size</Link>}
        {canBuy(art) && !isPrint(art) && <button className="btn fill" onClick={() => add({ slug: art.slug, title: art.title, type: art.type, price: art.price })}>{inCart ? 'Added' : 'Add to cart'}</button>}
        {!art.available && <><button className="btn" disabled>Sold</button><Link className="btn" to="/custom-art">Enquire about similar</Link></>}
        {art.available && art.price == null && !isPrint(art) && <Link className="btn fill" to="/contact">Enquire</Link>}
        {art.available && save}
      </div>
    </div>
  )
}

export default function Home() {
  const root = useRef(null)
  const { artworks } = useArtworks()
  const hero = useArtwork('butterflies') ?? artworks[0]
  const c = {
    heroTitle: useContent('home.heroTitle'), heroText: useContent('home.heroText'),
    cta1: useContent('home.heroCta1'), cta2: useContent('home.heroCta2'),
    galleryHeading: useContent('home.galleryHeading'), galleryLead: useContent('home.galleryLead'),
    zoomHeading: useContent('home.zoomHeading'), zoomLead: useContent('home.zoomLead'),
    aboutHeading: useContent('home.aboutHeading'), aboutText: useContent('home.aboutText'), aboutCta: useContent('home.aboutCta'),
    pillars: useContent('home.pillars'),
    big: useContent('home.purposeBig'), purposeHeading: useContent('home.purposeHeading'), purposeText: useContent('home.purposeText'),
    pills: useContent('home.purposePills'), purposeCta: useContent('home.purposeCta'),
    quote: useContent('home.poemQuote'), caption: useContent('home.poemCaption'), poemLink: useContent('home.poemLink'),
    newsletter: useContent('home.newsletterHeading'),
  }

  // The hero wipe-in is pure CSS (index.css). On wide screens the painting also drifts slightly against the
  // scroll; that needs GSAP, which is loaded only here, only on desktop, and never for reduced-motion visitors.
  useEffect(() => {
    if (!matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)').matches) return
    let stop = () => {}
    let cancelled = false
    import('../parallax').then((m) => { if (!cancelled) stop = m.heroParallax(root.current) })
    return () => { cancelled = true; stop() }
  }, [])

  return (
    <div ref={root}>
      <header id="top" className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>{c.heroTitle}</h1>
            <p>{c.heroText}</p>
            <div className="cta"><a className="btn fill" href="#gallery">{c.cta1}</a><Link className="btn" to="/about">{c.cta2}</Link></div>
          </div>
          {hero && (
            <div className="mat">
              <div className="frame"><div className="frame-inner"><PaintingArt art={hero} eager /></div></div>
            </div>
          )}
        </div>
      </header>

      <section id="gallery" className="section">
        <div className="container">
          <h2 data-reveal>{c.galleryHeading}</h2>
          <p className="lead" data-reveal>{c.galleryLead}</p>
          <div className="walls">
            {artworks.map((a) => (
              <div key={a.slug} className="pt" data-reveal>
                <Link to={`/art/${a.slug}`} className="cv" aria-label={`${a.title} — view details`}>
                  <span className="cv-art" style={a.ar >= 0.8 ? { width: '88%', aspectRatio: a.ar } : { height: '88%', aspectRatio: a.ar }}><PaintingArt art={a} /></span>
                </Link>
                <GalleryLabel art={a} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="zoom" className="section">
        <div className="container">
          <h2 data-reveal>{c.zoomHeading}</h2>
          <p className="lead" data-reveal>{c.zoomLead}</p>
          {hero && <div className="closeup mat" data-reveal><div className="frame"><PaintingArt art={hero} /></div></div>}
        </div>
      </section>

      <section id="about" className="section">
        <div className="artist-grid">
          <div className="portrait" data-reveal>Replace with the approved portrait of Kalpana Jagtap</div>
          <div data-reveal>
            <h2>{c.aboutHeading}</h2>
            <p>{c.aboutText}</p>
            <Link className="btn" to="/about">{c.aboutCta}</Link>
          </div>
        </div>
      </section>

      <section id="pillars" className="section band pil">
        <div className="pil-grid">
          {c.pillars.map((p, i) => (
            <div key={(p.name || '') + i} data-reveal>
              <h3 className="name">{p.name}</h3>
              <p className="desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="purpose" className="section purpose">
        <div className="big" data-reveal>{c.big}</div>
        <h2 data-reveal>{c.purposeHeading}</h2>
        <p data-reveal>{c.purposeText}</p>
        <div className="pts" data-reveal>{c.pills.map((p, i) => <span key={(p.text || '') + i}>{p.text}</span>)}</div>
        <Link className="btn fill" to="/contact">{c.purposeCta}</Link>
      </section>

      <section id="poetry" className="section">
        <div className="poem-quote" data-reveal>
          <p>{c.quote}</p>
          <small>{c.caption} <Link to="/poetry" className="underline">{c.poemLink}</Link>.</small>
        </div>
      </section>

      <section id="newsletter" className="news">
        <h2 data-reveal>{c.newsletter}</h2>
        <Newsletter />
      </section>
    </div>
  )
}
