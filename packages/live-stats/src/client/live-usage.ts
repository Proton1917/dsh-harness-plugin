import { useMemo, useSyncExternalStore } from 'react'
import type { SessionEventSource, SessionEventWindow } from '@deepseek-ai/dsh-api-session-controller/client'
import tokenizerData from '../../assets/deepseek-v3/tokenizer.json' with { type: 'json' }
import tokenizerConfig from '../../assets/deepseek-v3/tokenizer_config.json' with { type: 'json' }
import { createTokenCounter, type TokenCounter } from '../token-counter.ts'
import { sampleLiveChunks } from '../projection.ts'
import type { LiveTokenUsageProjection } from '../types.ts'

let counter: TokenCounter | undefined

/** Combine the durable Host totals with the currently visible transient attempt. */
export function useLiveUsage(
  source: SessionEventSource,
  durable: LiveTokenUsageProjection | undefined,
): LiveTokenUsageProjection | undefined {
  const subscribe = useMemo(() => source.subscribe.bind(source), [source])
  const snapshot = useMemo(() => source.getSnapshot.bind(source), [source])
  const window = useSyncExternalStore<SessionEventWindow>(subscribe, snapshot)
  return useMemo(() => {
    const chunks = window.entries
      .filter(entry => entry.type === 'transient')
      .map(entry => ({ chunk: entry.event.data.chunk, time: entry.event.time }))
    if (chunks.length === 0 || durable === undefined || durable.activeStepUsage === undefined) return durable
    counter ??= createTokenCounter(tokenizerData, tokenizerConfig)
    const sample = sampleLiveChunks(chunks, counter)
    return {
      ...durable,
      outputTokens: durable.outputTokens - durable.activeStepUsage.outputTokens + sample.buckets.outputTokens,
      estimated: !sample.exact || durable.estimated,
      ...(sample.exact ? {
        uncachedInputTokens: durable.uncachedInputTokens - durable.activeStepUsage.uncachedInputTokens + sample.buckets.uncachedInputTokens,
        cacheReadTokens: durable.cacheReadTokens - durable.activeStepUsage.cacheReadTokens + sample.buckets.cacheReadTokens,
        cacheWriteTokens: durable.cacheWriteTokens - durable.activeStepUsage.cacheWriteTokens + sample.buckets.cacheWriteTokens,
      } : {}),
      ...(sample.tokensPerSecond === undefined ? {} : { tokensPerSecond: sample.tokensPerSecond }),
    }
  }, [window, durable])
}
