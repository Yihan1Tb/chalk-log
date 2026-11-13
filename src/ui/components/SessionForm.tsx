import { useState, type FormEvent } from 'react'
import { dateKey } from '../../domain/dates'
import { GRADE_OPTIONS } from '../../domain/grades'
import { isClimbing, RESULTS, RESULT_LABELS, SESSION_TYPES, TYPE_LABELS, type Climb, type GradeSystem, type Session, type SessionDetail, type SessionType, type Training } from '../../domain/types'
import { Icon } from './Icon'
import { ConfirmDialog, Modal } from './Modal'

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
function newClimb(sessionId: string, type: SessionType, previous?: Climb): Climb {
  return { id: newId(), sessionId, grade: previous ? { ...previous.grade } : { system: type === 'boulder' ? 'v' : 'yds', value: type === 'boulder' ? 'V3' : '5.10a' }, attempts: 2, result: 'send', notes: '' }
}
function newTraining(sessionId: string, type: SessionType): Training {
  return { id: newId(), sessionId, exercise: type === 'hangboard' ? '双手悬挂' : type === 'strength' ? '引体向上' : '慢跑', sets: type === 'cardio' ? 1 : 3, reps: type === 'strength' ? 5 : 0, weightKg: 0, durationSeconds: type === 'hangboard' ? 10 : 0 }
}
export function SessionForm({ initial, onClose, onSave }: { initial?: SessionDetail; onClose: () => void; onSave: (detail: SessionDetail) => Promise<void> }) {
  const [session, setSession] = useState<Session>(() => initial?.session ?? { id: newId(), date: dateKey(new Date()), venue: '', type: 'boulder', rpe: 6, notes: '', durationMinutes: 90, source: 'personal', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  const [climbs, setClimbs] = useState<Climb[]>(() => initial?.climbs ?? [newClimb(session.id, session.type)])
  const [training, setTraining] = useState<Training[]>(() => initial?.training ?? [])
  const [active, setActive] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [routeTouched, setRouteTouched] = useState(Boolean(initial))
  const [discard, setDiscard] = useState(false)
  const [pendingType, setPendingType] = useState<SessionType | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const route = climbs[active]
  const update = <K extends keyof Session>(key: K, value: Session[K]) => { setSession(s => ({ ...s, [key]: value })); setDirty(true) }
  const updateClimb = (patch: Partial<Climb>) => { setClimbs(rows => rows.map((row, index) => index === active ? { ...row, ...patch } : row)); setDirty(true); setRouteTouched(true) }
  const updateTraining = (id: string, patch: Partial<Training>) => { setTraining(rows => rows.map(row => row.id === id ? { ...row, ...patch } : row)); setDirty(true) }
  const close = () => { if (busy) return; if (dirty) setDiscard(true); else onClose() }
  const applyType = (type: SessionType) => {
    update('type', type)
    if (isClimbing(type)) {
      if (!isClimbing(session.type) || (type === 'boulder') !== (session.type === 'boulder')) setClimbs([newClimb(session.id, type)])
    } else { setClimbs([]); if (!training.length) setTraining([newTraining(session.id, type)]) }
    setActive(0); setPendingType(null); setRouteTouched(false)
  }
  const changeType = (type: SessionType) => {
    if (type === session.type) return
    if (routeTouched && climbs.length && (!isClimbing(type) || (type === 'boulder') !== (session.type === 'boulder'))) setPendingType(type)
    else applyType(type)
  }
  const save = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true)
    try { await onSave({ session: { ...session, venue: session.venue.trim(), notes: session.notes.trim(), updatedAt: new Date().toISOString() }, climbs: isClimbing(session.type) ? climbs : [], training }) }
    catch (e) { setError(e instanceof Error ? e.message : '保存失败，请重试') }
    finally { setBusy(false) }
  }
  return <Modal title={initial ? '编辑训练' : '记录一次训练'} subtitle="每一次尝试，都值得记录" onClose={close} className="session-modal">
    <form onSubmit={save}>
      <fieldset disabled={busy} className="form-content">
        {session.source === 'example' && <p className="inline-notice">正在编辑示例记录；清除示例时，这条记录也会被移除。</p>}
        <div className="form-grid two"><label className="field">训练日期<input type="date" value={session.date} min="1900-01-01" max={dateKey(new Date())} required onChange={e => update('date', e.target.value)}/></label><label className="field">场馆 / 地点<input value={session.venue} maxLength={100} placeholder="今天在哪里攀爬？" onChange={e => update('venue', e.target.value)}/></label></div>
        <div className="field"><span>训练类型</span><div className="type-grid">{SESSION_TYPES.map(type => <button key={type} type="button" className={type === session.type ? 'selected' : ''} aria-pressed={type === session.type} onClick={() => changeType(type)}>{TYPE_LABELS[type]}</button>)}</div></div>
        <div className="form-grid two"><label className="field">训练时长（分钟）<input type="number" inputMode="numeric" min={isClimbing(session.type) ? 0 : 1} max={1440} required value={Number.isNaN(session.durationMinutes) ? '' : session.durationMinutes} onChange={e => update('durationMinutes', e.target.valueAsNumber)}/></label><div className="field"><label htmlFor="rpe">主观强度 RPE <strong className="accent">{session.rpe} / 10</strong></label><input id="rpe" type="range" min="1" max="10" value={session.rpe} onChange={e => update('rpe', Number(e.target.value))}/><div className="range-labels"><span>轻松</span><span>极限</span></div></div></div>
        {isClimbing(session.type) && <section className="route-section">
          <div className="section-heading"><h3>攀爬线路 <span className="count-label">{climbs.length}</span></h3><button type="button" className="text-button" onClick={() => { setClimbs(rows => [...rows, newClimb(session.id, session.type, rows[rows.length - 1])]); setActive(climbs.length); setDirty(true); setRouteTouched(true) }}><Icon name="plus" size={16}/>再记一条</button></div>
          <div className="route-tabs" aria-label="选择编辑的线路">{climbs.map((climb, index) => <button type="button" key={climb.id} aria-pressed={active === index} onClick={() => setActive(index)}><span>{String(index + 1).padStart(2, '0')}</span>{climb.grade.value}<span className={`route-dot ${climb.result === 'flash' || climb.result === 'send' ? 'complete' : ''}`}/></button>)}</div>
          {route && <div className="route-editor">
            <div className="section-heading"><span className="small muted">线路 {String(active + 1).padStart(2, '0')}</span>{climbs.length > 1 && <button type="button" className="icon-button small-icon" aria-label={`移除线路 ${active + 1}`} onClick={() => { setClimbs(rows => rows.filter((_, index) => index !== active)); setActive(Math.max(0, active - 1)); setDirty(true) }}><Icon name="trash" size={17}/></button>}</div>
            <div className="section-heading grade-heading"><h3>选择难度</h3>{session.type !== 'boulder' && <div className="segmented compact">{(['yds', 'french'] as GradeSystem[]).map(system => <button key={system} type="button" aria-pressed={route.grade.system === system} onClick={() => updateClimb({ grade: { system, value: system === 'yds' ? '5.10a' : '6a' } })}>{system === 'yds' ? 'YDS' : '法式'}</button>)}</div>}</div>
            <div className="grade-grid" aria-label="线路难度">{GRADE_OPTIONS[route.grade.system].map(grade => <button key={grade} type="button" aria-pressed={route.grade.value === grade} className={route.grade.value === grade ? 'selected' : ''} onClick={() => updateClimb({ grade: { ...route.grade, value: grade } })}>{grade}</button>)}</div>
            <div className="field"><span>这条线的结果</span><div className="result-grid">{RESULTS.map(result => <button key={result} type="button" aria-pressed={route.result === result} className={route.result === result ? 'selected' : ''} onClick={() => updateClimb({ result, attempts: result === 'flash' ? 1 : route.attempts })}><strong>{result[0].toUpperCase() + result.slice(1)}</strong><span>{RESULT_LABELS[result].split(' · ')[1]}</span></button>)}</div></div>
            <div className="form-grid route-bottom"><label className="field">尝试次数<div className="stepper"><button type="button" aria-label="减少尝试次数" disabled={route.attempts <= 1} onClick={() => updateClimb({ attempts: route.attempts - 1 })}>−</button><input aria-label="尝试次数" type="number" inputMode="numeric" min={1} max={999} required value={Number.isNaN(route.attempts) ? '' : route.attempts} onChange={e => { const attempts = e.target.valueAsNumber; updateClimb({ attempts, result: route.result === 'flash' && attempts > 1 ? 'send' : route.result }) }}/><button type="button" aria-label="增加尝试次数" disabled={route.attempts >= 999} onClick={() => updateClimb({ attempts: route.attempts + 1, result: route.result === 'flash' ? 'send' : route.result })}>+</button></div></label><label className="field">线路备注<input value={route.notes} maxLength={4000} placeholder="颜色、动作、下次的解法…" onChange={e => updateClimb({ notes: e.target.value })}/></label></div>
            {route.result === 'flash' && <p className="footnote">Flash 表示第一次尝试即完攀；增加尝试次数会自动改为 Send。</p>}
          </div>}
        </section>}
        {(!isClimbing(session.type) || training.length > 0) && <section className="training-section"><div className="section-heading"><h3>训练动作 <span className="muted small">选填</span></h3><button type="button" className="text-button" onClick={() => { setTraining(rows => [...rows, newTraining(session.id, session.type)]); setDirty(true) }}><Icon name="plus" size={16}/>添加动作</button></div><p className="footnote">也可以只记整次训练时长和备注。</p>{training.map((item, index) => <div className="exercise" key={item.id}><div className="exercise-heading"><label className="field">动作 {index + 1}<input value={item.exercise} maxLength={100} required placeholder="动作名称" onChange={e => updateTraining(item.id, { exercise: e.target.value })}/></label><button type="button" className="icon-button" aria-label={`移除动作 ${index + 1}`} onClick={() => { setTraining(rows => rows.filter(row => row.id !== item.id)); setDirty(true) }}><Icon name="trash" size={18}/></button></div><div className="form-grid four">{([{ key: 'sets', label: '组数', min: 1, max: 999 }, { key: 'reps', label: '每组次数', min: 0, max: 9999 }, { key: 'weightKg', label: '负重 kg', min: 0, max: 1000 }, { key: 'durationSeconds', label: '每组秒数', min: 0, max: 86400 }] as const).map(field => <label className="field" key={field.key}>{field.label}<input type="number" inputMode="decimal" min={field.min} max={field.max} step={field.key === 'weightKg' ? '0.1' : '1'} required value={Number.isNaN(item[field.key]) ? '' : item[field.key]} onChange={e => updateTraining(item.id, { [field.key]: e.target.valueAsNumber })}/></label>)}</div></div>)}</section>}
        <label className="field">给今天留句话<textarea rows={3} value={session.notes} maxLength={4000} placeholder="今天的突破、没解开的动作，或只是此刻的感受。" onChange={e => update('notes', e.target.value)}/></label>
        {error && <p className="error-message" role="alert">{error}</p>}
      </fieldset>
      <div className="form-footer"><span>{isClimbing(session.type) ? `${climbs.length} 条线路` : TYPE_LABELS[session.type]} · {Number.isNaN(session.durationMinutes) ? '—' : session.durationMinutes} 分钟</span><button type="submit" className="button primary" disabled={busy}><Icon name="check" size={18}/>{busy ? '保存中…' : '保存训练'}</button></div>
    </form>
    {discard && <ConfirmDialog options={{ title: '放弃这次修改？', description: '尚未保存的内容会丢失。', action: '放弃修改', danger: true, onConfirm: onClose }} busy={false} onClose={() => setDiscard(false)} onConfirm={onClose}/>}
    {pendingType && <ConfirmDialog options={{ title: '切换训练类型？', description: '当前线路的难度体系不适用于新类型，切换后需要重新填写线路。日期、场馆和备注会保留。', action: '切换类型', onConfirm: () => applyType(pendingType) }} busy={false} onClose={() => setPendingType(null)} onConfirm={() => applyType(pendingType)}/>}
  </Modal>
}
