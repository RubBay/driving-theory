import { useMemo, useState } from 'react'
import { Message } from '../App'
import { t, tx } from '../i18n'
import { imageUrl, useGroupQuestions } from '../lib/data'
import { getHighlights, toggleHighlight, useHighlights } from '../lib/highlights'
import { useGroupProgress } from '../lib/progress'
import { href } from '../lib/router'
import type { GroupConfig, Question } from '../types'
import { HighlighterIcon } from './icons'
import Runner, { HighlightButton } from './Runner'
import { btn } from './ui'

/** Highlighted questions: first the list, then one question with a grid of the highlighted ones. */
export default function Highlights({ group, number }: { group: GroupConfig; number: number | null }) {
  const data = useGroupQuestions(group)
  if (data.status === 'loading') return <Message text={t('common.loading')} />
  if (data.status === 'error')
    return (
      <Message text={t('common.loadError')}>
        <button type="button" className={btn.secondary} onClick={data.retry}>
          {t('common.retry')}
        </button>
      </Message>
    )
  return number == null ? (
    <HighlightList group={group} questions={data.questions} />
  ) : (
    <HighlightRunner group={group} questions={data.questions} number={number} />
  )
}

const byNumber = (a: Question, b: Question) => a.number - b.number

function HighlightList({ group, questions }: { group: GroupConfig; questions: Question[] }) {
  const ids = useHighlights(group.id)
  const progress = useGroupProgress(group.id)
  const list = useMemo(() => questions.filter((q) => ids.includes(q.id)).sort(byNumber), [questions, ids])

  return (
    <div className="mx-auto max-w-2xl">
      <a href={href.home} className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-accent">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {t('common.back')}
      </a>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <h1 className="text-2xl font-bold">{t('highlights.heading')}</h1>
        <p className="text-sm text-muted">
          {t('group.title', { n: group.id })} · {t('highlights.count', { n: list.length })}
        </p>
      </div>

      {list.length === 0 ? (
        <div className="py-12 text-center">
          <HighlighterIcon className="mx-auto size-10 text-muted" />
          <p className="mt-3 text-lg font-semibold">{t('highlights.empty')}</p>
          <p className="mt-1 text-muted">{t('highlights.emptyHint')}</p>
          <a href={href.practice(group.id)} className={`${btn.primary} mt-6`}>
            {t('mistakes.toPractice')}
          </a>
        </div>
      ) : (
        <ul className="mt-4 grid list-none gap-3 p-0">
          {list.map((q) => {
            const img = imageUrl(q)
            const st = progress[q.id]?.lastResult
            const edge = st === 'correct' ? 'border-l-ok-border' : st === 'wrong' ? 'border-l-bad-border' : 'border-l-border'
            return (
              <li key={q.id} className={`flex items-stretch rounded-2xl border border-l-4 border-border bg-surface ${edge}`}>
                <a
                  href={href.highlights(group.id, q.number)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3 text-fg no-underline"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 font-bold tabular-nums">
                    {q.number}
                  </span>
                  <span className="line-clamp-3 min-w-0 flex-1">{tx(q.question)}</span>
                  {img && (
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="hidden h-14 w-24 shrink-0 rounded-md border border-border bg-white object-cover sm:block"
                    />
                  )}
                </a>
                <div className="flex items-center pr-3">
                  <HighlightButton on number={q.number} onClick={() => toggleHighlight(group.id, q.id)} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function HighlightRunner({ group, questions, number }: { group: GroupConfig; questions: Question[]; number: number }) {
  // The grid is a snapshot of the highlighted questions when this screen opens, so
  // removing a highlight does not make the current question disappear.
  const [ids] = useState(() => getHighlights(group.id))
  const list = useMemo(() => questions.filter((q) => ids.includes(q.id)).sort(byNumber), [questions, ids])
  const index = list.findIndex((q) => q.number === number)

  if (index < 0) {
    return (
      <Message text={t('highlights.notFound')}>
        <a href={href.highlights(group.id)} className={btn.secondary}>
          {t('highlights.backToList')}
        </a>
      </Message>
    )
  }

  return (
    <Runner
      group={group}
      mode="highlights"
      title={t('highlights.title')}
      navigatorTitle={t('highlights.heading')}
      questions={list}
      index={index}
      onIndex={(i) => {
        window.location.hash = href.highlights(group.id, list[i].number)
      }}
      backHref={href.highlights(group.id)}
      backLabel={t('highlights.backToList')}
      forceNavigatorOpen
    />
  )
}
