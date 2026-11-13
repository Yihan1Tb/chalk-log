import type { StorageAdapter } from '../storage/StorageAdapter'
import { emptyDatabase, type Database, type ImportMode, type SessionDetail } from '../domain/types'
import { parseImport, validateDatabase } from '../domain/validation'

export const DATABASE_KEY = 'climb-log:database:v1'
export class TrainingRepository {
  private queue: Promise<unknown> = Promise.resolve()
  constructor(private readonly storage: StorageAdapter) {}
  async read(): Promise<Database> {
    const raw = await this.storage.getItem(DATABASE_KEY)
    if (raw === null) return emptyDatabase()
    try { return parseImport(raw) }
    catch (error) { throw new Error(`本地数据读取失败，原数据已保留。${error instanceof Error ? error.message : ''}`) }
  }
  private mutate(update: (current: Database) => Database): Promise<Database> {
    const next = this.queue.then(async () => {
      const data = validateDatabase(update(await this.read()))
      await this.storage.setItem(DATABASE_KEY, JSON.stringify(data))
      return data
    })
    this.queue = next.catch(() => undefined)
    return next
  }
  async get(id: string): Promise<SessionDetail | null> {
    const db = await this.read()
    const session = db.sessions.find(s => s.id === id)
    return session ? { session, climbs: db.climbs.filter(c => c.sessionId === id), training: db.training.filter(t => t.sessionId === id) } : null
  }
  save(detail: SessionDetail): Promise<Database> {
    return this.mutate(db => ({ ...db,
      sessions: [...db.sessions.filter(s => s.id !== detail.session.id), detail.session],
      climbs: [...db.climbs.filter(c => c.sessionId !== detail.session.id), ...detail.climbs],
      training: [...db.training.filter(t => t.sessionId !== detail.session.id), ...detail.training],
    }))
  }
  delete(id: string): Promise<Database> {
    return this.mutate(db => ({ ...db, sessions: db.sessions.filter(s => s.id !== id), climbs: db.climbs.filter(c => c.sessionId !== id), training: db.training.filter(t => t.sessionId !== id) }))
  }
  clearExamples(): Promise<Database> {
    return this.mutate(db => {
      const ids = new Set(db.sessions.filter(s => s.source === 'example').map(s => s.id))
      return { ...db, sessions: db.sessions.filter(s => !ids.has(s.id)), climbs: db.climbs.filter(c => !ids.has(c.sessionId)), training: db.training.filter(t => !ids.has(t.sessionId)) }
    })
  }
  importData(incoming: Database, mode: ImportMode): Promise<Database> {
    const checked = validateDatabase(incoming)
    return this.mutate(current => {
      if (mode === 'replace') return checked
      const ids = new Set(checked.sessions.map(s => s.id))
      return { schemaVersion: 1,
        sessions: [...current.sessions.filter(s => !ids.has(s.id)), ...checked.sessions],
        climbs: [...current.climbs.filter(c => !ids.has(c.sessionId)), ...checked.climbs],
        training: [...current.training.filter(t => !ids.has(t.sessionId)), ...checked.training],
      }
    })
  }
  async exportJson(): Promise<string> {
    return JSON.stringify({ ...await this.read(), exportedAt: new Date().toISOString(), app: '岩迹' }, null, 2)
  }
}
