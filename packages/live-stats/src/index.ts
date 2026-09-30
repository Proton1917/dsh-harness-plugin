import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-session-projection'
import { createLiveTokenUsageProjectionDefinition } from './projection.ts'
import { createDeepSeekTokenCounter } from './tokenizer.ts'

/** Services required by the host projection plugin. */
export const inject = ['sessionProjections']

/** 实时用时的显示刷新间隔。 */
export interface Config { refreshIntervalMs?: number }

/** Runtime schema for {@link Config}. */
export const Config = z.object({ refreshIntervalMs: z.natural().min(16).max(1000).default(250) })

/** Register the replayable live-token projection. */
export function apply(ctx: Context, _config: Config = {}): void {
  ctx.sessionProjections.register(createLiveTokenUsageProjectionDefinition(createDeepSeekTokenCounter()))
}

export { createLiveTokenUsageProjectionDefinition } from './projection.ts'
export { createDeepSeekTokenCounter } from './tokenizer.ts'
export type { TokenCounter } from './tokenizer.ts'
export type { LiveTokenUsageProjection } from './types.ts'
