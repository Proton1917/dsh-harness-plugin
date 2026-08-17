import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { createMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import type { LiveTokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import { apply, createDeepSeekTokenCounter, inject } from '../src/index.ts'

afterEach(() => { vi.useRealTimers() })

async function harness(): Promise<{ ctx: Context; session: Session }> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin({ inject, apply })
  return { ctx, session: ctx.sessions.create() }
}

function projected(ctx: Context, session: Session): LiveTokenUsageProjection {
  const value = ctx.sessionProjections.snapshot(session).values.liveTokenUsage
  if (value === undefined) throw new Error('liveTokenUsage projection is absent')
  return value
}

function usageChunk(session: Session, usage: TokenUsage): number {
  return session.append('assistant/chunk', {
    turn: 1,
    step: 1,
    chunk: { type: 'usage', usage },
  }).seq
}

describe('liveTokenUsage projection', () => {
  it('uses the official tokenizer for streamed completion text', () => {
    const counter = createDeepSeekTokenCounter()
    expect(counter.countText('ok')).toBe(1)
    expect(counter.countAssistantOutput([{ type: 'text', text: 'ok' }])).toBe(2)
  })

  it('updates input, output, and TPS per chunk, then accepts provider correction', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    const { ctx, session } = await harness()
    session.append('user/message', createUserMessage({
      content: [{ type: 'text', text: 'abcd' }],
      source: { kind: 'user' },
    }), { surfaceOp: 'append' })
    session.append('step/start', { turn: 1, step: 1 })
    session.append('request/header', {
      header: { config: { provider: 'mock', model: 'mock' }, system: 'abcd' },
      reason: 'initial',
    })
    const counter = createDeepSeekTokenCounter()
    const inputTokens = counter.countMessage(createUserMessage({
      content: [{ type: 'text', text: 'abcd' }],
      source: { kind: 'user' },
    })) + counter.countHeader({ config: { provider: 'mock', model: 'mock' }, system: 'abcd' })
    expect(projected(ctx, session)).toMatchObject({
      uncachedInputTokens: inputTokens,
      outputTokens: 0,
      estimated: true,
    })

    vi.setSystemTime(2_000)
    session.append('assistant/chunk', {
      turn: 1,
      step: 1,
      chunk: { type: 'text-delta', index: 0, text: 'abcd' },
    })
    vi.setSystemTime(3_000)
    session.append('assistant/chunk', {
      turn: 1,
      step: 1,
      chunk: { type: 'text-delta', index: 0, text: 'efgh' },
    })
    const firstTokens = counter.countText('abcd')
    const streamedTokens = firstTokens + counter.countText('efgh')
    expect(projected(ctx, session)).toMatchObject({
      outputTokens: streamedTokens,
      estimated: true,
      tokensPerSecond: streamedTokens - firstTokens,
    })

    vi.setSystemTime(4_000)
    usageChunk(session, { inputTokens: 20, outputTokens: 30, cacheReadTokens: 80 })
    expect(projected(ctx, session)).toEqual({
      uncachedInputTokens: 20,
      outputTokens: 30,
      cacheReadTokens: 80,
      cacheWriteTokens: 0,
      estimated: false,
      tokensPerSecond: 30 - firstTokens,
    })
  })

  it('does not invent a TPS interval from terminal duplicate events', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    const { ctx, session } = await harness()
    session.append('step/start', { turn: 1, step: 1 })
    session.append('assistant/chunk', {
      turn: 1,
      step: 1,
      chunk: { type: 'text-delta', index: 0, text: 'ok' },
    })
    vi.setSystemTime(2_000)
    session.append('assistant/chunk', {
      turn: 1,
      step: 1,
      chunk: { type: 'block-end', index: 0, block: { type: 'text', text: 'ok' } },
    })
    expect(projected(ctx, session)).toEqual({
      uncachedInputTokens: 0,
      outputTokens: 2,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      estimated: true,
    })
    usageChunk(session, { inputTokens: 10, outputTokens: 2 })
    expect(projected(ctx, session)).toEqual({
      uncachedInputTokens: 10,
      outputTokens: 2,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      estimated: false,
    })
  })

  it('replaces same-step retry estimates and drops aborted estimates', async () => {
    const { ctx, session } = await harness()
    session.append('step/start', { turn: 1, step: 1 })
    session.append('assistant/chunk', {
      turn: 1,
      step: 1,
      chunk: { type: 'text-delta', index: 0, text: 'discarded' },
    })
    session.append('step/end', { turn: 1, step: 1 })

    session.append('step/start', { turn: 1, step: 1 })
    const source = usageChunk(session, { inputTokens: 20, outputTokens: 5, cacheReadTokens: 80 })
    session.append('assistant/message', {
      turn: 1,
      step: 1,
      message: createMessage({
        role: 'assistant',
        content: [{ type: 'text', text: 'done' }],
        source: { kind: 'model', provider: 'mock', model: 'mock' },
      }),
      usage: { inputTokens: 20, outputTokens: 5, cacheReadTokens: 80 },
    }, { surfaceOp: 'append', sourceEventSeqs: [source] })
    session.append('step/end', { turn: 1, step: 1 })
    expect(projected(ctx, session)).toMatchObject({
      uncachedInputTokens: 20,
      outputTokens: 5,
      cacheReadTokens: 80,
      estimated: false,
    })

    session.append('step/start', { turn: 2, step: 1 })
    session.append('assistant/chunk', {
      turn: 2,
      step: 1,
      chunk: { type: 'text-delta', index: 0, text: 'partial' },
    })
    session.append('step/end', { turn: 2, step: 1 })
    session.append('turn/end', { turn: 2, reason: { kind: 'aborted' } })
    expect(projected(ctx, session)).toMatchObject({
      uncachedInputTokens: 20,
      outputTokens: 5,
      cacheReadTokens: 80,
      estimated: false,
    })
  })
})
