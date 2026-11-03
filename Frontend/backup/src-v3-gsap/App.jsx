import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import About from './pages/About'
import Art from './pages/Art'
import ArtworkDetail from './pages/ArtworkDetail'
import Poetry from './pages/Poetry'
import PoemDetail from './pages/PoemDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import Track from './pages/Track'
import { Contact, CustomArt } from './pages/Contact'
import { Faqs, NotFound, Privacy, ShippingReturns, Terms } from './pages/Info'

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </CartProvider>
  )
}
