import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

let openModalCount = 0
let previousBodyOverflow = ''

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement as HTMLElement | null
    if (openModalCount === 0) previousBodyOverflow = document.body.style.overflow
    openModalCount += 1
    document.body.style.overflow = 'hidden'
    // Older iOS WebViews (before Safari 15.4) lack showModal; fall back to a plain open dialog.
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    return () => {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
      openModalCount -= 1
      if (openModalCount === 0) document.body.style.overflow = previousBodyOverflow
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="modal-heading">
        <div>
          {subtitle && <p className="eyebrow">{subtitle}</p>}
          <h2>{title}</h2>
        </div>
        <button type="button" className="icon-button" aria-label="关闭弹窗" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export interface ConfirmOptions {
  title: string
  description: string
  action: string
  danger?: boolean
  onConfirm: () => Promise<void> | void
}
export function ConfirmDialog({
  options,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  options: ConfirmOptions
  busy: boolean
  error?: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal title={options.title} onClose={() => !busy && onClose()} className="confirm-modal">
      <p className="confirm-description">{options.description}</p>
      {error && (
        <p className="error-message confirm-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="button secondary" disabled={busy} onClick={onClose} autoFocus>
          取消
        </button>
        <button
          className={`button ${options.danger ? 'danger' : 'primary'}`}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? '处理中…' : options.action}
        </button>
      </div>
    </Modal>
  )
}
