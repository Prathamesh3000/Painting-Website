import { Link } from 'react-router-dom'
import { isPrint, priceLabel } from '../data/artworks'
import { useArtwork } from '../lib/ContentContext'
import PaintingArt from './PaintingArt'

// Accepts a catalogue entry or a cart line (looked up by slug so both render the same picture).
export function ArtImage({ art, className = '', eager = false, sizes }) {
  const full = useArtwork(art.slug) || art
  return <PaintingArt art={full} className={className} eager={eager} sizes={sizes} />
}

export function Badge({ art }) {
  const label = !art.available ? 'Sold' : isPrint(art) ? 'Print' : art.price == null ? 'On enquiry' : 'Original'
  return (
    <span className="absolute top-3 left-3 text-xs px-2.5 py-0.5 rounded-sm bg-ivory text-charcoal border border-sand">
      {label}
    </span>
  )
}

// Card image is ~88% of a grid column (max 3 columns in a 72rem container).
const CARD_SIZES = '(min-width: 1152px) 330px, (min-width: 600px) 42vw, 88vw'

// Cards keep each painting's true proportions; the grid aligns them to the top, like works hung on a wall.
export default function ArtCard({ art, eager = false }) {
  return (
    <Link to={`/art/${art.slug}`} className="block no-underline" data-reveal>
      {/* Same-size mount for every work (so titles and prices line up); the painting keeps its true proportions inside it. */}
      <div className="relative flex items-center justify-center bg-panel border border-sand" style={{ aspectRatio: '4 / 5' }}>
        <div className="overflow-hidden" style={art.ar >= 0.8 ? { width: '88%', aspectRatio: art.ar } : { height: '88%', aspectRatio: art.ar }}>
          <ArtImage art={art} eager={eager} sizes={CARD_SIZES} />
        </div>
        <Badge art={art} />
      </div>
      <div className="flex flex-wrap justify-between items-baseline gap-x-3 mt-4">
        <h2 className="font-serif text-3xl">{art.title}</h2>
        <span className="font-medium whitespace-nowrap">{priceLabel(art)}</span>
      </div>
      <p className="text-sm text-mut">{art.medium} · {art.dimensions}</p>
    </Link>
  )
}
