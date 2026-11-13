import { useSyncExternalStore } from 'react'

/** Hash routes keep the site fully static: no server rewrites needed. */
export type Route =
  | { name: 'home' }
  | { name: 'practice'; groupId: number }
  | { name: 'mistakes'; groupId: number }

function parse(hash: string): Route {
  const m = /^#\/(practice|mistakes)\/(\d+)$/.exec(hash)
  if (m) return { name: m[1] as 'practice' | 'mistakes', groupId: Number(m[2]) }
  return { name: 'home' }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parse(hash)
}

export const href = {
  home: '#/',
  practice: (groupId: number) => `#/practice/${groupId}`,
  mistakes: (groupId: number) => `#/mistakes/${groupId}`,
}
