import type { GroupConfig } from './types'

/**
 * Question groups available in the app.
 * To add a group: put data/group-N-en.json + data/images/gN/ in place
 * (see README) and add ONE line here.
 */
export const GROUPS: GroupConfig[] = [
  { id: 1, file: 'group-1-en.json', categories: 'ABC' },
]

/** Correct answers in a row needed for a question to leave "My mistakes". */
export const MISTAKE_CLEAR_STREAK = 2

export const SOURCE_URL = 'https://roadpolice.am'
