import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { ContentProvider } from './lib/ContentContext'
import Layout from './components/Layout'
import Home from './pages/Home'

// The homepage ships in the main bundle; every other page is fetched on first visit to keep the first load small.
// The admin panel is its own chunk, never downloaded by public visitors.
const AdminApp = lazy(() => import('./admin/AdminApp'))
const About = lazy(() => import('./pages/About'))
const Art = lazy(() => import('./pages/Art'))
const ArtworkDetail = lazy(() => import('./pages/ArtworkDetail'))
const Poetry = lazy(() => import('./pages/Poetry'))
const PoemDetail = lazy(() => import('./pages/PoemDetail'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'))
const Track = lazy(() => import('./pages/Track'))
const Contact = lazy(() => import('./pages/Contact').then((m) => ({ default: m.Contact })))
const CustomArt = lazy(() => import('./pages/Contact').then((m) => ({ default: m.CustomArt })))
const Faqs = lazy(() => import('./pages/Info').then((m) => ({ default: m.Faqs })))
const NotFound = lazy(() => import('./pages/Info').then((m) => ({ default: m.NotFound })))
const Privacy = lazy(() => import('./pages/Info').then((m) => ({ default: m.Privacy })))
const ShippingReturns = lazy(() => import('./pages/Info').then((m) => ({ default: m.ShippingReturns })))
const Terms = lazy(() => import('./pages/Info').then((m) => ({ default: m.Terms })))

export default function App() {
  // The admin panel is its own app: it has its own router (basename /admin, so its internal absolute links such as
  // "/orders" resolve to /admin/orders) and does not need the public cart or content providers.
  const { pathname } = window.location
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <BrowserRouter basename="/admin">
        <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
          <AdminApp />
        </Suspense>
      </BrowserRouter>
    )
  }
  return (
    <ContentProvider>
    <CartProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="art" element={<Art />} />
              <Route path="art/:slug" element={<ArtworkDetail />} />
              <Route path="poetry" element={<Poetry />} />
              <Route path="poetry/:slug" element={<PoemDetail />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="order/:orderNumber" element={<OrderConfirmation />} />
              <Route path="track" element={<Track />} />
              <Route path="contact" element={<Contact />} />
              <Route path="custom-art" element={<CustomArt />} />
              <Route path="shipping-returns" element={<ShippingReturns />} />
              <Route path="faqs" element={<Faqs />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="terms" element={<Terms />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </CartProvider>
    </ContentProvider>
  )
}
