import type { GroupConfig, LocalizedText } from './types'

/** One question group: its question files (one per language) and the home-card topic. */
const group = (id: number, questions: number, topic: LocalizedText): GroupConfig => ({
  id,
  questions,
  files: { en: `group-${id}-en.json`, ru: `group-${id}-ru.json` },
  categories: 'ABC',
  topic,
})

/**
 * Question groups available in the app.
 * To add a group: extract data/group-N-en.json and data/group-N-ru.json (see README)
 * and add ONE line here: id, number of questions, and the short topic shown on the home card.
 */
export const GROUPS: GroupConfig[] = [
  group(1, 147, { en: 'Road situations: lanes, turns, signs and right of way', ru: 'Дорожные ситуации: полосы, повороты, знаки и приоритет' }),
  group(2, 82, { en: 'Terms and rules of the Law on Ensuring Road Traffic Safety', ru: 'Термины и нормы Закона «Об обеспечении безопасности дорожного движения»' }),
  group(3, 59, { en: 'Vehicle condition: faults that prohibit operation', ru: 'Техническое состояние: неисправности, при которых эксплуатация запрещена' }),
  group(4, 181, { en: 'Road signs', ru: 'Дорожные знаки' }),
  group(5, 136, { en: 'Intersections and right of way', ru: 'Проезд перекрёстков и приоритет' }),
  group(6, 95, { en: 'Traffic lights, traffic controller signals and turns', ru: 'Сигналы светофора и регулировщика, повороты' }),
  group(7, 127, { en: 'Stopping, parking and pavement markings', ru: 'Остановка, стоянка и дорожная разметка' }),
  group(8, 53, { en: 'Speed, towing and carrying people and cargo', ru: 'Скорость, буксировка, перевозка людей и грузов' }),
  group(9, 119, { en: 'Passing, warning signals and vehicle lights', ru: 'Обгон, предупредительные сигналы и световые приборы' }),
  group(10, 51, { en: 'First aid', ru: 'Первая помощь' }),
]

/** Correct answers in a row needed for a question to leave "My mistakes". */
export const MISTAKE_CLEAR_STREAK = 2

export const SOURCE_URL = 'https://roadpolice.am'
