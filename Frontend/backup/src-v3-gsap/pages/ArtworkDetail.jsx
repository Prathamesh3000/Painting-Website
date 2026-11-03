import { Link, useParams } from 'react-router-dom'
import { ArtImage, Badge } from '../components/ArtCard'
import { artworks, canBuy, priceLabel } from '../data/artworks'
import { poems } from '../data/poems'
import { useCart } from '../context/CartContext'

export default function ArtworkDetail() {
  const { slug } = useParams()
  const art = artworks.find((a) => a.slug === slug)
  const { add, items, saved, toggleSaved } = useCart()

  if (!art) return <div className="max-w-3xl mx-auto px-5 py-24"><h1 className="text-4xl">Artwork not found</h1><Link to="/art" className="text-terracotta underline">Back to the gallery</Link></div>

  const poem = poems.find((p) => p.slug === art.poemSlug)
  const inCart = items.some((i) => i.slug === art.slug)

  return (
    <div className="max-w-6xl mx-auto px-5 py-8 grid md:grid-cols-2 gap-12">
      <div className="relative aspect-[4/5] bg-panel rounded-sm overflow-hidden">
        <ArtImage art={art} />
        <Badge art={art} />
      </div>

      <div>
        <Link to="/art" className="text-sm text-terracotta">← Gallery</Link>
        <h1 className="text-5xl mt-3">{art.title}</h1>
        <p className="mt-2 text-2xl">{priceLabel(art)}</p>
        <p className="mt-6 text-mut leading-relaxed">{art.description}</p>

        <dl className="mt-6 text-sm grid grid-cols-[8rem_1fr] gap-y-2">
          <dt className="text-mut">Type</dt><dd>Original painting (one of one)</dd>
          <dt className="text-mut">Medium</dt><dd>{art.medium}</dd>
          <dt className="text-mut">Size</dt><dd>{art.dimensions}</dd>
          {canBuy(art) && <><dt className="text-mut">Dispatch</dt><dd>{art.dispatch}</dd></>}
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          {canBuy(art) && (
            <button className="btn fill" disabled={inCart}
              onClick={() => add({ slug: art.slug, title: art.title, type: art.type, price: art.price })}>
              {inCart ? 'In your cart' : 'Add to cart'}
            </button>
          )}
          {art.available && art.price == null && <Link to="/contact" className="btn fill">Enquire</Link>}
          {!art.available && <><button className="btn" disabled>Sold</button><Link to="/custom-art" className="btn">Enquire about similar</Link></>}
          {art.available && <button className="btn" onClick={() => toggleSaved(art.slug)}>{saved.includes(art.slug) ? 'Saved' : 'Save'}</button>}
        </div>

        <p className="mt-6 text-sm text-mut">
          Each canvas is signed and comes with a certificate of authenticity. 100% of proceeds support children’s care and education.
          Delivery and returns: <Link to="/shipping-returns" className="underline">Shipping & returns</Link>.
        </p>

        {poem && (
          <aside className="mt-10 border-t border-sand pt-6">
            <p className="text-xs uppercase tracking-[0.3em] text-terracotta">Related poem</p>
            <Link to={`/poetry/${poem.slug}`} lang={poem.lang} className="font-serif text-2xl hover:text-terracotta">{poem.title}</Link>
          </aside>
        )}
      </div>
    </div>
  )
}
