import { lazy, Suspense, useEffect } from 'react'
import { GROUPS, SOURCE_URL } from './config'
import { AVAILABLE_LANGS, LANG_NAMES, setLang, t } from './i18n'
import { href, useRoute } from './lib/router'
import { updateSettings, useSettings } from './lib/settings'
import Home from './components/Home'

// The question screens are split out so the home screen loads fast.
const Practice = lazy(() => import('./components/Practice'))
const Mistakes = lazy(() => import('./components/Mistakes'))
const Highlights = lazy(() => import('./components/Highlights'))

export default function App() {
  const route = useRoute()
  const { theme, lang } = useSettings()
  // Set before rendering the children, so every t() call below uses the new language.
  setLang(lang)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t('app.title')
  }, [lang])

  const group = route.name === 'home' ? undefined : GROUPS.find((g) => g.id === route.groupId)

  let screen
  if (route.name === 'home') screen = <Home />
  else if (!group) screen = <Message text={t('common.notFound')} />
  else if (route.name === 'practice') screen = <Practice key={group.id} group={group} />
  else if (route.name === 'highlights') screen = <Highlights key={group.id} group={group} number={route.number} />
  else screen = <Mistakes key={group.id} group={group} />

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <a href={href.home} className="rounded font-semibold text-fg no-underline">
            {t('app.title')}
          </a>
          <div className="flex items-center gap-2">
          <div role="group" aria-label={t('lang.label')} className="flex h-11 rounded-lg border border-border bg-surface-2 p-0.5">
            {AVAILABLE_LANGS.map((code) => (
              <button
                key={code}
                type="button"
                lang={code}
                onClick={() => updateSettings({ lang: code })}
                aria-pressed={lang === code}
                aria-label={LANG_NAMES[code]?.name ?? code}
                title={LANG_NAMES[code]?.name ?? code}
                className={`min-w-10 rounded-md px-2 text-sm font-semibold ${
                  lang === code ? 'bg-accent text-accent-fg' : 'text-muted'
                }`}
              >
                {LANG_NAMES[code]?.short ?? code.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
            aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
            title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
            className="grid size-11 place-items-center rounded-lg border border-border bg-surface-2 text-fg"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {theme === 'dark' ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </>
              ) : (
                <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
              )}
            </svg>
          </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
        <Suspense fallback={<Message text={t('common.loading')} />}>{screen}</Suspense>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-4 text-sm text-muted">
          <p>
            {t('footer.source')}{' '}
            <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="rounded text-accent underline">
              {t('footer.sourceName')}
            </a>
          </p>
          <p className="mt-1">{t('footer.unofficial')}</p>
        </div>
      </footer>
    </div>
  )
}

export function Message({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="py-16 text-center text-muted" role="status">
      <p>{text}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
