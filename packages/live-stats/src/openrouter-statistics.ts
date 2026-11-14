import { z } from 'zod'

/** OpenRouter 返回的单次调用统计及其原始消息位置。 */
export const openRouterStatisticsSchema = z.object({
  generationId: z.string().regex(/^gen-[A-Za-z0-9-]+$/),
  sourceSeq: z.number().int().nonnegative(),
  turn: z.number().int().nonnegative(),
  step: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  generationMs: z.number().positive(),
  provider: z.string(),
}).strict()

/** 可随 Session 重放的 OpenRouter 单次统计。 */
export type OpenRouterStatistics = z.infer<typeof openRouterStatisticsSchema>

const generationResponseSchema = z.object({ data: z.object({
  id: openRouterStatisticsSchema.shape.generationId,
  native_tokens_completion: z.number().int().nonnegative().nullable(),
  generation_time: z.number().nonnegative().nullable(),
  provider_name: z.string().nullable(),
}) })

/**
 * 读取 OpenRouter 的原始计数和毫秒时长。
 * @param value - Generation API 返回的 JSON。
 * @param generationId - 当前查询的原始 generation ID。
 * @returns 已就绪的统计；统计字段待补充时返回 undefined。
 */
export function readOpenRouterGeneration(value: unknown, generationId: string) {
  const { data } = generationResponseSchema.parse(value)
  if (data.id !== generationId) throw new Error('OpenRouter generation ID 与请求不一致')
  if (data.native_tokens_completion === null || data.generation_time === null || data.generation_time === 0) return undefined
  return { generationId: data.id, outputTokens: data.native_tokens_completion,
    generationMs: data.generation_time, provider: data.provider_name ?? 'OpenRouter' }
}

declare module '@deepseek-ai/dsh-session/types' {
  interface PluginRecordMap {
    /** OpenRouter 单次调用的已结算统计。 */
    'plugin:proton1917/live-stats/openrouter': OpenRouterStatistics
  }
}
