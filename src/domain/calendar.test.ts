import { describe, expect, it } from 'vitest'
import { countSessionsByDate, monthCells, shiftMonth } from './calendar'
import { parseImport } from './validation'
import fixture from '../../tests/fixtures/import-valid.json'

describe('本地日历', () => {
  it('以周一开始，闰年二月包含 29 日，月末补齐一周', () => {
    const cells = monthCells('2024-02-10')
    expect(cells.slice(0, 4)).toEqual([null, null, null, '2024-02-01'])
    expect(cells.filter(Boolean)).toHaveLength(29)
    expect(cells[31]).toBe('2024-02-29')
    expect(cells).toHaveLength(35)
    expect(monthCells('2026-11-13')[6]).toBe('2026-11-01')
    expect(monthCells('2026-11-13')).toHaveLength(42)
  })
  it('切换跨年及月末日期，不跳过二月', () => {
    expect(shiftMonth('2026-01-31', 1)).toBe('2026-02-28')
    expect(shiftMonth('2024-01-31', 1)).toBe('2024-02-29')
    expect(shiftMonth('2026-12-15', 1)).toBe('2027-01-15')
    expect(shiftMonth('2026-01-15', -1)).toBe('2025-12-15')
  })
  it('按日期汇总训练次数，空数据保持空标记', () => {
    const session = parseImport(JSON.stringify(fixture)).sessions[0]
    const counts = countSessionsByDate([
      session,
      { ...session, id: 'second' },
      { ...session, id: 'third', date: '2026-02-03' },
    ])
    expect(counts.get(session.date)).toBe(2)
    expect(counts.get('2026-02-03')).toBe(1)
    expect(countSessionsByDate([]).size).toBe(0)
  })
})
