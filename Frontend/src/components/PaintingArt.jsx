// Placeholder paintings drawn as SVG (from the client's v3 prototype). Real photos set `image` (via the admin panel or data/artworks.js).
import { mediaUrl } from '../lib/ContentContext'

export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <g id="wing"><path d="M0 0C-70-120-230-110-210 10C-200 90-80 80 0 0Z" /><path d="M0 0C-50 70-150 160-90 190C-30 210 10 90 0 0Z" opacity=".85" /></g>
        <g id="bf"><use href="#wing" /><use href="#wing" transform="scale(-1 1)" /><rect x="-4" y="-40" width="8" height="120" rx="4" fill="#493B30" /></g>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e9d5b6" /><stop offset=".55" stopColor="#d89c62" /><stop offset="1" stopColor="#7a4d2e" /></linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfd6c4" /><stop offset="1" stopColor="#4d5a4a" /></linearGradient>
        <filter id="paint" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".012 .035" numOctaves="3" seed="4" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="24" /></filter>
        <g id="bird"><path d="M-90 0C-50-40 40-50 90-10L150-34L112 12C80 52-40 62-90 0Z" /><path d="M-20-20C-10-110 60-150 120-130C92-90 52-50 20-20Z" opacity=".85" /><circle cx="72" cy="-14" r="5" fill="#f7f3ec" /></g>
        <g id="petal"><path d="M0 0C-62-60-42-170 0-215C42-170 62-60 0 0Z" /></g>
        <linearGradient id="g4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9c9b0" /><stop offset=".5" stopColor="#5d7160" /><stop offset="1" stopColor="#2b342c" /></linearGradient>
        <linearGradient id="g5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3d9a8" /><stop offset=".5" stopColor="#e19a5e" /><stop offset="1" stopColor="#5a3a28" /></linearGradient>
        <radialGradient id="g3" cx=".5" cy=".42" r=".7"><stop offset="0" stopColor="#fbe7b8" /><stop offset=".4" stopColor="#c98a4b" /><stop offset="1" stopColor="#2d352d" /></radialGradient>
      </defs>
    </svg>
  )
}

