export const SESSION_TYPES = ['boulder', 'lead', 'toprope', 'hangboard', 'strength', 'cardio'] as const
export type SessionType = typeof SESSION_TYPES[number]
export const TYPE_LABELS: Record<SessionType, string> = {
  boulder: '抱石', lead: '先锋', toprope: '顶绳', hangboard: '指力板', strength: '力量', cardio: '有氧',
}
export const RESULTS = ['flash', 'send', 'attempt', 'project'] as const
export type ClimbResult = typeof RESULTS[number]
export const RESULT_LABELS: Record<ClimbResult, string> = {
  flash: 'Flash · 一次完攀', send: 'Send · 完攀', attempt: 'Attempt · 尝试', project: 'Project · 攻线',
}
export type GradeSystem = 'v' | 'yds' | 'french'
export interface Grade { system: GradeSystem; value: string }
export interface Session {
  id: string
  date: string
  venue: string
  type: SessionType
  rpe: number
  notes: string
  durationMinutes: number
  source: 'personal' | 'example'
  createdAt: string
  updatedAt: string
}
export interface Climb {
  id: string
  sessionId: string
  grade: Grade
  attempts: number
  result: ClimbResult
  notes: string
}
export interface Training {
  id: string
  sessionId: string
  exercise: string
  sets: number
  reps: number
  weightKg: number
  durationSeconds: number
}
export interface Database {
  schemaVersion: 1
  sessions: Session[]
  climbs: Climb[]
  training: Training[]
}
export interface SessionDetail { session: Session; climbs: Climb[]; training: Training[] }
export type ImportMode = 'merge' | 'replace'
export const emptyDatabase = (): Database => ({ schemaVersion: 1, sessions: [], climbs: [], training: [] })
export const isClimbing = (type: SessionType): boolean => ['boulder', 'lead', 'toprope'].includes(type)
export const isCompleted = (result: ClimbResult): boolean => result === 'flash' || result === 'send'
