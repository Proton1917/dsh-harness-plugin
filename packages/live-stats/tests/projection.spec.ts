import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { createMessage, createUserMessage, createSystemMessage, createToolResultMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import { AssistantStreamAccumulator } from '@deepseek-ai/dsh-llm/assistant-stream'
import SessionStore from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { apply, createDeepSeekTokenCounter, inject } from '../src/index.ts'
import { sampleLiveChunks } from '../src/projection.ts'

const contexts: Context[] = []
afterEach(async () => { for (const ctx of contexts.splice(0)) await ctx.fiber.dispose() })
async function harness() {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin({ inject, apply })
  return { ctx, session: ctx.sessions.create() }
}
function projected(ctx: Context, session: Session) {
  const value = ctx.sessionProjections.snapshot(session).values.liveTokenUsage
  if (value === undefined) throw new Error('liveTokenUsage projection is absent')
  return value
}
const counter = createDeepSeekTokenCounter()
const chunks = [
  { time: 1_000, chunk: { type: 'text-delta' as const, index: 0, text: 'abcd' } },
  { time: 2_000, chunk: { type: 'text-delta' as const, index: 0, text: 'efgh' } },
]
function stream() {
  const accumulator = new AssistantStreamAccumulator()
  for (const item of chunks) accumulator.push(item)
  return [...accumulator.snapshot()]
}

describe('live usage', () => {
  it('uses official tokenizer counts and real delta timestamps', () => {
    expect(counter.countText('ok')).toBe(1)
    expect(sampleLiveChunks(chunks.slice(0, 1), counter).tokensPerSecond).toBeUndefined()
    const sample = sampleLiveChunks(chunks, counter)
    expect(sample.tokensPerSecond).toBe(counter.countText('efgh'))
    expect(sample.buckets.outputTokens).toBe(counter.countText('abcd') + counter.countText('efgh'))
    const corrected = sampleLiveChunks([...chunks, { time: 2_100, chunk: { type: 'usage', usage: { inputTokens: 20, outputTokens: 30 } } }], counter)
    expect(corrected.exact).toBe(true)
    expect(corrected.buckets.outputTokens).toBe(30)
  })

  it('does not invent a TPS interval from a terminal block', () => {
    const result = sampleLiveChunks([chunks[0]!, { time: 2_000, chunk: { type: 'block-end', index: 0, block: { type: 'text', text: 'abcd' } } }], counter)
    expect(result.tokensPerSecond).toBeUndefined()
  })

  it('publishes replayable settled usage and provider correction through the Host wire', async () => {
    const { ctx, session } = await harness()
    const frames: unknown[] = []
    ctx.sessionProjections.onChanged((s, key, value) => { if (s === session && key === 'liveTokenUsage') frames.push(value) })
    session.append('step/start', { turn: 1, step: 1 })
    session.append('assistant/message', {
      turn: 1, step: 1, stream: stream(),
      message: createMessage({ role: 'assistant', content: [{ type: 'text', text: 'abcdefgh' }], source: { kind: 'model', provider: 'mock', model: 'mock' } }),
      usage: { inputTokens: 20, outputTokens: 30, cacheReadTokens: 80 },
    }, { surfaceOp: 'append' })
    session.append('step/end', { turn: 1, step: 1 })
    expect(projected(ctx, session)).toMatchObject({ uncachedInputTokens: 20, outputTokens: 30, cacheReadTokens: 80, estimated: false, tokensPerSecond: 30 - counter.countText('abcd') })
    expect(frames.length).toBeGreaterThan(1)
  })

  it('counts system messages and seq-based surface replacements', async () => {
    const { ctx, session } = await harness()
    const user = (text: string) => createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } })
    const first = session.append('user/message', user('old'), { surfaceOp: 'append' })
    session.append('user/message', user('replacement'), { surfaceOp: { op: 'replace', startSeq: first.seq, endSeq: first.seq }, sourceEventSeqs: [first.seq] })
    session.append('step/start', { turn: 1, step: 1 })
    const system = createSystemMessage('medical instructions')
    session.append('system/message', { turn: 1, step: 1, message: system }, { surfaceOp: 'append' })
    expect(projected(ctx, session).uncachedInputTokens).toBe(counter.countMessage(user('replacement')) + counter.countText('medical instructions'))
  })

  it('drops an aborted step estimate while preserving settled billed totals', async () => {
    const { ctx, session } = await harness()
    session.append('step/start', { turn: 1, step: 1 })
    session.append('assistant/attempt', { turn: 1, step: 1, stream: stream() })
    session.append('step/end', { turn: 1, step: 1 })
    expect(projected(ctx, session).outputTokens).toBeGreaterThan(0)
    session.append('turn/end', { turn: 1, reason: { kind: 'aborted' } })
    expect(projected(ctx, session)).toMatchObject({ outputTokens: 0, estimated: false })
  })
  it('counts developer changes and first-class tool results in subsequent input', async () => {
    const { ctx, session } = await harness()
    const developer = createMessage({ role: 'developer', content: [{ type: 'text', text: 'Updated instructions' }], source: { kind: 'plugin', plugin: 'test' } })
    const tool = createToolResultMessage({ callId: ToolCallId('call-1'), content: [{ type: 'text', text: 'Tool output' }], isError: false })
    session.append('developer/message', { turn: 1, step: 1, message: developer }, { surfaceOp: 'append' })
    session.append('tool/result', { turn: 1, step: 1, message: tool }, { surfaceOp: 'append' })
    session.append('step/start', { turn: 1, step: 2 })
    expect(counter.countMessage(developer)).toBe(counter.countText('Updated instructions'))
    expect(counter.countMessage(tool)).toBeGreaterThan(counter.countText('Tool output'))
    expect(projected(ctx, session).uncachedInputTokens).toBe(counter.countMessage(developer) + counter.countMessage(tool))
  })

})
