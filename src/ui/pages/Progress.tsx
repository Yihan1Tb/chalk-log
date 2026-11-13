import { gradeLabel } from '../../domain/grades'
import { overview, weeklyVolume } from '../../domain/stats'
import { TYPE_LABELS, SESSION_TYPES, type Database } from '../../domain/types'
import { DifficultyTrend, Pyramid, VolumeChart } from '../components/Charts'

export function Progress({ db }: { db: Database }) {
  const stats = overview(db)
  const activeWeeks = weeklyVolume(db).filter((w) => w.sessions > 0).length
  return (
    <div className="page progress-page">
      <section className="page-intro">
        <div>
          <p className="eyebrow">进步，有迹可循</p>
          <h1>看见积累。</h1>
          <p className="intro-description">不只关注最难的那条线，也看看你走过的每一步。</p>
        </div>
        <span className="period-label">全部记录 · 本地统计</span>
      </section>
      {db.sessions.some((s) => s.source === 'example') && (
        <div className="example-banner">
          <span>
            <span className="sample-label">示例</span>以下统计包含已载入的示例记录。
          </span>
        </div>
      )}
      <section className="progress-summary">
        <div>
          <span>累计完攀</span>
          <strong>
            {stats.totalCompleted}
            <small>条</small>
          </strong>
        </div>
        <div>
          <span>线路完攀率</span>
          <strong>
            {stats.completionRate}
            <small>%</small>
          </strong>
        </div>
        <div>
          <span>训练总时长</span>
          <strong>
            {Math.round((stats.totalMinutes / 60) * 10) / 10}
            <small>小时</small>
          </strong>
        </div>
      </section>
      <section className="panel volume-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">节奏，比偶尔的爆发更重要</p>
            <h2>每周训练量</h2>
          </div>
          <span className="subtle-tag">近 8 周</span>
        </div>
        <VolumeChart db={db} />
        <p className="footnote">
          每周一至周日 · 最近 8 周中有 {activeWeeks} 周留下了训练记录 · 本周尚未结束
        </p>
      </section>
      <DifficultyTrend db={db} />
      <div className="progress-columns">
        <Pyramid db={db} />
        <div className="progress-side">
          <section className="panel personal-best">
            <p className="eyebrow">那些突破的瞬间</p>
            <h2>最高完攀</h2>
            <div className="best-line">
              <span>抱石</span>
              <strong>{stats.bestBoulder ? gradeLabel(stats.bestBoulder) : '—'}</strong>
            </div>
            <div className="best-line">
              <span>绳索</span>
              <strong>{stats.bestRope ? gradeLabel(stats.bestRope) : '—'}</strong>
            </div>
            <p className="footnote">仅统计 Flash 与 Send。绳索包含先锋和顶绳。</p>
          </section>
          <section className="panel type-distribution">
            <h2>训练构成</h2>
            {SESSION_TYPES.map((type) => {
              const count = db.sessions.filter((s) => s.type === type).length
              return (
                <div className="distribution-row" key={type}>
                  <span>{TYPE_LABELS[type]}</span>
                  <div>
                    <span
                      style={{
                        width: `${db.sessions.length ? (count / db.sessions.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <strong>
                    {count}
                    <small>次</small>
                  </strong>
                </div>
              )
            })}
          </section>
        </div>
      </div>
      <p className="page-footnote">
        每条线路计一次结果，不按尝试次数重复计数。完攀率 = 完攀线路数 ÷ 已记录线路数。
      </p>
    </div>
  )
}
