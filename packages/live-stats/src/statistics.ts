import { assistantStreamFirstTokenTime } from '@deepseek-ai/dsh-llm/assistant-stream'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { z } from 'zod'
import type { LiveSessionStatistics } from './types.ts'

/** 持久化计时状态，以进入步骤计数，并按完整日志累计实际耗时。 */
export interface StatisticsState extends LiveSessionStatistics {
  lastTurn: number | null
}

/** 持久化及远端计时字段的验证规则。 */
export const statisticsSchema = z.object({
  turns: z.number().int().nonnegative(),
  steps: z.number().int().nonnegative(),
  llmMs: z.number().nonnegative(),
  toolMs: z.number().nonnegative(),
  ttftMs: z.number().nonnegative(),
  ttftSteps: z.number().int().nonnegative(),
  model: z.object({ startedAt: z.number().nonnegative(), firstTokenTime: z.number().nonnegative().nullable() }).strict().nullable(),
  pendingTools: z.record(z.string(), z.number().nonnegative()),
}).strict()

/** @returns 尚未进入步骤的会话统计。 */
export function initialStatistics(): StatisticsState {
  return { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, model: null, pendingTools: {}, lastTurn: null }
}

function closeModel(state: StatisticsState, time: number): StatisticsState {
  const model = state.model
  if (model === null) return state
  return {
    ...state,
    model: null,
    llmMs: state.llmMs + Math.max(0, time - model.startedAt),
    ttftMs: state.ttftMs + (model.firstTokenTime === null ? 0 : Math.max(0, model.firstTokenTime - model.startedAt)),
    ttftSteps: state.ttftSteps + (model.firstTokenTime === null ? 0 : 1),
  }
}

/**
 * 根据步骤、流式消息和工具事件累计计时；取消步骤保留实际耗时。
 * @param state - 上一条事件的统计。
 * @param event - 完整会话日志中的事件。
 * @returns 事件发生后的统计及未结束计时。
 */
export function applyStatistics(state: StatisticsState, event: SessionEvent): StatisticsState {
  switch (event.type) {
    case 'step/start':
      return { ...state, turns: state.turns + (state.lastTurn === event.data.turn ? 0 : 1),
        steps: state.steps + 1, lastTurn: event.data.turn, model: { startedAt: event.time, firstTokenTime: null } }
    case 'assistant/message':
    case 'assistant/attempt': {
      if (state.model === null) return state
      const first = state.model.firstTokenTime ?? assistantStreamFirstTokenTime(event.data.stream) ?? null
      const next = { ...state, model: { ...state.model, firstTokenTime: first } }
      return event.type === 'assistant/message' ? closeModel(next, event.time) : next
    }
    case 'step/end':
      return closeModel(state, event.time)
    case 'tool/call':
      return { ...state, pendingTools: { ...state.pendingTools, [event.data.callId]: event.time } }
    case 'tool/result': {
      const id = event.data.message.source.callId
      if (!Object.hasOwn(state.pendingTools, id)) return state
      const start = state.pendingTools[id]!
      return { ...state, toolMs: state.toolMs + Math.max(0, event.time - start),
        pendingTools: Object.fromEntries(Object.entries(state.pendingTools).filter(([key]) => key !== id)) }
    }
    case 'turn/end': {
      const next = closeModel(state, event.time)
      return { ...next, toolMs: next.toolMs + Object.values(next.pendingTools).reduce((sum, start) => sum + Math.max(0, event.time - start), 0), pendingTools: {} }
    }
    default:
      return state
  }
}

/**
 * 把当前时刻和真实首 token 到达时间加入会话累计统计。
 * @param stats - Host 提供的累计统计和计时起点。
 * @param now - Client 当前时间，单位为毫秒。
 * @param firstTokenTime - 当前输出中最早的非空增量到达时间。
 * @returns 当前显示的用时及首 token 平均值；等待首 token 时显示下界估算。
 */
export function runningStatistics(stats: LiveSessionStatistics, now: number, firstTokenTime?: number) {
  const model = stats.model
  const first = model?.firstTokenTime ?? firstTokenTime
  const activeTtft = model === null ? 0 : Math.max(0, (first ?? now) - model.startedAt)
  const ttftSteps = stats.ttftSteps + (model === null ? 0 : 1)
  return { ...stats,
    llmMs: stats.llmMs + (model === null ? 0 : Math.max(0, now - model.startedAt)),
    toolMs: stats.toolMs + Object.values(stats.pendingTools).reduce((sum, start) => sum + Math.max(0, now - start), 0),
    ttftAverageMs: ttftSteps === 0 ? undefined : (stats.ttftMs + activeTtft) / ttftSteps,
    ttftEstimated: model !== null && first === undefined,
  }
}
