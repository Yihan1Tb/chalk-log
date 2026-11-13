// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { emptyDatabase, type SessionDetail } from '../domain/types'
import { parseImport } from '../domain/validation'
import validImport from '../../tests/fixtures/import-valid.json'
import { Profile } from './pages/Profile'
import { SessionForm } from './components/SessionForm'
import { ClimbApp } from './ClimbApp'
import { DATABASE_KEY } from '../repo/TrainingRepository'
import { dateKey } from '../domain/dates'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  window.scrollTo = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('指力板计时器', () => {
  it('开始、暂停、继续、重置，并将完整计时预填为可保存的指力板训练', async () => {
    render(<ClimbApp />)
    fireEvent.click(await screen.findByRole('button', { name: '指力板计时器' }))
    vi.useFakeTimers()
    for (const [label, value] of [
      ['悬挂秒数', '2'],
      ['休息秒数', '1'],
      ['每组次数', '2'],
      ['组数', '2'],
      ['组间休息秒数', '3'],
    ])
      fireEvent.change(screen.getByLabelText(label), { target: { value } })
    expect((screen.getByLabelText('阶段提示音') as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '开始' }))
    act(() => vi.advanceTimersByTime(5500))
    expect(screen.getByRole('timer').getAttribute('aria-label')).toBe('剩余 2 秒')
    fireEvent.click(screen.getByRole('button', { name: '暂停' }))
    act(() => vi.advanceTimersByTime(100000))
    expect(screen.getByText('悬挂 · 已暂停')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    fireEvent.click(screen.getByRole('button', { name: '重置' }))
    expect(screen.getByRole('timer').getAttribute('aria-label')).toBe('剩余 5 秒')
    fireEvent.click(screen.getByRole('button', { name: '开始' }))
    act(() => vi.advanceTimersByTime(18000))
    fireEvent.click(screen.getByRole('button', { name: '生成训练记录' }))
    expect(screen.getByRole('dialog', { name: '记录一次训练' })).toBeTruthy()
    expect((screen.getByLabelText('训练时长（分钟）') as HTMLInputElement).value).toBe('1')
    expect((screen.getByLabelText('每组秒数') as HTMLInputElement).value).toBe('4')
    vi.useRealTimers()
    fireEvent.click(screen.getByRole('button', { name: '保存训练' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.overflow).not.toBe('hidden')
    const saved = parseImport(localStorage.getItem(DATABASE_KEY)!)
    expect(saved.sessions).toHaveLength(1)
    expect(saved.sessions[0].type).toBe('hangboard')
    expect(saved.training[0]).toMatchObject({ sets: 2, reps: 2, durationSeconds: 4 })
  })
})

describe('训练日历', () => {
  it('标记同一天的多条训练，切月、筛选、编辑保存后刷新当天列表', async () => {
    const today = dateKey(new Date())
    const db = parseImport(JSON.stringify(validImport))
    const session = { ...db.sessions[0], date: today }
    db.sessions = [
      session,
      {
        ...session,
        id: 'calendar-second',
        type: 'hangboard',
        venue: '日历测试',
        durationMinutes: 5,
      },
    ]
    localStorage.setItem(DATABASE_KEY, JSON.stringify(db))
    render(<ClimbApp />)
    fireEvent.click(await screen.findByRole('button', { name: '日历' }))
    const day = screen.getByRole('button', { name: `${today}，2 次训练，今天` })
    expect(day.getAttribute('aria-pressed')).toBe('true')
    expect(day.querySelector('.intensity-2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '上个月' }))
    expect(screen.queryByRole('button', { name: `编辑 ${today} 指力板训练` })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '下个月' }))
    fireEvent.click(screen.getByRole('button', { name: '今天' }))
    fireEvent.click(screen.getByRole('button', { name: '指力板' }))
    expect(screen.getByRole('button', { name: `${today}，1 次训练，今天` })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: `编辑 ${today} 指力板训练` }))
    fireEvent.change(screen.getByLabelText('场馆 / 地点'), { target: { value: '日历编辑成功' } })
    fireEvent.click(screen.getByRole('button', { name: '保存训练' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByText('日历编辑成功')).toBeTruthy()
    const otherDay = today.endsWith('-01') ? `${today.slice(0, 8)}02` : `${today.slice(0, 8)}01`
    fireEvent.click(screen.getByRole('button', { name: `${otherDay}，0 次训练` }))
    expect(screen.getByText('这一天还没有符合筛选的训练。')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '列表' }))
    expect(screen.getByText('日历编辑成功')).toBeTruthy()
  })
})
const profileProps = () => ({
  db: emptyDatabase(),
  theme: 'system' as const,
  onTheme: vi.fn(),
  onExport: vi.fn(),
  onImport: vi.fn().mockResolvedValue(undefined),
  onExamples: vi.fn(),
  onClearExamples: vi.fn(),
  busy: false,
})
function upload(data: unknown) {
  const file = { name: 'test.json', size: 100, text: () => Promise.resolve(JSON.stringify(data)) }
  fireEvent.change(screen.getByLabelText('选择 JSON 备份文件'), { target: { files: [file] } })
}
describe('导入交互', () => {
  it('点击覆盖选项后弹窗保持打开，明确确认前禁用执行', async () => {
    const props = profileProps()
    render(<Profile {...props} />)
    upload(validImport)
    await screen.findByRole('dialog', { name: '导入训练记录' })
    fireEvent.click(screen.getByRole('radio', { name: /覆盖全部记录/ }))
    expect(screen.getByRole('dialog', { name: '导入训练记录' })).toBeTruthy()
    expect((screen.getByRole('button', { name: '确认覆盖' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect(props.onImport).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: '我确认用此文件覆盖当前所有训练记录' }))
    fireEvent.click(screen.getByRole('button', { name: '确认覆盖' }))
    await waitFor(() => expect(props.onImport).toHaveBeenCalledWith(validImport, 'replace'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
  it('坏文件不会打开确认窗或调用导入', async () => {
    const props = profileProps()
    render(<Profile {...props} />)
    upload({ schemaVersion: 99 })
    await screen.findByRole('alert')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(props.onImport).not.toHaveBeenCalled()
  })
  it('合并失败保留文件和选项，可再次尝试', async () => {
    const props = profileProps()
    props.onImport.mockRejectedValue(new Error('存储空间不足'))
    render(<Profile {...props} />)
    upload(validImport)
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: '确认合并' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('存储空间不足'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(props.onImport).toHaveBeenCalledWith(validImport, 'merge')
  })
})
describe('训练表单', () => {
  it('保存两条不同难度和结果的线路，Flash 自动固定一次尝试', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<SessionForm onSave={onSave} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('场馆 / 地点'), { target: { value: '测试岩馆' } })
    fireEvent.click(screen.getByRole('button', { name: /^Flash/ }))
    fireEvent.click(screen.getByRole('button', { name: '再记一条' }))
    fireEvent.click(screen.getByRole('button', { name: 'V4' }))
    fireEvent.click(screen.getByRole('button', { name: /^Project/ }))
    fireEvent.click(screen.getByRole('button', { name: '保存训练' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    const detail = onSave.mock.calls[0][0] as SessionDetail
    expect(detail.session.venue).toBe('测试岩馆')
    expect(detail.climbs.map((c) => [c.grade.value, c.result, c.attempts])).toEqual([
      ['V3', 'flash', 1],
      ['V4', 'project', 2],
    ])
    expect(detail.climbs.every((c) => c.sessionId === detail.session.id)).toBe(true)
  })
  it('非攀岩训练可删除所有动作，仅保存时长与备注', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<SessionForm onSave={onSave} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '有氧' }))
    fireEvent.click(screen.getByRole('button', { name: '移除动作 1' }))
    fireEvent.change(screen.getByLabelText('训练时长（分钟）'), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText('给今天留句话'), { target: { value: '轻松慢跑' } })
    fireEvent.click(screen.getByRole('button', { name: '保存训练' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    const detail = onSave.mock.calls[0][0] as SessionDetail
    expect(detail.climbs).toEqual([])
    expect(detail.training).toEqual([])
    expect(detail.session).toMatchObject({ type: 'cardio', durationMinutes: 30, notes: '轻松慢跑' })
  })
  it('保存失败保留表单，放弃未保存内容必须确认', async () => {
    const onClose = vi.fn()
    render(
      <SessionForm onSave={vi.fn().mockRejectedValue(new Error('保存失败'))} onClose={onClose} />,
    )
    fireEvent.change(screen.getByLabelText('场馆 / 地点'), { target: { value: '不能丢失的内容' } })
    fireEvent.click(screen.getByRole('button', { name: '保存训练' }))
    await screen.findByRole('alert')
    expect((screen.getByLabelText('场馆 / 地点') as HTMLInputElement).value).toBe('不能丢失的内容')
    fireEvent.click(screen.getByRole('button', { name: '关闭弹窗' }))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '放弃修改' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
describe('导出下载入口', () => {
  it('生成可重新导入的 JSON Blob 和带日期的下载文件名', async () => {
    localStorage.setItem(DATABASE_KEY, JSON.stringify(validImport))
    let exported: Blob | undefined
    URL.createObjectURL = vi.fn((blob: Blob) => {
      exported = blob
      return 'blob:export-test'
    })
    URL.revokeObjectURL = vi.fn()
    let filename = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      filename = this.download
    })
    render(<ClimbApp />)
    await screen.findByRole('heading', { name: /每一次向上/ })
    fireEvent.click(screen.getByRole('button', { name: '我的' }))
    fireEvent.click(screen.getByRole('button', { name: '导出' }))
    await waitFor(() => expect(exported).toBeTruthy())
    expect(filename).toMatch(/^岩迹-训练备份-\d{4}-\d{2}-\d{2}\.json$/)
    const json = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsText(exported!)
    })
    expect(parseImport(json)).toEqual(validImport)
  })
})
