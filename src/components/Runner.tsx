import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MISTAKE_CLEAR_STREAK } from '../config'
import { t, tx } from '../i18n'
import { imageUrl, preloadImage } from '../lib/data'
import { percentages, recordAnswer, useGroupProgress } from '../lib/progress'
import { FRESH_VIEW, type View } from '../lib/run'
import { href } from '../lib/router'
import { updateSettings, useSettings } from '../lib/settings'
import type { GroupConfig, Question } from '../types'
import ImageViewer from './ImageViewer'
import { btn } from './ui'

interface Props {
  group: GroupConfig
  mode: 'practice' | 'mistakes'
  title: string
  /** Questions in display order. */
  questions: Question[]
  index: number
  onIndex: (index: number) => void
  /** Mistakes mode: called when "Next" is pressed on the last question. */
  onEnd?: () => void
  /** Extra controls shown next to "Show answer" (e.g. the shuffle toggle). */
  tools?: ReactNode
  /** Hide the "All questions" panel (used while shuffle is on). */
  hideNavigator?: boolean
  /** Controlled per-question state (Practice keeps it with the run); otherwise kept in memory. */
  views?: Record<string, View>
  onViewChange?: (id: string, view: View) => void
  /** Shown under the question counter (e.g. run progress). */
  status?: ReactNode
}

const SWIPE_MIN_PX = 60

