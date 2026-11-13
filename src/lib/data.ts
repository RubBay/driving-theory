import { useEffect, useState } from 'react'
import type { GroupConfig, Question } from '../types'

const DATA_BASE = `${import.meta.env.BASE_URL}data/`
const cache = new Map<string, Promise<Question[]>>()

/** Load a group's questions (fetched once, then cached for the session). */
export function loadGroup(group: GroupConfig): Promise<Question[]> {
  let promise = cache.get(group.file)
  if (!promise) {
    promise = fetch(DATA_BASE + group.file).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<Question[]>
    })
    promise.catch(() => cache.delete(group.file)) // allow a retry after a failure
    cache.set(group.file, promise)
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
