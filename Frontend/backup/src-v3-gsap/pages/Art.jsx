import { Link } from 'react-router-dom'
import ArtCard from '../components/ArtCard'
import { artworks } from '../data/artworks'

export default function Art() {
  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <h1 className="text-5xl">Gallery</h1>
      <p className="mt-2 text-mut max-w-xl">
        Original works in oil and acrylic. Each canvas is signed and comes with a certificate of authenticity.
        100% of artwork proceeds support children’s care and education.
      </p>
      <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
        {artworks.map((a) => <ArtCard key={a.slug} art={a} />)}
      </div>
      <p className="mt-16 text-center text-mut">
        Looking for something specific? <Link to="/custom-art" className="text-terracotta underline underline-offset-4">Commission a custom painting</Link>.
      </p>
    </div>
  )
}
