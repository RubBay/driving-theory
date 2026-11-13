import en, { type StringKey } from './en'
import ru from './ru'
import type { Lang, LocalizedText } from '../types'

/**
 * UI languages. To add one (e.g. Armenian):
 *   1. create hy.ts with the same keys as en.ts,
 *   2. register it in `dictionaries` and LANG_NAMES,
 *   3. add its question files to the group in src/config.ts.
 */
const dictionaries: Partial<Record<Lang, Record<StringKey, string>>> = { en, ru }

export const AVAILABLE_LANGS = Object.keys(dictionaries) as Lang[]
export const FALLBACK_LANG: Lang = 'en'

/** Short labels for the language switch. */
export const LANG_NAMES: Partial<Record<Lang, { short: string; name: string }>> = {
  en: { short: 'EN', name: 'English' },
  ru: { short: 'RU', name: 'Русский' },
}

let current: Lang = FALLBACK_LANG

export function getLang(): Lang {
  return current
}

export function setLang(lang: Lang): void {
  if (dictionaries[lang]) current = lang
}

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && value in dictionaries
}

const pluralRules = new Map<Lang, Intl.PluralRules>()

/** Choose a plural form: forms are [one, other] or [one, few, many]. */
function plural(n: number, forms: string[]): string {
  let rules = pluralRules.get(current)
  if (!rules) {
    rules = new Intl.PluralRules(current)
    pluralRules.set(current, rules)
  }
  const category = rules.select(n)
  if (forms.length >= 3) return category === 'one' ? forms[0] : category === 'few' ? forms[1] : forms[2]
  return category === 'one' ? forms[0] : forms[forms.length - 1]
}

/**
 * Translate a UI string. `{name}` is filled from `vars`; `{name|one|few|many}`
 * becomes the plural form that fits the number in `vars.name`.
 */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  const template: string = dictionaries[current]?.[key] ?? en[key]
  if (!vars) return template
  return template.replace(/\{(\w+)((?:\|[^|}]*)*)\}/g, (match, name: string, forms: string) => {
    if (!(name in vars)) return match
    if (!forms) return String(vars[name])
    return plural(Number(vars[name]), forms.slice(1).split('|'))
  })
}

/** Pick the current-language value of a content field, falling back to English. */
export function tx(text: LocalizedText | null | undefined): string {
  if (!text) return ''
  return text[current] ?? text[FALLBACK_LANG] ?? Object.values(text)[0] ?? ''
}
