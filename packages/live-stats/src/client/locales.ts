import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** 实时统计使用的本地化命名空间。 */
export const LIVE_STATS_NS = 'liveStats'

/** 按钮和详情的本地化文本标识。 */
export type LiveStatsLocaleKey =
  | 'counts' | 'speed' | 'totalCompact' | 'cacheHit' | 'timeTitle' | 'usageTitle'
  | 'turnsLabel' | 'stepsLabel' | 'llmLabel' | 'toolLabel' | 'ttftLabel' | 'speedLabel'
  | 'totalLabel' | 'inputLabel' | 'uncachedLabel' | 'cacheReadLabel' | 'cacheWriteLabel'
  | 'outputLabel' | 'cacheLabel' | 'estimateLabel' | 'estimateValue' | 'timeEstimateValue' | 'timeTimingLabel'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 输入框下方的实时统计。 */
    liveStats: LiveStatsLocaleKey
  }
}

/** 简体中文统计文案。 */
export const zh: Record<LiveStatsLocaleKey, string> = {
  counts: '{turns} 轮 {steps} 步', speed: '{throughput} tok/s', totalCompact: '{total} tok',
  cacheHit: '缓存命中 {percent}%', timeTitle: '会话统计', usageTitle: 'Token 用量',
  turnsLabel: '轮次', stepsLabel: '步骤', llmLabel: '模型用时', toolLabel: '工具调用用时',
  ttftLabel: '首 token 平均（TTFT）', speedLabel: '输出速度（TPS）', totalLabel: '累计用量',
  inputLabel: '输入总量', uncachedLabel: '未缓存输入', cacheReadLabel: '缓存读取',
  cacheWriteLabel: '缓存写入', outputLabel: '输出', cacheLabel: '已报告缓存命中',
  estimateLabel: '实时用量', estimateValue: '~ 表示估算值；输入与缓存随请求和提供方报告更新',
  timeTimingLabel: '实时计时',
  timeEstimateValue: '用时包含当前任务；~ 表示首 token 等待时间的估算',
}

/** 英文统计文案。 */
export const en: Record<LiveStatsLocaleKey, string> = {
  counts: '{turns} turns {steps} steps', speed: '{throughput} tok/s', totalCompact: '{total} tok',
  cacheHit: 'Cache hit {percent}%', timeTitle: 'Session statistics', usageTitle: 'Token usage',
  turnsLabel: 'Turns', stepsLabel: 'Steps', llmLabel: 'LLM time', toolLabel: 'Tool time',
  ttftLabel: 'Average TTFT', speedLabel: 'Output speed (TPS)', totalLabel: 'Total tokens',
  inputLabel: 'Total input', uncachedLabel: 'Uncached input', cacheReadLabel: 'Cache read',
  cacheWriteLabel: 'Cache write', outputLabel: 'Output', cacheLabel: 'Reported cache hit',
  estimateLabel: 'Live usage', estimateValue: '~ marks estimates; input and cache update with requests and provider reports',
  timeTimingLabel: 'Live timing',
  timeEstimateValue: 'Times include active work; ~ marks first-token waiting estimates',
}
