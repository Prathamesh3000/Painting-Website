// Desktop-only hero parallax. GSAP + ScrollTrigger live in this file alone and are loaded with a dynamic import
// (see Home.jsx), so phones and reduced-motion visitors never download them.
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// The painting inside its frame drifts 4% against the scroll (scrub: 1.5 adds a gentle lag). Returns a cleanup function.
export function heroParallax(scope) {
  const ctx = gsap.context(() => {
    gsap.fromTo('.hero .frame-inner', { yPercent: -4 }, {
      yPercent: 4, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.5 },
    })
  }, scope)
  return () => ctx.revert()
}
