import { useEffect, useId, useRef, type ReactNode } from 'react'
import { t } from '../i18n'
import { btn } from './ui'

/** Modal dialog built on <dialog>: focus is trapped, Escape calls onClose. */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      aria-labelledby={titleId}
      className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-border bg-surface p-5 text-fg"
    >
      <h3 id={titleId} className="text-lg font-bold">
        {title}
      </h3>
      {children}
    </dialog>
  )
}

export function ConfirmDialog(props: {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog title={props.title} onClose={props.onCancel}>
      <p className="mt-2 text-muted">{props.body}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" className={btn.secondary} onClick={props.onCancel} autoFocus>
          {t('common.cancel')}
        </button>
        <button type="button" className={btn.danger} onClick={props.onConfirm}>
          {props.confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
