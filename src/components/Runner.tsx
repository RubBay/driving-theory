import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MISTAKE_CLEAR_STREAK } from '../config'
import { t, tx } from '../i18n'
import { imageUrl, preloadImage } from '../lib/data'
import { recordAnswer, useGroupProgress, type QuestionProgress } from '../lib/progress'
import { href } from '../lib/router'
import type { GroupConfig, Question } from '../types'
import ImageViewer from './ImageViewer'
import { btn } from './ui'

interface View {
  /** Option picked in this view (1-based), or null. */
  choice: number | null
  /** "Show answer" was used: the answer is visible but nothing is recorded. */
  revealed: boolean
  /** Progress entry produced by the answer given in this session. */
  result?: QuestionProgress
}

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
}

const SWIPE_MIN_PX = 60

export default function Runner({ group, mode, title, questions, index, onIndex, onEnd, tools }: Props) {
  const progress = useGroupProgress(group.id)
  const [views, setViews] = useState<Record<string, View>>({})
  const [navOpen, setNavOpen] = useState(false)
  const [viewer, setViewer] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const total = questions.length
  const q = questions[index]
  const saved = progress[q.id]

  // Practice shows earlier answers as locked; "My mistakes" always starts fresh.
  const view: View =
    views[q.id] ??
    (mode === 'practice' && saved ? { choice: saved.choice, revealed: false } : { choice: null, revealed: false })
  const locked = view.choice != null || view.revealed
  const isCorrect = view.choice === q.answer

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

  const answer = useCallback(
    (choice: number) => {
      if (locked || choice < 1 || choice > q.options.length) return
      const result = recordAnswer(group.id, q, choice)
      setViews((v) => ({ ...v, [q.id]: { choice, revealed: false, result } }))
    },
    [locked, q, group.id],
  )

  const reveal = () => setViews((v) => ({ ...v, [q.id]: { choice: null, revealed: true } }))

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

  let feedback: ReactNode = null
  if (view.revealed) {
    feedback = <p>{t('feedback.revealed', { n: q.answer })}</p>
  } else if (view.choice != null) {
    const status = view.result?.status ?? saved?.status
    const streak = view.result?.streak ?? saved?.streak ?? 0
    feedback = (
      <>
        <p className="font-semibold">
          {isCorrect ? t('feedback.correct') : t('feedback.wrong', { n: q.answer })}
        </p>
        {isCorrect && status === 'wrong' && (
          <p>{t('feedback.streak', { streak, needed: MISTAKE_CLEAR_STREAK })}</p>
        )}
        {isCorrect && mode === 'mistakes' && status === 'correct' && <p>{t('feedback.cleared')}</p>}
        {!isCorrect && mode === 'mistakes' && <p>{t('feedback.stays', { needed: MISTAKE_CLEAR_STREAK })}</p>}
      </>
    )
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
      <section onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} aria-label={title}>
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

        <ol className="mt-4 grid list-none gap-2.5 p-0">
          {q.options.map((opt, i) => {
            const n = i + 1
            const showCorrect = locked && n === q.answer
            const showWrong = view.choice === n && n !== q.answer
            let cls = 'border-border bg-surface text-fg'
            if (showCorrect) cls = 'border-ok-border bg-ok-bg text-ok-fg'
            else if (showWrong) cls = 'border-bad-border bg-bad-bg text-bad-fg'
            else if (locked) cls = 'border-border bg-surface text-muted'
            return (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => answer(n)}
                  disabled={locked}
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
                view.choice != null && !isCorrect
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
          <button type="button" className={btn.secondary} onClick={reveal} disabled={locked}>
            {t('runner.showAnswer')}
          </button>
          {tools}
          <button
            type="button"
            className={`${btn.secondary} lg:hidden`}
            aria-expanded={navOpen}
            aria-controls="question-navigator"
            onClick={() => setNavOpen((o) => !o)}
          >
            {t('runner.navigator')}
            <svg viewBox="0 0 24 24" className={`size-4 ${navOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
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
        id="question-navigator"
        aria-label={t('runner.navigator')}
        className={`${navOpen ? 'block' : 'hidden'} mt-4 rounded-2xl border border-border bg-surface p-3 lg:sticky lg:top-4 lg:mt-0 lg:block`}
      >
        <h2 className="font-semibold">{t('runner.navigator')}</h2>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 p-0 text-sm text-muted">
          <Legend cls="border-border bg-surface-2" label={t('legend.unanswered')} />
          <Legend cls="border-ok-border bg-ok-bg" label={t('legend.correct')} />
          <Legend cls="border-bad-border bg-bad-bg" label={t('legend.wrong')} />
        </ul>
        <ol className="mt-3 grid max-h-[26rem] list-none grid-cols-6 gap-1.5 overflow-y-auto p-1">
          {byNumber.map(({ item, i }) => {
            const st = progress[item.id]?.status
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
                  onClick={() => {
                    onIndex(i)
                    setNavOpen(false)
                  }}
                  aria-current={current ? 'true' : undefined}
                  aria-label={t('runner.jumpTo', {
                    n: item.number,
                    status: t(st === 'correct' ? 'status.correct' : st === 'wrong' ? 'status.wrong' : 'status.unanswered'),
                  })}
                  className={`grid aspect-square w-full min-w-0 place-items-center rounded-lg border text-sm font-semibold tabular-nums ${cls} ${
                    current ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
                  }`}
                >
                  {item.number}
                </button>
              </li>
            )
          })}
        </ol>
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
