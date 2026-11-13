import { describe, expect, it } from 'vitest'
import {
  createTimer,
  timerRecord,
  timerStage,
  transitionTimer,
  validateHangboard,
  workoutSeconds,
} from './hangboard'
import { emptyDatabase } from './types'
import { validateDatabase } from './validation'

const config = { hangSeconds: 2, restSeconds: 1, reps: 2, sets: 2, setRestSeconds: 3 }
const running = () => transitionTimer(createTimer(config), { type: 'start', nowMs: 1000 })
const at = (seconds: number) =>
  transitionTimer(running(), { type: 'tick', nowMs: 1000 + seconds * 1000 })
describe('指力板纯函数状态机', () => {
  it('按准备、悬挂、休息、组间休息切换，不多算最后一次休息', () => {
    expect(workoutSeconds(config)).toBe(13)
    expect(timerStage(createTimer(config))).toMatchObject({ phase: 'prepare', remainingSeconds: 5 })
    const expected = [
      [5, 'hang', 1, 1, 2],
      [7, 'rest', 1, 1, 1],
      [8, 'hang', 1, 2, 2],
      [10, 'setRest', 1, 2, 3],
      [13, 'hang', 2, 1, 2],
      [15, 'rest', 2, 1, 1],
      [16, 'hang', 2, 2, 2],
      [18, 'completed', 2, 2, 0],
    ] as const
    for (const [seconds, phase, set, rep, remainingSeconds] of expected)
      expect(timerStage(at(seconds))).toEqual({ phase, set, rep, remainingSeconds })
  })
  it('亚秒显示向上取整，边界不会停在零秒', () => {
    expect(timerStage(at(5.01)).remainingSeconds).toBe(2)
    expect(timerStage(at(6.999)).remainingSeconds).toBe(1)
    expect(timerStage(at(7)).phase).toBe('rest')
  })
  it('暂停时先结算未收到的 tick，继续不计入暂停时长', () => {
    const paused = transitionTimer(running(), { type: 'pause', nowMs: 6500 })
    expect(paused).toMatchObject({ status: 'paused', elapsedMs: 5500 })
    expect(transitionTimer(paused, { type: 'tick', nowMs: 100000 })).toBe(paused)
    const resumed = transitionTimer(paused, { type: 'start', nowMs: 100000 })
    expect(transitionTimer(resumed, { type: 'tick', nowMs: 100500 }).elapsedMs).toBe(6000)
  })
  it('延迟 tick 跨多个阶段，超时结束后不重复开始或累计', () => {
    const complete = at(500)
    expect(complete).toMatchObject({ status: 'completed', elapsedMs: 18000 })
    expect(transitionTimer(complete, { type: 'start', nowMs: 600000 })).toBe(complete)
    expect(transitionTimer(complete, { type: 'tick', nowMs: 600000 })).toBe(complete)
    expect(transitionTimer(running(), { type: 'pause', nowMs: 500000 }).status).toBe('completed')
  })
  it('单组单次和零秒休息不产生空阶段', () => {
    const single = transitionTimer(createTimer({ ...config, sets: 1, reps: 1 }), {
      type: 'start',
      nowMs: 0,
    })
    expect(timerStage(transitionTimer(single, { type: 'tick', nowMs: 7000 })).phase).toBe(
      'completed',
    )
    const zero = transitionTimer(createTimer({ ...config, restSeconds: 0, setRestSeconds: 0 }), {
      type: 'start',
      nowMs: 0,
    })
    expect(timerStage(transitionTimer(zero, { type: 'tick', nowMs: 9000 }))).toMatchObject({
      phase: 'hang',
      set: 2,
      rep: 1,
    })
    expect(transitionTimer(zero, { type: 'tick', nowMs: 13000 }).status).toBe('completed')
  })
  it('拒绝空值、非整数、负数、越界和超过一天的配置', () => {
    for (const patch of [
      { hangSeconds: NaN },
      { hangSeconds: 0 },
      { restSeconds: -1 },
      { reps: 1.5 },
      { sets: 101 },
      { setRestSeconds: 3601 },
      { hangSeconds: 3600, reps: 100 },
    ])
      expect(validateHangboard({ ...config, ...patch })).toBeTruthy()
    expect(() => createTimer({ ...config, reps: 0 })).toThrow()
    expect(validateHangboard(config)).toBeNull()
  })
  it('重置保留配置，时间回拨和无效时间不重复累计，不修改输入对象', () => {
    const original = running()
    const ticked = transitionTimer(original, { type: 'tick', nowMs: 2000 })
    const backwards = transitionTimer(ticked, { type: 'tick', nowMs: 1500 })
    expect(transitionTimer(backwards, { type: 'tick', nowMs: 2500 }).elapsedMs).toBe(1500)
    expect(transitionTimer(ticked, { type: 'tick', nowMs: NaN })).toBe(ticked)
    expect(transitionTimer(ticked, { type: 'reset' })).toEqual(createTimer(config))
    expect(original.elapsedMs).toBe(0)
    expect(transitionTimer(original, { type: 'start', nowMs: 3000 })).toBe(original)
  })
  it('完成后生成有效训练草稿，时长不含准备、组内悬挂时长不重复算休息', () => {
    const metadata = {
      sessionId: 'timer-session',
      trainingId: 'timer-training',
      date: '2026-11-13',
      timestamp: '2026-11-13T15:00:00.000Z',
    }
    expect(() => timerRecord(running(), metadata)).toThrow('完成计时')
    const detail = timerRecord(at(18), metadata)
    expect(detail.session).toMatchObject({
      type: 'hangboard',
      durationMinutes: 1,
      source: 'personal',
    })
    expect(detail.training[0]).toMatchObject({
      sessionId: metadata.sessionId,
      sets: 2,
      reps: 2,
      durationSeconds: 4,
    })
    expect(detail.session.notes).toContain('总计 13 秒')
    expect(() =>
      validateDatabase({
        ...emptyDatabase(),
        sessions: [detail.session],
        training: detail.training,
      }),
    ).not.toThrow()
  })
})
