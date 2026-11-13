import { useEffect, useState } from 'react'
import type { GroupConfig, Lang, LocalizedText, Question } from '../types'

const DATA_BASE = `${import.meta.env.BASE_URL}data/`
const cache = new Map<number, Promise<Question[]>>()

async function fetchFile(file: string): Promise<Question[]> {
  const res = await fetch(DATA_BASE + file)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as Question[]
}

const mergeText = (a: LocalizedText | null, b: LocalizedText | null): LocalizedText | null =>
  a || b ? { ...(a ?? {}), ...(b ?? {}) } : null

/**
 * Merge the language files of a group into one list. The English file is the
 * base (ids, answers, pictures); another language only adds its text, and only
 * for questions whose answer and option count match.
 */
function merge(base: Question[], extra: Question[]): Question[] {
  const byId = new Map(extra.map((q) => [q.id, q]))
  return base.map((q) => {
    const o = byId.get(q.id)
    if (!o || o.answer !== q.answer || o.options.length !== q.options.length) return q
    return {
      ...q,
      question: { ...q.question, ...o.question },
      options: q.options.map((opt, i) => ({ ...opt, ...o.options[i] })),
      explanation: mergeText(q.explanation, o.explanation),
    }
  })
}

/** Load a group's questions in all its languages (fetched once, then cached). */
export function loadGroup(group: GroupConfig): Promise<Question[]> {
  let promise = cache.get(group.id)
  if (!promise) {
    const entries = Object.entries(group.files) as [Lang, string][]
    entries.sort(([a], [b]) => (a === 'en' ? -1 : b === 'en' ? 1 : 0))
    promise = Promise.all(entries.map(([, file]) => fetchFile(file))).then(([base, ...rest]) =>
      rest.reduce(merge, base),
    )
    promise.catch(() => cache.delete(group.id)) // allow a retry after a failure
    cache.set(group.id, promise)
  }
  return promise
}

export function imageUrl(q: Question): string | null {
  return q.image ? DATA_BASE + q.image : null
}

/** Warm the browser cache for a question's picture. */
export function preloadImage(q: Question | undefined): void {
  const url = q && imageUrl(q)
  if (url) new Image().src = url
}

type GroupState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; questions: Question[] }

export function useGroupQuestions(group: GroupConfig): GroupState & { retry: () => void } {
  const [state, setState] = useState<GroupState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    loadGroup(group).then(
      (questions) => {
        if (alive) setState({ status: 'ready', questions })
      },
      () => {
        if (alive) setState({ status: 'error' })
      },
    )
    return () => {
      alive = false
    }
  }, [group, attempt])
  return { ...state, retry: () => setAttempt((a) => a + 1) }
}
