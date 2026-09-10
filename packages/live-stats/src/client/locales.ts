import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** Locale namespace owned by the live statistics rows. */
export const LIVE_STATS_NS = 'liveStats'

/** Complete user-facing copy of the live statistics rows. */
export type LiveStatsLocaleKey =
  | 'counts'
  | 'llm'
  | 'tokens'
  | 'tool'
  | 'tps'
  | 'ttftAverage'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Live token and throughput statistics rendered below the composer. */
    liveStats: LiveStatsLocaleKey
  }
}

/** Simplified Chinese live-statistics copy. */
export const zh: Record<LiveStatsLocaleKey, string> = {
  counts: '{turns} 轮 · {steps} 步',
  llm: 'LLM {duration}',
  tokens: '输入 {input} · 输出 {output} · 总计 {total} token',
  tool: '工具 {duration}',
  tps: 'TPS {throughput} token/秒',
  ttftAverage: '首 token 平均 {duration}',
}

/** English live-statistics copy. */
export const en: Record<LiveStatsLocaleKey, string> = {
  counts: 'Turns {turns} · Steps {steps}',
  llm: 'LLM {duration}',
  tokens: 'Input {input} · Output {output} · Total {total} tok',
  tool: 'Tools {duration}',
  tps: 'TPS {throughput} tok/s',
  ttftAverage: 'TTFT avg {duration}',
}
