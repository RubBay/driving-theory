import { useState } from 'react'
import { GROUPS } from '../config'
import { t, tx } from '../i18n'
import { updateSettings, useSettings } from '../lib/settings'
import { useGroupQuestions } from '../lib/data'
import { percentages, resetGroup, summarize, useGroupProgress } from '../lib/progress'
import { href } from '../lib/router'
import { useHighlights } from '../lib/highlights'
import { clearRun, summarizeRun, useRun } from '../lib/run'
import type { GroupConfig } from '../types'
import { ConfirmDialog } from './Dialog'
import { HighlighterIcon } from './icons'
import { btn } from './ui'

export default function Home() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">{t('home.heading')}</h1>
      <p className="mt-1 text-muted">{t('home.intro')}</p>
      <div className="mt-5 grid gap-4">
        {GROUPS.map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}
      </div>
    </div>
  )
}

function GroupCard({ group }: { group: GroupConfig }) {
  const data = useGroupQuestions(group)
  const progress = useGroupProgress(group.id)
  const [confirming, setConfirming] = useState(false)
  const run = useRun(group.id)
  const highlighted = useHighlights(group.id).length
  const runSummary = run && !run.finishedAt ? summarizeRun(run) : null

  const { openGroups } = useSettings()
  const open = openGroups.includes(group.id)
  const toggle = () =>
    updateSettings({ openGroups: open ? openGroups.filter((id) => id !== group.id) : [...openGroups, group.id] })

  const total = data.status === 'ready' ? data.questions.length : null
  const { answered, correct, wrong, mistakes, attemptsCorrect, attempts } = summarize(progress)
  const pct = (n: number) => (total ? `${(n / total) * 100}%` : '0%')
  const bodyId = `g${group.id}-body`

  return (
    <section className="rounded-2xl border border-border bg-surface" aria-labelledby={`g${group.id}-title`}>
      {/* Header: always visible, says in detail which group this is; tapping it opens or closes the card. */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-start gap-3 rounded-2xl p-4 text-left text-fg sm:p-5"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span id={`g${group.id}-title`} className="text-xl font-bold">
              {t('group.title', { n: group.id })}
            </span>
            <span className="text-sm text-muted">
              {t('group.categories', { categories: group.categories })}
              {total != null && ` · ${t('group.questions', { count: total })}`}
            </span>
          </span>
          {group.topic && <span className="mt-1 block font-medium">{tx(group.topic)}</span>}
          <span className="mt-2 block text-sm text-muted">
            {t('group.summary', { answered, total: total ?? '…', mistakes, highlighted })}
          </span>
          {runSummary && (
            <span className="block text-sm text-accent">
              {t('group.inProgress', { done: runSummary.done, total: runSummary.total })}
            </span>
          )}
          {!open && (
            <span className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <span className="bg-ok-border" style={{ width: pct(correct) }} />
              <span className="bg-bad-border" style={{ width: pct(wrong) }} />
            </span>
          )}
        </span>
        <span
          className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-2xl leading-none font-semibold"
          title={open ? t('group.hide', { n: group.id }) : t('group.show', { n: group.id })}
        >
          <span aria-hidden="true">{open ? '−' : '+'}</span>
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
      <div id={bodyId} className="min-h-0 overflow-hidden" inert={!open}>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
      {data.status === 'error' && (
        <div className="mt-3 rounded-lg border border-bad-border bg-bad-bg p-3 text-bad-fg" role="alert">
          <p>{t('common.loadError')}</p>
          <button type="button" className={`${btn.secondary} mt-2`} onClick={data.retry}>
            {t('common.retry')}
          </button>
        </div>
      )}

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label={t('group.answered')} value={answered} />
        <Stat label={t('group.correct')} value={correct} tone="ok" />
        <Stat label={t('group.wrong')} value={wrong} tone="bad" />
      </dl>

      <div
        className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total ?? 0}
        aria-valuenow={answered}
        aria-label={t('group.progress', { answered, total: total ?? '…' })}
      >
        <div className="bg-ok-border" style={{ width: pct(correct) }} />
        <div className="bg-bad-border" style={{ width: pct(wrong) }} />
      </div>
      <p className="mt-1 text-sm text-muted">{t('group.progress', { answered, total: total ?? '…' })}</p>
      {attempts > 0 && (
        <p className="text-sm text-muted">
          {t('group.accuracy', {
            pct: percentages(attemptsCorrect, attempts - attemptsCorrect).correct,
            correct: attemptsCorrect,
            attempts,
          })}
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <a href={href.practice(group.id)} className={`${btn.primary} sm:col-span-2`}>
          {runSummary
            ? t('group.continue', { done: runSummary.done, total: runSummary.total })
            : t('group.practice')}
        </a>
        <a href={href.mistakes(group.id)} className={btn.secondary}>
          {t('group.mistakes')}
          <span className="rounded-full bg-bad-bg px-2 py-0.5 text-sm text-bad-fg">{mistakes}</span>
        </a>
        <a href={href.highlights(group.id)} className={btn.secondary}>
          <HighlighterIcon className="size-5 text-hl" />
          {t('highlights.title')}
          <span className="rounded-full bg-hl-bg px-2 py-0.5 text-sm text-hl">{highlighted}</span>
        </a>
        <button type="button" className={`${btn.danger} sm:col-span-2`} onClick={() => setConfirming(true)} disabled={answered === 0 && !run}>
          {t('group.reset')}
        </button>
      </div>
      </div>
      </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title={t('group.resetTitle')}
          body={t('group.resetBody', { n: group.id })}
          confirmLabel={t('group.resetConfirm')}
          onConfirm={() => {
            resetGroup(group.id)
            clearRun(group.id) // a practice in progress starts over too
            setConfirming(false)
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'bad' }) {
  const color = tone === 'ok' ? 'text-ok-fg' : tone === 'bad' ? 'text-bad-fg' : 'text-fg'
  return (
    <div className="flex flex-col-reverse rounded-xl bg-surface-2 px-2 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`text-2xl font-bold tabular-nums ${color}`}>{value}</dd>
    </div>
  )
}