export default function Runner({
  group,
  mode,
  title,
  questions,
  index,
  onIndex,
  onEnd,
  tools,
  hideNavigator,
  views: controlledViews,
  onViewChange,
  status,
}: Props) {
  const progress = useGroupProgress(group.id)
  const [localViews, setLocalViews] = useState<Record<string, View>>({})
  const views = controlledViews ?? localViews
  const setView = (id: string, next: View) =>
    onViewChange ? onViewChange(id, next) : setLocalViews((v) => ({ ...v, [id]: next }))
  const { panelOpen: navOpen } = useSettings()
  const [viewer, setViewer] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const total = questions.length
  const q = questions[index]
  const saved = progress[q.id]

  // Each question starts unanswered in a new practice run or mistakes round.
  const view: View = views[q.id] ?? FRESH_VIEW
  /** Every wrong option has been picked: only the correct one is left. */
  const allWrong = view.wrongs.length >= q.options.length - 1
  /** The question is finished: correct answer picked, shown, or no wrong options left. */
  const locked = view.correct || view.revealed || allWrong
  const hasWrong = view.wrongs.length > 0
  const optionsRef = useRef<HTMLOListElement>(null)

  const go = useCallback(
    (next: number) => {
      if (next < 0) return
      if (next >= total) {
        onEnd?.()
        return
      }
      onIndex(next)
    },
    [total, onIndex, onEnd],
  )

  /**
   * One attempt per visit: the first pick is recorded in the statistics; later
   * picks on the same visit only update what is shown.
   */
  const answer = useCallback(
    (choice: number) => {
      if (locked || choice < 1 || choice > q.options.length || view.wrongs.includes(choice)) return
      const correct = choice === q.answer
      const first = view.counted === undefined
      const result = first ? recordAnswer(group.id, q, choice) : view.result
      const counted = first ? (correct ? 'correct' : 'wrong') : view.counted
      setView(q.id, { ...view, wrongs: correct ? view.wrongs : [...view.wrongs, choice], correct, result, counted })
      if (!correct) focusOptions.current = true
    },
    [locked, q, group.id, view, setView],
  )

  /** Mark the correct option without recording an attempt. */
  const reveal = () => setView(q.id, { ...view, revealed: true })

  // A wrong pick disables that button, so move focus to the first option still open.
  const focusOptions = useRef(false)
  useEffect(() => {
    if (!focusOptions.current) return
    focusOptions.current = false
    if (!locked) optionsRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  })

  const record = percentages(saved?.correctCount ?? 0, saved?.wrongCount ?? 0)

  // New question: back to the top, and warm up the neighbouring pictures.
  useEffect(() => {
    window.scrollTo(0, 0)
    preloadImage(questions[index + 1])
    preloadImage(questions[index - 1])
  }, [q.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Desktop keys: 1-5 answer, arrows move.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (viewer || e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && (target as HTMLInputElement).type !== 'checkbox') return
      if (document.querySelector('dialog[open]')) return
      if (e.key === 'ArrowRight') go(index + 1)
      else if (e.key === 'ArrowLeft') go(index - 1)
      else if (/^[1-5]$/.test(e.key)) answer(Number(e.key))
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewer, go, index, answer])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start || viewer) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = e.changedTouches[0].clientY - start.y
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
    go(dx < 0 ? index + 1 : index - 1)
  }

  const byNumber = useMemo(
    () => questions.map((item, i) => ({ item, i })).sort((a, b) => a.item.number - b.item.number),
    [questions],
  )

  const img = imageUrl(q)
  const imgAlt = t('runner.imageAlt', { n: q.number })
  const isLast = index === total - 1

  const latest = view.result ?? saved
  const streak = latest?.streak ?? 0
  let feedback: ReactNode = null
  if (view.correct && view.counted === 'wrong') {
    feedback = (
      <>
        <p className="font-semibold">{t('feedback.correct')}</p>
        <p>{t('feedback.countedWrong')}</p>
      </>
    )
  } else if (view.correct) {
    feedback = (
      <>
        <p className="font-semibold">{t('feedback.correct')}</p>
        {latest?.mistake && <p>{t('feedback.streak', { streak, needed: MISTAKE_CLEAR_STREAK })}</p>}
        {mode === 'mistakes' && latest && !latest.mistake && <p>{t('feedback.cleared')}</p>}
      </>
    )
  } else if (hasWrong) {
    feedback = (
      <>
        <p className="font-semibold">
          {locked ? t('feedback.wrong', { n: q.answer }) : t('feedback.chooseAnother')}
        </p>
        {mode === 'mistakes' && <p>{t('feedback.stays', { needed: MISTAKE_CLEAR_STREAK })}</p>}
      </>
    )
  } else if (view.revealed) {
    feedback = <p>{t('feedback.revealed', { n: q.answer })}</p>
  }

  return (
    <div className="lg:flex lg:items-start lg:justify-center lg:gap-8">
      {/* Desktop: this spacer mirrors the panel so the question column sits in the centre
          of the page while the panel is closed, and moves left when it opens. */}
      <div
        aria-hidden="true"
        className={`hidden shrink-0 transition-[width] duration-200 motion-reduce:transition-none ${hideNavigator ? '' : 'lg:block'} ${navOpen ? 'w-24' : 'w-52'}`}
      />
      <section onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} aria-label={title} className="lg:max-w-2xl lg:min-w-0 lg:flex-1">
        <div className="flex items-center justify-between gap-3">
          <a href={href.home} className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-accent">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
            {t('common.back')}
          </a>
          <p className="text-sm text-muted">
            {title} · {t('group.title', { n: group.id })}
          </p>
        </div>

        <div className="mt-2 flex items-baseline gap-3">
          <p
            className="text-2xl font-bold tabular-nums"
            aria-label={t('runner.positionLabel', { current: index + 1, total })}
          >
            {t('runner.position', { current: index + 1, total })}
          </p>
          {q.number !== index + 1 && <p className="text-sm text-muted">{t('runner.number', { n: q.number })}</p>}
        </div>
        {status}

        <div className="mt-1 text-sm text-muted">
          {record.attempts === 0 ? (
            <p>{t('stats.none')}</p>
          ) : (
            <>
              <p>
                {t('stats.record', {
                  correct: saved!.correctCount,
                  wrong: saved!.wrongCount,
                  pct: record.correct,
                })}
              </p>
              <div className="mt-1 flex h-1.5 max-w-xs overflow-hidden rounded-full" aria-hidden="true">
                <div className="bg-ok-border" style={{ width: `${record.correct}%` }} />
                <div className="bg-bad-border" style={{ width: `${record.wrong}%` }} />
              </div>
            </>
          )}
        </div>

        <h1 className="mt-3 text-lg leading-snug font-semibold sm:text-xl">{tx(q.question)}</h1>

        {img && (
          <button
            type="button"
            onClick={() => setViewer(true)}
            aria-label={t('runner.imageOpen', { n: q.number })}
            className="mt-4 block w-full cursor-zoom-in overflow-hidden rounded-xl border border-border bg-white p-0"
          >
            <img key={img} src={img} alt={imgAlt} loading="lazy" decoding="async" className="mx-auto block h-auto max-h-[60vh] w-auto max-w-full" />
          </button>
        )}

        <ol ref={optionsRef} className="mt-4 grid list-none gap-2.5 p-0">
          {q.options.map((opt, i) => {
            const n = i + 1
            const showCorrect = locked && n === q.answer
            const showWrong = view.wrongs.includes(n)
            let cls = 'border-border bg-surface text-fg'
            if (showCorrect) cls = 'border-ok-border bg-ok-bg text-ok-fg'
            else if (showWrong) cls = 'border-bad-border bg-bad-bg text-bad-fg'
            else if (locked) cls = 'border-border bg-surface text-muted'
            return (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => answer(n)}
                  disabled={locked || showWrong}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left text-base ${cls}`}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-current text-sm font-bold" aria-hidden="true">
                    {n}
                  </span>
                  <span className="sr-only">{n}.</span>
                  <span className="flex-1">{tx(opt)}</span>
                  {showCorrect && <Mark ok label={t('feedback.correctAnswer')} />}
                  {showWrong && <Mark label={t('feedback.yourAnswer')} />}
                </button>
              </li>
            )
          })}
        </ol>

        <div className="mt-3 min-h-6" role="status" aria-live="polite">
          {feedback && (
            <div
              className={`rounded-xl border px-3 py-2 ${
                hasWrong && !view.correct
                  ? 'border-bad-border bg-bad-bg text-bad-fg'
                  : 'border-ok-border bg-ok-bg text-ok-fg'
              }`}
            >
              {feedback}
            </div>
          )}
        </div>

        {locked && q.explanation && (
          <div className="mt-3 rounded-xl border border-border bg-surface p-3">
            <h2 className="text-sm font-semibold text-muted">{t('runner.explanation')}</h2>
            <p className="mt-1">{tx(q.explanation)}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!locked && (
            <button type="button" className={btn.secondary} onClick={reveal}>
              {t('runner.showAnswer')}
            </button>
          )}
          {tools}
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 mt-4 grid grid-cols-2 gap-2 border-t border-border bg-bg px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:px-0">
          <button type="button" className={btn.secondary} onClick={() => go(index - 1)} disabled={index === 0}>
            {t('runner.previous')}
          </button>
          <button
            type="button"
            className={btn.primary}
            onClick={() => go(index + 1)}
            disabled={isLast && !onEnd}
          >
            {isLast && onEnd ? t('runner.nextRound') : t('runner.next')}
          </button>
        </div>
        <p className="mt-2 hidden text-sm text-muted lg:block">{t('runner.keysHint')}</p>
      </section>

      <aside
        aria-label={t('runner.navigator')}
        className={`${hideNavigator ? 'hidden' : ''} mt-4 rounded-2xl border border-border bg-surface p-3 lg:sticky lg:top-4 lg:mt-0 lg:shrink-0 lg:transition-[width] lg:duration-200 motion-reduce:transition-none ${
          navOpen ? 'lg:w-80' : 'lg:w-52'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold whitespace-nowrap">{t('runner.navigator')}</h2>
          <button
            type="button"
            aria-expanded={navOpen}
            aria-controls="question-navigator"
            aria-label={navOpen ? t('runner.navigatorHide') : t('runner.navigatorShow')}
            title={navOpen ? t('runner.navigatorHide') : t('runner.navigatorShow')}
            onClick={() => updateSettings({ panelOpen: !navOpen })}
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-2xl leading-none font-semibold text-fg"
          >
            <span aria-hidden="true">{navOpen ? '−' : '+'}</span>
          </button>
        </div>
        {/* Height animates via grid rows (0fr <-> 1fr); `inert` keeps the hidden grid out of tab order. */}
        <div
          className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${
            navOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
        <div id="question-navigator" className="min-h-0 overflow-hidden" inert={!navOpen}>
        <div className="lg:w-[calc(20rem-1.5rem-2px)]">
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 p-0 text-sm text-muted">
          <Legend cls="border-border bg-surface-2" label={t('legend.unanswered')} />
          <Legend cls="border-ok-border bg-ok-bg" label={t('legend.correct')} />
          <Legend cls="border-bad-border bg-bad-bg" label={t('legend.wrong')} />
        </ul>
        <ol className="mt-3 grid max-h-[26rem] list-none grid-cols-6 gap-1.5 overflow-y-auto p-1">
          {byNumber.map(({ item, i }) => {
            const entry = progress[item.id]
            const st = entry?.lastResult
            const pct = entry ? percentages(entry.correctCount, entry.wrongCount).correct : null
            const status = t(st === 'correct' ? 'status.correct' : st === 'wrong' ? 'status.wrong' : 'status.unanswered')
            const current = i === index
            const cls =
              st === 'correct'
                ? 'border-ok-border bg-ok-bg text-ok-fg'
                : st === 'wrong'
                  ? 'border-bad-border bg-bad-bg text-bad-fg'
                  : 'border-border bg-surface-2 text-fg'
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onIndex(i)}
                  aria-current={current ? 'true' : undefined}
                  aria-label={
                    pct == null
                      ? t('runner.jumpTo', { n: item.number, status })
                      : t('runner.jumpToStats', { n: item.number, status, pct })
                  }
                  className={`flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border text-sm font-semibold tabular-nums ${cls} ${
                    current ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
                  }`}
                >
                  <span className="leading-none">{item.number}</span>
                  {pct != null && (
                    <span className="text-[0.6875rem] leading-none font-normal" aria-hidden="true">
                      {pct}%
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
        </div>
        </div>
        </div>
      </aside>

      {viewer && img && <ImageViewer src={img} alt={imgAlt} onClose={() => setViewer(false)} />}
    </div>
  )
}

function Mark({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span className="flex shrink-0 items-center">
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ok ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6 6l12 12M18 6L6 18" />}
      </svg>
      <span className="sr-only">({label})</span>
    </span>
  )
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <li className="flex list-none items-center gap-1.5">
      <span className={`inline-block size-3.5 rounded border ${cls}`} aria-hidden="true" />
      {label}
    </li>
  )
}
