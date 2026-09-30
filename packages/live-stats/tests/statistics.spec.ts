import { describe, expect, it } from 'vitest'
import captured from './fixtures/realtime-statistics.json' with { type: 'json' }
import { runningStatistics, statisticsSchema } from '../src/statistics.ts'

// 数据来自真实 DeepSeek 请求和 sleep 6 工具调用的 Host Projection。
const pendingTool = statisticsSchema.parse(captured.pendingTool)
const waitingModel = statisticsSchema.parse(captured.waitingModel)
const settled = statisticsSchema.parse(captured.settled)

describe('真实计时记录的显示', () => {
  it('工具尚未结算时随时间累加，并与工具结束记录一致', () => {
    const beforeEnd = runningStatistics(pendingTool, captured.toolResultTime - 1000)
    const atEnd = runningStatistics(pendingTool, captured.toolResultTime)
    expect(atEnd.toolMs - beforeEnd.toolMs).toBe(1000)
    expect(atEnd.toolMs).toBe(waitingModel.toolMs)
    expect(atEnd.llmMs).toBe(pendingTool.llmMs)
  })
  it('等待首 token 时更新估算，到达时使用真实延迟', () => {
    const waiting = runningStatistics(waitingModel, captured.firstTokenTime - 100)
    const received = runningStatistics(waitingModel, captured.firstTokenTime, captured.firstTokenTime)
    expect(waiting.ttftEstimated).toBe(true)
    expect(received.ttftEstimated).toBe(false)
    expect(received.ttftAverageMs).toBe(settled.ttftMs / settled.ttftSteps)
    expect(received.llmMs - waiting.llmMs).toBe(100)
    expect(received.turns).toBe(2)
    expect(received.steps).toBe(3)
  })
  it('结束后模型和工具用时保持已记录值', () => {
    const first = runningStatistics(settled, captured.toolResultTime)
    const later = runningStatistics(settled, captured.toolResultTime + 10000)
    expect(later.llmMs).toBe(first.llmMs)
    expect(later.toolMs).toBe(first.toolMs)
    expect(later.ttftAverageMs).toBe(first.ttftAverageMs)
  })
})
