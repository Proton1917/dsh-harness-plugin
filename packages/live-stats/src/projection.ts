import { expandAssistantStream } from '@deepseek-ai/dsh-llm/assistant-stream'
import { z } from 'zod'
import { pluginRecordOf } from '@deepseek-ai/dsh-session'
import { openRouterStatisticsSchema } from './openrouter-statistics.ts'
import type { OpenRouterStatistics } from './openrouter-statistics.ts'
import type { ContentBlock, Message, TokenUsage } from '@deepseek-ai/dsh-llm'
import type { EpochHeader, SessionEvent, SurfaceEvent } from '@deepseek-ai/dsh-session'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import type { TokenCounter } from './token-counter.ts'
import type { LiveTokenUsageProjection } from './types.ts'
import { applyStatistics, initialStatistics, statisticsSchema } from './statistics.ts'
import type { StatisticsState } from './statistics.ts'
import { applyChunk, exactStep, rateOf, zeroBuckets } from './stream-sampling.ts'
import type { ActiveStep } from './stream-sampling.ts'
export { sampleLiveChunks } from './stream-sampling.ts'

const bucketsFrom = (usage: TokenUsage): TokenUsageProjection => ({
  uncachedInputTokens: usage.inputTokens,
  outputTokens: usage.outputTokens,
  cacheReadTokens: usage.cacheReadTokens ?? 0,
  cacheWriteTokens: usage.cacheWriteTokens ?? 0,
})

const addReplacing = (
  totals: TokenUsageProjection,
  previous: TokenUsageProjection | undefined,
  next: TokenUsageProjection,
): TokenUsageProjection => ({
  uncachedInputTokens: totals.uncachedInputTokens - (previous?.uncachedInputTokens ?? 0) + next.uncachedInputTokens,
  outputTokens: totals.outputTokens - (previous?.outputTokens ?? 0) + next.outputTokens,
  cacheReadTokens: totals.cacheReadTokens - (previous?.cacheReadTokens ?? 0) + next.cacheReadTokens,
  cacheWriteTokens: totals.cacheWriteTokens - (previous?.cacheWriteTokens ?? 0) + next.cacheWriteTokens,
})

const projectionSchema = z.object({
  uncachedInputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  activeStepUsage: z.object({ uncachedInputTokens: z.number(), outputTokens: z.number(), cacheReadTokens: z.number(), cacheWriteTokens: z.number() }).optional(),
  estimated: z.boolean(),
  settledEstimated: z.boolean().optional(),
  activeStepEstimated: z.boolean().optional(),
  statistics: statisticsSchema.optional(),
  tokensPerSecond: z.number().nonnegative().optional(),
  openRouter: openRouterStatisticsSchema.optional(),
}).strict() as unknown as z.ZodType<LiveTokenUsageProjection>

interface SurfaceNode {
  seq: number
  tokens: number
}

interface SettledSample {
  turn: number
  step: number
  buckets: TokenUsageProjection
  estimated: boolean
  tokensPerSecond?: number
}

interface State {
  openRouter?: OpenRouterStatistics
  settled: TokenUsageProjection
  settledEstimates: number
  last: SettledSample | null
  surface: SurfaceNode[]
  surfaceTokens: number
  header: EpochHeader | undefined
  active: ActiveStep | null
  statistics: StatisticsState
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    liveTokenUsage: State
  }
}

const tokenBucketsSchema = z.object({
  uncachedInputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
}).strict()

const outputBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }).strict(),
  z.object({ type: z.literal('reasoning'), text: z.string() }).strict(),
  z.object({
    type: z.literal('tool-call'),
    id: z.string(),
    name: z.string(),
    arguments: z.string(),
  }).strict(),
  z.object({
    type: z.literal('fixed'),
    block: z.custom<ContentBlock>(value => typeof value === 'object'
      && value !== null
      && typeof (value as { type?: unknown }).type === 'string'),
  }).strict(),
])

