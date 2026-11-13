import { useEffect, useRef, useState } from 'react'
import { GROUPS } from '../config'
import { t } from '../i18n'
import { useGroupQuestions } from '../lib/data'
import { resetGroup, summarize, useGroupProgress } from '../lib/progress'
import { href } from '../lib/router'
import { rememberLastQuestion } from '../lib/settings'
import type { GroupConfig } from '../types'
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

  const total = data.status === 'ready' ? data.questions.length : null
  const { answered, correct, wrong } = summarize(progress)
  const pct = (n: number) => (total ? `${(n / total) * 100}%` : '0%')

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby={`g${group.id}-title`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`g${group.id}-title`} className="text-xl font-bold">
          {t('group.title', { n: group.id })}
        </h2>
        <p className="text-sm text-muted">
          {data.status === 'ready' && t('group.questions', { count: data.questions.length })}
          {data.status === 'loading' && t('common.loading')}
        </p>
      </div>
      <p className="text-muted">{t('group.categories', { categories: group.categories })}</p>

      {data.status === 'error' && (
        <div className="mt-3 rounded-lg border border-bad-border bg-bad-bg p-3 text-bad-fg" role="alert">
          <p>{t('common.loadError')}</p>
          <button type="button" className={`${btn.secondary} mt-2`} onClick={data.retry}>
            {t('common.retry')}
          </button>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
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

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <a href={href.practice(group.id)} className={`${btn.primary} sm:col-span-2`}>
          {t('group.practice')}
        </a>
        <a href={href.mistakes(group.id)} className={btn.secondary}>
          {t('group.mistakes')}
          <span className="rounded-full bg-bad-bg px-2 py-0.5 text-sm text-bad-fg">{wrong}</span>
        </a>
        <button type="button" className={btn.danger} onClick={() => setConfirming(true)} disabled={answered === 0}>
          {t('group.reset')}
        </button>
      </div>

      {confirming && (
        <ConfirmDialog
          title={t('group.resetTitle')}
          body={t('group.resetBody', { n: group.id })}
          confirmLabel={t('group.resetConfirm')}
          onConfirm={() => {
            resetGroup(group.id)
            rememberLastQuestion(group.id, 1) // Practice starts over from question 1
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

function ConfirmDialog(props: {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        props.onCancel()
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-border bg-surface p-5 text-fg"
    >
      <h3 id="confirm-title" className="text-lg font-bold">
        {props.title}
      </h3>
      <p className="mt-2 text-muted">{props.body}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" className={btn.secondary} onClick={props.onCancel} autoFocus>
          {t('common.cancel')}
        </button>
        <button type="button" className={btn.danger} onClick={props.onConfirm}>
          {props.confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
