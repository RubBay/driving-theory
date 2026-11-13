import { useEffect, useRef } from 'react'
import type { Question } from '../types'
import type { QuestionProgress } from './progress'
import { createStore, useStore } from './storage'

/** What the screen shows for one question during a run (or a "My mistakes" round). */
export interface View {
  /** Wrong options picked on this question, in order (1-based). They stay red. */
  wrongs: number[]
  /** The correct option was picked. */
  correct: boolean
  /** "Show answer" was pressed: the correct option is marked without recording an attempt. */
  revealed: boolean
  /** Progress entry produced by the answer given here. */
  result?: QuestionProgress
  /**
   * Result recorded in the statistics. Only the first pick is recorded, so several
   * wrong picks (or wrong, then right) count as a single mistake.
   */
  counted?: 'correct' | 'wrong'
}

export const FRESH_VIEW: View = { wrongs: [], correct: false, revealed: false }

export type RunMode = 'ordered' | 'shuffle'

/**
 * One pass through a group in Practice. The order is fixed when the run starts,
 * so switching between shuffled and in-order mid-run is not possible.
 */
export interface Run {
  mode: RunMode
  /** Question ids in the order they are asked. */
  order: string[]
  currentId: string
  startedAt: number
  /** Time actively spent on the practice screen (ms): visible and not idle. */
  activeMs: number
  views: Record<string, View>
  finishedAt?: number
}

type AllRuns = Record<string, Run>

const store = createStore<AllRuns>('adt:run:v1', {})

export function useRun(groupId: number): Run | undefined {
  return useStore(store)[groupId]
}

function update(groupId: number, fn: (run: Run) => Run): void {
  store.set((all) => {
    const run = all[groupId]
    return run ? { ...all, [groupId]: fn(run) } : all
  })
}

function shuffled<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function startRun(groupId: number, questions: Question[], mode: RunMode): void {
  const order = (mode === 'shuffle' ? shuffled(questions) : questions).map((q) => q.id)
  store.set((all) => ({
    ...all,
    [groupId]: { mode, order, currentId: order[0], startedAt: Date.now(), activeMs: 0, views: {} },
  }))
}

export function clearRun(groupId: number): void {
  store.set((all) => {
    const rest = { ...all }
    delete rest[groupId]
    return rest
  })
}

export function setRunCurrent(groupId: number, currentId: string): void {
  update(groupId, (run) => ({ ...run, currentId }))
}

export function setRunView(groupId: number, id: string, view: View): void {
  update(groupId, (run) => ({ ...run, views: { ...run.views, [id]: view } }))
}

export function addRunTime(groupId: number, ms: number): void {
  if (ms > 0) update(groupId, (run) => (run.finishedAt ? run : { ...run, activeMs: run.activeMs + ms }))
}

export function finishRun(groupId: number): void {
  update(groupId, (run) => (run.finishedAt ? run : { ...run, finishedAt: Date.now() }))
}

/** A question is done once its first pick has been recorded or its answer was shown. */
export function isDone(view: View | undefined): boolean {
  return Boolean(view && (view.counted || view.revealed))
}

export function summarizeRun(run: Run) {
  let correct = 0
  let wrong = 0
  let shown = 0
  for (const id of run.order) {
    const v = run.views[id]
    if (v?.counted === 'correct') correct++
    else if (v?.counted === 'wrong') wrong++
    else if (v?.revealed) shown++
  }
  return { correct, wrong, shown, done: correct + wrong + shown, total: run.order.length }
}

/** Stop counting time after this long without a tap, click or key press. */
const IDLE_MS = 5 * 60 * 1000
const TICK_MS = 1000
const SAVE_EVERY_MS = 15 * 1000

/**
 * Count the time spent on the practice screen while the page is visible and the
 * user is not idle. The total is saved with the run, so it survives reloads.
 */
export function useActiveTimer(groupId: number, running: boolean): void {
  const pending = useRef(0)
  useEffect(() => {
    if (!running) return
    let lastTick = Date.now()
    let lastActivity = Date.now()
    let lastSave = Date.now()
    const flush = () => {
      addRunTime(groupId, pending.current)
      pending.current = 0
      lastSave = Date.now()
    }
    const onActivity = () => {
      lastActivity = Date.now()
    }
    const tick = () => {
      const now = Date.now()
      if (document.visibilityState === 'visible' && now - lastActivity < IDLE_MS) {
        pending.current += Math.min(now - lastTick, 5 * TICK_MS) // ignore long gaps (sleep, throttling)
      }
      lastTick = now
      if (now - lastSave >= SAVE_EVERY_MS) flush()
    }
    const onVisibility = () => {
      tick()
      if (document.visibilityState === 'hidden') flush()
      else lastActivity = Date.now()
    }
    const timer = window.setInterval(tick, TICK_MS)
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      tick()
      flush()
      window.clearInterval(timer)
      events.forEach((e) => window.removeEventListener(e, onActivity))
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
    }
  }, [groupId, running])
}
