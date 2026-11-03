import { Link, useSearchParams } from 'react-router-dom'
import { useContent, usePoems } from '../lib/ContentContext'

const langs = [['', 'All'], ['en', 'English'], ['mr', 'मराठी']]

export default function Poetry() {
  const [params, setParams] = useSearchParams()
  const { poems } = usePoems()
  const heading = useContent('poetry.heading')
  const intro = useContent('poetry.intro')
  const lang = params.get('lang') || ''
  const list = poems.filter((p) => !lang || p.lang === lang)

  return (
    <div className="max-w-2xl mx-auto px-5 py-12 md:py-20">
      <h1 className="text-5xl md:text-7xl">{heading}</h1>
      <p className="mt-4 text-mut text-lg">{intro}</p>

      <div className="mt-10 flex gap-2" role="group" aria-label="Language">
        {langs.map(([v, l]) => (
          <button key={v} onClick={() => setParams(v ? { lang: v } : {})} aria-pressed={lang === v}
            className={'px-4 py-2 text-sm border ' + (lang === v ? 'bg-charcoal text-ivory border-charcoal' : 'border-mut')}>
            {l}
          </button>
        ))}
      </div>

      <ul className="mt-12 divide-y divide-sand border-y border-sand">
        {list.map((p) => (
          <li key={p.slug} data-reveal>
            <Link to={`/poetry/${p.slug}`} className="flex flex-wrap items-baseline justify-between gap-x-6 py-6 no-underline">
              <span lang={p.lang} className="font-serif text-4xl">{p.title}</span>
              <span className="text-xs uppercase tracking-widest text-mut">{p.lang === 'mr' ? 'मराठी' : 'English'} · {p.theme}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
