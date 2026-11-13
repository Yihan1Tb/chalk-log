export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}
export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return dateKey(parseDate(value)) === value && value >= '1900-01-01' && value <= '2199-12-31'
}
export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
export function startOfWeek(date: Date): Date {
  const start = addDays(date, -((date.getDay() + 6) % 7))
  start.setHours(0, 0, 0, 0)
  return start
}
export function weekKey(date: Date): string {
  return dateKey(startOfWeek(date))
}
export function formatDate(value: string): string {
  return parseDate(value).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}
export function shortDate(value: string): string {
  const date = parseDate(value)
  return `${date.getMonth() + 1}/${date.getDate()}`
}
