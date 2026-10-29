import { expect, it } from 'vitest'
import captured from './fixtures/openrouter-generation.json' with { type: 'json' }
import { readOpenRouterGeneration } from '../src/openrouter-statistics.ts'

it('使用真实 Generation API 记录中的原始输出数量和生成时长', () => {
  const statistics = readOpenRouterGeneration(captured, captured.data.id)
  expect(statistics).toEqual({ generationId: captured.data.id, outputTokens: 37,
    generationMs: 158, provider: 'Together' })
  expect(statistics!.outputTokens * 1000 / statistics!.generationMs).toBeCloseTo(234.1772151898734)
})

it('拒绝把另一条调用的统计关联到当前消息', () => {
  expect(() => readOpenRouterGeneration(captured, 'msg_eQ71ZE4iN0CUCYGVwF0n')).toThrow('generation ID')
})
