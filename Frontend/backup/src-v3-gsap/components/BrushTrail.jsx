import { useEffect, useRef } from 'react'

// Painted-stroke cursor trail from the client's prototype. Fine pointers only; off for reduced motion.
export default function BrushTrail() {
  const ref = useRef(null)

  useEffect(() => {
    if (!matchMedia('(pointer:fine)').matches || matchMedia('(prefers-reduced-motion:reduce)').matches) return
    const c = ref.current
    const x = c.getContext('2d')
    const cols = ['#A87549', '#D8C6AE', '#493B30', '#343D34']
    let px = null, py = 0, ci = 0, hot = 0, raf = 0

    const fit = () => { c.width = innerWidth; c.height = innerHeight }
    fit()

    const move = (e) => {
      if (px !== null) {
        x.globalCompositeOperation = 'source-over'
        x.strokeStyle = cols[ci]
        x.globalAlpha = 0.55
        x.lineWidth = 10 + Math.min(22, Math.hypot(e.clientX - px, e.clientY - py) / 2)
        x.lineCap = 'round'
        x.beginPath(); x.moveTo(px, py); x.lineTo(e.clientX, e.clientY); x.stroke()
        hot = 90
      }
      px = e.clientX; py = e.clientY
      if (Math.random() < 0.03) ci = (ci + 1) % cols.length
    }
    const fade = () => {
      if (hot > 0) {
        hot--
        x.globalCompositeOperation = 'destination-out'
        x.globalAlpha = 0.07
        x.fillRect(0, 0, c.width, c.height)
      }
      raf = requestAnimationFrame(fade)
    }
    addEventListener('resize', fit)
    addEventListener('pointermove', move)
    fade()
    return () => { removeEventListener('resize', fit); removeEventListener('pointermove', move); cancelAnimationFrame(raf) }
  }, [])

  return <canvas id="brush" ref={ref} aria-hidden="true" />
}
