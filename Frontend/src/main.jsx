import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Motion is opt-out: only visitors who have not asked for reduced motion get the `motion` class (see index.css).
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('motion')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
