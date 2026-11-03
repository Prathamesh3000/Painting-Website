// Editable site text. Each field has a stable `key`, a default (what the site shows today) and a type for the admin editor.
// The public site reads defaults from here and overrides them with whatever an admin saved (see lib/ContentContext.jsx).
// Keys must match /^[a-z0-9]+(\.[A-Za-z0-9]+)*$/ (see Backend/docs/ADMIN_API.md). Never rename a key once published.
const t = (key, group, label, def, help) => ({ key, group, label, type: 'text', default: def, ...(help ? { help } : {}) })
const ta = (key, group, label, def, help) => ({ key, group, label, type: 'textarea', default: def, ...(help ? { help } : {}) })

const PARAS = 'Leave a blank line between paragraphs.'

export const CONTENT_FIELDS = [
  // ---- Site-wide ----
  t('global.announcement', 'Site-wide', 'Announcement bar', '100% of artwork proceeds support children’s care and education',
    'Shown above the menu on every page. Leave empty to hide the bar.'),
  t('global.footerTagline', 'Site-wide', 'Footer tagline', 'Where art meets purpose.'),
  {
    key: 'global.social', group: 'Site-wide', label: 'Social links', type: 'list',
    help: 'Shown in the footer. Use full web addresses starting with https://.',
    itemFields: [{ key: 'name', label: 'Name', type: 'text' }, { key: 'url', label: 'Web address', type: 'text' }],
    default: [
      { name: 'Instagram', url: 'https://www.instagram.com/' },
      { name: 'Facebook', url: 'https://www.facebook.com/' },
      { name: 'YouTube', url: 'https://www.youtube.com/' },
      { name: 'Pinterest', url: 'https://www.pinterest.com/' },
    ],
  },

  // ---- Home ----
  t('home.heroTitle', 'Home', 'Hero title', 'Where Art Meets Purpose.'),
  ta('home.heroText', 'Home', 'Hero paragraph',
    'Discover original paintings inspired by nature, humanity and the beauty of life. Own a piece of art and become part of a meaningful journey.'),
  t('home.heroCta1', 'Home', 'Hero button 1', 'Explore original art'),
  t('home.heroCta2', 'Home', 'Hero button 2', 'Discover her story'),
  t('home.galleryHeading', 'Home', 'Gallery heading', 'A collection of stories'),
  ta('home.galleryLead', 'Home', 'Gallery introduction',
    'Original works in oil and acrylic. Each canvas is signed, comes with a certificate of authenticity, and carries the story of how it was made.'),
  t('home.zoomHeading', 'Home', 'Close-up heading', 'Look closer.'),
  ta('home.zoomLead', 'Home', 'Close-up introduction',
    'Every painting is built from layers of oil and acrylic. Zoom in and you can see the ridges the brush left behind, which no print can copy.'),
  t('home.aboutHeading', 'Home', 'Artist band heading', 'The artist behind every canvas'),
  ta('home.aboutText', 'Home', 'Artist band paragraph',
    'Kalpana Jagtap is a public servant and fine artist whose life brings together governance, artistic expression and compassion. Through paintings and poetry, she explores nature, humanity and philosophical thought.'),
  t('home.aboutCta', 'Home', 'Artist band button', 'Read her full story'),
  {
    key: 'home.pillars', group: 'Home', label: 'Three pillars', type: 'list',
    itemFields: [{ key: 'name', label: 'Name', type: 'text' }, { key: 'desc', label: 'Description', type: 'text' }],
    default: [
      { name: 'Governance', desc: 'Service and administrative excellence.' },
      { name: 'Art & Poetry', desc: 'Nature, humanity and philosophy.' },
      { name: 'Children’s Care', desc: 'Supporting education and vulnerable children.' },
    ],
  },
  t('home.purposeBig', 'Home', 'Purpose: big figure', '100%'),
  t('home.purposeHeading', 'Home', 'Purpose: heading', 'of artwork sale proceeds support children’s care and education.'),
  ta('home.purposeText', 'Home', 'Purpose: paragraph',
    'Every original artwork contributes to safe shelter, nutritious meals, academic scholarships and art therapy for vulnerable children across rural Maharashtra.'),
  {
    key: 'home.purposePills', group: 'Home', label: 'Purpose: short points', type: 'list',
    itemFields: [{ key: 'text', label: 'Text', type: 'text' }],
    default: [{ text: 'Safe shelter' }, { text: 'Nutritious meals' }, { text: 'Scholarships' }, { text: 'Art therapy' }],
  },
  t('home.purposeCta', 'Home', 'Purpose: button', 'See the impact behind your purchase'),
  ta('home.poemQuote', 'Home', 'Poem quote',
    'Every brushstroke begins as a quiet question, and every canvas answers with light, patience and a little courage.'),
  t('home.poemCaption', 'Home', 'Poem quote caption', 'Selected poems, reflections and the stories behind each painting.'),
  t('home.poemLink', 'Home', 'Poem quote link label', 'Read the poetry journal'),
  t('home.newsletterHeading', 'Home', 'Newsletter heading', 'Stay inspired by art, poetry and meaningful stories.'),

  // ---- Gallery ----
  t('art.heading', 'Gallery', 'Gallery page heading', 'Gallery'),
  ta('art.intro', 'Gallery', 'Gallery page introduction',
    'Original works in oil and acrylic. Each canvas is signed and comes with a certificate of authenticity. 100% of artwork proceeds support children’s care and education.'),
  t('art.customText', 'Gallery', 'Commission prompt', 'Looking for something specific?'),
  t('art.customLink', 'Gallery', 'Commission link label', 'Commission a custom painting'),
  t('art.detailNote', 'Gallery', 'Artwork page note',
    'Each canvas is signed and comes with a certificate of authenticity. 100% of proceeds support children’s care and education.',
    'Shown under the buttons on every artwork page, followed by a link to Shipping & returns.'),

  // ---- Poetry ----
  t('poetry.heading', 'Poetry', 'Poetry page heading', 'Poetry Journal'),
  t('poetry.intro', 'Poetry', 'Poetry page introduction', 'Poems in English and मराठी.'),

  // ---- About ----
  t('about.subtitle', 'About', 'Subtitle', 'Public servant · Fine artist · Philanthropist'),
  t('about.story.title', 'About', 'Section 1: title', 'Her story'),
  ta('about.story.text', 'About', 'Section 1: text',
    'Placeholder biography. Replace this text with Kalpana’s own words about who she is, where she comes from and what drives her work. Keep it personal and readable.'),
  t('about.journey.title', 'About', 'Section 2: title', 'The artist’s journey'),
  ta('about.journey.text', 'About', 'Section 2: text',
    'Placeholder text about the creative process, studio, materials and the themes that recur in the paintings.'),
  t('about.role.title', 'About', 'Section 3: title', 'Her professional role'),
  ta('about.role.text', 'About', 'Section 3: text', 'Placeholder — include only if this matters to the public identity she wants.'),
  t('about.giving.title', 'About', 'Section 4: title', 'Initiatives & giving'),
  ta('about.giving.text', 'About', 'Section 4: text', 'Placeholder — add verified, approved details of causes and initiatives only.'),
  t('about.cta1', 'About', 'Button 1', 'Explore Art'),
  t('about.cta2', 'About', 'Button 2', 'Read Poetry'),
  t('about.cta3', 'About', 'Button 3', 'Contact'),

  // ---- Checkout ----
  t('checkout.intro', 'Checkout', 'Checkout introduction', 'Guest checkout — no account needed. Delivery within India.'),
  ta('checkout.payment', 'Checkout', 'Payment explanation',
    'Online payment will be connected once a payment gateway is chosen. For now, placing the order reserves your items and Kalpana’s team will contact you with payment details.'),
  t('order.confirmNote', 'Checkout', 'Order confirmation note', 'A confirmation will be sent to your email once email delivery is set up.'),

  // ---- Pages ----
  t('contact.intro', 'Pages', 'Contact page introduction', 'General enquiries and collaborations.'),
  t('customArt.intro', 'Pages', 'Custom art page introduction', 'Commission a painting. Share your idea and Kalpana will follow up.'),
  t('pages.shipping.title', 'Pages', 'Shipping & returns: title', 'Shipping & returns'),
  ta('pages.shipping.body', 'Pages', 'Shipping & returns: text',
    'Placeholder: delivery within India only. Prints dispatch in 7–10 days, originals in 5–7 days. Replace with confirmed dispatch times, shipping charges and the return policy.', PARAS),
  t('pages.faqs.title', 'Pages', 'FAQs: title', 'FAQs'),
  {
    key: 'pages.faqs.items', group: 'Pages', label: 'FAQs: questions and answers', type: 'list',
    itemFields: [{ key: 'q', label: 'Question', type: 'text' }, { key: 'a', label: 'Answer', type: 'textarea' }],
    default: [
      { q: 'Are originals unique?', a: 'Yes — each original is a one-of-a-kind painting and is removed from sale once sold.' },
      { q: 'Do you ship outside India?', a: 'Not at launch.' },
      { q: 'Can I commission a painting?', a: 'Yes — use the custom art form.' },
    ],
    help: 'The words “custom art form” in an answer link to the custom art page.',
  },
  t('pages.faqs.note', 'Pages', 'FAQs: footnote', 'Placeholder answers — update with confirmed details.'),
  t('pages.privacy.title', 'Pages', 'Privacy policy: title', 'Privacy policy'),
  ta('pages.privacy.body', 'Pages', 'Privacy policy: text',
    'Placeholder. A privacy policy covering the data collected at checkout and through forms must be added before launch.', PARAS),
  t('pages.terms.title', 'Pages', 'Terms: title', 'Terms'),
  ta('pages.terms.body', 'Pages', 'Terms: text', 'Placeholder. Terms of sale and site use must be added before launch.', PARAS),
]

export const contentDefaults = Object.fromEntries(CONTENT_FIELDS.map((f) => [f.key, f.default]))
export const contentTypes = Object.fromEntries(CONTENT_FIELDS.map((f) => [f.key, f.type]))
