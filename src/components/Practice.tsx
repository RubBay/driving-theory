import { useEffect, useMemo, useState } from 'react'
import { Message } from '../App'
import { t } from '../i18n'
import { useGroupQuestions } from '../lib/data'
import { formatDuration } from '../lib/format'
import { href } from '../lib/router'
import {
  finishRun,
  isDone,
  setActiveMode,
  setRunCurrent,
  setRunView,
  startRun,
  summarizeRun,
  useActiveTimer,
  useGroupRuns,
  type GroupRuns,
  type Run,
  type RunMode,
} from '../lib/run'
import type { GroupConfig, Question } from '../types'
import { ConfirmDialog, Dialog } from './Dialog'
import Runner from './Runner'
import { btn } from './ui'

export default function Practice({ group }: { group: GroupConfig }) {
  const data = useGroupQuestions(group)
  const runs = useGroupRuns(group.id)
  const run = runs.active ? runs[runs.active] : undefined
  if (data.status === 'loading') return <Message text={t('common.loading')} />
  if (data.status === 'error')
    return (
      <Message text={t('common.loadError')}>
        <button type="button" className={btn.secondary} onClick={data.retry}>
          {t('common.retry')}
        </button>
      </Message>
    )
  if (!run) return <StartScreen group={group} questions={data.questions} runs={runs} />
  return <PracticeRun group={group} questions={data.questions} run={run} />
}

/**
 * Choose a mode. Each mode keeps its own run: "Question by question" is for going
 * through and checking all the answers; "Shuffle" is the practice whose progress,
 * result and time are shown on the home screen.
 */
