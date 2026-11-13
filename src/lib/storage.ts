import { useSyncExternalStore } from 'react'

/**
 * localStorage access that never throws. If storage is unavailable (private
 * mode, blocked site data, quota), values live in memory for this page load
 * and the app keeps working.
 */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: keep the in-memory copy only */
  }
}

export interface Store<T> {
  get(): T
  set(next: T | ((prev: T) => T)): void
  subscribe(listener: () => void): () => void
}

/** A tiny observable store persisted to localStorage (best effort). */
export function createStore<T extends object>(key: string, defaults: T): Store<T> {
  let state: T = { ...defaults, ...readJSON<Partial<T>>(key, {}) }
  const listeners = new Set<() => void>()
  // Another tab changed the same key: take its version, so this tab does not
  // later write stale data over it.
  try {
    window.addEventListener('storage', (e) => {
      if (e.key !== key) return
      state = { ...defaults, ...readJSON<Partial<T>>(key, {}) }
      listeners.forEach((l) => l())
    })
  } catch {
    /* no window events: nothing to sync */
  }
  return {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? next(state) : next
      writeJSON(key, state)
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get)
}
