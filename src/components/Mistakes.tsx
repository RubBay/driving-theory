import { useMemo, useState } from 'react'
import { Message } from '../App'
import { MISTAKE_CLEAR_STREAK } from '../config'
import { t } from '../i18n'
import { useGroupQuestions } from '../lib/data'
import { getGroupProgress } from '../lib/progress'
import { href } from '../lib/router'
import type { GroupConfig, Question } from '../types'
import Runner from './Runner'
import { btn } from './ui'

export default function Mistakes({ group }: { group: GroupConfig }) {
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
  return <MistakesRunner group={group} questions={data.questions} />
}

function MistakesRunner({ group, questions }: { group: GroupConfig; questions: Question[] }) {
  // The list is a snapshot taken at the start of each round, so a question
  // does not vanish from under you the moment it is cleared. "Next round"
  // re-reads the list: cleared questions drop out, the rest come round again.
  const [round, setRound] = useState(0)
  const [index, setIndex] = useState(0)
  const list = useMemo(() => {
    const progress = getGroupProgress(group.id)
    return questions.filter((q) => progress[q.id]?.status === 'wrong')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, group.id, round])

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <h1 className="text-xl font-bold">{t('mistakes.empty')}</h1>
        <p className="mt-2 text-muted">{t('mistakes.emptyHint', { needed: MISTAKE_CLEAR_STREAK })}</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <a href={href.practice(group.id)} className={btn.primary}>
            {t('mistakes.toPractice')}
          </a>
          <a href={href.home} className={btn.secondary}>
            {t('common.back')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <Runner
      key={round}
      group={group}
      mode="mistakes"
      title={t('mistakes.title')}
      questions={list}
      index={Math.min(index, list.length - 1)}
      onIndex={setIndex}
      onEnd={() => {
        setIndex(0)
        setRound((r) => r + 1)
      }}
    />
  )
}
