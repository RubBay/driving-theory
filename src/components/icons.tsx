/** Small shared icons (kept out of the lazy-loaded screens so Home can use them). */
export function HighlighterIcon({ filled = false, className = 'size-5' }: { filled?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 11-6 6v3h9l3-3" />
      <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" fill={filled ? 'currentColor' : 'none'} />
    </svg>
  )
}
