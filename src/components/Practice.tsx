import { useMemo, useState } from 'react'
import { Message } from '../App'
import { t } from '../i18n'
import { useGroupQuestions } from '../lib/data'
import { rememberLastQuestion, settingsStore, updateSettings, useSettings } from '../lib/settings'
import type { GroupConfig, Question } from '../types'
import Runner from './Runner'
import { btn } from './ui'

function shuffled<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export default function Practice({ group }: { group: GroupConfig }) {
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
  return <PracticeRunner group={group} questions={data.questions} />
}

function PracticeRunner({ group, questions }: { group: GroupConfig; questions: Question[] }) {
  const { shuffle } = useSettings()
  // A new random order each time shuffle is switched on (or the screen opens).
  const order = useMemo(() => (shuffle ? shuffled(questions) : questions), [questions, shuffle])

  // Track the current question by id so it stays put when the order changes.
  const [currentId, setCurrentId] = useState<string>(() => {
    const last = settingsStore.get().last[group.id]
    return (questions.find((q) => q.number === last) ?? order[0]).id
  })
  const index = Math.max(0, order.findIndex((q) => q.id === currentId))

  return (
    <Runner
      group={group}
      mode="practice"
      title={t('practice.title')}
      questions={order}
      index={index}
      hideNavigator={shuffle}
      onIndex={(i) => {
        setCurrentId(order[i].id)
        rememberLastQuestion(group.id, order[i].number)
      }}
      tools={
        <label className={`${btn.secondary} select-none`}>
          <input
            type="checkbox"
            className="size-5 accent-(--accent)"
            checked={shuffle}
            onChange={(e) => updateSettings({ shuffle: e.target.checked })}
          />
          {t('runner.shuffle')}
        </label>
      }
    />
  )
}
