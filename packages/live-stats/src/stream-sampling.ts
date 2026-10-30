import type { ContentBlock, StreamChunk, TokenUsage } from '@deepseek-ai/dsh-llm'
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import type { TokenCounter } from './token-counter.ts'

type OutputBlock =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'tool-call'; id: Extract<ContentBlock, { type: 'tool-call' }>['id']; name: string; arguments: string }
  | { type: 'fixed'; block: ContentBlock }

/** Host 重放与 Client 流式采样共用的单次调用状态。 */
export interface ActiveStep {
  turn: number
  step: number
  buckets: TokenUsageProjection
  exact: boolean
  blocks: Array<OutputBlock | null>
  firstOutputTime?: number
  firstOutputTokens?: number
  latestOutputTime?: number
}

/** @returns 一次调用的初始用量。 */
export const zeroBuckets = (): TokenUsageProjection => ({
  uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
})

function applyOutputChunk(blocks: Array<OutputBlock | null>, chunk: StreamChunk): Array<OutputBlock | null> {
  if (chunk.type === 'usage' || chunk.type === 'finish') return blocks
  const next = [...blocks]
  while (next.length <= chunk.index) next.push(null)
  switch (chunk.type) {
    case 'text-delta': {
      if (chunk.text === '') return blocks
      const previous = next[chunk.index]
      next[chunk.index] = { type: 'text', text: (previous?.type === 'text' ? previous.text : '') + chunk.text }
      return next
    }
    case 'reasoning-delta': {
      if (chunk.text === '') return blocks
      const previous = next[chunk.index]
      next[chunk.index] = { type: 'reasoning', text: (previous?.type === 'reasoning' ? previous.text : '') + chunk.text }
      return next
    }
    case 'tool-call-delta': {
      if (chunk.name === undefined && chunk.argumentsDelta === '') return blocks
      const previous = next[chunk.index]
      next[chunk.index] = { type: 'tool-call', id: chunk.id,
        name: chunk.name ?? (previous?.type === 'tool-call' ? previous.name : ''),
        arguments: (previous?.type === 'tool-call' ? previous.arguments : '') + chunk.argumentsDelta }
      return next
    }
    case 'block-end':
      next[chunk.index] = { type: 'fixed', block: chunk.block }
      return next
    default:
      return blocks
  }
}

function outputTokens(blocks: readonly (OutputBlock | null)[], counter: TokenCounter): number {
  const content: ContentBlock[] = []
  for (const block of blocks) {
    if (block !== null) content.push(block.type === 'fixed' ? block.block : block)
  }
  return counter.countAssistantOutput(content)
}

function outputDeltaTokens(chunk: StreamChunk, counter: TokenCounter): number {
  switch (chunk.type) {
    case 'text-delta':
    case 'reasoning-delta': return counter.countText(chunk.text)
    case 'tool-call-delta': return counter.countText(chunk.name ?? '') + counter.countText(chunk.argumentsDelta)
    default: return 0
  }
}

/** @param step - 一次调用的采样状态。@returns 首个和最后输出增量之间的采样速度。 */
export function rateOf(step: ActiveStep): number | undefined {
  if (step.firstOutputTime === undefined || step.latestOutputTime === undefined || step.firstOutputTokens === undefined) return
  const elapsedMs = step.latestOutputTime - step.firstOutputTime
  const generatedTokens = step.buckets.outputTokens - step.firstOutputTokens
  if (elapsedMs <= 0 || generatedTokens <= 0) return
  return generatedTokens * 1000 / elapsedMs
}

/** @param step - 当前状态。@param usage - 提供方报告。@returns 已校正的用量。 */
export function exactStep(step: ActiveStep, usage: TokenUsage): ActiveStep {
  return { ...step, buckets: { uncachedInputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens ?? 0, cacheWriteTokens: usage.cacheWriteTokens ?? 0 }, exact: true }
}

/** @param active - 当前状态。@param chunk - 输出增量。@param time - 到达时间。@param counter - tokenizer。@returns 更新后的单次状态。 */
export function applyChunk(active: ActiveStep, chunk: StreamChunk, time: number, counter: TokenCounter): ActiveStep {
  if (chunk.type === 'usage') return exactStep(active, chunk.usage)
  const blocks = applyOutputChunk(active.blocks, chunk)
  if (blocks === active.blocks) return active
  const added = outputDeltaTokens(chunk, counter)
  const tokens = active.exact ? active.buckets.outputTokens : chunk.type === 'block-end' ? outputTokens(blocks, counter) : active.buckets.outputTokens + added
  return { ...active, blocks, buckets: { ...active.buckets, outputTokens: tokens },
    ...(added > 0 ? { firstOutputTime: active.firstOutputTime ?? time, firstOutputTokens: active.firstOutputTokens ?? tokens, latestOutputTime: time } : {}) }
}

/** @param chunks - 单次调用的流式增量。@param counter - tokenizer。@returns 用量及单次采样速度。 */
export function sampleLiveChunks(chunks: readonly { chunk: StreamChunk; time: number }[], counter: TokenCounter) {
  let active: ActiveStep = { turn: 0, step: 0, buckets: zeroBuckets(), blocks: [], exact: false }
  for (const member of chunks) active = applyChunk(active, member.chunk, member.time, counter)
  return { buckets: active.buckets, exact: active.exact, tokensPerSecond: rateOf(active), firstOutputTime: active.firstOutputTime }
}
