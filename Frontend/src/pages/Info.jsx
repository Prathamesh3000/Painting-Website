import { Link } from 'react-router-dom'
import { useContent } from '../lib/ContentContext'

// Placeholder policy pages. Replace the copy with the owner's real policies (and have privacy/terms legally reviewed).
function Page({ title, children }) {
  return (
    <div className="max-w-2xl mx-auto px-5 py-16">
      <h1 className="text-5xl">{title}</h1>
      <div className="mt-6 space-y-4 text-mut leading-relaxed">{children}</div>
    </div>
  )
}

// Editable policy text: a blank line starts a new paragraph.
function Paragraphs({ text }) {
  return String(text).split(/\r?\n\s*\n/).filter((p) => p.trim()).map((p, i) => <p key={i}>{p}</p>)
}

function Policy({ k }) {
  return <Page title={useContent(`pages.${k}.title`)}><Paragraphs text={useContent(`pages.${k}.body`)} /></Page>
}

// "custom art form" in an answer links to the commission form.
const LINK_PHRASE = 'custom art form'
function Answer({ text }) {
  const at = text.indexOf(LINK_PHRASE)
  if (at < 0) return text
  return <>{text.slice(0, at)}<Link to="/custom-art" className="underline text-terracotta">{LINK_PHRASE}</Link>{text.slice(at + LINK_PHRASE.length)}</>
}

export const ShippingReturns = () => <Policy k="shipping" />

export const Faqs = () => {
  const items = useContent('pages.faqs.items')
  const note = useContent('pages.faqs.note')
  return (
    <Page title={useContent('pages.faqs.title')}>
      {items.map((f, i) => <p key={i}><strong>{f.q}</strong><br /><Answer text={f.a || ''} /></p>)}
      {note && <p className="text-sm">{note}</p>}
    </Page>
  )
}

export const Privacy = () => <Policy k="privacy" />

export const Terms = () => <Policy k="terms" />

export const NotFound = () => (
  <Page title="Page not found"><Link to="/" className="underline text-terracotta">Return home</Link></Page>
)
