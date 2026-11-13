// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ClimbApp } from './ClimbApp'
import { Modal } from './components/Modal'

// Read source files directly: Vitest does not process CSS contents by default.
const css = readFileSync(resolve(process.cwd(), 'src/ui/styles.css'), 'utf8')
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

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
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('iPhone Safari / 微信内置浏览器兼容', () => {
  it('视口覆盖刘海区域，并在样式中预留安全区、动态视口高度与 16px 输入字号', () => {
    expect(html).toMatch(/viewport-fit=cover/)
    expect(html).toMatch(/lang="zh-CN"/)
    expect(html).toContain('<title>Chalk Log · 攀岩训练记录</title>')
    for (const side of ['top', 'right', 'bottom', 'left'])
      expect(css).toContain(`env(safe-area-inset-${side}, 0px)`)
    expect(css).toMatch(/max-height: calc\(100vh[^;]*;\s*max-height: calc\(100dvh/)
    expect(css).toMatch(/min-height: 100vh;\s*min-height: 100dvh;/)
    expect(css).toMatch(
      /@media \(hover: none\), \(pointer: coarse\)[\s\S]*font-size: 16px !important/,
    )
    expect(css).toContain('-webkit-tap-highlight-color: transparent')
    expect(css).toContain('touch-action: manipulation')
    expect(css).toContain('-webkit-text-size-adjust: 100%')
    expect(css).toContain("input[type='date']::-webkit-date-and-time-value")
  })

  it('无痕模式等本地存储不可用时给出提示，可切换临时模式且不清空原数据', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')
    render(<ClimbApp />)
    expect(await screen.findByText('本地存储不可用或空间不足')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '使用临时模式' }))
    expect(await screen.findByText('临时模式：记录尚未持久保存')).toBeTruthy()
    expect(screen.getAllByText('临时记录，请及时导出').length).toBeGreaterThan(0)
    fireEvent.click(await screen.findByRole('button', { name: '记录训练' }))
    fireEvent.click(screen.getByRole('button', { name: '保存训练' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: '导出临时记录' })).toBeTruthy()
    expect(removeItem).not.toHaveBeenCalledWith('climb-log:database:v1')
  })

  it('旧版 iOS WebView 缺少 dialog.showModal 时仍能打开和关闭弹窗', () => {
    // @ts-expect-error simulate a WebView without the modal dialog API
    delete HTMLDialogElement.prototype.showModal
    // @ts-expect-error simulate a WebView without the modal dialog API
    delete HTMLDialogElement.prototype.close
    const onClose = vi.fn()
    const { unmount } = render(
      <Modal title="兼容弹窗" onClose={onClose}>
        <p>内容</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: '兼容弹窗' })
    expect(dialog.hasAttribute('open')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '关闭弹窗' }))
    expect(onClose).toHaveBeenCalled()
    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
