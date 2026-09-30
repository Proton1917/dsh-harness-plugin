import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  IconDatabaseOutlineRegular, IconGaugeOutlineRegular,
  useAnchoredPosition, useDismissOnOutsidePointer,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-session-stats/client'
import type { LiveTokenUsageProjection } from '../types.ts'
import { billedInputTokens, cacheHitPercent, formatDuration, formatFullTokens, formatTokens, formatTokensPerSecond } from './format.ts'
import type { LIVE_STATS_NS } from './locales.ts'
import { runningStatistics } from '../statistics.ts'
import { useLiveClock } from './live-clock.ts'

/** 两个统计按钮共享的会话数据。 */
export interface LiveStatsPillsProps {
  liveUsage?: LiveTokenUsageProjection | undefined
  useProjection: UseProjection
  t: TranslateNS<typeof LIVE_STATS_NS>
  refreshIntervalMs: number
  sessionRunning: boolean
}

interface StatPillProps {
  kind: 'time' | 'usage'
  label: string
  title: string
  icon: ReactNode
  open: boolean
  setOpen: (open: boolean) => void
  children: ReactNode
}

function StatPill({ kind, label, title, icon, open, setOpen, children }: StatPillProps) {
  const anchor = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const position = useAnchoredPosition({ open, anchorRef: anchor, panelRef: panel, side: 'top', gap: 8, margin: 12 })
  useDismissOnOutsidePointer(anchor, open, setOpen, panel)
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent): void => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('keydown', close) }
  }, [open, setOpen])
  return <span className="dsh-live-stat-anchor">
    <span ref={anchor}>
      <button type="button" className="dsh-live-stat-pill" data-live-stat={kind}
        aria-label={title} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setOpen(!open) }}>
        {icon}<span className="dsh-live-stat-label">{label}</span>
      </button>
    </span>
    {open && createPortal(<div ref={panel} role="dialog" aria-label={title}
      className="dsh-live-stat-panel" data-live-stat-details={kind}
      style={position ?? { visibility: 'hidden', left: 0, top: 0 }}>
      <div className="dsh-live-stat-title">{icon}{title}</div>
      <dl className="dsh-live-stat-details">{children}</dl>
    </div>, document.body)}
  </span>
}

/**
 * 使用同一组实时数据显示统计按钮及其展开详情。
 * @param props - 会话投影、流式用量及本地化文本。
 * @returns 速度和用量统计按钮。
 */
export function LiveStatsPills({ useProjection, liveUsage: transient, t, refreshIntervalMs, sessionRunning }: LiveStatsPillsProps) {
  const settledStats = useProjection('sessionStats')
  const billed = useProjection('tokenUsage')
  const projected = useProjection('liveTokenUsage')
  const usage = transient ?? projected ?? billed
  const recorded = (transient ?? projected)?.statistics
  const statistics = recorded === undefined || sessionRunning ? recorded : { ...recorded, model: null, pendingTools: {} }
  const active = statistics !== undefined && (statistics.model !== null || Object.keys(statistics.pendingTools).length > 0)
  const now = useLiveClock(active, refreshIntervalMs)
  const running = statistics === undefined ? undefined : runningStatistics(statistics, now)
  const stats = running ?? settledStats
  const rate = (transient ?? projected)?.tokensPerSecond
    ?? (settledStats !== undefined && settledStats.decodeMs > 0 ? settledStats.decodeTokens / (settledStats.decodeMs / 1000) : undefined)
  const [opened, setOpened] = useState<'time' | 'usage' | null>(null)
  const setTime = useCallback((open: boolean) => { setOpened(open ? 'time' : null) }, [])
  const setUsage = useCallback((open: boolean) => { setOpened(open ? 'usage' : null) }, [])
  const estimated = (transient ?? projected)?.estimated === true
  const count = (value: number): string => `${estimated ? '~' : ''}${formatFullTokens(value)}`
  const speed = rate === undefined ? null : t('speed', { throughput: formatTokensPerSecond(rate) })
  const timeLabel = [stats !== undefined && stats.steps > 0 ? t('counts', { turns: stats.turns, steps: stats.steps }) : null, speed]
    .filter(value => value !== null).join(' · ')
  const total = usage === undefined ? 0 : billedInputTokens(usage) + usage.outputTokens
  const reportedUsage = (transient ?? projected)?.activeStepEstimated === false ? usage : billed
  const cache = reportedUsage === undefined ? null : cacheHitPercent(reportedUsage)
  const ttft = statistics === undefined
    ? settledStats !== undefined && settledStats.ttftSteps > 0 ? settledStats.ttftMs / settledStats.ttftSteps : undefined
    : running?.ttftAverageMs
  const ttftEstimated = running?.ttftEstimated === true
  const usageLabel = [t('totalCompact', { total: `${estimated ? '~' : ''}${formatTokens(total)}` }),
    cache === null ? null : t('cacheHit', { percent: cache })].filter(value => value !== null).join(' · ')
  const row = (key: string, label: string, value: string) => <Fragment key={key}><dt>{label}</dt><dd>{value}</dd></Fragment>
  if (timeLabel === '' && total === 0) return null
  return <div className="dsh-live-stats" data-dsh-live-stats>
    {timeLabel !== '' && <StatPill kind="time" label={timeLabel} title={t('timeTitle')} icon={<IconGaugeOutlineRegular />}
      open={opened === 'time'} setOpen={setTime}>
      {stats !== undefined && <>
        {row('turns', t('turnsLabel'), String(stats.turns))}
        {row('steps', t('stepsLabel'), String(stats.steps))}
        {row('llm', t('llmLabel'), formatDuration(stats.llmMs))}
        {row('tool', t('toolLabel'), formatDuration(stats.toolMs))}
        {ttft !== undefined && row('ttft', t('ttftLabel'), `${ttftEstimated ? '~' : ''}${formatDuration(ttft)}`)}
      </>}
      {speed !== null && row('tps', t('speedLabel'), speed)}
      {active && row('timing', t('timeTimingLabel'), t('timeEstimateValue'))}
    </StatPill>}
    {usage !== undefined && total > 0 && <StatPill kind="usage" label={usageLabel} title={t('usageTitle')}
      icon={<IconDatabaseOutlineRegular />} open={opened === 'usage'} setOpen={setUsage}>
      {row('total', t('totalLabel'), count(total))}
      {row('input', t('inputLabel'), count(billedInputTokens(usage)))}
      {row('uncached', t('uncachedLabel'), count(usage.uncachedInputTokens))}
      {row('read', t('cacheReadLabel'), formatFullTokens(usage.cacheReadTokens))}
      {usage.cacheWriteTokens > 0 && row('write', t('cacheWriteLabel'), formatFullTokens(usage.cacheWriteTokens))}
      {row('output', t('outputLabel'), count(usage.outputTokens))}
      {cache !== null && row('cache', t('cacheLabel'), `${cache}%`)}
      {estimated && row('estimate', t('estimateLabel'), t('estimateValue'))}
    </StatPill>}
  </div>
}
