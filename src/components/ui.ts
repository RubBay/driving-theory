/** Shared button styles (min height 48px: comfortable tap targets). */
const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-bold no-underline disabled:opacity-45'

export const btn = {
  primary: `${base} bg-sign text-sign-fg shadow-[inset_0_-3px_0_rgb(0_0_0/0.25)] hover:brightness-110`,
  secondary: `${base} border border-border bg-surface-2 text-fg hover:border-accent`,
  danger: `${base} border border-bad-border bg-transparent text-bad-fg hover:bg-bad-bg`,
}
