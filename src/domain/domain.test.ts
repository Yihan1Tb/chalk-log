import { describe, expect, it } from 'vitest'
import { addDays, dateKey, isValidDate, startOfWeek } from './dates'
import { compareGrades, FRENCH_GRADES, gradeRank } from './grades'
import { createExamples } from './examples'
import { difficultyPyramid, overview, weeklyDifficulty, weeklyVolume } from './stats'
import { emptyDatabase, type Database } from './types'
import { parseImport, validateDatabase } from './validation'

const now = new Date(2026, 10, 13, 12)
describe('日期和难度', () => {
  it('按本地日历以周一开始，跨年和周日均正确', () => {
    expect(dateKey(startOfWeek(new Date(2027, 0, 3, 23)))).toBe('2026-12-28')
    expect(dateKey(addDays(new Date(2026, 11, 31, 12), 1))).toBe('2027-01-01')
    expect(isValidDate('2026-02-29')).toBe(false)
    expect(isValidDate('2024-02-29')).toBe(true)
  })
  it('按难度而不是字符串顺序排序，不跨抱石与绳索比较', () => {
    expect(compareGrades({ system: 'v', value: 'V10' }, { system: 'v', value: 'V9' })).toBeGreaterThan(0)
    expect(compareGrades({ system: 'yds', value: '5.10a' }, { system: 'yds', value: '5.9' })).toBeGreaterThan(0)
    expect(compareGrades({ system: 'french', value: '6b+' }, { system: 'yds', value: '5.11a' })).toBe(0)
    expect(() => compareGrades({ system: 'v', value: 'V4' }, { system: 'yds', value: '5.11a' })).toThrow()
    const ranks = FRENCH_GRADES.map(value => gradeRank({ system: 'french', value }))
    expect(ranks.every((rank, i) => i === 0 || rank >= ranks[i - 1])).toBe(true)
  })
})
describe('示例与统计', () => {
  it('生成最近八周且不包含未来的可导入示例，覆盖全部六种训练', () => {
    const db = createExamples(now)
    expect(validateDatabase(db)).toEqual(db)
    expect(db.sessions.every(s => s.date <= '2026-11-13' && s.source === 'example')).toBe(true)
    expect(new Set(db.sessions.map(s => s.type)).size).toBe(6)
    expect(createExamples(now)).toEqual(db)
  })
  it('只统计 Flash/Send，并将抱石与绳索分开', () => {
    const db = createExamples(now)
    const stats = overview(db, now)
    expect(stats.weeklySessions).toBe(2)
    expect(stats.weeklyBoulder?.value).toBe('V4')
    expect(stats.weeklyRope?.value).toBe('5.10a')
    expect(stats.weeklyCompleted).toBe(7)
    expect(stats.bestRope?.value).toBe('5.11a')
    expect(difficultyPyramid(db, 'boulder').some(p => p.grade === 'V5')).toBe(false)
  })
  it('连续八周补零，不把下一周记录计入本周', () => {
    const series = weeklyVolume(emptyDatabase(), now)
    expect(series).toHaveLength(8)
    expect(series.every(w => w.sessions === 0)).toBe(true)
    const db = createExamples(now)
    db.sessions[db.sessions.length - 1].date = '2026-11-16'
    expect(overview(db, now).weeklySessions).toBe(1)
  })
  it('难度趋势区分先锋与顶绳，没有完攀的周保留空值', () => {
    const db = createExamples(now)
    expect(weeklyDifficulty(db, 'boulder', now).at(-1)?.grade?.value).toBe('V4')
    expect(weeklyDifficulty(db, 'lead', now).at(-1)?.grade?.value).toBe('5.10a')
    expect(weeklyDifficulty(db, 'toprope', now).at(-1)?.grade).toBeNull()
    expect(weeklyDifficulty(emptyDatabase(), 'boulder', now).every(w => w.rank === null)).toBe(true)
  })
})
describe('导入验证', () => {
  it('接受自身导出的结构，拒绝非法 JSON 和未知版本', () => {
    const db = createExamples(now)
    expect(parseImport(JSON.stringify(db))).toEqual(db)
    expect(() => parseImport('{')).toThrow('JSON 无法解析')
    expect(() => validateDatabase({ ...db, schemaVersion: 2 })).toThrow('不支持的数据版本')
  })
  it.each([
    [(db: Database) => { db.sessions[0].date = '2026-02-30' }, '日期无效'],
    [(db: Database) => { db.climbs[0].sessionId = 'missing' }, '关联'],
    [(db: Database) => { db.climbs[0].attempts = 2 }, 'Flash'],
    [(db: Database) => { db.climbs[0].grade.value = 'V99' }, '难度无效'],
    [(db: Database) => { db.sessions.push(db.sessions[0]) }, '重复 ID'],
    [(db: Database) => { db.sessions[0].rpe = 11 }, 'RPE'],
  ] as const)('拒绝坏数据 %#', (change, message) => {
    const db = createExamples(now); change(db)
    expect(() => validateDatabase(db)).toThrow(message)
  })
})
