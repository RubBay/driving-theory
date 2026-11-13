import { createStore, useStore } from './storage'

export type Theme = 'dark' | 'light'

export interface Settings {
  theme: Theme
  shuffle: boolean
  /** "All questions" panel expanded (closed by default). */
  panelOpen: boolean
  /** Last question number opened in Practice, per group id. */
  last: Record<string, number>
}

export const settingsStore = createStore<Settings>('adt:settings:v1', {
  theme: 'dark',
  shuffle: false,
  panelOpen: false,
  last: {},
})

export const useSettings = () => useStore(settingsStore)

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.set((prev) => ({ ...prev, ...patch }))
}

export function rememberLastQuestion(groupId: number, number: number): void {
  settingsStore.set((prev) => ({ ...prev, last: { ...prev.last, [groupId]: number } }))
}
