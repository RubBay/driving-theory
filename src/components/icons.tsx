/** Small shared icons (kept out of the lazy-loaded screens so Home can use them). */
export function HighlighterIcon({ filled = false, className = 'size-5' }: { filled?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 11-6 6v3h9l3-3" />
      <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" fill={filled ? 'currentColor' : 'none'} />
    </svg>
  )
}

/** Logo: a blue sign plate with a road receding to the horizon and a yellow centre dash. */
export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="var(--sign)" />
      <rect x="3" y="3" width="34" height="34" rx="7.5" fill="none" stroke="var(--sign-fg)" strokeWidth="2" />
      <path d="M17.5 11h5L30 33H10z" fill="var(--sign-fg)" />
      <path d="M20 14.5v3.5M20 21v4.5M20 28.5v4.5" stroke="var(--lane)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/** Chevron that points down when closed and up when open. */
export function ChevronIcon({ open, className = 'size-5' }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
