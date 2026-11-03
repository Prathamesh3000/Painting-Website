import { Link, useSearchParams } from 'react-router-dom'
import { poems } from '../data/poems'

const langs = [['', 'All'], ['en', 'English'], ['mr', 'मराठी']]

export default function Poetry() {
  const [params, setParams] = useSearchParams()
  const lang = params.get('lang') || ''
  const list = poems.filter((p) => !lang || p.lang === lang)

  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <h1 className="text-5xl">Poetry Journal</h1>
      <p className="mt-2 text-charcoal/70">Poems in English and मराठी.</p>

      <div className="mt-8 flex gap-2" role="group" aria-label="Language">
        {langs.map(([v, l]) => (
          <button key={v} onClick={() => setParams(v ? { lang: v } : {})}
            className={'px-4 py-1.5 text-sm border ' + (lang === v ? 'bg-charcoal text-ivory border-charcoal' : 'border-sand hover:border-charcoal')}>
            {l}
          </button>
        ))}
      </div>

      <ul className="mt-10 divide-y divide-sand border-y border-sand">
        {list.map((p) => (
          <li key={p.slug}>
            <Link to={`/poetry/${p.slug}`} className="flex items-baseline justify-between py-5 group">
              <span lang={p.lang} className="font-serif text-3xl group-hover:text-terracotta">{p.title}</span>
              <span className="text-xs uppercase tracking-widest text-charcoal/60">{p.lang === 'mr' ? 'मराठी' : 'English'} · {p.theme}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
