import type { GroupConfig } from './types'

/**
 * Question groups available in the app.
 * To add a group: put data/group-N-en.json + data/images/gN/ in place
 * (see README) and add ONE line here.
 */
export const GROUPS: GroupConfig[] = [
  {
    id: 1,
    files: { en: 'group-1-en.json', ru: 'group-1-ru.json' },
    categories: 'ABC',
    topic: { en: 'Road situations: lanes, turns, signs and right of way', ru: 'Дорожные ситуации: полосы, повороты, знаки и приоритет' },
  },
  {
    id: 2,
    files: { en: 'group-2-en.json', ru: 'group-2-ru.json' },
    categories: 'ABC',
    topic: { en: 'Terms and rules of the Law on Ensuring Road Traffic Safety', ru: 'Термины и нормы Закона «Об обеспечении безопасности дорожного движения»' },
  },
]

/** Correct answers in a row needed for a question to leave "My mistakes". */
export const MISTAKE_CLEAR_STREAK = 2

export const SOURCE_URL = 'https://roadpolice.am'
