import { useState } from 'react'
import { addDays, formatDate, parseDate, shortDate, startOfWeek, dateKey } from '../../domain/dates'
import { gradeLabel, gradeRank } from '../../domain/grades'
import { overview } from '../../domain/stats'
import { isClimbing, isCompleted, SESSION_TYPES, TYPE_LABELS, type Database, type Session, type SessionType } from '../../domain/types'
import { VolumeChart } from '../components/Charts'
import { Icon } from '../components/Icon'

export function Journal({ db, onNew, onEdit, onDelete, onExamples, onStats, busy }: { db: Database; onNew: () => void; onEdit: (session: Session) => void; onDelete: (session: Session) => void; onExamples: () => void; onStats: () => void; busy: boolean }) {
  const stats = overview(db)
  const [filter, setFilter] = useState<SessionType | 'all'>('all')
  const [limit, setLimit] = useState(8)
  const sessions = db.sessions.filter(s => filter === 'all' || s.type === filter).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const monday = startOfWeek(new Date())
  const weekRange = `${shortDate(dateKey(monday))} — ${shortDate(dateKey(addDays(monday, 6)))}`
  const exampleCount = db.sessions.filter(s => s.source === 'example').length
  return <div className="page journal-page">
    <section className="page-intro"><div><p className="eyebrow">你的攀爬日常 <span className="eyebrow-line"/></p><h1>每一次向上，<br/>都算数。</h1><p className="intro-description">记录尝试，看见积累。下一次，比上一次更近一点。</p></div><button className="button primary new-session-button" onClick={onNew}><Icon name="plus" size={20}/>记录训练</button></section>
    <div className="overview-heading"><span>本周概览</span><span>{weekRange}<span className="week-dot"/>周一至周日</span></div>
    <section className="metrics-grid" aria-label="训练概览">
      <div className="metric"><p>本周训练</p><div className="metric-number accent">{String(stats.weeklySessions).padStart(2, '0')}<span>次</span></div><div className="metric-foot"><span className="tiny-dot"/>{stats.weeklyMinutes ? `累计 ${stats.weeklyMinutes} 分钟` : '从今天的第一次开始'}</div></div>
      <div className="metric best-metric"><p>本周最高完攀</p><div className="grade-pair"><div><strong>{stats.weeklyBoulder ? gradeLabel(stats.weeklyBoulder) : '—'}</strong><span>抱石</span></div><div><strong className="rope-grade">{stats.weeklyRope ? gradeLabel(stats.weeklyRope) : '—'}</strong><span>绳索</span></div></div><div className="metric-foot">{stats.weeklyCompleted} 条完攀 <span className="muted">/ Flash + Send</span></div></div>
      <div className="metric"><p>累计训练</p><div className="metric-number">{String(stats.totalSessions).padStart(2, '0')}<span>次</span></div><div className="metric-foot">{stats.totalSessions ? '每一份坚持，都留下了痕迹' : '你的故事，正要开始'}</div></div>
    </section>
    {!db.sessions.length && <section className="welcome-panel"><div className="welcome-art" aria-hidden="true"><svg viewBox="0 0 120 100" fill="none"><path d="M4 88 43 21l18 30 15-25 40 62H4Z" stroke="currentColor" strokeWidth="1.4"/><path d="m28 47 15 9 13-13M63 48l13 7 12-9M18 88l25-43 28 43" stroke="currentColor" strokeWidth="1" opacity=".4"/><circle cx="97" cy="17" r="7" stroke="currentColor" strokeWidth="1.4"/></svg></div><div><p className="eyebrow">你好，攀岩者</p><h2>先看看，进步的样子。</h2><p>载入最近 8 周的示例：抱石 V3–V4、先锋 5.10a、顶绳 5.11a。<br className="desktop-only"/>示例会单独标记，随时可以清除。</p></div><button className="button secondary" disabled={busy} onClick={onExamples}>{busy ? '载入中…' : '体验示例数据'}<Icon name="arrow" size={17}/></button></section>}
    {exampleCount > 0 && <div className="example-banner"><span><span className="sample-label">示例</span>当前包含 {exampleCount} 次示例训练，统计包含示例数据。</span><span className="muted">可在「我的」中一键清除</span></div>}
    <div className="journal-columns">
      <section className="history-section"><div className="section-heading"><div><p className="eyebrow">一路走来的痕迹</p><h2>训练记录 <span className="count-label">{db.sessions.length}</span></h2></div><Icon name="calendar" size={21}/></div>
        <div className="filter-tabs" aria-label="筛选训练类型">{(['all', ...SESSION_TYPES] as const).map(type => <button key={type} aria-pressed={filter === type} onClick={() => { setFilter(type); setLimit(8) }}>{type === 'all' ? '全部' : TYPE_LABELS[type]}</button>)}</div>
        <div className="session-list">{sessions.length ? sessions.slice(0, limit).map(session => {
          const climbs = db.climbs.filter(c => c.sessionId === session.id)
          const completed = climbs.filter(c => isCompleted(c.result))
          const best = [...completed].sort((a, b) => gradeRank(b.grade) - gradeRank(a.grade))[0]
          const date = parseDate(session.date)
          return <article className="session-row" key={session.id}>
            <button className="session-open" aria-label={`编辑 ${session.date} ${TYPE_LABELS[session.type]}训练`} onClick={() => onEdit(session)}>
              <div className="session-date"><strong>{String(date.getDate()).padStart(2, '0')}</strong><span>{date.getFullYear() !== new Date().getFullYear() ? `${date.getFullYear()}.` : ''}{date.getMonth() + 1}月</span></div>
              <div className="session-main"><div className="session-title"><h3>{TYPE_LABELS[session.type]}</h3>{session.source === 'example' && <span className="sample-label">示例</span>}</div><p className="session-venue">{session.venue || '未填写场馆'}</p><div className="session-meta"><span>{session.durationMinutes} 分钟</span><span>RPE {session.rpe}</span><span>{isClimbing(session.type) ? `${completed.length}/${climbs.length} 条完攀` : db.training.filter(t => t.sessionId === session.id).length + ' 个动作'}</span></div></div>
              <div className="session-best">{best ? <><strong>{gradeLabel(best.grade)}</strong><span>最高完攀</span></> : <><Icon name={isClimbing(session.type) ? 'mountain' : 'activity'} size={24}/><span>{isClimbing(session.type) ? '继续尝试' : '日常积累'}</span></>}</div>
            </button><button className="icon-button delete-session" aria-label={`删除 ${session.date} ${TYPE_LABELS[session.type]}训练`} disabled={busy} onClick={() => onDelete(session)}><Icon name="trash" size={17}/></button>
          </article>
        }) : <div className="empty-history"><div className="empty-symbol"><Icon name="mountain" size={32}/></div><h3>{db.sessions.length ? '这个分类，等待第一条记录。' : '岩壁上的努力，值得被记住。'}</h3><p>{db.sessions.length ? '换个分类看看，或记录一次新训练。' : '一次完攀，几次尝试，都是前进的一部分。'}</p><button className="text-button" onClick={onNew}>记下今天的训练<Icon name="arrow" size={17}/></button></div>}</div>
        {sessions.length > limit && <button className="load-more" onClick={() => setLimit(value => value + 12)}>查看更早记录 <span>还有 {sessions.length - limit} 次</span></button>}
        {sessions.length > 0 && <p className="history-hint">点击记录可查看与编辑 · 按训练日期倒序排列</p>}
      </section>
      <aside className="journal-aside"><section className="panel trend-preview"><div className="section-heading"><div><p className="eyebrow">把坚持连成一条线</p><h2>训练节奏</h2></div><span className="subtle-tag">近 8 周</span></div><VolumeChart db={db} compact/><button className="text-button" onClick={onStats}>看看我的进步<Icon name="arrow" size={17}/></button></section><section className="quiet-note"><span className="note-line"/><p>不必每次都登顶。<br/>愿意再试一次，<br/>也是一种进步。</p><span>攀爬，按自己的节奏。</span></section>{db.sessions.length > 0 && <p className="last-session">最近训练 · {formatDate([...db.sessions].sort((a, b) => b.date.localeCompare(a.date))[0].date)}</p>}</aside>
    </div>
  </div>
}
