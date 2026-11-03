import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { poems } from '../data/poems'
import { artworks } from '../data/artworks'
import { ArtImage } from '../components/ArtCard'

export default function PoemDetail() {
  const { slug } = useParams()
  const idx = poems.findIndex((p) => p.slug === slug)
  const [copied, setCopied] = useState(false)

  if (idx < 0) return <div className="max-w-3xl mx-auto px-5 py-24"><h1 className="text-4xl">Poem not found</h1><Link to="/poetry" className="text-terracotta underline">Back to Poetry</Link></div>

  const poem = poems[idx]
  const prev = poems[idx - 1]
  const next = poems[idx + 1]
  const art = artworks.find((a) => a.poemSlug === poem.slug)

  const share = async () => {
    const data = { title: poem.title, url: window.location.href }
    if (navigator.share) { try { await navigator.share(data) } catch { /* cancelled */ } return }
    try { await navigator.clipboard.writeText(data.url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard unavailable */ }
  }

  return (
    <article className="max-w-xl mx-auto px-5 py-16" lang={poem.lang}>
      <Link to={`/poetry?lang=${poem.lang}`} lang="en" className="text-sm text-terracotta">← Poetry Journal</Link>
      <h1 className="text-5xl mt-4 mb-10">{poem.title}</h1>
      <p className="poem-text">{poem.body}</p>

      <div className="mt-10" lang="en">
        <button className="btn btn-light" onClick={share}>{copied ? 'Link copied' : 'Share'}</button>
      </div>

      {art && (
        <Link to={`/art/${art.slug}`} lang="en" className="mt-14 flex gap-4 items-center border border-sand p-4 hover:border-terracotta">
          <div className="w-20 h-24 shrink-0"><ArtImage art={art} /></div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-terracotta">Related artwork</p>
            <p className="font-serif text-2xl">{art.title}</p>
          </div>
        </Link>
      )}

      <nav className="mt-14 flex justify-between text-sm" lang="en" aria-label="Poem navigation">
        {prev ? <Link to={`/poetry/${prev.slug}`} className="hover:text-terracotta">← {prev.title}</Link> : <span />}
        {next ? <Link to={`/poetry/${next.slug}`} className="hover:text-terracotta">{next.title} →</Link> : <span />}
      </nav>
    </article>
  )
}
