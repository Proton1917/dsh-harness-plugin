import { describe, expect, it } from 'vitest'
import { Config } from '../src/index.ts'

describe('实时统计配置', () => {
  it('使用默认配置激活本地流式统计', () => {
    expect(Config({})).toEqual({ refreshIntervalMs: 250 })
  })

  it('为 OpenRouter 密钥文件补充查询参数并校验路径', () => {
    expect(Config({ openRouter: { apiKeyFile: '/credentials/openrouter' } }).openRouter).toEqual({
      apiKeyFile: '/credentials/openrouter',
      timeoutMs: 10000,
      maxAttempts: 3,
      retryDelayMs: 1000,
    })
    expect(() => Config({ openRouter: {} })).toThrow()
  })
})