function StartScreen({ group, questions, runs }: { group: GroupConfig; questions: Question[]; runs: GroupRuns }) {
  const count = questions.length
  const choices: { mode: RunMode; title: string; body: string }[] = [
    { mode: 'shuffle', title: t('start.shuffle'), body: t('start.shuffleBody', { count }) },
    { mode: 'ordered', title: t('start.ordered'), body: t('start.orderedBody', { count }) },
  ]
  return (
    <div className="mx-auto max-w-xl">
      <a href={href.home} className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-accent">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {t('common.back')}
      </a>
      <h1 className="mt-2 text-3xl font-black tracking-tight">{t('start.heading')}</h1>
      <p className="mt-1 text-muted">{t('start.intro')}</p>
      <div className="mt-5 grid gap-3">
        {choices.map((c) => {
          const run = runs[c.mode]
          const sum = run ? summarizeRun(run) : null
          let status = t('start.notStarted')
          if (run && sum && run.finishedAt) status = t('start.finished', { correct: sum.correct, wrong: sum.wrong })
          else if (sum) status = t('start.inProgress', { done: sum.done, total: sum.total })
          return (
            <button
              key={c.mode}
              type="button"
              onClick={() => (run ? setActiveMode(group.id, c.mode) : startRun(group.id, questions, c.mode))}
              className="shadow-card flex items-start gap-4 rounded-[20px] border-2 border-border bg-surface p-4 text-left text-fg hover:border-accent sm:p-5"
            >
              <span className="sign-plate grid size-12 shrink-0 place-items-center rounded-xl" aria-hidden="true">
                <ModeIcon mode={c.mode} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold">{c.title}</span>
                <span className="mt-1 block text-muted">{c.body}</span>
                <span className={`mt-2 block text-sm font-semibold ${run ? 'text-accent' : 'text-muted'}`}>{status}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PracticeRun({ group, questions, run }: { group: GroupConfig; questions: Question[]; run: Run }) {
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const order = useMemo(
    () => run.order.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q)),
    [run.order, byId],
  )
  const index = Math.max(0, order.findIndex((q) => q.id === run.currentId))
  const summary = summarizeRun(run)
  const finished = Boolean(run.finishedAt)
  const [showSummary, setShowSummary] = useState(finished)
  const [confirmNew, setConfirmNew] = useState(false)
  const mode = run.mode
  // Only Shuffle is timed and ends with a result; "Question by question" is for checking answers.
  const timed = mode === 'shuffle'

  useActiveTimer(group.id, mode, timed && !finished)

  // The run ends when every question has an answer recorded (or its answer shown).
  const allDone = order.length > 0 && order.every((q) => isDone(run.views[q.id]))
  useEffect(() => {
    if (allDone && !finished) {
      finishRun(group.id, mode)
      if (timed) setShowSummary(true)
    }
  }, [allDone, finished, group.id, mode, timed])

  /** Begin this mode again from the start (a new random order for Shuffle). */
  const startOver = () => {
    setShowSummary(false)
    startRun(group.id, questions, mode)
    window.scrollTo(0, 0)
  }
  const changeMode = () => {
    setActiveMode(group.id, undefined)
    window.scrollTo(0, 0)
  }

  return (
    <>
      <Runner
        group={group}
        mode="practice"
        title={t('practice.title')}
        questions={order}
        index={index}
        hideNavigator={mode === 'shuffle'}
        views={run.views}
        onViewChange={(id, view) => setRunView(group.id, mode, id, view)}
        onIndex={(i) => setRunCurrent(group.id, mode, order[i].id)}
        status={
          <p className="mt-1 text-sm text-muted">
            {mode === 'shuffle' ? t('run.modeShuffle') : t('run.modeOrdered')} ·{' '}
            {t('run.done', { done: summary.done, total: summary.total })}
          </p>
        }
        tools={
          <>
            <button type="button" className={btn.secondary} onClick={changeMode}>
              {t('run.changeMode')}
            </button>
            {finished && timed ? (
              <button type="button" className={btn.secondary} onClick={() => setShowSummary(true)}>
                {t('run.results')}
              </button>
            ) : (
              <button type="button" className={btn.secondary} onClick={() => setConfirmNew(true)}>
                {t('run.startOver')}
              </button>
            )}
          </>
        }
      />

      {showSummary && finished && timed && (
        <Dialog title={t('summary.title')} onClose={() => setShowSummary(false)}>
          <p className="mt-1 text-muted">{t('summary.intro', { total: summary.total })}</p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
            <SummaryStat label={t('summary.correct')} value={summary.correct} tone="ok" />
            <SummaryStat label={t('summary.wrong')} value={summary.wrong} tone="bad" />
          </dl>
          {summary.shown > 0 && <p className="mt-2 text-sm text-muted">{t('summary.shown', { n: summary.shown })}</p>}
          <p className="mt-3">
            {t('summary.time')} <strong className="tabular-nums">{formatDuration(run.activeMs)}</strong>
          </p>
          <p className="mt-1 text-sm text-muted">{t('summary.timeNote')}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" className={btn.secondary} onClick={() => setShowSummary(false)}>
              {t('summary.review')}
            </button>
            <button type="button" className={btn.primary} onClick={startOver}>
              {t('run.again')}
            </button>
          </div>
        </Dialog>
      )}

      {confirmNew && (
        <ConfirmDialog
          title={t('run.newTitle')}
          body={t(timed ? 'run.newBody' : 'run.newBodyOrdered', { done: summary.done, total: summary.total })}
          confirmLabel={t('run.newConfirm')}
          onConfirm={() => {
            setConfirmNew(false)
            startOver()
          }}
          onCancel={() => setConfirmNew(false)}
        />
      )}
    </>
  )
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'bad' }) {
  const cls = tone === 'ok' ? 'border-ok-border bg-ok-bg text-ok-fg' : 'border-bad-border bg-bad-bg text-bad-fg'
  return (
    <div className={`flex flex-col-reverse rounded-xl border px-2 py-3 ${cls}`}>
      <dt className="text-sm">{label}</dt>
      <dd className="text-3xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}

/** Shuffle: crossing arrows. Question by question: a straight road ahead. */
function ModeIcon({ mode }: { mode: RunMode }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {mode === 'shuffle' ? (
        <path d="M3 7h3.5c2 0 3.2 1 4.3 2.7l2.4 4.6C14.3 16 15.5 17 17.5 17H21M3 17h3.5c1.4 0 2.4-.5 3.2-1.4M14.3 8.4C15.1 7.5 16.1 7 17.5 7H21M18 4l3 3-3 3M18 14l3 3-3 3" />
      ) : (
        <path d="M12 21V3M7 8l5-5 5 5M5 21l2-9M19 21l-2-9" />
      )}
    </svg>
  )
}
