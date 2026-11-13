import { createStore, useStore } from './storage'

export type Theme = 'dark' | 'light'

export interface Settings {
  theme: Theme
  /** "All questions" panel expanded (closed by default). */
  panelOpen: boolean
}

export const settingsStore = createStore<Settings>('adt:settings:v1', {
  theme: 'dark',
  panelOpen: false,
})

export const useSettings = () => useStore(settingsStore)

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.set((prev) => ({ ...prev, ...patch }))
}
