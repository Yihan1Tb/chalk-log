import { useEffect, useRef, useState } from 'react'
import { dateKey } from '../../domain/dates'
import {
  createTimer,
  DEFAULT_HANGBOARD,
  timerRecord,
  timerStage,
  transitionTimer,
  validateHangboard,
  workoutSeconds,
  type HangboardConfig,
} from '../../domain/hangboard'
import type { SessionDetail } from '../../domain/types'
import { ConfirmDialog, Modal } from './Modal'
import { newId } from './SessionForm'

const PHASE_LABELS = {
  prepare: '准备',
  hang: '悬挂',
  rest: '休息',
  setRest: '组间休息',
  completed: '训练完成',
}
const FIELDS = [
  { key: 'hangSeconds', label: '悬挂秒数', min: 1, max: 3600 },
  { key: 'restSeconds', label: '休息秒数', min: 0, max: 3600 },
  { key: 'reps', label: '每组次数', min: 1, max: 100 },
  { key: 'sets', label: '组数', min: 1, max: 100 },
  { key: 'setRestSeconds', label: '组间休息秒数', min: 0, max: 3600 },
] as const

export function HangboardTimer({
  onClose,
  onRecord,
}: {
  onClose: () => void
  onRecord: (detail: SessionDetail) => void
}) {
  const [config, setConfig] = useState<HangboardConfig>({ ...DEFAULT_HANGBOARD })
  const [state, setState] = useState(() => createTimer())
  const [sound, setSound] = useState(false)
  const [soundError, setSoundError] = useState('')
  const [discard, setDiscard] = useState(false)
  const audio = useRef<AudioContext | null>(null)
  const stage = timerStage(state)
  const stageKey = `${stage.phase}:${stage.set}:${stage.rep}`
  const previousStage = useRef(stageKey)
  const error = validateHangboard(config)

  // Audio is unlocked only by an explicit user gesture, including on iOS.
  const enableAudio = async () => {
    try {
      const Audio =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Audio) throw new Error('unsupported')
      audio.current ??= new Audio()
      await audio.current.resume()
      setSoundError('')
    } catch {
      setSoundError('此浏览器暂时无法播放提示音，倒计时仍可使用。')
    }
  }
  useEffect(() => {
    if (state.status !== 'running') return
    const tick = () =>
      setState((current) => transitionTimer(current, { type: 'tick', nowMs: Date.now() }))
    const interval = window.setInterval(tick, 100)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [state.status])
  useEffect(() => {
    const changed = previousStage.current !== stageKey
    previousStage.current = stageKey
    const context = audio.current
    if (!changed || !sound || !context || context.state !== 'running' || state.status === 'idle')
      return
    try {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.frequency.value = stage.phase === 'hang' ? 880 : 440
      gain.gain.setValueAtTime(0.12, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.23)
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
      }
    } catch {
      setSoundError('提示音播放失败，倒计时仍可使用。')
    }
  }, [stageKey, sound, state.status, stage.phase])
  useEffect(
    () => () => {
      void audio.current?.close().catch(() => undefined)
    },
    [],
  )
  const close = () => {
    if (state.status === 'idle') onClose()
    else {
      setState((current) => transitionTimer(current, { type: 'pause', nowMs: Date.now() }))
      setDiscard(true)
    }
  }
  const start = () => {
    if (error) return
    if (sound) void enableAudio()
    setState((current) =>
      transitionTimer(current.status === 'idle' ? createTimer(config) : current, {
        type: 'start',
        nowMs: Date.now(),
      }),
    )
  }
  return (
    <Modal title="指力板计时器" subtitle="专注每一次悬挂" onClose={close} className="timer-modal">
      <div className="timer-content">
        <div className={`timer-display ${stage.phase === 'hang' ? 'is-hanging' : ''}`}>
          <p className="timer-phase" role="status">
            {PHASE_LABELS[stage.phase]}
            {state.status === 'paused' ? ' · 已暂停' : ''}
          </p>
          <div
            className="timer-digits"
            role="timer"
            aria-label={`剩余 ${stage.remainingSeconds} 秒`}
          >
            {String(stage.remainingSeconds).padStart(2, '0')}
            <span>秒</span>
          </div>
          <p className="muted">
            第 {stage.set} / {state.status === 'idle' ? config.sets || '—' : state.config.sets} 组 ·
            第 {stage.rep} / {state.status === 'idle' ? config.reps || '—' : state.config.reps} 次
          </p>
        </div>
        <div className="timer-actions">
          {state.status === 'running' ? (
            <button
              className="button primary"
              onClick={() =>
                setState((current) =>
                  transitionTimer(current, { type: 'pause', nowMs: Date.now() }),
                )
              }
            >
              暂停
            </button>
          ) : state.status !== 'completed' ? (
            <button className="button primary" disabled={Boolean(error)} onClick={start}>
              {state.status === 'paused' ? '继续' : '开始'}
            </button>
          ) : (
            <button
              className="button primary"
              onClick={() => {
                const now = new Date()
                onRecord(
                  timerRecord(state, {
                    sessionId: newId(),
                    trainingId: newId(),
                    date: dateKey(now),
                    timestamp: now.toISOString(),
                  }),
                )
              }}
            >
              生成训练记录
            </button>
          )}
          <button
            className="button secondary"
            onClick={() => setState((current) => transitionTimer(current, { type: 'reset' }))}
          >
            重置
          </button>
        </div>
        <fieldset className="timer-settings form-grid two" disabled={state.status !== 'idle'}>
          <legend>训练设置</legend>
          {FIELDS.map((field) => (
            <label className="field" key={field.key}>
              {field.label}
              <input
                type="number"
                inputMode="numeric"
                min={field.min}
                max={field.max}
                step={1}
                required
                value={Number.isNaN(config[field.key]) ? '' : config[field.key]}
                onChange={(event) =>
                  setConfig((current) => ({ ...current, [field.key]: event.target.valueAsNumber }))
                }
              />
            </label>
          ))}
        </fieldset>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <label className="timer-sound">
          <input
            type="checkbox"
            checked={sound}
            onChange={(event) => {
              setSound(event.target.checked)
              if (event.target.checked) void enableAudio()
            }}
          />
          阶段提示音
        </label>
        {sound && soundError && (
          <p className="footnote" role="status">
            {soundError}
          </p>
        )}
        <p className="footnote">
          准备 5 秒{!error && ` · 训练约 ${Math.ceil(workoutSeconds(config) / 60)} 分钟（含休息）`}
          。最后一次悬挂后直接进入组间休息，最后一组结束后停止。暂停时间不计入训练。
        </p>
        <p className="footnote">
          请保持页面在前台以接收提示音。切换后台或锁屏可能使声音中断，返回后按经过时间校正；刷新页面会结束本次计时。
        </p>
      </div>
      {discard && (
        <ConfirmDialog
          options={{
            title: '离开计时器？',
            description:
              state.status === 'completed'
                ? '尚未生成的训练记录将丢失。'
                : '计时已暂停，离开后本次进度将丢失。',
            action: '离开计时器',
            onConfirm: onClose,
          }}
          busy={false}
          onClose={() => setDiscard(false)}
          onConfirm={onClose}
        />
      )}
    </Modal>
  )
}
