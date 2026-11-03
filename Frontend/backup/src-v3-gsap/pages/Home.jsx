import { useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Link } from 'react-router-dom'
import { artworks, canBuy, priceLabel } from '../data/artworks'
import PaintingArt from '../components/PaintingArt'
import Newsletter from '../components/Newsletter'
import { useCart } from '../context/CartContext'
import '../home.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
// smoothstep easing used for the camera moves
const smooth = (t) => t * t * (3 - 2 * t)

const pillars = [
  ['Governance', 'Service and administrative excellence.'],
  ['Art & Poetry', 'Nature, humanity and philosophy.'],
  ['Children’s Care', 'Supporting education and vulnerable children.'],
]
const POEM = 'Every brushstroke begins as a quiet question, and every canvas answers with light, patience and a little courage.'

function GalleryLabel({ art }) {
  const { items, add, saved, toggleSaved } = useCart()
  const inCart = items.some((i) => i.slug === art.slug)
  const isSaved = saved.includes(art.slug)
  const save = <button className="btn" onClick={() => toggleSaved(art.slug)}>{isSaved ? 'Saved' : 'Save'}</button>

  return (
    <div className="lab">
      <b>{art.title}</b>
      <span>{art.medium} · {art.dimensions}</span>
      <em>{art.available ? priceLabel(art) : `${priceLabel(art)}`}</em>
      <div className="row">
        {canBuy(art) && <button className="btn fill" onClick={() => add({ slug: art.slug, title: art.title, type: art.type, price: art.price })}>{inCart ? 'Added' : 'Add to cart'}</button>}
        {!art.available && <><button className="btn" disabled>Sold</button><Link className="btn" to="/custom-art">Enquire about similar</Link></>}
        {art.available && art.price == null && <Link className="btn fill" to="/contact">Enquire</Link>}
        {art.available && save}
      </div>
    </div>
  )
}

