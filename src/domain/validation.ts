import { isValidDate } from './dates'
import { isValidGrade } from './grades'
import { isClimbing, RESULTS, SESSION_TYPES, type Climb, type Database, type Grade, type Session, type Training } from './types'

export class DataValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'DataValidationError' }
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DataValidationError(message)
}
function object(value: unknown, label: string): Record<string, unknown> {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), `${label}格式不正确`)
  return value as Record<string, unknown>
}
function text(value: unknown, label: string, max = 4000, required = false): asserts value is string {
  assert(typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0), `${label}须为${required ? '非空' : ''}文本，且不超过 ${max} 字`)
}
function number(value: unknown, label: string, min: number, max: number, integer = true): asserts value is number {
  assert(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value)), `${label}须为 ${min}–${max} 的${integer ? '整数' : '数字'}`)
}
function timestamp(value: unknown, label: string): asserts value is string {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)), `${label}格式不正确`)
}
function unique(rows: { id: string }[], label: string) {
  assert(new Set(rows.map(row => row.id)).size === rows.length, `${label}存在重复 ID`)
}
export function validateDatabase(input: unknown): Database {
  const data = object(input, '数据')
  assert(data.schemaVersion === 1, '不支持的数据版本，请导入岩迹导出的版本 1 JSON')
  for (const key of ['sessions', 'climbs', 'training']) {
    assert(Array.isArray(data[key]) && data[key].length <= 50000, `${key}须为数组，且不超过 50000 条`)
  }
  const sessions = (data.sessions as unknown[]).map((value, i): Session => {
    const row = object(value, `第 ${i + 1} 条训练`)
    text(row.id, '训练 ID', 120, true)
    assert(isValidDate(row.date), `第 ${i + 1} 条训练日期无效`)
    text(row.venue, '场馆', 100)
    assert(SESSION_TYPES.includes(row.type as Session['type']), '训练类型无效')
    number(row.rpe, 'RPE', 1, 10)
    text(row.notes, '训练备注')
    number(row.durationMinutes, '时长（分钟）', 0, 1440)
    assert(row.source === 'personal' || row.source === 'example', '记录来源无效')
    timestamp(row.createdAt, '创建时间'); timestamp(row.updatedAt, '更新时间')
    return { id: row.id, date: row.date, venue: row.venue, type: row.type as Session['type'], rpe: row.rpe, notes: row.notes, durationMinutes: row.durationMinutes, source: row.source, createdAt: row.createdAt, updatedAt: row.updatedAt }
  })
  unique(sessions, '训练')
  const byId = new Map(sessions.map(s => [s.id, s]))
  const climbs = (data.climbs as unknown[]).map((value): Climb => {
    const row = object(value, '线路')
    text(row.id, '线路 ID', 120, true); text(row.sessionId, '关联训练 ID', 120, true)
    const session = byId.get(row.sessionId)
    assert(session && isClimbing(session.type), '线路须关联到一条攀岩训练')
    const grade = object(row.grade, '难度')
    assert(isValidGrade(grade as unknown as Grade), '线路难度无效')
    assert((session.type === 'boulder') === (grade.system === 'v'), '抱石须使用 V 级，先锋或顶绳须使用 YDS 或法式难度')
    number(row.attempts, '尝试次数', 1, 999)
    assert(RESULTS.includes(row.result as Climb['result']), '线路结果无效')
    assert(row.result !== 'flash' || row.attempts === 1, 'Flash 的尝试次数必须为 1')
    text(row.notes, '线路备注')
    return { id: row.id, sessionId: row.sessionId, grade: { system: grade.system, value: grade.value } as Grade, attempts: row.attempts, result: row.result as Climb['result'], notes: row.notes }
  })
  unique(climbs, '线路')
  const training = (data.training as unknown[]).map((value): Training => {
    const row = object(value, '训练动作')
    text(row.id, '动作 ID', 120, true); text(row.sessionId, '关联训练 ID', 120, true)
    assert(byId.has(row.sessionId), '训练动作关联的记录不存在')
    text(row.exercise, '动作名称', 100, true)
    number(row.sets, '组数', 1, 999); number(row.reps, '次数', 0, 9999)
    number(row.weightKg, '重量（千克）', 0, 1000, false)
    number(row.durationSeconds, '动作时长（秒）', 0, 86400)
    return { id: row.id, sessionId: row.sessionId, exercise: row.exercise, sets: row.sets, reps: row.reps, weightKg: row.weightKg, durationSeconds: row.durationSeconds }
  })
  unique(training, '训练动作')
  const sessionsWithClimbs = new Set(climbs.map(c => c.sessionId))
  for (const session of sessions) {
    assert(!isClimbing(session.type) || sessionsWithClimbs.has(session.id), '攀岩训练至少需要一条线路')
    assert(isClimbing(session.type) || session.durationMinutes > 0, '非攀岩训练请填写大于 0 的时长')
  }
  return { schemaVersion: 1, sessions, climbs, training }
}
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024
export function parseImport(json: string): Database {
  assert(json.length <= MAX_IMPORT_BYTES, '文件过大，请选择小于 5 MB 的 JSON')
  let data: unknown
  try { data = JSON.parse(json) } catch { throw new DataValidationError('JSON 无法解析，请检查文件是否完整') }
  return validateDatabase(data)
}
