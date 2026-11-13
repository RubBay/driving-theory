import { MISTAKE_CLEAR_STREAK } from '../config'
import type { Question } from '../types'
import { createStore, useStore } from './storage'

export type Result = 'correct' | 'wrong'

export interface QuestionProgress {
  /** Number of attempts answered correctly / wrong, over all time. */
  correctCount: number
  wrongCount: number
  /** Result of the most recent attempt. Drives the colours in the question grid. */
  lastResult: Result
  /** Time of the most recent attempt (ms since epoch); null if unknown (migrated data). */
  lastAnsweredAt: number | null
  /** Option picked in the most recent attempt (1-based). */
  choice: number
  /** Correct answers in a row since the last wrong one. */
  streak: number
  /** In "My mistakes": set by a wrong answer, cleared after MISTAKE_CLEAR_STREAK correct in a row. */
  mistake: boolean
}

export type GroupProgress = Record<string, QuestionProgress>
type AllProgress = Record<string, GroupProgress>

/** Shape saved by the first version of the app (latest result only). */
interface LegacyProgress {
  status: Result
  choice: number
  streak: number
}

/**
 * Upgrade entries saved by the first version: the saved result counts as one
 * attempt. A question that was still in "My mistakes" but had already been
 * answered correctly since (streak > 0) keeps that streak, so those correct
 * answers are counted too and its last result is "correct".
 */
function migrate(all: AllProgress): AllProgress {
  let changed = false
  const out: AllProgress = {}
  for (const [groupId, group] of Object.entries(all)) {
    const next: GroupProgress = {}
    for (const [id, entry] of Object.entries(group ?? {})) {
      const legacy = entry as unknown as Partial<LegacyProgress>
      if (entry && entry.lastResult === undefined && legacy.status !== undefined) {
        changed = true
        const streak = Math.max(0, Number(legacy.streak) || 0)
        const wasWrong = legacy.status === 'wrong'
        next[id] = {
          correctCount: wasWrong ? streak : 1,
          wrongCount: wasWrong ? 1 : 0,
          lastResult: wasWrong && streak === 0 ? 'wrong' : 'correct',
          lastAnsweredAt: null,
          choice: Number(legacy.choice) || 0,
          streak,
          mistake: wasWrong,
        }
      } else if (entry) {
        next[id] = entry
      }
    }
    out[groupId] = next
  }
  return changed ? out : all
}

const EMPTY: GroupProgress = {}
const store = createStore<AllProgress>('adt:progress:v1', {})
{
  const migrated = migrate(store.get())
  if (migrated !== store.get()) store.set(migrated)
}

export function useGroupProgress(groupId: number): GroupProgress {
  return useStore(store)[groupId] ?? EMPTY
}

export function getGroupProgress(groupId: number): GroupProgress {
  return store.get()[groupId] ?? EMPTY
}

/**
 * Record one attempt.
 * - Wrong: the question enters "My mistakes" and its streak resets.
 * - Correct: the streak grows; a question in "My mistakes" leaves it once the
 *   streak reaches MISTAKE_CLEAR_STREAK.
 */
export function recordAnswer(groupId: number, q: Question, choice: number): QuestionProgress {
  const prev = getGroupProgress(groupId)[q.id]
  const correct = choice === q.answer
  const streak = correct ? (prev?.streak ?? 0) + 1 : 0
  const next: QuestionProgress = {
    correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0),
    wrongCount: (prev?.wrongCount ?? 0) + (correct ? 0 : 1),
    lastResult: correct ? 'correct' : 'wrong',
    lastAnsweredAt: Date.now(),
    choice,
    streak,
    mistake: correct ? Boolean(prev?.mistake) && streak < MISTAKE_CLEAR_STREAK : true,
  }
  store.set((all) => ({ ...all, [groupId]: { ...(all[groupId] ?? {}), [q.id]: next } }))
  return next
}

/** Clears a group's answers, mistakes and attempt statistics. */
export function resetGroup(groupId: number): void {
  store.set((all) => {
    const rest = { ...all }
    delete rest[groupId]
    return rest
  })
}

/** Whole-number percentages that always add up to 100. */
export function percentages(correctCount: number, wrongCount: number) {
  const attempts = correctCount + wrongCount
  const correct = attempts ? Math.round((correctCount / attempts) * 100) : 0
  return { attempts, correct, wrong: attempts ? 100 - correct : 0 }
}

export function summarize(progress: GroupProgress) {
  let correct = 0
  let wrong = 0
  let mistakes = 0
  let attemptsCorrect = 0
  let attempts = 0
  for (const p of Object.values(progress)) {
    if (p.lastResult === 'correct') correct++
    else wrong++
    if (p.mistake) mistakes++
    attemptsCorrect += p.correctCount
    attempts += p.correctCount + p.wrongCount
  }
  return { answered: correct + wrong, correct, wrong, mistakes, attemptsCorrect, attempts }
}
