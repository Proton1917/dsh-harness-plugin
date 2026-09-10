import { readFileSync } from 'node:fs'
import { createTokenCounter, type TokenCounter } from './token-counter.ts'
export type { TokenCounter } from './token-counter.ts'

/** Load the official DeepSeek tokenizer for provisional usage accounting. */
export function createDeepSeekTokenCounter(): TokenCounter {
  return createTokenCounter(
    JSON.parse(readFileSync(new URL('../assets/deepseek-v3/tokenizer.json', import.meta.url), 'utf8')) as object,
    JSON.parse(readFileSync(new URL('../assets/deepseek-v3/tokenizer_config.json', import.meta.url), 'utf8')) as object,
  )
}
