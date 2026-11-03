import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArtImage, Badge } from '../components/ArtCard'
import ZoomViewer from '../components/ZoomViewer'
import { canBuy, inr, isPrint, priceLabel } from '../data/artworks'
import { useArtwork, useArtworks, useContent, usePoem } from '../lib/ContentContext'
import { useCart } from '../context/CartContext'

export default function ArtworkDetail() {
  const { slug } = useParams()
  const art = useArtwork(slug)
  const { loading } = useArtworks()
  const poem = usePoem(art?.poemSlug)
  const note = useContent('art.detailNote')
  const { add, items, saved, toggleSaved } = useCart()
  const [pick, setPick] = useState(0)

  // Not in the bundled data but the API may still be loading: wait rather than flash "not found".
  if (!art && loading) return <div className="max-w-3xl mx-auto px-5 py-24" aria-busy="true" />
  if (!art) return <div className="max-w-3xl mx-auto px-5 py-24"><h1 className="text-4xl">Artwork not found</h1><Link to="/art" className="text-terracotta underline">Back to the gallery</Link></div>

  const print = isPrint(art)
  const variant = print ? art.variants[Math.min(pick, art.variants.length - 1)] : null
  const price = print ? variant.price : art.price
  const line = print
    ? { slug: art.slug, title: art.title, type: 'print', variant: variant.label, price }
    : { slug: art.slug, title: art.title, type: art.type, price }
  const inCart = items.some((i) => i.slug === art.slug && (i.variant || '') === (variant?.label || ''))

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 md:py-16 grid gap-10 md:gap-16 md:grid-cols-[3fr_2fr] items-start">
      {/* The painting stays in view while the details scroll beside it. */}
      <div className="md:sticky md:top-24">
        <div className="relative bg-panel border border-sand p-3 md:p-6">
          <ZoomViewer art={art}>
            <div className="mx-auto overflow-hidden" style={{ aspectRatio: art.ar, maxHeight: '78vh' }}>
              <ArtImage art={art} eager />
            </div>
          </ZoomViewer>
          <Badge art={art} />
        </div>
        <p className="mt-2 text-sm text-mut">Select the painting to enlarge it.</p>
      </div>

      <div>
        <Link to="/art" className="text-sm text-terracotta underline">← Gallery</Link>
        <h1 className="text-5xl md:text-6xl mt-4">{art.title}</h1>
        <p className="mt-3 text-2xl">{print && art.available ? inr(price) : priceLabel(art)}</p>
        <p className="mt-6 text-mut leading-relaxed text-lg">{art.description}</p>

        <dl className="mt-8 text-sm grid grid-cols-[7rem_1fr] gap-y-2 border-t border-sand pt-6">
          <dt className="text-mut">Type</dt><dd>{print ? 'Canvas print' : 'Original painting (one of one)'}</dd>
          <dt className="text-mut">Medium</dt><dd>{art.medium}</dd>
          <dt className="text-mut">Size</dt><dd>{art.dimensions}</dd>
          {canBuy(art) && <><dt className="text-mut">Dispatch</dt><dd>{art.dispatch}</dd></>}
        </dl>

        {print && art.available && (
          <div className="mt-6">
            <label htmlFor="variant" className="text-sm">Size</label>
            <select id="variant" className="input mt-1 max-w-xs" value={pick} onChange={(e) => setPick(+e.target.value)}>
              {art.variants.map((v, i) => <option key={v.label} value={i}>{v.label} — {inr(v.price)}</option>)}
            </select>
          </div>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          {canBuy(art) && (
            <button className="btn fill" disabled={inCart}
              onClick={() => add(line)}>
              {inCart ? 'In your cart' : 'Add to cart'}
            </button>
          )}
          {art.available && !print && art.price == null && <Link to="/contact" className="btn fill">Enquire</Link>}
          {!art.available && <><button className="btn" disabled>Sold</button><Link to="/custom-art" className="btn">Enquire about similar</Link></>}
          {art.available && <button className="btn" onClick={() => toggleSaved(art.slug)}>{saved.includes(art.slug) ? 'Saved' : 'Save'}</button>}
        </div>

        <p className="mt-8 text-sm text-mut">
          {note}{' '}
          Delivery and returns: <Link to="/shipping-returns" className="underline">Shipping & returns</Link>.
        </p>

        {poem && (
          <aside className="mt-10 border-t border-sand pt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-mut">Related poem</p>
            <Link to={`/poetry/${poem.slug}`} lang={poem.lang} className="font-serif text-3xl text-terracotta underline">{poem.title}</Link>
          </aside>
        )}
      </div>
    </div>
  )
}
