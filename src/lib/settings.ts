import { isLang } from '../i18n'
import type { Lang } from '../types'
import { createStore, useStore } from './storage'

export type Theme = 'dark' | 'light'

export interface Settings {
  theme: Theme
  /** "All questions" panel expanded (closed by default). */
  panelOpen: boolean
  /** Interface and question language. */
  lang: Lang
  /** Group cards opened on the home screen (all closed by default). */
  openGroups: number[]
}

/** First visit: Russian if the browser prefers it, otherwise English. */
function defaultLang(): Lang {
  try {
    const preferred = (navigator.languages?.[0] ?? navigator.language ?? '').slice(0, 2).toLowerCase()
    return isLang(preferred) ? preferred : 'en'
  } catch {
    return 'en'
  }
}

export const settingsStore = createStore<Settings>('adt:settings:v1', {
  theme: 'dark',
  panelOpen: false,
  lang: defaultLang(),
  openGroups: [],
})

export const useSettings = () => useStore(settingsStore)

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.set((prev) => ({ ...prev, ...patch }))
}
