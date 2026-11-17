import { t } from '../i18n'

/** "45 s", "23 min" or "1 h 5 min". */
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 1) return t('time.seconds', { s: Math.max(1, Math.round(ms / 1000)) })
  if (totalMin < 60) return t('time.minutes', { m: totalMin })
  return t('time.hours', { h: Math.floor(totalMin / 60), m: totalMin % 60 })
}
