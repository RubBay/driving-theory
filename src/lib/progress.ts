import { MISTAKE_CLEAR_STREAK } from '../config'
import type { Question } from '../types'
import { createStore, useStore } from './storage'

export type Status = 'correct' | 'wrong'

export interface QuestionProgress {
  /** 'wrong' = currently in "My mistakes". */
  status: Status
  /** Option picked most recently (1-based). */
  choice: number
  /** Correct answers in a row since the last wrong one. */
  streak: number
}

export type GroupProgress = Record<string, QuestionProgress>
type AllProgress = Record<string, GroupProgress>

const EMPTY: GroupProgress = {}
const store = createStore<AllProgress>('adt:progress:v1', {})

export function useGroupProgress(groupId: number): GroupProgress {
  return useStore(store)[groupId] ?? EMPTY
}

export function getGroupProgress(groupId: number): GroupProgress {
  return store.get()[groupId] ?? EMPTY
}

/**
 * Record an answer.
 * - Wrong answer: the question is marked wrong (enters "My mistakes"), streak resets.
 * - Correct answer on a question marked wrong: it stays wrong until it has been
 *   answered correctly MISTAKE_CLEAR_STREAK times in a row.
 */
export function recordAnswer(groupId: number, q: Question, choice: number): QuestionProgress {
  const prev = getGroupProgress(groupId)[q.id]
  let next: QuestionProgress
  if (choice !== q.answer) {
    next = { status: 'wrong', choice, streak: 0 }
  } else if (prev?.status === 'wrong') {
    const streak = prev.streak + 1
    next = { status: streak >= MISTAKE_CLEAR_STREAK ? 'correct' : 'wrong', choice, streak }
  } else {
    next = { status: 'correct', choice, streak: (prev?.streak ?? 0) + 1 }
  }
  store.set((all) => ({ ...all, [groupId]: { ...(all[groupId] ?? {}), [q.id]: next } }))
  return next
}

export function resetGroup(groupId: number): void {
  store.set((all) => {
    const rest = { ...all }
    delete rest[groupId]
    return rest
  })
}

export function summarize(progress: GroupProgress) {
  let correct = 0
  let wrong = 0
  for (const p of Object.values(progress)) {
    if (p.status === 'correct') correct++
    else wrong++
  }
  return { answered: correct + wrong, correct, wrong }
}
