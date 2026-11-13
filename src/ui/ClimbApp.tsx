import { useEffect, useMemo, useState } from 'react'
import { dateKey } from '../domain/dates'
import { createExamples } from '../domain/examples'
import {
  TYPE_LABELS,
  type Database,
  type ImportMode,
  type Session,
  type SessionDetail,
} from '../domain/types'
import { TrainingRepository, DATABASE_KEY } from '../repo/TrainingRepository'
import { LocalStorageAdapter } from '../storage/LocalStorageAdapter'
import { MemoryStorageAdapter } from '../storage/MemoryStorageAdapter'
import type { StorageAdapter } from '../storage/StorageAdapter'
import { Icon } from './components/Icon'
import { ConfirmDialog, type ConfirmOptions } from './components/Modal'
import { SessionForm } from './components/SessionForm'
import { HangboardTimer } from './components/HangboardTimer'
import { Journal } from './pages/Journal'
import { Progress } from './pages/Progress'
import { Profile, type Theme } from './pages/Profile'

type Tab = 'journal' | 'progress' | 'profile'
const THEME_KEY = 'climb-log:theme'
function initialTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}
export function ClimbApp() {
  const [storageBlocked, setStorageBlocked] = useState(false)
  const [temporary, setTemporary] = useState(false)
  const [storage, setStorage] = useState<StorageAdapter>(
    () => new LocalStorageAdapter(() => setStorageBlocked(true)),
  )
  const repository = useMemo(() => new TrainingRepository(storage), [storage])
  const [db, setDb] = useState<Database | null>(null)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState<Tab>('journal')
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [resolvedTheme, setResolvedTheme] = useState('light')
  const [editor, setEditor] = useState<{ detail?: SessionDetail; draft?: boolean } | null>(null)
  const [timerOpen, setTimerOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)
  const [confirmError, setConfirmError] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null)
  const notify = (message: string, error = false) => setToast({ message, error })
  const useTemporaryStorage = async () => {
    const memory = new MemoryStorageAdapter()
    if (db) await memory.setItem(DATABASE_KEY, JSON.stringify(db))
    setStorage(memory)
    setTemporary(true)
    setStorageBlocked(false)
    setLoadError('')
  }
  const reload = async () => {
    if (storage instanceof LocalStorageAdapter) {
      setStorageBlocked(false)
      storage.checkWritable()
    }
    try {
      setDb(await repository.read())
      setLoadError('')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '读取失败，请重试')
    }
  }
  useEffect(() => {
    void reload()
    const changed = (event: StorageEvent) => {
      if (temporary) return
      if (event.key === DATABASE_KEY || event.key === null) void reload()
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [repository])
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const actual = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = actual
      setResolvedTheme(actual)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', actual === 'dark' ? '#101012' : '#f5f5f7')
    }
    apply()
    if (media.addEventListener) media.addEventListener('change', apply)
    else media.addListener(apply)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* Theme remains usable for this page session. */
    }
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', apply)
      else media.removeListener(apply)
    }
  }, [theme])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), toast.error ? 6500 : 3500)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    setConfirmError('')
  }, [confirm])
  const switchTab = (value: Tab) => {
    setTab(value)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const edit = (session: Session) => {
    if (!db) return
    setEditor({
      detail: {
        session: { ...session },
        climbs: db.climbs
          .filter((c) => c.sessionId === session.id)
          .map((c) => ({ ...c, grade: { ...c.grade } })),
        training: db.training.filter((t) => t.sessionId === session.id).map((t) => ({ ...t })),
      },
    })
  }
  const save = async (detail: SessionDetail) => {
    setDb(await repository.save(detail))
    setEditor(null)
    if (editor?.draft) setTimerOpen(false)
    notify(editor?.detail && !editor.draft ? '训练记录已更新' : '今天的努力，记下了。')
  }
  const remove = (session: Session) =>
    setConfirm({
      title: '删除这次训练？',
      description: `${session.date} 的${TYPE_LABELS[session.type]}训练及其全部线路、动作将被删除。此操作无法撤销。`,
      action: '删除训练',
      danger: true,
      onConfirm: async () => {
        setDb(await repository.delete(session.id))
        notify('训练记录已删除')
      },
    })
  const loadExamples = async () => {
    setBusy(true)
    try {
      setDb(await repository.importData(createExamples(), 'merge'))
      notify('示例已载入，随时可在「我的」中清除')
    } catch (e) {
      notify(e instanceof Error ? e.message : '载入失败', true)
    } finally {
      setBusy(false)
    }
  }
  const clearExamples = () =>
    setConfirm({
      title: '清除全部示例？',
      description: '仅移除标记为「示例」的训练及其线路、动作，你的个人记录会保留。',
      action: '清除示例',
      onConfirm: async () => {
        setDb(await repository.clearExamples())
        notify('示例已清除，个人记录已保留')
      },
    })
  const exportData = async () => {
    try {
      const json = await repository.exportJson()
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `岩迹-训练备份-${dateKey(new Date())}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      notify('已发起 JSON 下载，请在浏览器下载列表中确认')
    } catch (e) {
      notify(e instanceof Error ? e.message : '导出失败', true)
    }
  }
  const importData = async (data: Database, mode: ImportMode) => {
    setDb(await repository.importData(data, mode))
    notify(`已${mode === 'merge' ? '合并' : '覆盖导入'} ${data.sessions.length} 次训练`)
  }
  const confirmAction = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      await confirm.onConfirm()
      setConfirm(null)
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : '操作失败，请重试')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      <header className="app-header">
        <button className="brand" onClick={() => switchTab('journal')} aria-label="岩迹首页">
          <span className="brand-mark">
            <Icon name="mountain" size={23} />
          </span>
          <strong>岩迹</strong>
          <span className="brand-divider" />
          <span className="brand-caption">攀岩训练记录</span>
        </button>
        <div className="header-right">
          <span className="header-date">
            {new Date().toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </span>
          <button
            className="icon-button theme-toggle"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label={`切换为${resolvedTheme === 'dark' ? '浅色' : '深色'}模式`}
            title="切换外观"
          >
            <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={19} />
          </button>
        </div>
      </header>
      <main id="main-content">
        {(storageBlocked || temporary) && (
          <section className="storage-notice" aria-label="存储状态">
            <div role="status">
              <strong>{temporary ? '临时模式：记录尚未持久保存' : '本地存储不可用或空间不足'}</strong>
              <p>{temporary
                ? '刷新或关闭页面会丢失临时记录，请先导出 JSON 备份。原本地数据不会被覆盖。'
                : '浏览器可能限制了存储。可检查权限后重试，或使用临时模式继续记录。临时记录只在当前页面有效。'}</p>
              {storageBlocked && !db && <p>原有记录暂时无法读取；进入临时模式会从空列表开始，不会清除原数据。</p>}
            </div>
            {temporary ? <button className="button secondary" disabled={!db} onClick={exportData}>导出临时记录</button> : (
              <div className="journal-actions">
                <button className="button secondary" onClick={reload}>重试本地存储</button>
                <button className="button secondary" onClick={useTemporaryStorage}>使用临时模式</button>
              </div>
            )}
          </section>
        )}
        {loadError ? (
          <section className="load-state">
            <h1>记录暂时无法读取。</h1>
            <p role="alert">{loadError}</p>
            <button className="button primary" onClick={reload}>
              重新读取
            </button>
          </section>
        ) : !db ? (
          <section className="load-state" aria-live="polite">
            <span className="loading-ring" />
            <p>正在打开你的攀爬日常…</p>
          </section>
        ) : tab === 'journal' ? (
          <Journal
            db={db}
            onNew={() => setEditor({})}
            onTimer={() => setTimerOpen(true)}
            onEdit={edit}
            onDelete={remove}
            onExamples={loadExamples}
            onStats={() => switchTab('progress')}
            busy={busy}
          />
        ) : tab === 'progress' ? (
          <Progress db={db} />
        ) : (
          <Profile
            db={db}
            temporary={temporary}
            theme={theme}
            onTheme={setTheme}
            onExport={exportData}
            onImport={importData}
            onExamples={loadExamples}
            onClearExamples={clearExamples}
            busy={busy}
          />
        )}
      </main>
      <footer className="app-footer">
        <span>岩迹</span>
        <span>每一步，都有意义。</span>
        <span>{temporary ? '临时记录，请及时导出' : storageBlocked ? '存储受限，请检查备份' : '记录保存在此设备'}</span>
      </footer>
      <nav className="bottom-nav" aria-label="主要导航">
        {(
          [
            { value: 'journal', label: '记录', icon: 'mountain' },
            { value: 'progress', label: '统计', icon: 'activity' },
            { value: 'profile', label: '我的', icon: 'user' },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            className={tab === item.value ? 'active' : ''}
            aria-current={tab === item.value ? 'page' : undefined}
            onClick={() => switchTab(item.value)}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {timerOpen && (
        <HangboardTimer
          onClose={() => setTimerOpen(false)}
          onRecord={(detail) => setEditor({ detail, draft: true })}
        />
      )}
      {editor && (
        <SessionForm
          initial={editor.detail}
          draft={editor.draft}
          onClose={() => setEditor(null)}
          onSave={save}
        />
      )}
      {confirm && (
        <ConfirmDialog
          options={confirm}
          busy={busy}
          error={confirmError}
          onClose={() => setConfirm(null)}
          onConfirm={confirmAction}
        />
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? 'toast-error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          <Icon name={toast.error ? 'close' : 'check'} size={18} />
          <span>{toast.message}</span>
          <button className="icon-button" aria-label="关闭提示" onClick={() => setToast(null)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
