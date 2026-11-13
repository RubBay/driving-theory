import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'

const MIN = 1
const MAX = 6

interface Transform {
  scale: number
  x: number
  y: number
}

/** Full-screen picture with pinch-zoom, wheel zoom, drag to pan and double-tap. */
export default function ImageViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [tf, setTf] = useState<Transform>({ scale: 1, x: 0, y: 0 })
  const tfRef = useRef(tf)
  const stage = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const moved = useRef(false)
  const lastTap = useRef(0)

  const apply = (next: Transform) => {
    const el = stage.current
    const scale = Math.min(MAX, Math.max(MIN, next.scale))
    // Keep the picture from being dragged completely off screen.
    const maxX = el ? (el.clientWidth * (scale - 1)) / 2 : 0
    const maxY = el ? (el.clientHeight * (scale - 1)) / 2 : 0
    const clamped = {
      scale,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    }
    tfRef.current = clamped
    setTf(clamped)
  }

  /** Zoom to `scale` keeping the screen point (px, py) fixed. */
  const zoomAt = (scale: number, px: number, py: number, from = tfRef.current) => {
    const el = stage.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const s = Math.min(MAX, Math.max(MIN, scale))
    const k = s / from.scale
    apply({ scale: s, x: px - cx - (px - cx - from.x) * k, y: py - cy - (py - cy - from.y) * k })
  }

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeBtn.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [onClose])

  // Wheel zoom needs a non-passive listener to prevent page scroll.
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomAt(tfRef.current.scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) moved.current = false
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const pts = pointers.current
    if (pts.size === 1) {
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true
      if (tfRef.current.scale > 1) apply({ ...tfRef.current, x: tfRef.current.x + dx, y: tfRef.current.y + dy })
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    } else if (pts.size === 2) {
      moved.current = true
      const [a0, b0] = [...pts.values()]
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const [a1, b1] = [...pts.values()]
      const d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y) || 1
      const d1 = Math.hypot(a1.x - b1.x, a1.y - b1.y)
      const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 }
      const m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 }
      // Pan by the midpoint movement, then zoom around the new midpoint.
      const panned = { ...tfRef.current, x: tfRef.current.x + m1.x - m0.x, y: tfRef.current.y + m1.y - m0.y }
      zoomAt(panned.scale * (d1 / d0), m1.x, m1.y, panned)
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const wasSingle = pointers.current.size === 1
    pointers.current.delete(e.pointerId)
    if (!wasSingle || moved.current || e.type === 'pointercancel') return
    const now = Date.now()
    if (now - lastTap.current < 320) {
      // Double tap / double click: toggle zoom.
      lastTap.current = 0
      if (tfRef.current.scale > 1) apply({ scale: 1, x: 0, y: 0 })
      else zoomAt(2.5, e.clientX, e.clientY)
    } else {
      lastTap.current = now
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-neutral-200">
        <p>{t('viewer.hint')}</p>
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          aria-label={t('viewer.close')}
          className="grid size-11 shrink-0 place-items-center rounded-lg bg-neutral-800 text-white"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div
        ref={stage}
        className="flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full bg-white"
          style={{
            transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.scale})`,
            cursor: tf.scale > 1 ? 'grab' : 'zoom-in',
          }}
        />
      </div>
    </div>
  )
}