export default function Home() {
  const root = useRef(null)
  const [pillar, setPillar] = useState(0)

  // Every section is a tall block holding a sticky 100vh stage (see home.css), so no pinning is needed:
  // each timeline simply scrubs from "section top hits viewport top" to "section bottom hits viewport bottom".
  useGSAP(() => {
    const q = (s) => root.current.querySelector(s)
    const qa = (s) => [...root.current.querySelectorAll(s)]
    const range = (trigger, extra = {}) => ({ trigger, start: 'top top', end: 'bottom bottom', scrub: true, ...extra })

    const mm = gsap.matchMedia()
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
      const still = ctx.conditions.reduce
      const strokes = qa('.s')
      const words = qa('.w')

      // 1. Hero — brush strokes draw on and uncover the painting; the headline fades up at the end.
      if (still) {
        gsap.set(strokes, { strokeDashoffset: 0 })
        gsap.set('#hc', { opacity: 1 })
        gsap.set('#hint', { opacity: 0 })
      } else {
        const hero = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: range(q('#top')) })
        strokes.forEach((s, i) => hero.fromTo(s, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.55 / 1.5 }, (i * 0.17) / 1.5))
        hero
          .fromTo(q('#painting'), { scale: 1.12, transformOrigin: '50% 50%' }, { scale: 1, duration: 1 }, 0)
          .fromTo(q('#hc'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.22 }, 0.72)
          .fromTo(q('#hint'), { opacity: 1 }, { opacity: 0, duration: 1 / 6 }, 0)
      }

      // 2. Walk-through gallery — one camera ({ s: scale, x: pan, p: progress }) drives the whole room.
      const gw = q('#gw')
      const pts = qa('.pt')
      const frames = pts.map((p) => p.querySelector('.cv'))
      const n = frames.length
      let GX = [], GY = 0, GS = 1
      const cam = { s: 0.36, x: 0, p: 0 }

      const measure = () => {
        gw.style.transform = 'none'
        const w0 = gw.getBoundingClientRect()
        GX = frames.map((f) => { const r = f.getBoundingClientRect(); return r.left - w0.left + r.width / 2 })
        const r0 = frames[0].getBoundingClientRect()
        GY = r0.top - w0.top + r0.height / 2
        GS = Math.min(innerHeight * 0.84 / r0.height, innerWidth * 0.9 / r0.width)
        const floor = innerHeight * 0.78
        frames.forEach((f) => {
          const r = f.getBoundingClientRect()
          f.style.webkitBoxReflect = 'below ' + Math.max(0, 2 * (floor - (r.bottom - w0.top))) + 'px linear-gradient(transparent 62%,rgba(255,255,255,.3))'
        })
      }
      // Applies the camera to the room; each frame lights up as it nears the centre of the screen.
      const apply = () => {
        const { s, x, p } = cam
        gw.style.transform = `translate(${innerWidth / 2 - (GX[0] + x) * s}px,${innerHeight * 0.44 - GY * s}px) scale(${s})`
        const on = 0.2 + 0.8 * cl(p / 0.1)
        pts.forEach((el, k) => {
          const d = Math.abs(GX[k] - GX[0] - x) * s / innerWidth
          el.style.setProperty('--lit', (cl(1 - d * 2.4) * on).toFixed(3))
        })
      }
      measure()

      const L = 0.67 / (n - 1) // share of the timeline given to each frame-to-frame move
      const gal = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate: apply,
        scrollTrigger: range(q('#gallery'), { invalidateOnRefresh: true }),
      })
      gal
        .fromTo(cam, { s: 0.36 }, { s: () => GS, duration: 0.16, ease: smooth }, 0) // zoom out to the whole room
        .fromTo(cam, { s: () => GS }, { s: 1, duration: 0.07, ease: smooth, immediateRender: false }, 0.24) // settle on frame one
      for (let i = 0; i < n - 1; i++) {
        gal.fromTo(cam, { x: () => GX[i] - GX[0] }, { x: () => GX[i + 1] - GX[0], duration: 0.56 * L, ease: smooth, immediateRender: false }, 0.31 + (i + 0.22) * L)
      }
      gal
        .to(cam, { p: 1, duration: 1 }, 0)
        .fromTo(q('#gi'), { opacity: 1 }, { opacity: 0, duration: 0.07 }, 0)
        .fromTo(q('#hp'), { width: '0%' }, { width: '100%', duration: 1 }, 0)

      // Sizes depend on the viewport, so re-measure before every ScrollTrigger refresh and re-apply after.
      ScrollTrigger.addEventListener('refreshInit', measure)
      ScrollTrigger.addEventListener('refresh', apply)
      apply()

      // 3. Brushwork zoom.
      if (still) {
        gsap.set('#zc', { opacity: 1 })
      } else {
        gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: range(q('#zoom')) })
          .fromTo(q('#zs'), { scale: 1, transformOrigin: '50% 52%' }, { scale: 4.6, duration: 1 }, 0)
          .fromTo(q('#zc'), { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0.55)
      }

      // 4. Portrait parallax — drifts against the scroll while the portrait crosses the viewport.
      if (!still) {
        const portrait = q('.portrait')
        const drift = () => 0.06 * (innerHeight + portrait.offsetHeight)
        gsap.fromTo(q('#pin'), { y: () => -drift() }, {
          y: () => drift(), ease: 'none',
          scrollTrigger: { trigger: portrait, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
        })
      }

      // 5. Pillars — thirds of the pinned section pick the highlighted name (React state, changes rarely).
      ScrollTrigger.create({
        trigger: q('#pillars'), start: 'top top', end: 'bottom bottom',
        onUpdate: (self) => setPillar(Math.min(2, Math.floor(self.progress * 3))),
      })

      // 6. Purpose — counter climbs to 100 by 62.5% of the section, then holds.
      const num = q('#num')
      if (still) {
        num.textContent = '100'
      } else {
        const counter = { n: 0 }
        gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: range(q('#purpose')) })
          .to(counter, { n: 100, duration: 0.625, onUpdate: () => { num.textContent = Math.round(counter.n) } })
          .to({}, { duration: 0.375 })
      }

      // 7. Poem — words brighten one after another as the paragraph scrolls through.
      if (still) {
        gsap.set(words, { opacity: 1 })
      } else {
        const pp = q('#pp')
        const poem = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: pp, start: 'top 85%', end: () => `+=${pp.offsetHeight + innerHeight * 0.35}`, scrub: true, invalidateOnRefresh: true },
        })
        // One explicit tween per word (rather than a stagger) so every word starts dim before its turn.
        words.forEach((w, i) => poem.fromTo(w, { opacity: 0.2 }, { opacity: 1, duration: 0.05 }, (i * 0.95) / (words.length - 1)))
      }

      return () => {
        ScrollTrigger.removeEventListener('refreshInit', measure)
        ScrollTrigger.removeEventListener('refresh', apply)
      }
    })
  }, { scope: root })

  const strokePaths = [
    'M-80 120C300 40 900 210 1520 110',
    'M1520 330C1000 420 400 260 -80 340',
    'M-80 560C400 470 1000 650 1520 540',
    'M1520 780C900 880 400 700 -80 790',
  ]

  return (
    <div ref={root}>
      <header id="top" className="hero">
        <div className="stage">
          <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Butterflies, an original painting by Kalpana Jagtap">
            <defs>
              <mask id="reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="1440" height="900">
                {strokePaths.map((d) => (
                  <path key={d} className="s" pathLength="1" d={d} stroke="#fff" strokeWidth="330" strokeLinecap="round" fill="none"
                    style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
                ))}
              </mask>
            </defs>
            <rect width="1440" height="900" fill="#D8C6AE" />
            <g mask="url(#reveal)" id="painting">
              <rect width="1440" height="900" fill="url(#g1)" />
              <circle cx="1130" cy="190" r="150" fill="#f6e3bf" opacity=".7" />
              <g fill="#A87549"><use href="#bf" transform="translate(420 430) scale(1.6) rotate(-14)" /></g>
              <g fill="#343D34"><use href="#bf" transform="translate(940 560) scale(1.1) rotate(18)" /></g>
              <g fill="#f7f3ec"><use href="#bf" transform="translate(1180 330) scale(.7) rotate(-6)" /></g>
              <g fill="#493B30"><use href="#bf" transform="translate(200 700) scale(.55) rotate(24)" /></g>
              <g fill="#d8c6ae"><use href="#bf" transform="translate(720 230) scale(.6) rotate(-30)" /></g>
            </g>
          </svg>
          <div className="hero-copy" id="hc">
            <h1>Where Art Meets Purpose.</h1>
            <p>Discover original paintings inspired by nature, humanity and the beauty of life. Own a piece of art and become part of a meaningful journey.</p>
            <div className="cta"><a className="btn fill" href="#gallery">Explore original art</a><Link className="btn" to="/about">Discover her story</Link></div>
          </div>
          <div className="hint" id="hint">Scroll to paint<i /></div>
        </div>
      </header>

      <section id="gallery" className="gal">
        <div className="stage">
          <div className="world" id="gw">
            <div className="ceil" /><div className="wall" /><div className="floor" /><div className="base" /><div className="rail" />
            <div className="wt">
              <h2>A collection of stories</h2>
              <p>Original works in oil and acrylic. Each canvas is signed, comes with a certificate of authenticity, and carries the story of how it was made.</p>
            </div>
            <div className="rw">
              {artworks.map((a) => (
                <div key={a.slug} className="pt" style={{ '--ar': a.ar, '--hv': a.hv + 'vh' }}>
                  <div className="glow" /><div className="spot" /><i className="fix" />
                  <div className={'cv' + (a.gold ? ' gold' : '')}><PaintingArt art={a} /></div>
                  <div className="pool" />
                  <GalleryLabel art={a} />
                </div>
              ))}
            </div>
          </div>
          <div className="dim" />
          <div className="gi" id="gi">Scroll to step inside the gallery<i /></div>
          <div className="progress"><b id="hp" /></div>
        </div>
      </section>

      <section className="zoom" id="zoom">
        <div className="stage">
          <svg id="zs" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Close-up of brushwork on a butterfly painting">
            <rect width="1440" height="900" fill="url(#g1)" />
            <g filter="url(#paint)">
              <circle cx="1100" cy="200" r="160" fill="#f6e3bf" opacity=".6" />
              <g fill="#A87549"><use href="#bf" transform="translate(560 470) scale(1.9) rotate(-12)" /></g>
              <g fill="#343D34"><use href="#bf" transform="translate(1050 650) scale(.8) rotate(18)" /></g>
            </g>
            <g fill="none" strokeLinecap="round" strokeOpacity=".5">
              <path d="M380 400C470 330 560 340 620 420" stroke="#f7f3ec" strokeWidth="7" />
              <path d="M330 470C420 420 520 430 590 500" stroke="#f3d9a8" strokeWidth="5" />
              <path d="M700 380C770 330 840 350 880 420" stroke="#493B30" strokeWidth="6" />
              <path d="M430 560C500 540 580 560 630 600" stroke="#f7f3ec" strokeWidth="4" />
            </g>
          </svg>
          <div className="zc" id="zc">
            <h2>Look closer.</h2>
            <p>Every painting is built from layers of oil and acrylic. Zoom in and you can see the ridges the brush left behind, which no print can copy.</p>
          </div>
        </div>
      </section>

      <section id="about" className="artist">
        <div className="portrait"><div className="in" id="pin">Replace with the approved portrait of Kalpana Jagtap</div></div>
        <div>
          <h2>The artist behind every canvas</h2>
          <p>Kalpana Jagtap is a public servant and fine artist whose life brings together governance, artistic expression and compassion. Through paintings and poetry, she explores nature, humanity and philosophical thought.</p>
          <Link className="btn" to="/about">Read her full story</Link>
        </div>
      </section>

      <section className="pil" id="pillars">
        <div className="stage">
          <div className="wrap">
            <div className="names">
              {pillars.map(([name], k) => <div key={name} className={'name' + (k === pillar ? ' on' : '')}>{name}</div>)}
            </div>
            <p className="desc">{pillars[pillar][1]}</p>
          </div>
        </div>
      </section>

      <section className="purpose" id="purpose">
        <div className="stage">
          <div>
            <div className="big"><span id="num">0</span>%</div>
            <h2>of artwork sale proceeds support children’s care and education.</h2>
            <p>Every original artwork contributes to safe shelter, nutritious meals, academic scholarships and art therapy for vulnerable children across rural Maharashtra.</p>
            <div className="pts"><span>Safe shelter</span><span>Nutritious meals</span><span>Scholarships</span><span>Art therapy</span></div>
            <Link className="btn fill" to="/contact">See the impact behind your purchase</Link>
          </div>
        </div>
      </section>

      <section id="poetry" className="poem">
        <p id="pp">{POEM.split(' ').map((w, i) => <span key={i}><span className="w">{w}</span> </span>)}</p>
        <small>Selected poems, reflections and the stories behind each painting. <Link to="/poetry" className="underline">Read the poetry journal</Link>.</small>
      </section>

      <section id="newsletter" className="news">
        <h2>Stay inspired by art, poetry and meaningful stories.</h2>
        <Newsletter />
      </section>
    </div>
  )
}