const activeStepSchema = z.object({
  turn: z.number().int().nonnegative(),
  step: z.number().int().nonnegative(),
  buckets: tokenBucketsSchema,
  exact: z.boolean(),
  blocks: z.array(outputBlockSchema.nullable()),
  firstOutputTime: z.number().nonnegative().optional(),
  firstOutputTokens: z.number().int().nonnegative().optional(),
  latestOutputTime: z.number().nonnegative().optional(),
}).strict()

const settledSampleSchema = z.object({
  turn: z.number().int().nonnegative(),
  step: z.number().int().nonnegative(),
  buckets: tokenBucketsSchema,
  estimated: z.boolean(),
  tokensPerSecond: z.number().nonnegative().optional(),
}).strict()

const stateSchema = z.object({
  openRouter: openRouterStatisticsSchema.optional(),
  settled: tokenBucketsSchema,
  settledEstimates: z.number().int().nonnegative(),
  last: settledSampleSchema.nullable(),
  surface: z.array(z.object({
    seq: z.number().int().nonnegative(),
    tokens: z.number().int().nonnegative(),
  }).strict()),
  surfaceTokens: z.number().int().nonnegative(),
  header: z.custom<EpochHeader>(value => typeof value === 'object'
    && value !== null
    && typeof (value as { config?: unknown }).config === 'object'
    && (value as { config?: unknown }).config !== null).optional(),
  active: activeStepSchema.nullable(),
  statistics: statisticsSchema.extend({ lastTurn: z.number().int().nonnegative().nullable() }),
}).strict() as z.ZodType<State>

function surfaceMessage(event: SurfaceEvent): Message {
  switch (event.type) {
    case 'user/message':
      return event.data
    case 'system/message':
    case 'developer/message':
    case 'assistant/message':
    case 'tool/result':
      return event.data.message
  }
}

function applySurface(
  state: State,
  event: SurfaceEvent,
  counter: TokenCounter,
): Pick<State, 'surface' | 'surfaceTokens'> {
  const tokens = counter.countMessage(surfaceMessage(event))
  if (event.surfaceOp === 'append') {
    return {
      surface: [...state.surface, { seq: event.seq, tokens }],
      surfaceTokens: state.surfaceTokens + tokens,
    }
  }
  const operation = event.surfaceOp
  const start = state.surface.findIndex(node => node.seq === operation.startSeq)
  const end = state.surface.findIndex(node => node.seq === operation.endSeq)
  if (start === -1 || end === -1 || start > end) {
    throw new Error(
      `live-stats: replace at seq ${event.seq} has invalid current range ${operation.startSeq}-${operation.endSeq}`,
    )
  }
  const removed = state.surface.slice(start, end + 1)
    .reduce((sum, node) => sum + node.tokens, 0)
  return {
    surface: [
      ...state.surface.slice(0, start),
      { seq: event.seq, tokens },
      ...state.surface.slice(end + 1),
    ],
    surfaceTokens: state.surfaceTokens - removed + tokens,
  }
}

function view(state: State): LiveTokenUsageProjection {
  const active = state.active
  const previous = active !== null
    && state.last?.turn === active.turn
    && state.last.step === active.step
    ? state.last
    : undefined
  const buckets = active === null
    ? state.settled
    : addReplacing(state.settled, previous?.buckets, active.buckets)
  const estimates = state.settledEstimates
    - (previous?.estimated === true ? 1 : 0)
    + (active !== null && !active.exact ? 1 : 0)
  const rate = active === null ? state.last?.tokensPerSecond : rateOf(active)
  return {
    ...buckets,
    ...(state.openRouter === undefined ? {} : { openRouter: state.openRouter }),
    estimated: estimates > 0,
    settledEstimated: state.settledEstimates - (previous?.estimated === true ? 1 : 0) > 0,
    ...(active === null ? {} : { activeStepEstimated: !active.exact }),
    statistics: {
      turns: state.statistics.turns, steps: state.statistics.steps,
      llmMs: state.statistics.llmMs, toolMs: state.statistics.toolMs,
      ttftMs: state.statistics.ttftMs, ttftSteps: state.statistics.ttftSteps,
      model: state.statistics.model, pendingTools: state.statistics.pendingTools,
    },
    ...(active === null ? {} : { activeStepUsage: active.buckets }),
    ...(rate === undefined ? {} : { tokensPerSecond: rate }),
  }
}

