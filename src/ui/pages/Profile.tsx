import { useRef, useState, type ChangeEvent } from 'react'
import type { Database, ImportMode } from '../../domain/types'
import { MAX_IMPORT_BYTES, parseImport } from '../../domain/validation'
import { Icon, type IconName } from '../components/Icon'
import { Modal } from '../components/Modal'

export type Theme = 'system' | 'light' | 'dark'
export function Profile({
  db,
  temporary = false,
  theme,
  onTheme,
  onExport,
  onImport,
  onExamples,
  onClearExamples,
  busy,
}: {
  db: Database
  temporary?: boolean
  theme: Theme
  onTheme: (theme: Theme) => void
  onExport: () => void
  onImport: (data: Database, mode: ImportMode) => Promise<void>
  onExamples: () => void
  onClearExamples: () => void
  busy: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [incoming, setIncoming] = useState<Database | null>(null)
  const [filename, setFilename] = useState('')
  const [mode, setMode] = useState<ImportMode>('merge')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [replaceConfirmed, setReplaceConfirmed] = useState(false)
  const exampleCount = db.sessions.filter((s) => s.source === 'example').length
  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    setError('')
    if (!file) return
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('文件过大，请选择小于 5 MB 的 JSON')
      const parsed = parseImport(await file.text())
      setFilename(file.name)
      setIncoming(parsed)
      setMode('merge')
      setReplaceConfirmed(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取文件失败')
    }
  }
  const runImport = async () => {
    if (!incoming) return
    setImporting(true)
    setError('')
    try {
      await onImport(incoming, mode)
      setIncoming(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败')
    } finally {
      setImporting(false)
    }
  }
  const Row = ({
    icon,
    title,
    detail,
    action,
    onClick,
    disabled = false,
  }: {
    icon: IconName
    title: string
    detail: string
    action: string
    onClick: () => void
    disabled?: boolean
  }) => (
    <div className="settings-row">
      <div className="settings-icon">
        <Icon name={icon} />
      </div>
      <div className="settings-copy">
        <h3>{title}</h3>
        <p>{detail}</p>
      </div>
      <button
        className="button secondary small-button"
        disabled={busy || disabled}
        onClick={onClick}
      >
        {action}
      </button>
    </div>
  )
  return (
    <div className="page profile-page">
      <section className="page-intro">
        <div>
          <p className="eyebrow">属于你的攀爬空间</p>
          <h1>按你的方式。</h1>
          <p className="intro-description">让记录顺手，也让每一份积累好好保存。</p>
        </div>
      </section>
      <section className="profile-card">
        <div className="profile-avatar">
          <Icon name="mountain" size={34} />
        </div>
        <div>
          <h2>攀岩者</h2>
          <p>保持好奇，继续向上。</p>
        </div>
        <div className="profile-count">
          <strong>{db.sessions.filter((s) => s.source === 'personal').length}</strong>
          <span>次个人训练</span>
        </div>
      </section>
      <div className="settings-layout">
        <section className="settings-group">
          <p className="eyebrow">舒服的样子</p>
          <h2>外观</h2>
          <div className="panel appearance-panel">
            <div className="appearance-header">
              <Icon name={theme === 'dark' ? 'moon' : 'sun'} />
              <div>
                <h3>主题模式</h3>
                <p>浅色清晰，深色沉静。</p>
              </div>
            </div>
            <div className="segmented theme-segmented">
              {(
                [
                  { value: 'system', label: '跟随系统' },
                  { value: 'light', label: '浅色' },
                  { value: 'dark', label: '深色' },
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  aria-pressed={theme === item.value}
                  onClick={() => onTheme(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="settings-group">
          <p className="eyebrow">每一份记录，都属于你</p>
          <h2>数据与备份</h2>
          <div className="panel settings-panel">
            <Row
              icon="download"
              title="导出训练记录"
              detail={`${db.sessions.length} 次训练 · ${db.climbs.length} 条线路 · JSON 格式`}
              action="导出"
              onClick={onExport}
            />
            <Row
              icon="upload"
              title="从备份导入"
              detail="校验数据后，可选择合并或覆盖。"
              action="导入"
              onClick={() => {
                setError('')
                input.current?.click()
              }}
            />
            <input
              ref={input}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              tabIndex={-1}
              aria-label="选择 JSON 备份文件"
              onChange={chooseFile}
            />
          </div>
          {error && !incoming && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <p className="settings-note">
            {temporary ? '当前为临时模式，刷新或关闭页面会丢失记录。请先导出 JSON 备份。' : '记录仅保存在此浏览器中。更换设备或清除浏览器数据前，请先导出备份。'}
          </p>
        </section>
        <section className="settings-group sample-settings">
          <p className="eyebrow">先体验，再出发</p>
          <h2>示例数据</h2>
          <div className="panel settings-panel">
            <Row
              icon="spark"
              title={exampleCount ? '示例已载入' : '看看进步的样子'}
              detail={
                exampleCount
                  ? `共 ${exampleCount} 次示例训练，已标记为「示例」。`
                  : '最近 8 周，V3–V4 / 5.10a / 5.11a 水平。'
              }
              action={exampleCount ? '已载入' : '载入示例'}
              disabled={exampleCount > 0}
              onClick={onExamples}
            />
            {exampleCount > 0 && (
              <Row
                icon="trash"
                title="清除示例记录"
                detail="保留你的全部个人训练记录。"
                action="清除示例"
                onClick={onClearExamples}
              />
            )}
          </div>
        </section>
      </div>
      <div className="about-app">
        <Icon name="mountain" size={24} />
        <strong>岩迹</strong>
        <span>把每一次向上，留在这里。</span>
        <small>版本 1.0 · 为热爱攀爬的人而做</small>
      </div>
      {incoming && (
        <Modal
          title="导入训练记录"
          subtitle="备份已通过格式校验"
          onClose={() => !importing && setIncoming(null)}
          className="import-modal"
        >
          <div className="import-summary">
            <Icon name="file" size={28} />
            <div>
              <strong>{filename}</strong>
              <p>
                {incoming.sessions.length} 次训练 · {incoming.climbs.length} 条线路 ·{' '}
                {incoming.training.length} 个动作
              </p>
            </div>
          </div>
          <div className="import-options">
            <label className={mode === 'merge' ? 'selected' : ''}>
              <input
                type="radio"
                name="import-mode"
                value="merge"
                checked={mode === 'merge'}
                disabled={importing}
                onChange={() => {
                  setMode('merge')
                  setReplaceConfirmed(false)
                }}
              />
              <span>
                <strong>合并记录</strong>
                <small>保留现有记录。同 ID 的整次训练使用导入版本，重复导入不会增加条数。</small>
              </span>
            </label>
            <label className={mode === 'replace' ? 'selected' : ''}>
              <input
                type="radio"
                name="import-mode"
                value="replace"
                checked={mode === 'replace'}
                disabled={importing}
                onChange={() => setMode('replace')}
              />
              <span>
                <strong>覆盖全部记录</strong>
                <small>
                  移除当前的 {db.sessions.length} 次训练，再载入此文件。建议先导出备份。
                </small>
              </span>
            </label>
          </div>
          {mode === 'replace' && (
            <label className="replace-confirm">
              <input
                type="checkbox"
                checked={replaceConfirmed}
                disabled={importing}
                onChange={(e) => setReplaceConfirmed(e.target.checked)}
              />
              我确认用此文件覆盖当前所有训练记录
            </label>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button secondary"
              disabled={importing}
              onClick={() => setIncoming(null)}
            >
              取消
            </button>
            <button
              className="button primary"
              disabled={importing || (mode === 'replace' && !replaceConfirmed)}
              onClick={runImport}
            >
              {importing ? '导入中…' : mode === 'merge' ? '确认合并' : '确认覆盖'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
