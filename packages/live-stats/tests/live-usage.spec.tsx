/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import type { SessionEventLikeEntry, SessionEventWindow } from '@deepseek-ai/dsh-api-session-controller/client'
import { LlmAttemptId } from '@deepseek-ai/dsh-llm/brand'
import { useLiveUsage } from '../src/client/live-usage.ts'
import { createTokenCounter } from '../src/token-counter.ts'
import data from '../assets/deepseek-v3/tokenizer.json' with { type: 'json' }
import config from '../assets/deepseek-v3/tokenizer_config.json' with { type: 'json' }
import type { LiveTokenUsageProjection } from '../src/types.ts'

afterEach(cleanup)
it('updates on transient wire frames, avoids duplicate settled output, and retracts on settlement', () => {
  const listeners = new Set<() => void>()
  let window: SessionEventWindow = { entries: [], revision: 0, hasMore: false, change: { kind: 'replace', entries: [] } }
  const source = {
    getSnapshot: () => window,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    append: (entry: SessionEventLikeEntry) => { window = { ...window, revision: window.revision + 1, entries: [...window.entries, entry], change: { kind: 'append', entries: [entry] } }; for (const listener of listeners) listener() },
    settleAssistant: (_id: unknown) => { window = { ...window, revision: window.revision + 1, entries: [], change: { kind: 'replace', entries: [] } }; for (const listener of listeners) listener() },
  }
  const attemptId = LlmAttemptId('live-stats-test')
  const base: LiveTokenUsageProjection = { uncachedInputTokens: 10, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0, estimated: true, activeStepUsage: { uncachedInputTokens: 10, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 } }
  const hook = renderHook(({ value }) => useLiveUsage(source, value), { initialProps: { value: base } })
  const append = (time: number, text: string) => source.append({ type: 'transient', event: { type: 'assistant/live-chunk', time, seq: time / 10000, data: { attemptId, turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text } } } })
  act(() => append(1_000, 'abcd'))
  expect(hook.result.current?.tokensPerSecond).toBeUndefined()
  act(() => append(2_000, 'efgh'))
  const counter = createTokenCounter(data, config)
  const output = counter.countText('abcd') + counter.countText('efgh')
  expect(hook.result.current?.outputTokens).toBe(50 + output)
  expect(hook.result.current?.tokensPerSecond).toBe(counter.countText('efgh'))
  hook.rerender({ value: { ...base, outputTokens: 80, activeStepUsage: { ...base.activeStepUsage!, outputTokens: 30 } } })
  expect(hook.result.current?.outputTokens).toBe(50 + output)
  act(() => source.settleAssistant(attemptId))
  expect(hook.result.current?.outputTokens).toBe(80)
})
