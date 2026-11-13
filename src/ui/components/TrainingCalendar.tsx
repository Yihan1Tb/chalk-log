import { countSessionsByDate, monthCells, shiftMonth } from '../../domain/calendar'
import { dateKey, parseDate } from '../../domain/dates'
import type { Session } from '../../domain/types'

export function TrainingCalendar({
  sessions,
  selectedDate,
  onSelect,
}: {
  sessions: Session[]
  selectedDate: string
  onSelect: (date: string) => void
}) {
  const today = dateKey(new Date())
  const month = parseDate(selectedDate)
  const title = `${month.getFullYear()} 年 ${month.getMonth() + 1} 月`
  const counts = countSessionsByDate(sessions)
  return (
    <section className="training-calendar" aria-label="训练日历">
      <div className="calendar-heading">
        <h3 aria-live="polite">{title}</h3>
        <div className="calendar-controls">
          <button
            className="icon-button"
            aria-label="上个月"
            disabled={selectedDate.startsWith('1900-01')}
            onClick={() => onSelect(shiftMonth(selectedDate, -1))}
          >
            ‹
          </button>
          <button className="text-button" onClick={() => onSelect(today)}>
            今天
          </button>
          <button
            className="icon-button"
            aria-label="下个月"
            disabled={selectedDate.startsWith('2199-12')}
            onClick={() => onSelect(shiftMonth(selectedDate, 1))}
          >
            ›
          </button>
        </div>
      </div>
      <div className="calendar-grid" aria-label={title}>
        {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
          <span className="calendar-weekday" key={day} aria-hidden="true">
            {day}
          </span>
        ))}
        {monthCells(selectedDate).map((day, index) =>
          day ? (
            <button
              key={day}
              className={`calendar-day ${day === today ? 'is-today' : ''}`}
              aria-pressed={day === selectedDate}
              aria-current={day === today ? 'date' : undefined}
              aria-label={`${day}，${counts.get(day) ?? 0} 次训练${day === today ? '，今天' : ''}`}
              onClick={() => onSelect(day)}
            >
              <span>{Number(day.slice(-2))}</span>
              {(counts.get(day) ?? 0) > 0 && (
                <span
                  aria-hidden="true"
                  className={`calendar-dot intensity-${Math.min(counts.get(day)!, 3)}`}
                />
              )}
            </button>
          ) : (
            <span key={`blank-${index}`} aria-hidden="true" />
          ),
        )}
      </div>
      <p className="calendar-legend">
        <span className="calendar-dot intensity-1" />1 次
        <span className="calendar-dot intensity-2" />2 次
        <span className="calendar-dot intensity-3" />3 次及以上<span>按当前类型筛选</span>
      </p>
    </section>
  )
}
