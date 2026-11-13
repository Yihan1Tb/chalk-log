import { describe, expect, it } from 'vitest'
import type { StorageAdapter } from '../storage/StorageAdapter'
import { createExamples } from '../domain/examples'
import { emptyDatabase } from '../domain/types'
import { DATABASE_KEY, TrainingRepository } from './TrainingRepository'

class MemoryStorage implements StorageAdapter {
  values = new Map<string, string>()
  fail = false
  async getItem(key: string) { return this.values.get(key) ?? null }
  async setItem(key: string, value: string) { if (this.fail) throw new Error('模拟存储失败'); this.values.set(key, value) }
  async removeItem(key: string) { this.values.delete(key) }
}
describe('训练仓库', () => {
  it('合并幂等，编辑后级联更新，删除不遗留子表', async () => {
    const repo = new TrainingRepository(new MemoryStorage())
    const sample = createExamples(new Date(2026, 10, 13, 12))
    await repo.importData(sample, 'merge'); await repo.importData(sample, 'merge')
    expect((await repo.read()).sessions).toHaveLength(sample.sessions.length)
    const detail = (await repo.get(sample.sessions[0].id))!
    detail.session.venue = '新场馆'; detail.climbs = detail.climbs.slice(0, 1)
    await repo.save(detail)
    expect((await repo.get(detail.session.id))?.climbs).toHaveLength(1)
    expect((await repo.get(detail.session.id))?.session.venue).toBe('新场馆')
    await repo.delete(detail.session.id)
    expect(await repo.get(detail.session.id)).toBeNull()
    expect((await repo.read()).climbs.some(c => c.sessionId === detail.session.id)).toBe(false)
  })
  it('清除示例保留个人数据，覆盖导入可清空数据库', async () => {
    const repo = new TrainingRepository(new MemoryStorage())
    const sample = createExamples()
    sample.sessions[0].source = 'personal'
    await repo.importData(sample, 'replace')
    const cleared = await repo.clearExamples()
    expect(cleared.sessions).toHaveLength(1)
    expect(cleared.climbs.every(c => c.sessionId === sample.sessions[0].id)).toBe(true)
    await repo.importData(emptyDatabase(), 'replace')
    expect(await repo.read()).toEqual(emptyDatabase())
  })
  it('存储失败不破坏旧数据，原始损坏数据也不会被覆盖', async () => {
    const storage = new MemoryStorage(); const repo = new TrainingRepository(storage)
    await repo.importData(createExamples(), 'replace')
    const before = storage.values.get(DATABASE_KEY)
    storage.fail = true
    await expect(repo.clearExamples()).rejects.toThrow('模拟存储失败')
    expect(storage.values.get(DATABASE_KEY)).toBe(before)
    storage.fail = false; storage.values.set(DATABASE_KEY, 'broken')
    await expect(repo.importData(emptyDatabase(), 'replace')).rejects.toThrow('原数据已保留')
    expect(storage.values.get(DATABASE_KEY)).toBe('broken')
  })
  it('排队执行同时发生的修改', async () => {
    const repo = new TrainingRepository(new MemoryStorage())
    const db = await repo.importData(createExamples(), 'replace')
    await Promise.all([repo.delete(db.sessions[0].id), repo.delete(db.sessions[1].id)])
    expect((await repo.read()).sessions).toHaveLength(db.sessions.length - 2)
  })
})
