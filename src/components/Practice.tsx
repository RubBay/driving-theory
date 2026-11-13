import { useEffect, useMemo, useState } from 'react'
import { Message } from '../App'
import { t } from '../i18n'
import { useGroupQuestions } from '../lib/data'
import { href } from '../lib/router'
import {
  clearRun,
  finishRun,
  isDone,
  setRunCurrent,
  setRunView,
  startRun,
  summarizeRun,
  useActiveTimer,
  useRun,
  type Run,
  type RunMode,
} from '../lib/run'
import type { GroupConfig, Question } from '../types'
import { ConfirmDialog, Dialog } from './Dialog'
import Runner from './Runner'
import { btn } from './ui'

export default function Practice({ group }: { group: GroupConfig }) {
  const data = useGroupQuestions(group)
  const run = useRun(group.id)
  if (data.status === 'loading') return <Message text={t('common.loading')} />
  if (data.status === 'error')
    return (
      <Message text={t('common.loadError')}>
        <button type="button" className={btn.secondary} onClick={data.retry}>
          {t('common.retry')}
        </button>
      </Message>
    )
  if (!run) return <StartScreen group={group} questions={data.questions} />
  return <PracticeRun group={group} questions={data.questions} run={run} />
}

/** Choose the order once, at the start: it cannot change during a run. */
function StartScreen({ group, questions }: { group: GroupConfig; questions: Question[] }) {
  const choices: { mode: RunMode; title: string; body: string }[] = [
    { mode: 'ordered', title: t('start.ordered'), body: t('start.orderedBody', { count: questions.length }) },
    { mode: 'shuffle', title: t('start.shuffle'), body: t('start.shuffleBody', { count: questions.length }) },
  ]
  return (
    <div className="mx-auto max-w-xl">
      <a href={href.home} className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-accent">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {t('common.back')}
      </a>
      <h1 className="mt-2 text-2xl font-bold">{t('start.heading')}</h1>
      <p className="mt-1 text-muted">{t('start.intro')}</p>
      <div className="mt-5 grid gap-3">
        {choices.map((c) => (
          <button
            key={c.mode}
            type="button"
            onClick={() => startRun(group.id, questions, c.mode)}
            className="rounded-2xl border-2 border-border bg-surface p-4 text-left text-fg hover:border-accent"
          >
            <span className="block text-lg font-semibold">{c.title}</span>
            <span className="mt-1 block text-muted">{c.body}</span>
          </button>
        ))}
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

  useActiveTimer(group.id, !finished)

  // The run ends when every question has an answer recorded (or its answer shown).
  const allDone = order.length > 0 && order.every((q) => isDone(run.views[q.id]))
  useEffect(() => {
    if (allDone && !finished) {
      finishRun(group.id)
      setShowSummary(true)
    }
  }, [allDone, finished, group.id])

  const newPractice = () => {
    clearRun(group.id)
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
        hideNavigator={run.mode === 'shuffle'}
        views={run.views}
        onViewChange={(id, view) => setRunView(group.id, id, view)}
        onIndex={(i) => setRunCurrent(group.id, order[i].id)}
        status={
          <p className="mt-1 text-sm text-muted">
            {run.mode === 'shuffle' ? t('run.modeShuffle') : t('run.modeOrdered')} ·{' '}
            {t('run.done', { done: summary.done, total: summary.total })}
          </p>
        }
        tools={
          finished ? (
            <button type="button" className={btn.secondary} onClick={() => setShowSummary(true)}>
              {t('run.results')}
            </button>
          ) : (
            <button type="button" className={btn.secondary} onClick={() => setConfirmNew(true)}>
              {t('run.new')}
            </button>
          )
        }
      />

      {showSummary && finished && (
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
            <button type="button" className={btn.primary} onClick={newPractice}>
              {t('run.new')}
            </button>
          </div>
        </Dialog>
      )}

      {confirmNew && (
        <ConfirmDialog
          title={t('run.newTitle')}
          body={t('run.newBody', { done: summary.done, total: summary.total })}
          confirmLabel={t('run.newConfirm')}
          onConfirm={() => {
            setConfirmNew(false)
            newPractice()
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

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 1) return t('time.seconds', { s: Math.max(1, Math.round(ms / 1000)) })
  if (totalMin < 60) return t('time.minutes', { m: totalMin })
  return t('time.hours', { h: Math.floor(totalMin / 60), m: totalMin % 60 })
}
