import { Link } from 'react-router-dom'

// Placeholder policy pages. Replace the copy with the owner's real policies (and have privacy/terms legally reviewed).
function Page({ title, children }) {
  return (
    <div className="max-w-2xl mx-auto px-5 py-16">
      <h1 className="text-5xl">{title}</h1>
      <div className="mt-6 space-y-4 text-charcoal/80 leading-relaxed">{children}</div>
    </div>
  )
}

export const ShippingReturns = () => (
  <Page title="Shipping & returns">
    <p>Placeholder: delivery within India only. Prints dispatch in 7–10 days, originals in 5–7 days. Replace with confirmed dispatch times, shipping charges and the return policy.</p>
  </Page>
)

export const Faqs = () => (
  <Page title="FAQs">
    <p><strong>Are originals unique?</strong><br />Yes — each original is a one-of-a-kind painting and is removed from sale once sold.</p>
    <p><strong>Do you ship outside India?</strong><br />Not at launch.</p>
    <p><strong>Can I commission a painting?</strong><br />Yes — use the <Link to="/custom-art" className="underline text-terracotta">custom art form</Link>.</p>
    <p className="text-sm">Placeholder answers — update with confirmed details.</p>
  </Page>
)

export const Privacy = () => (
  <Page title="Privacy policy"><p>Placeholder. A privacy policy covering the data collected at checkout and through forms must be added before launch.</p></Page>
)

export const Terms = () => (
  <Page title="Terms"><p>Placeholder. Terms of sale and site use must be added before launch.</p></Page>
)

export const NotFound = () => (
  <Page title="Page not found"><Link to="/" className="underline text-terracotta">Return home</Link></Page>
)
