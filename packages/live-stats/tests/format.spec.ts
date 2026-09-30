import { describe, expect, it } from 'vitest'
import { cacheHitPercent, formatDuration, formatFullTokens, formatTokens, formatTokensPerSecond } from '../src/client/format.ts'
import { en, zh } from '../src/client/locales.ts'

describe('实时统计格式', () => {
  it('保留完整累计数量并按显示空间缩写按钮读数', () => {
    expect(formatTokens(517)).toBe('517')
    expect(formatTokens(12_200)).toBe('12.2K')
    expect(formatFullTokens(11_404_840)).toBe('11,404,840')
  })
  it('格式化时长和每秒输出速度', () => {
    expect(formatDuration(162_000)).toBe('2m42s')
    expect(formatTokensPerSecond(42.64)).toBe('42.6')
    expect(formatTokensPerSecond(142.64)).toBe('143')
  })
  it('中英文包含相同的按钮和详情文案', () => {
    expect(Object.keys(zh)).toEqual(Object.keys(en))
  })
  it('缓存命中保留小数并区分完整命中与接近完整命中', () => {
    expect(cacheHitPercent({ uncachedInputTokens: 99, cacheReadTokens: 9901, cacheWriteTokens: 0, outputTokens: 0 })).toBe('99.01')
    expect(cacheHitPercent({ uncachedInputTokens: 1, cacheReadTokens: 99999, cacheWriteTokens: 0, outputTokens: 0 })).toBe('99.999')
    expect(cacheHitPercent({ uncachedInputTokens: 0, cacheReadTokens: 10000, cacheWriteTokens: 0, outputTokens: 0 })).toBe('100')
  })
})
