import { useRef, useState } from 'react'
import PaintingArt from './PaintingArt'

const LEVELS = [1, 1.5, 2, 3]

// Click (or press Enter on) the artwork to open an enlarged, scrollable view.
// Works by keyboard (buttons, Tab, Esc), mouse and touch; the dialog is native so focus is trapped for us.
export default function ZoomViewer({ art, children }) {
  const dialog = useRef(null)
  const [i, setI] = useState(0)

  const open = () => { setI(0); dialog.current.showModal() }
  const step = (d) => setI((v) => Math.min(LEVELS.length - 1, Math.max(0, v + d)))

  return (
    <>
      <button type="button" className="zoom-trigger" onClick={open} aria-label={`Enlarge ${art.title}`}>
        {children}
      </button>
      <dialog ref={dialog} className="zoom-dialog" aria-label={`${art.title}, enlarged`}
        onClick={(e) => { if (e.target === dialog.current) dialog.current.close() }}>
        <div className="zoom-bar">
          <span className="font-serif text-2xl">{art.title}</span>
          <span className="flex gap-2 items-center">
            <button className="btn" onClick={() => step(-1)} disabled={i === 0} aria-label="Zoom out">−</button>
            <span aria-live="polite" className="text-sm min-w-12 text-center">{Math.round(LEVELS[i] * 100)}%</span>
            <button className="btn" onClick={() => step(1)} disabled={i === LEVELS.length - 1} aria-label="Zoom in">+</button>
            <button className="btn" onClick={() => dialog.current.close()}>Close</button>
          </span>
        </div>
        <div className="zoom-pane" tabIndex={0} aria-label="Enlarged artwork, scrollable">
          <div style={{ width: `${LEVELS[i] * 100}%`, maxWidth: LEVELS[i] === 1 ? '34rem' : 'none', aspectRatio: art.ar }}>
            <PaintingArt art={art} full />
          </div>
        </div>
      </dialog>
    </>
  )
}