const P = {
  butterflies: (
    <>
      <rect width="800" height="1000" fill="url(#g1)" />
      <g fill="#A87549"><use href="#bf" transform="translate(300 480) scale(1.5) rotate(-12)" /></g>
      <g fill="#f7f3ec"><use href="#bf" transform="translate(580 300) scale(.6) rotate(14)" /></g>
      <g fill="#343D34"><use href="#bf" transform="translate(560 760) scale(.8) rotate(-20)" /></g>
    </>
  ),
  birds: (
    <>
      <rect width="800" height="1000" fill="url(#g2)" />
      <circle cx="560" cy="250" r="110" fill="#f1e6cc" opacity=".8" />
      <path d="M-40 340C200 300 440 420 860 350" stroke="#343D34" strokeWidth="20" fill="none" filter="url(#paint)" />
      <g fill="#343D34" filter="url(#paint)"><use href="#bird" transform="translate(280 322) scale(1.1) rotate(-6)" /></g>
      <g fill="#493B30" filter="url(#paint)"><use href="#bird" transform="translate(560 400) scale(.8) rotate(5)" /></g>
      <g fill="#A87549" filter="url(#paint)"><use href="#bird" transform="translate(240 650) scale(.6) rotate(-16)" /></g>
      <g fill="#f7f3ec" opacity=".8"><use href="#bird" transform="translate(600 700) scale(.4) rotate(10)" /></g>
      <path d="M0 880C200 820 500 900 800 840V1000H0Z" fill="#343D34" />
    </>
  ),
  spiritual: (
    <>
      <rect width="800" height="1000" fill="url(#g3)" />
      <g fill="none" stroke="#f7f3ec" strokeOpacity=".55" strokeWidth="3">
        <circle cx="400" cy="420" r="90" /><circle cx="400" cy="420" r="170" /><circle cx="400" cy="420" r="260" /><circle cx="400" cy="420" r="360" />
      </g>
      <circle cx="400" cy="420" r="46" fill="#fbe7b8" />
    </>
  ),
  'lotus-pond': (
    <>
      <rect width="800" height="1000" fill="url(#g4)" />
      <g fill="none" stroke="#f1e6cc" strokeOpacity=".35" strokeWidth="4" filter="url(#paint)">
        <ellipse cx="400" cy="680" rx="120" ry="34" /><ellipse cx="400" cy="690" rx="230" ry="70" /><ellipse cx="400" cy="700" rx="340" ry="110" />
      </g>
      <g fill="#2b342c" filter="url(#paint)">
        <ellipse cx="180" cy="800" rx="130" ry="38" /><ellipse cx="640" cy="850" rx="150" ry="42" /><ellipse cx="600" cy="640" rx="90" ry="26" />
      </g>
      <g transform="translate(400 640)" filter="url(#paint)">
        <g fill="#A87549" opacity=".8"><use href="#petal" transform="rotate(-58)" /><use href="#petal" transform="rotate(58)" /></g>
        <g fill="#d89c62" opacity=".9"><use href="#petal" transform="rotate(-30)" /><use href="#petal" transform="rotate(30)" /></g>
        <g fill="#f3d9a8"><use href="#petal" /></g>
        <circle cy="-8" r="22" fill="#fbe7b8" />
      </g>
    </>
  ),
  'banaras-dawn': (
    <>
      <rect width="800" height="1000" fill="url(#g5)" />
      <circle cx="400" cy="400" r="140" fill="#fbe7b8" filter="url(#paint)" />
      <g fill="#493B30" filter="url(#paint)"><path d="M60 620L60 480L90 440L120 480L120 620ZM680 620L680 450L715 390L750 450L750 620ZM250 620L250 540L290 500L330 540L330 620Z" /></g>
      <g filter="url(#paint)">
        <path d="M0 620H800V690H0Z" fill="#7a4d2e" /><path d="M0 690H800V770H0Z" fill="#5a3a28" />
        <path d="M0 770H800V860H0Z" fill="#3b2a1f" /><path d="M0 860H800V1000H0Z" fill="#2d352d" />
        <path d="M300 900C400 860 520 880 600 920C500 940 380 940 300 900Z" fill="#d89c62" />
      </g>
      <g stroke="#fbe7b8" strokeOpacity=".5" strokeWidth="4" fill="none"><path d="M330 880H570M360 900H540" /></g>
    </>
  ),
}

// Renders a painting at any size: a real photo when `art.image` exists, else the SVG stand-in.
// `eager` is for the first image on a page (above the fold); everything else lazy-loads.
// `sizes` describes the rendered width for srcset (default suits the artwork detail column). `full` skips srcset and
// uses the original file (zoom view). Without art.imageSet the plain `src` is used, exactly as before.
const DETAIL_SIZES = '(min-width: 1152px) 600px, (min-width: 768px) 55vw, 100vw'
export default function PaintingArt({ art, className = '', eager = false, sizes = DETAIL_SIZES, full = false }) {
  const label = `${art.title}, ${art.medium}`
  if (art.image) {
    const set = !full && Array.isArray(art.imageSet) ? art.imageSet : []
    const srcSet = set.length ? set.map((v) => `${mediaUrl(v.url)} ${v.width}w`).join(', ') : undefined
    return (
      <img src={mediaUrl(art.image)} srcSet={srcSet} sizes={srcSet ? sizes : undefined} alt={art.imageAlt || label} width={1000} height={Math.round(1000 / art.ar)}
        loading={eager ? 'eager' : 'lazy'} decoding="async" className={'w-full h-full object-cover block ' + className} />
    )
  }
  const body = P[art.slug]
  if (!body) return <div className={'w-full h-full bg-sand ' + className} role="img" aria-label={label} />
  return (
    <svg viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} className={'w-full h-full block ' + className}>
      {body}
    </svg>
  )
}
