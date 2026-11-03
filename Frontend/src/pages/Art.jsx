import { Link } from 'react-router-dom'
import ArtCard from '../components/ArtCard'
import { useArtworks, useContent } from '../lib/ContentContext'

export default function Art() {
  const { artworks } = useArtworks()
  const heading = useContent('art.heading')
  const intro = useContent('art.intro')
  const customText = useContent('art.customText')
  const customLink = useContent('art.customLink')
  return (
    <div className="max-w-6xl mx-auto px-5 py-12 md:py-20">
      <h1 className="text-5xl md:text-7xl">{heading}</h1>
      <p className="mt-4 text-mut text-lg max-w-xl">
        {intro}
      </p>
      {/* Each work keeps its true proportions and hangs from the top of its row, like a gallery wall. */}
      <div className="mt-14 grid gap-x-8 gap-y-16 items-start [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
        {artworks.map((a, i) => <ArtCard key={a.slug} art={a} eager={i < 3} />)}
      </div>
      <p className="mt-24 text-center text-mut" data-reveal>
        {customText} <Link to="/custom-art" className="text-terracotta underline">{customLink}</Link>.
      </p>
    </div>
  )
}
