/** Shared button styles (min height 48px: comfortable tap targets). */
const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold no-underline disabled:opacity-45'

export const btn = {
  primary: `${base} bg-accent text-accent-fg`,
  secondary: `${base} border border-border bg-surface-2 text-fg`,
  danger: `${base} border border-bad-border bg-transparent text-bad-fg`,
}
