import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'

const fullTokenCount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** @param value - token 数量。@returns 紧凑数量。 */
export function formatTokens(value: number): string {
  const scaled = (n: number): string => n >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10)
  if (value < 1000) return String(value)
  if (value < 1_000_000) return `${scaled(value / 1000)}K`
  return `${scaled(value / 1_000_000)}M`
}

/** @param value - token 数量。@returns 完整整数文本。 */
export function formatFullTokens(value: number): string { return fullTokenCount.format(value) }

/** @param value - 毫秒时长。@returns 分钟和秒数。 */
export function formatDuration(value: number): string {
  const seconds = value / 1000
  if (seconds < 60) return `${Math.round(seconds * 10) / 10}s`
  const rounded = Math.round(seconds)
  return `${Math.floor(rounded / 60)}m${rounded % 60}s`
}

/** @param usage - 提供方的用量分类。@returns 输入 token 总数。 */
export function billedInputTokens(usage: TokenUsageProjection): number {
  return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
}

/** @param usage - 已结算用量。@returns 缓存命中百分比，无输入时返回 null。 */
export function cacheHitPercent(usage: TokenUsageProjection): string | null {
  const total = billedInputTokens(usage)
  if (total === 0) return null
  if (usage.cacheReadTokens === total) return '100'
  const percent = usage.cacheReadTokens / total * 100
  for (let digits = 2; digits <= 15; digits++) {
    const rounded = Number(percent.toFixed(digits))
    if (rounded < 100) return String(rounded)
  }
  return String(percent)
}

/** @param value - 每秒 token 数量。@returns 吞吐量文本。 */
export function formatTokensPerSecond(value: number): string {
  return String(value < 100 ? Math.round(value * 10) / 10 : Math.round(value))
}
