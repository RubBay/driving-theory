/** Languages the data model is ready for. Only `en` ships in v1. */
export type Lang = 'en' | 'ru' | 'hy'

/** Every piece of content text is keyed by language: { "en": "..." } */
export type LocalizedText = Partial<Record<Lang, string>>

export interface Question {
  id: string
  group: number
  number: number
  question: LocalizedText
  options: LocalizedText[]
  /** 1-based index of the correct option. */
  answer: number
  /** Path relative to the data folder, e.g. "images/g1/q001.webp". */
  image: string | null
  explanation: LocalizedText | null
}

export interface GroupConfig {
  id: number
  /**
   * Question files inside data/ (copied to public/data/ at build time), one per
   * language. They are merged into one list; the English file is the base.
   */
  files: Partial<Record<Lang, string>>
  /** Licence categories this group covers, shown on the home card. */
  categories: string
}
