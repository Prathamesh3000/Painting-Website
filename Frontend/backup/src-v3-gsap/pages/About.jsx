import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-terracotta mb-4">About</p>
      <h1 className="text-5xl md:text-6xl">Kalpana Jagtap</h1>
      <p className="mt-2 text-charcoal/70">Public servant · Fine artist · Philanthropist</p>

      <div className="aspect-[16/9] bg-sand my-10 flex items-center justify-center text-charcoal/50 text-sm">
        Portrait or studio photograph
      </div>

      <Section title="Her story">
        Placeholder biography. Replace this text with Kalpana’s own words about who she is, where she comes from and
        what drives her work. Keep it personal and readable.
      </Section>
      <Section title="The artist’s journey">
        Placeholder text about the creative process, studio, materials and the themes that recur in the paintings.
      </Section>
      <Section title="Her professional role">
        Placeholder — include only if this matters to the public identity she wants.
      </Section>
      <Section title="Initiatives & giving">
        Placeholder — add verified, approved details of causes and initiatives only.
      </Section>

      <div className="mt-12 flex flex-wrap gap-4">
        <Link to="/art" className="btn btn-dark">Explore Art</Link>
        <Link to="/poetry" className="btn btn-light">Read Poetry</Link>
        <Link to="/contact" className="btn btn-light">Contact</Link>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-3xl">{title}</h2>
      <p className="mt-2 text-charcoal/80 leading-relaxed">{children}</p>
    </section>
  )
}
