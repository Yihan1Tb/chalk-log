import type { StorageAdapter } from './StorageAdapter'

/** Explicitly selected, page-lifetime storage. It never writes to browser persistence. */
export class MemoryStorageAdapter implements StorageAdapter {
  private readonly values = new Map<string, string>()
  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null
  }
  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value)
  }
  async removeItem(key: string): Promise<void> {
    this.values.delete(key)
  }
}
