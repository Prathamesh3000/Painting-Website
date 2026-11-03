import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useArtworks, usePoems } from '../lib/ContentContext'
import { ArtImage } from '../components/ArtCard'

export default function PoemDetail() {
  const { slug } = useParams()
  const { poems, loading } = usePoems()
  const { artworks } = useArtworks()
  const idx = poems.findIndex((p) => p.slug === slug)
  const [copied, setCopied] = useState(false)

  if (idx < 0 && loading) return <div className="max-w-3xl mx-auto px-5 py-24" aria-busy="true" />
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
    <article className="mx-auto px-5 py-12 md:py-20" style={{ maxWidth: 'calc(var(--measure-poem) + 2.5rem)' }} lang={poem.lang}>
      <Link to={`/poetry?lang=${poem.lang}`} lang="en" className="text-sm text-terracotta underline">← Poetry Journal</Link>
      <h1 className="text-5xl md:text-6xl mt-6 mb-12">{poem.title}</h1>
      <div className="poem-text">
        {poem.body.split('\n').map((line, i) => line === ''
          ? <span key={i} className="block h-8" aria-hidden="true" />
          : <span key={i} className="poem-line block" style={{ '--i': i }}>{line}</span>)}
      </div>

      <div className="mt-14" lang="en">
        <button className="btn" onClick={share}>{copied ? 'Link copied' : 'Share'}</button>
      </div>

      {art && (
        <Link to={`/art/${art.slug}`} lang="en" className="mt-16 flex gap-4 items-center border border-sand p-4 no-underline">
          <div className="w-20 shrink-0 overflow-hidden" style={{ aspectRatio: art.ar }}><ArtImage art={art} /></div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-mut">Related artwork</p>
            <p className="font-serif text-3xl">{art.title}</p>
          </div>
        </Link>
      )}

      <nav className="mt-16 flex justify-between gap-4 text-base" lang="en" aria-label="Poem navigation">
        {prev ? <Link to={`/poetry/${prev.slug}`} className="underline inline-block py-3">← <span lang={prev.lang}>{prev.title}</span></Link> : <span />}
        {next ? <Link to={`/poetry/${next.slug}`} className="underline inline-block py-3"><span lang={next.lang}>{next.title}</span> →</Link> : <span />}
      </nav>
    </article>
  )
}
