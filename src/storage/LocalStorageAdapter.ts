import type { StorageAdapter } from './StorageAdapter'

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly onUnavailable?: () => void) {}

  /** Probe a disposable key; never overwrite, clear or migrate the user's database. */
  checkWritable(): boolean {
    const key = `climb-log:storage-check:${Date.now()}:${Math.random().toString(36).slice(2)}`
    try {
      window.localStorage.setItem(key, '1')
      window.localStorage.removeItem(key)
      return true
    } catch {
      this.onUnavailable?.()
      return false
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(key)
    } catch {
      this.onUnavailable?.()
      throw new Error('无法读取本地存储，请检查浏览器的存储权限')
    }
  }
  async setItem(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      this.onUnavailable?.()
      throw new Error('保存失败：本地空间不足或存储被禁用。请先导出备份，当前表单仍保留')
    }
  }
  async removeItem(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(key)
    } catch {
      this.onUnavailable?.()
      throw new Error('无法清除本地数据，请检查浏览器的存储权限')
    }
  }
}
