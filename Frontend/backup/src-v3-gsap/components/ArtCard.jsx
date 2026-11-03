import { Link } from 'react-router-dom'
import { artworks, priceLabel } from '../data/artworks'
import PaintingArt from './PaintingArt'

// Accepts a catalogue entry or a cart line (looked up by slug so both render the same picture).
export function ArtImage({ art, className = '' }) {
  const full = artworks.find((a) => a.slug === art.slug) || art
  return <PaintingArt art={full} className={className} />
}

export function Badge({ art }) {
  const label = !art.available ? 'Sold' : art.price == null ? 'On enquiry' : 'Original'
  return (
    <span className={'absolute top-3 left-3 text-xs px-2.5 py-0.5 rounded-sm ' + (!art.available ? 'bg-[#493B30] text-white' : 'bg-ivory text-charcoal')}>
      {label}
    </span>
  )
}

export default function ArtCard({ art }) {
  return (
    <Link to={`/art/${art.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-panel rounded-sm">
        <div className="w-full h-full transition-transform duration-[1200ms] group-hover:scale-105"><ArtImage art={art} /></div>
        <Badge art={art} />
      </div>
      <div className="flex flex-wrap justify-between items-baseline gap-x-3 mt-4">
        <h3 className="font-serif text-2xl">{art.title}</h3>
        <span className="font-medium whitespace-nowrap">{priceLabel(art)}</span>
      </div>
      <p className="text-sm text-mut">{art.medium} · {art.dimensions}</p>
    </Link>
  )
}
