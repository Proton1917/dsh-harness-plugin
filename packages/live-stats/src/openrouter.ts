import { readFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import type { Context } from '@deepseek-ai/cordis'
import { appendPluginRecord } from '@deepseek-ai/dsh-session'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { z } from 'zod'
import { readOpenRouterGeneration } from './openrouter-statistics.ts'

/** Host 端 OpenRouter 统计查询配置。 */
export interface OpenRouterConfig {
  apiKeyFile: string
  timeoutMs: number
  maxAttempts: number
  retryDelayMs: number
}

const responseIdentity = z.object({ response: z.object({ responseId: z.string().regex(/^gen-[A-Za-z0-9-]+$/) }) })

/**
 * 从适配器保留的响应元数据读取 OpenRouter generation ID。
 * @param event - 已提交的模型消息。
 * @returns Generation API 接受的调用 ID。
 */
export function openRouterGenerationId(event: SessionEvent<'assistant/message'>): string | undefined {
  const source = event.data.message.source
  if (source.kind !== 'model') return undefined
  const identity = responseIdentity.safeParse(source.replayState)
  return identity.success ? identity.data.response.responseId : undefined
}

/**
 * 按次查询 OpenRouter，并把结果保存为可跳过的 Session 插件记录。
 * @param ctx - 拥有订阅和查询任务的 Host 上下文。
 * @param config - 密钥文件及有限查询策略。
 */
export function installOpenRouterStatistics(ctx: Context, config: OpenRouterConfig): void {
  const jobs = new Map<Session, Set<{ controller: AbortController; done: Promise<void> }>>()
  let disposed = false
  async function collect(session: Session, event: SessionEvent<'assistant/message'>, generationId: string, signal: AbortSignal) {
    const key = (await readFile(config.apiKeyFile, 'utf8')).trim()
    if (key.length === 0) throw new Error('OpenRouter 统计密钥文件为空')
    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
      if (attempt > 0) await delay(config.retryDelayMs, undefined, { signal })
      signal.throwIfAborted()
      const url = new URL('https://openrouter.ai/api/v1/generation')
      url.searchParams.set('id', generationId)
      const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.any([signal, AbortSignal.timeout(config.timeoutMs)]) })
      if (response.status === 404) {
        await response.body?.cancel()
        continue
      }
      if (!response.ok) {
        await response.body?.cancel()
        throw new Error(`OpenRouter 统计查询失败：HTTP ${response.status}`)
      }
      const statistics = readOpenRouterGeneration(await response.json(), generationId)
      if (statistics === undefined) continue
      signal.throwIfAborted()
      appendPluginRecord(session, 'plugin:proton1917/live-stats/openrouter', {
        ...statistics, sourceSeq: event.seq, turn: event.data.turn, step: event.data.step,
      })
      return
    }
    throw new Error('OpenRouter 单次调用统计仍在准备，查询期限已结束')
  }
  ctx.on('session/event', (session, event) => {
    if (disposed || event.type !== 'assistant/message') return
    const generationId = openRouterGenerationId(event)
    if (generationId === undefined) return
    const controller = new AbortController()
    const owned = jobs.get(session) ?? new Set()
    jobs.set(session, owned)
    const job = { controller, done: Promise.resolve() }
    owned.add(job)
    job.done = collect(session, event, generationId, controller.signal).catch(error => {
      if (!controller.signal.aborted) ctx.logger.warn('live-stats: %s', error instanceof Error ? error.message : String(error))
    }).finally(() => {
      owned.delete(job)
      if (owned.size === 0) jobs.delete(session)
    })
  })
  ctx.on('session/disposed', session => {
    for (const job of jobs.get(session) ?? []) job.controller.abort()
  })
  ctx.on('session/flush', async session => {
    await Promise.all([...(jobs.get(session) ?? [])].map(job => job.done))
  })
  ctx.effect(() => async () => {
    disposed = true
    const pending = [...jobs.values()].flatMap(owned => [...owned])
    for (const job of pending) job.controller.abort()
    await Promise.all(pending.map(job => job.done))
  }, 'live-stats: OpenRouter statistics')
}
