import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-session-projection'
import { createLiveTokenUsageProjectionDefinition } from './projection.ts'
import { createDeepSeekTokenCounter } from './tokenizer.ts'
import { installOpenRouterStatistics } from './openrouter.ts'
import type { OpenRouterConfig } from './openrouter.ts'

/** Services required by the host projection plugin. */
export const inject = ['sessionProjections']

/** 实时用时的显示刷新间隔。 */
export interface Config {
  refreshIntervalMs?: number
  /** Host 端查询 OpenRouter 单次统计；密钥从指定文件读取。 */
  openRouter?: OpenRouterConfig
}

/** Runtime schema for {@link Config}. */
export const Config = z.object({
  refreshIntervalMs: z.natural().min(16).max(1000).default(250),
  openRouter: z.object({
    apiKeyFile: z.string().required(),
    timeoutMs: z.natural().min(1).default(10000),
    maxAttempts: z.natural().min(1).max(5).default(3),
    retryDelayMs: z.natural().min(1).default(1000),
  }),
})

/** Register the replayable live-token projection. */
export function apply(ctx: Context, config: Config = {}): void {
  ctx.sessionProjections.register(createLiveTokenUsageProjectionDefinition(createDeepSeekTokenCounter()))
  if (config.openRouter !== undefined) installOpenRouterStatistics(ctx, config.openRouter)
}

export { createLiveTokenUsageProjectionDefinition } from './projection.ts'
export { createDeepSeekTokenCounter } from './tokenizer.ts'
export type { TokenCounter } from './tokenizer.ts'
export type { LiveTokenUsageProjection } from './types.ts'
