import en, { type StringKey } from './en'
import type { Lang, LocalizedText } from '../types'

/**
 * UI languages. v1 ships English only. To add Russian or Armenian:
 *   1. create ru.ts / hy.ts with the same keys as en.ts,
 *   2. register it in `dictionaries`,
 *   3. add a language switch that calls setLang().
 */
const dictionaries: Partial<Record<Lang, Record<StringKey, string>>> = { en }

export const AVAILABLE_LANGS = Object.keys(dictionaries) as Lang[]
export const FALLBACK_LANG: Lang = 'en'

let current: Lang = FALLBACK_LANG

export function getLang(): Lang {
  return current
}

export function setLang(lang: Lang): void {
  if (dictionaries[lang]) current = lang
}

/** Translate a UI string; `{name}` placeholders are filled from `vars`. */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  const template: string = dictionaries[current]?.[key] ?? en[key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

/** Pick the current-language value of a content field, falling back to English. */
export function tx(text: LocalizedText | null | undefined): string {
  if (!text) return ''
  return text[current] ?? text[FALLBACK_LANG] ?? Object.values(text)[0] ?? ''
}
