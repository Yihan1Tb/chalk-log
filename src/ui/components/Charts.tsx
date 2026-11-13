import { useState } from 'react'
import { difficultyPyramid, weeklyDifficulty, weeklyVolume } from '../../domain/stats'
import { gradeLabel, V_GRADES, YDS_GRADES } from '../../domain/grades'
import { TYPE_LABELS, type Database } from '../../domain/types'

export function VolumeChart({ db, compact = false }: { db: Database; compact?: boolean }) {
  const weeks = weeklyVolume(db)
  const [selected, setSelected] = useState(weeks.length - 1)
  const max = Math.max(4, ...weeks.map((w) => w.sessions))
  const width = 680,
    height = compact ? 150 : 220,
    left = 30,
    right = 20,
    top = 20,
    bottom = 34
  const x = (i: number) => left + (i * (width - left - right)) / 7
  const y = (value: number) => height - bottom - (value / max) * (height - top - bottom)
  const points = weeks.map((w, i) => `${x(i)},${y(w.sessions)}`).join(' ')
  const active = weeks[selected]
  return (
    <div className="volume-chart">
      {!compact && (
        <div className="chart-detail">
          <div>
            <strong>{active.sessions}</strong>
            <span>次训练</span>
          </div>
          <span>
            {active.label} 当周 · {active.minutes} 分钟 · {active.completed} 条完攀
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`近八周训练次数：${weeks.map((w) => `${w.label} 当周 ${w.sessions} 次`).join('，')}`}
      >
        {[0, Math.ceil(max / 2), max].map((tick) => (
          <g key={tick}>
            <line x1={left} y1={y(tick)} x2={width - right} y2={y(tick)} className="chart-grid" />
            <text x={left - 14} y={y(tick) + 4} className="chart-label" textAnchor="middle">
              {tick}
            </text>
          </g>
        ))}
        <polygon
          points={`${left},${y(0)} ${points} ${x(7)},${y(0)}`}
          fill="var(--accent)"
          opacity="0.045"
        />
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {weeks.map((w, i) => (
          <g key={w.key}>
            <circle
              cx={x(i)}
              cy={y(w.sessions)}
              r={i === selected && !compact ? 5 : 3}
              fill={i === 7 || (i === selected && !compact) ? 'var(--accent)' : 'var(--surface)'}
              stroke="var(--accent)"
              strokeWidth="2"
            />
            <text x={x(i)} y={height - 8} className="chart-label" textAnchor="middle">
              {i === 7 ? '本周' : w.label}
            </text>
          </g>
        ))}
      </svg>
      {!compact && (
        <div className="chart-week-buttons" aria-label="查看每周训练详情">
          {weeks.map((w, i) => (
            <button key={w.key} aria-pressed={selected === i} onClick={() => setSelected(i)}>
              {i === 7 ? '本周' : w.label}
              <span className="sr-only">当周 {w.sessions} 次训练</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Pyramid({ db }: { db: Database }) {
  const [kind, setKind] = useState<'boulder' | 'rope'>('boulder')
  const rows = difficultyPyramid(db, kind)
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <section className="panel pyramid-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">每一层，都是积累</p>
          <h2>难度金字塔</h2>
        </div>
        <div className="segmented compact" aria-label="金字塔类型">
          <button aria-pressed={kind === 'boulder'} onClick={() => setKind('boulder')}>
            抱石
          </button>
          <button aria-pressed={kind === 'rope'} onClick={() => setKind('rope')}>
            绳索
          </button>
        </div>
      </div>
      <p className="muted small">累计完攀线路 · Flash + Send</p>
      <div className="pyramid-bars">
        {rows.length ? (
          rows.map((row) => (
            <div className="pyramid-row" key={row.grade}>
              <strong>{row.grade}</strong>
              <div className="pyramid-track">
                <div
                  className="pyramid-bar"
                  style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }}
                />
              </div>
              <span>
                {row.count}
                <span className="sr-only">条完攀</span>
              </span>
            </div>
          ))
        ) : (
          <div className="chart-empty">
            还没有{kind === 'boulder' ? '抱石' : '绳索'}完攀记录
            <br />
            <span>下一次登顶，就从这里开始。</span>
          </div>
        )}
      </div>
      {kind === 'rope' && (
        <p className="footnote">
          先锋与顶绳合计；法式难度按近似对照归入 YDS。不同岩馆的定级可能不同。
        </p>
      )}
    </section>
  )
}

export function DifficultyTrend({ db }: { db: Database }) {
  const [type, setType] = useState<'boulder' | 'lead' | 'toprope'>('boulder')
  const weeks = weeklyDifficulty(db, type)
  const ranks = weeks.flatMap((w) => (w.rank === null ? [] : [w.rank]))
  const min = Math.max(0, Math.min(...ranks) - 1)
  const max = Math.max(...ranks) + 1
  const scale = type === 'boulder' ? V_GRADES : YDS_GRADES
  const ticks = [...new Set([min, Math.round((min + max) / 2), max])].filter((rank) => scale[rank])
  const x = (i: number) => 48 + (i * 612) / 7
  const y = (rank: number) => 152 - ((rank - min) / (max - min)) * 128
  const segments: string[][] = [[]]
  weeks.forEach((week, index) => {
    if (week.rank === null) {
      if (segments[segments.length - 1].length) segments.push([])
    } else segments[segments.length - 1].push(`${x(index)},${y(week.rank)}`)
  })
  return (
    <section className="panel difficulty-trend">
      <div className="section-heading">
        <div>
          <p className="eyebrow">那些更进一步的时刻</p>
          <h2>难度趋势</h2>
        </div>
        <div className="segmented compact" aria-label="难度趋势类型">
          {(['boulder', 'lead', 'toprope'] as const).map((value) => (
            <button key={value} aria-pressed={type === value} onClick={() => setType(value)}>
              {TYPE_LABELS[value]}
            </button>
          ))}
        </div>
      </div>
      <p className="small muted trend-description">每周最高完攀 · 近 8 周</p>
      {ranks.length ? (
        <svg
          viewBox="0 0 680 188"
          role="img"
          aria-label={`${TYPE_LABELS[type]}每周最高完攀：${weeks.map((w) => `${w.label} ${w.grade ? gradeLabel(w.grade) : '没有完攀'}`).join('，')}`}
        >
          {ticks.map((rank) => (
            <g key={rank}>
              <line x1="48" y1={y(rank)} x2="660" y2={y(rank)} className="chart-grid" />
              <text x="36" y={y(rank) + 4} textAnchor="end" className="chart-label">
                {scale[rank]}
              </text>
            </g>
          ))}
          {segments
            .filter((segment) => segment.length)
            .map((segment, i) => (
              <polyline
                key={i}
                points={segment.join(' ')}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          {weeks.map((week, index) => (
            <g key={week.key}>
              {week.rank !== null && (
                <>
                  <circle
                    cx={x(index)}
                    cy={y(week.rank)}
                    r="3.5"
                    fill="var(--surface)"
                    stroke="var(--accent)"
                    strokeWidth="2"
                  />
                  <text
                    x={x(index)}
                    y={y(week.rank) - 12}
                    textAnchor="middle"
                    className="chart-label trend-point-label"
                  >
                    {scale[week.rank]}
                  </text>
                </>
              )}
              <text x={x(index)} y="181" textAnchor="middle" className="chart-label">
                {index === 7 ? '本周' : week.label}
              </text>
            </g>
          ))}
        </svg>
      ) : (
        <div className="chart-empty">
          还没有{TYPE_LABELS[type]}完攀记录
          <br />
          <span>完成第一条线路后，这里会留下起点。</span>
        </div>
      )}
      <p className="footnote">
        仅统计 Flash 和 Send；没有完攀的周留空。绳索以 YDS 展示，法式为近似换算。
      </p>
    </section>
  )
}
