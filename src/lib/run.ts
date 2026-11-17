import { useEffect, useRef } from 'react'
import type { Question } from '../types'
import type { QuestionProgress } from './progress'
import { createStore, readJSON, useStore } from './storage'

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

/**
 * The practice runs of one group. Each mode keeps its own run, so switching
 * between "Question by question" (for checking answers) and "Shuffle" (the
 * practice whose progress the home screen shows) never loses either one.
 */
export interface GroupRuns {
  /** The mode open in Practice; none = show the start screen. */
  active?: RunMode
  ordered?: Run
  shuffle?: Run
}

type AllRuns = Record<string, GroupRuns>

const EMPTY: GroupRuns = {}
const store = createStore<AllRuns>('adt:runs:v2', {})

// Upgrade from the first version, which kept a single run per group.
{
  const old = readJSON<Record<string, Run>>('adt:run:v1', {})
  if (Object.keys(store.get()).length === 0 && Object.keys(old).length > 0) {
    const upgraded: AllRuns = {}
    for (const [groupId, run] of Object.entries(old)) {
      if (run && (run.mode === 'ordered' || run.mode === 'shuffle')) {
        upgraded[groupId] = { active: run.mode, [run.mode]: run }
      }
    }
    store.set(upgraded)
  }
}

export function useGroupRuns(groupId: number): GroupRuns {
  return useStore(store)[groupId] ?? EMPTY
}

function updateGroup(groupId: number, fn: (runs: GroupRuns) => GroupRuns): void {
  store.set((all) => ({ ...all, [groupId]: fn(all[groupId] ?? {}) }))
}

function update(groupId: number, mode: RunMode, fn: (run: Run) => Run): void {
  updateGroup(groupId, (runs) => {
    const run = runs[mode]
    return run ? { ...runs, [mode]: fn(run) } : runs
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

/** Start a fresh run of this mode (replacing any earlier one of the same mode) and open it. */
export function startRun(groupId: number, questions: Question[], mode: RunMode): void {
  const order = (mode === 'shuffle' ? shuffled(questions) : questions).map((q) => q.id)
  const run: Run = { mode, order, currentId: order[0], startedAt: Date.now(), activeMs: 0, views: {} }
  updateGroup(groupId, (runs) => ({ ...runs, active: mode, [mode]: run }))
}

/** Open an existing run, or show the start screen with `undefined`. */
export function setActiveMode(groupId: number, mode: RunMode | undefined): void {
  updateGroup(groupId, (runs) => ({ ...runs, active: mode }))
}

/** Delete every run of the group (used by Reset progress). */
export function clearRuns(groupId: number): void {
  store.set((all) => {
    const rest = { ...all }
    delete rest[groupId]
    return rest
  })
}

export function setRunCurrent(groupId: number, mode: RunMode, currentId: string): void {
  update(groupId, mode, (run) => ({ ...run, currentId }))
}

export function setRunView(groupId: number, mode: RunMode, id: string, view: View): void {
  update(groupId, mode, (run) => ({ ...run, views: { ...run.views, [id]: view } }))
}

export function addRunTime(groupId: number, mode: RunMode, ms: number): void {
  if (ms > 0) update(groupId, mode, (run) => (run.finishedAt ? run : { ...run, activeMs: run.activeMs + ms }))
}

export function finishRun(groupId: number, mode: RunMode): void {
  update(groupId, mode, (run) => (run.finishedAt ? run : { ...run, finishedAt: Date.now() }))
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
export function useActiveTimer(groupId: number, mode: RunMode, running: boolean): void {
  const pending = useRef(0)
  useEffect(() => {
    if (!running) return
    let lastTick = Date.now()
    let lastActivity = Date.now()
    let lastSave = Date.now()
    const flush = () => {
      addRunTime(groupId, mode, pending.current)
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
  }, [groupId, mode, running])
}
