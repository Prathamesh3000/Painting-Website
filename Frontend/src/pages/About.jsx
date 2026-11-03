import { Link } from 'react-router-dom'
import { useContent } from '../lib/ContentContext'

export default function About() {
  const subtitle = useContent('about.subtitle')
  const cta = [useContent('about.cta1'), useContent('about.cta2'), useContent('about.cta3')]
  return (
    <div className="max-w-2xl mx-auto px-5 py-12 md:py-20">
      <p className="text-xs uppercase tracking-[0.3em] text-terracotta mb-4">About</p>
      <h1 className="text-5xl md:text-6xl">Kalpana Jagtap</h1>
      <p className="mt-2 text-mut">{subtitle}</p>

      <div className="aspect-[16/9] bg-panel border border-sand my-10 flex items-center justify-center text-mut text-sm">
        Portrait or studio photograph
      </div>

      <Section k="about.story" />
      <Section k="about.journey" />
      <Section k="about.role" />
      <Section k="about.giving" />

      <div className="mt-12 flex flex-wrap gap-4">
        <Link to="/art" className="btn btn-dark">{cta[0]}</Link>
        <Link to="/poetry" className="btn btn-light">{cta[1]}</Link>
        <Link to="/contact" className="btn btn-light">{cta[2]}</Link>
      </div>
    </div>
  )
}

function Section({ k }) {
  const title = useContent(k + '.title')
  const children = useContent(k + '.text')
  return (
    <section className="mt-12" data-reveal>
      <h2 className="text-4xl">{title}</h2>
      <p className="mt-3 text-lg leading-relaxed text-mut">{children}</p>
    </section>
  )
}
