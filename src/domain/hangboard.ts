import type { SessionDetail } from './types'

export interface HangboardConfig {
  hangSeconds: number
  restSeconds: number
  reps: number
  sets: number
  setRestSeconds: number
}
export const DEFAULT_HANGBOARD: HangboardConfig = {
  hangSeconds: 7,
  restSeconds: 3,
  reps: 6,
  sets: 3,
  setRestSeconds: 120,
}
export const PREPARE_SECONDS = 5
export type TimerPhase = 'prepare' | 'hang' | 'rest' | 'setRest' | 'completed'
export interface TimerState {
  config: HangboardConfig
  status: 'idle' | 'running' | 'paused' | 'completed'
  elapsedMs: number
  lastTickMs: number | null
}
export type TimerAction = { type: 'start' | 'pause' | 'tick'; nowMs: number } | { type: 'reset' }

/** Active session time includes rests; preparation and paused time are excluded. */
export function workoutSeconds(config: HangboardConfig): number {
  return (
    config.sets * (config.reps * config.hangSeconds + (config.reps - 1) * config.restSeconds) +
    (config.sets - 1) * config.setRestSeconds
  )
}
export function validateHangboard(config: HangboardConfig): string | null {
  const limits: [number, number, number][] = [
    [config.hangSeconds, 1, 3600],
    [config.restSeconds, 0, 3600],
    [config.reps, 1, 100],
    [config.sets, 1, 100],
    [config.setRestSeconds, 0, 3600],
  ]
  if (limits.some(([value, min, max]) => !Number.isInteger(value) || value < min || value > max))
    return '请输入范围内的整数：悬挂 1–3600 秒，休息 0–3600 秒，每组次数和组数 1–100。'
  if (workoutSeconds(config) > 86400) return '总训练时长不能超过 24 小时，请减少次数或时长。'
  return null
}
export function createTimer(config: HangboardConfig = DEFAULT_HANGBOARD): TimerState {
  const error = validateHangboard(config)
  if (error) throw new Error(error)
  return { config: { ...config }, status: 'idle', elapsedMs: 0, lastTickMs: null }
}
function advance(state: TimerState, nowMs: number): TimerState {
  if (state.status !== 'running' || state.lastTickMs === null || !Number.isFinite(nowMs))
    return state
  const lastTickMs = Math.max(state.lastTickMs, nowMs)
  const totalMs = (PREPARE_SECONDS + workoutSeconds(state.config)) * 1000
  const elapsedMs = Math.min(totalMs, state.elapsedMs + lastTickMs - state.lastTickMs)
  return {
    ...state,
    elapsedMs,
    lastTickMs,
    status: elapsedMs === totalMs ? 'completed' : 'running',
  }
}
/** Pure transitions: callers supply time; delayed ticks may cross any number of phases. */
export function transitionTimer(state: TimerState, action: TimerAction): TimerState {
  if (action.type === 'reset') return createTimer(state.config)
  if (!Number.isFinite(action.nowMs)) return state
  if (action.type === 'start') {
    return state.status === 'idle' || state.status === 'paused'
      ? { ...state, status: 'running', lastTickMs: action.nowMs }
      : state
  }
  const next = advance(state, action.nowMs)
  return action.type === 'pause' && next.status === 'running'
    ? { ...next, status: 'paused', lastTickMs: null }
    : next
}
export function timerStage(state: TimerState): {
  phase: TimerPhase
  set: number
  rep: number
  remainingSeconds: number
} {
  const { config } = state
  let remainingMs = state.elapsedMs
  if (remainingMs < PREPARE_SECONDS * 1000)
    return {
      phase: 'prepare',
      set: 1,
      rep: 1,
      remainingSeconds: Math.ceil(PREPARE_SECONDS - remainingMs / 1000),
    }
  remainingMs -= PREPARE_SECONDS * 1000
  for (let set = 1; set <= config.sets; set++) {
    for (let rep = 1; rep <= config.reps; rep++) {
      if (remainingMs < config.hangSeconds * 1000)
        return {
          phase: 'hang',
          set,
          rep,
          remainingSeconds: Math.ceil(config.hangSeconds - remainingMs / 1000),
        }
      remainingMs -= config.hangSeconds * 1000
      if (rep < config.reps) {
        if (remainingMs < config.restSeconds * 1000)
          return {
            phase: 'rest',
            set,
            rep,
            remainingSeconds: Math.ceil(config.restSeconds - remainingMs / 1000),
          }
        remainingMs -= config.restSeconds * 1000
      }
    }
    if (set < config.sets) {
      if (remainingMs < config.setRestSeconds * 1000)
        return {
          phase: 'setRest',
          set,
          rep: config.reps,
          remainingSeconds: Math.ceil(config.setRestSeconds - remainingMs / 1000),
        }
      remainingMs -= config.setRestSeconds * 1000
    }
  }
  return { phase: 'completed', set: config.sets, rep: config.reps, remainingSeconds: 0 }
}
export function timerRecord(
  state: TimerState,
  metadata: { sessionId: string; trainingId: string; date: string; timestamp: string },
): SessionDetail {
  if (state.status !== 'completed') throw new Error('完成计时后才能生成训练记录')
  const { config } = state
  const seconds = workoutSeconds(config)
  return {
    session: {
      id: metadata.sessionId,
      date: metadata.date,
      type: 'hangboard',
      venue: '',
      rpe: 6,
      durationMinutes: Math.max(1, Math.ceil(seconds / 60)),
      notes: `指力板计时完成：${config.sets} 组 × ${config.reps} 次，悬挂 ${config.hangSeconds} 秒，次间休息 ${config.restSeconds} 秒，组间休息 ${config.setRestSeconds} 秒。总计 ${seconds} 秒（含休息，不含准备与暂停；分钟向上取整）。每组秒数为该组累计悬挂时间。`,
      source: 'personal',
      createdAt: metadata.timestamp,
      updatedAt: metadata.timestamp,
    },
    climbs: [],
    training: [
      {
        id: metadata.trainingId,
        sessionId: metadata.sessionId,
        exercise: '双手悬挂',
        sets: config.sets,
        reps: config.reps,
        weightKg: 0,
        durationSeconds: config.hangSeconds * config.reps,
      },
    ],
  }
}
