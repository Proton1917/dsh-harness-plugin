import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'

/** 当前会话的累计计数、已记录用时和正在进行的计时。 */
export interface LiveSessionStatistics {
  turns: number
  steps: number
  llmMs: number
  toolMs: number
  ttftMs: number
  ttftSteps: number
  model: { startedAt: number; firstTokenTime: number | null } | null
  pendingTools: Record<string, number>
}

/** Continuously updated session totals published by the live-stats plugin. */
export interface LiveTokenUsageProjection extends TokenUsageProjection {
  /** Whether any displayed input or output bucket still contains an estimate. */
  estimated: boolean
  /** 已完成步骤中是否仍有估算用量。 */
  settledEstimated?: boolean
  /** 当前步骤是否尚未收到提供方用量。 */
  activeStepEstimated?: boolean
  /** 从完整会话日志重建的统计及计时起点。 */
  statistics?: LiveSessionStatistics
  /** Active step contribution already included in the cumulative Host totals. */
  activeStepUsage?: TokenUsageProjection
  /** Output throughput for the active or latest response when an interval exists. */
  tokensPerSecond?: number
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Live cumulative usage, estimated during streaming and corrected by provider usage. */
    liveTokenUsage: LiveTokenUsageProjection
  }
}