/** Create the replayable live usage projection consumed by DSH Web and the TPS row. */
export function createLiveTokenUsageProjectionDefinition(
  counter: TokenCounter,
) {
  return {
    key: 'liveTokenUsage',
    stateSchema,
    init: () => ({
      settled: zeroBuckets(),
      settledEstimates: 0,
      last: null,
      surface: [],
      surfaceTokens: 0,
      header: undefined,
      active: null,
      statistics: initialStatistics(),
    }),
    apply: (state, event: SessionEvent) => {
      const record = pluginRecordOf(event)
      if (record?.type === 'plugin:proton1917/live-stats/openrouter') {
        const statistics = openRouterStatisticsSchema.parse(record.data)
        return state.openRouter === undefined || statistics.sourceSeq > state.openRouter.sourceSeq
          ? { ...state, openRouter: statistics } : state
      }
      const statistics = applyStatistics(state.statistics, event)
      let next = statistics === state.statistics ? state : { ...state, statistics }
      if (event.type === 'step/start') {
        next = {
          ...next,
          active: {
            ...event.data,
            buckets: {
              ...zeroBuckets(),
              uncachedInputTokens: counter.countHeader(state.header) + state.surfaceTokens,
            },
            exact: false,
            blocks: [],
          },
        }
      } else if (event.type === 'request/header') {
        next = {
          ...next,
          header: event.data.header,
          ...(next.active === null ? {} : {
            active: {
              ...next.active,
              buckets: {
                ...next.active.buckets,
                uncachedInputTokens: counter.countHeader(event.data.header) + state.surfaceTokens,
              },
            },
          }),
        }
      } else if ((event.type === 'assistant/message' || event.type === 'assistant/attempt') && next.active !== null) {
        let active: ActiveStep = { ...next.active, blocks: [], exact: false, buckets: { ...next.active.buckets, outputTokens: 0 } }
        delete active.firstOutputTime
        delete active.firstOutputTokens
        delete active.latestOutputTime
        for (const member of expandAssistantStream(event.data.stream)) active = applyChunk(active, member.chunk, member.time, counter)
        if (event.type === 'assistant/message' && event.data.usage !== undefined) active = exactStep(active, event.data.usage)
        next = { ...next, active }
      } else if (event.type === 'step/end' && next.active !== null) {
        const active = next.active
        const rate = rateOf(active)
        const previous = next.last?.turn === active.turn && next.last.step === active.step
          ? next.last
          : undefined
        next = {
          ...next,
          settled: addReplacing(next.settled, previous?.buckets, active.buckets),
          settledEstimates: next.settledEstimates
          - (previous?.estimated === true ? 1 : 0)
          + (!active.exact ? 1 : 0),
          last: {
            turn: active.turn,
            step: active.step,
            buckets: active.buckets,
            estimated: !active.exact,
            ...(rate === undefined ? {} : { tokensPerSecond: rate }),
          },
          active: null,
        }
      } else if (event.type === 'turn/end'
      && event.data.reason.kind !== 'completed'
      && next.last?.turn === event.data.turn
      && next.last.estimated) {
        next = {
          ...next,
          settled: addReplacing(next.settled, next.last.buckets, zeroBuckets()),
          settledEstimates: next.settledEstimates - 1,
          last: null,
        }
      }

      if (event.type === 'system/message' || event.type === 'developer/message' || event.type === 'user/message' || event.type === 'assistant/message' || event.type === 'tool/result') {
        next = { ...next, ...applySurface(next, event, counter) }
        if ((event.type === 'system/message' || event.type === 'developer/message' || event.type === 'user/message') && next.active !== null && !next.active.exact) {
          next = { ...next, active: { ...next.active, buckets: { ...next.active.buckets, uncachedInputTokens: counter.countHeader(next.header) + next.surfaceTokens } } }
        }
      }
      return next
    },
    wire: { viewSchema: projectionSchema, view },
    stateVersion: 6,
  } satisfies ProjectionDefinition<'liveTokenUsage', State>
}
