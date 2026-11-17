import { useState } from 'react'
import { GROUPS } from '../config'
import { t, tx } from '../i18n'
import { updateSettings, useSettings } from '../lib/settings'
import { resetGroup, summarize, useAllProgress, useGroupProgress } from '../lib/progress'
import { href } from '../lib/router'
import { useHighlights } from '../lib/highlights'
import { formatDuration } from '../lib/format'
import { clearRuns, setActiveMode, summarizeRun, useGroupRuns } from '../lib/run'
import type { GroupConfig } from '../types'
import { ConfirmDialog } from './Dialog'
import { ChevronIcon, HighlighterIcon } from './icons'
import { btn } from './ui'

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl">
      <Hero />
      <div className="mt-6 grid gap-4">
        {GROUPS.map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}
      </div>
    </div>
  )
}

const TOTAL_QUESTIONS = GROUPS.reduce((sum, g) => sum + g.questions, 0)

/** The home band: an asphalt strip with the heading, totals and a road running to the horizon. */
function Hero() {
  const all = useAllProgress()
  const practised = GROUPS.reduce((sum, g) => sum + summarize(all[g.id] ?? {}).answered, 0)
  const stats = [
    { value: TOTAL_QUESTIONS, label: t('home.statQuestions', { count: TOTAL_QUESTIONS }) },
    { value: GROUPS.length, label: t('home.statGroups', { count: GROUPS.length }) },
    { value: practised, label: t('home.statPractised') },
  ]
  return (
    <section className="shadow-card relative overflow-hidden rounded-[20px] bg-road px-5 py-6 text-marking sm:px-8 sm:py-8">
      <RoadArt className="pointer-events-none absolute -right-10 bottom-0 h-full w-auto opacity-35 sm:right-0 sm:opacity-100" />
      <div className="relative max-w-md">
        <p className="kicker text-lane">{t('home.kicker')}</p>
        <h1 className="mt-2 text-3xl leading-[1.05] font-black tracking-tight sm:text-[2.5rem]">{t('home.heading')}</h1>
        <p className="mt-3 text-marking/85">{t('home.intro')}</p>
        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
          {stats.map((st) => (
            <div key={st.label} className="flex flex-col-reverse">
              <dt className="text-sm text-marking/75">{st.label}</dt>
              <dd className="text-2xl leading-none font-black tabular-nums">{st.value.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function RoadArt({ className }: { className?: string }) {
  // Centre dashes shrink toward the horizon.
  const dashes: [number, number, number][] = [
    [212, 178, 7],
    [160, 134, 5.5],
    [118, 99, 4.2],
    [87, 74, 3.2],
    [65, 57, 2.4],
    [50, 45, 1.8],
  ]
  return (
    <svg viewBox="0 0 280 220" className={className} aria-hidden="true">
      <path d="M30 220 L132 30 L148 30 L250 220 Z" fill="var(--marking)" opacity="0.07" />
      <path d="M30 220 L132 30 M250 220 L148 30" stroke="var(--marking)" strokeWidth="3" strokeLinecap="round" fill="none" />
      {dashes.map(([y1, y2, w]) => (
        <line key={y1} x1="140" y1={y1} x2="140" y2={y2} stroke="var(--lane)" strokeWidth={w} strokeLinecap="round" />
      ))}
      <path d="M0 30 H280" stroke="var(--marking)" strokeWidth="1" opacity="0.18" />
    </svg>
  )
}

function GroupCard({ group }: { group: GroupConfig }) {
  const progress = useGroupProgress(group.id)
  const [confirming, setConfirming] = useState(false)
  const runs = useGroupRuns(group.id)
  const highlighted = useHighlights(group.id).length

  const { openGroups } = useSettings()
  const open = openGroups.includes(group.id)
  const toggle = () =>
    updateSettings({ openGroups: open ? openGroups.filter((id) => id !== group.id) : [...openGroups, group.id] })

  const total = group.questions
  const { answered, mistakes } = summarize(progress)
  // The home card shows the Shuffle practice only; "Question by question" is for checking answers.
  const shuffle = runs.shuffle
  const s = shuffle ? summarizeRun(shuffle) : { done: 0, correct: 0, wrong: 0, shown: 0, total }
  const { done, correct, wrong } = s
  const shuffleFinished = Boolean(shuffle?.finishedAt)
  const shuffleStatus = !shuffle
    ? t('group.shuffleNone')
    : shuffleFinished
      ? t('group.shuffleFinished', { correct, wrong, total: s.total, time: formatDuration(shuffle.activeMs) })
      : t('group.shuffleProgress', { done, total: s.total, correct, wrong })
  const pct = (n: number) => `${(n / (s.total || total)) * 100}%`
  const bodyId = `g${group.id}-body`

  return (
    <section className="shadow-card rounded-[20px] border border-border bg-surface" aria-labelledby={`g${group.id}-title`}>
      {/* Header: always visible, says in detail which group this is; tapping it opens or closes the card. */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={bodyId}
        title={open ? t('group.hide', { n: group.id }) : t('group.show', { n: group.id })}
        className="group flex w-full items-start gap-3 rounded-[20px] p-4 text-left text-fg sm:gap-4 sm:p-5"
      >
        <span className="sign-plate grid size-12 shrink-0 place-items-center rounded-xl text-xl font-black sm:size-14 sm:text-2xl tabular-nums" aria-hidden="true">
          {group.id}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-3">
            <span id={`g${group.id}-title`} className="text-xl font-extrabold tracking-tight">
              {t('group.title', { n: group.id })}
            </span>
            <span className="text-sm text-muted">
              {t('group.categories', { categories: group.categories })}
              {` · ${t('group.questions', { count: total })}`}
            </span>
          </span>
          {group.topic && <span className="mt-0.5 block leading-snug font-semibold">{tx(group.topic)}</span>}
          <span className="mt-3 flex items-center gap-3">
            <span className="road-track h-3 flex-1" aria-hidden="true">
              <span className="bg-ok-border" style={{ width: pct(correct) }} />
              <span className="bg-bad-border" style={{ width: pct(wrong) }} />
            </span>
            <span className="shrink-0 text-sm font-bold tabular-nums text-muted">
              {t('group.percentDone', { pct: Math.round((done / (s.total || total)) * 100) })}
            </span>
          </span>
          <span className={`mt-2 block text-sm ${shuffle && !shuffleFinished ? 'font-semibold text-accent' : 'text-muted'}`}>
            {shuffleStatus}
          </span>
          <span className="block text-sm text-muted">{t('group.summary', { mistakes, highlighted })}</span>
        </span>
        <span className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-fg group-hover:border-accent">
          <ChevronIcon open={open} />
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
      <div id={bodyId} className="min-h-0 overflow-hidden" inert={!open}>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
      <div className="lane-line mb-4 opacity-70" aria-hidden="true" />

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label={t('group.done')} value={done} />
        <Stat label={t('group.correct')} value={correct} tone="ok" />
        <Stat label={t('group.wrong')} value={wrong} tone="bad" />
      </dl>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <a
          href={href.practice(group.id)}
          onClick={() => setActiveMode(group.id, shuffle && !shuffleFinished ? 'shuffle' : undefined)}
          className={`${btn.primary} sm:col-span-2`}
        >
          {shuffle && !shuffleFinished ? t('group.continue', { done, total: s.total }) : t('group.practice')}
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
        <button type="button" className={`${btn.danger} sm:col-span-2`} onClick={() => setConfirming(true)} disabled={answered === 0 && !runs.ordered && !runs.shuffle}>
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
            clearRuns(group.id) // practices in progress start over too
            setConfirming(false)
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'bad' }) {
  const lamp = tone === 'ok' ? 'bg-ok-border' : tone === 'bad' ? 'bg-bad-border' : 'bg-lane'
  return (
    <div className="flex flex-col-reverse items-center rounded-xl bg-surface-2 px-2 py-3">
      <dt className="flex items-center gap-1.5 text-sm text-muted">
        <span className={`inline-block size-2.5 rounded-full ${lamp}`} aria-hidden="true" />
        {label}
      </dt>
      <dd className="text-2xl font-black tabular-nums text-fg">{value}</dd>
    </div>
  )
}
