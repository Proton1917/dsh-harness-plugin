/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { apply } from '../src/client/index.ts'
import {
  formatDuration, formatFullTokens, formatTokens, LiveStatsLine,
} from '../src/client/LiveStatsLine.tsx'
import { en, LIVE_STATS_NS } from '../src/client/locales.ts'
import { TpsLine, formatTokensPerSecond } from '../src/client/TpsLine.tsx'

afterEach(cleanup)

const t = ((key: keyof typeof en, params: Record<string, string | number> = {}): string => {
  let value: string = en[key]
  for (const [name, replacement] of Object.entries(params)) {
    value = value.replaceAll(`{${name}}`, String(replacement))
  }
  return value
}) as TranslateNS<typeof LIVE_STATS_NS>

describe('TPS composer line', () => {
  it('formats stable compact rates', () => {
    expect(formatTokensPerSecond(42.64)).toBe('42.6')
    expect(formatTokensPerSecond(142.64)).toBe('143')
  })

  it('renders only after an elapsed output sample exists', () => {
    const absent = ((key: string): unknown => key === 'liveTokenUsage'
      ? { estimated: true, uncachedInputTokens: 10, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 }
      : undefined) as UseProjection
    const view = render(<TpsLine useProjection={absent} t={t} />)
    expect(view.container.textContent).toBe('')

    const live = ((key: string): unknown => key === 'liveTokenUsage'
      ? {
        estimated: true,
        uncachedInputTokens: 10,
        outputTokens: 8,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        tokensPerSecond: 42.64,
      }
      : undefined) as UseProjection
    view.rerender(<TpsLine useProjection={live} t={t} />)
    expect(view.container.textContent).toBe('TPS 42.6 tok/s')
  })

  it('falls back to settled decode throughput between streamed samples', () => {
    const settled = ((key: string): unknown => key === 'liveTokenUsage'
      ? { estimated: false, uncachedInputTokens: 10, outputTokens: 60, cacheReadTokens: 0, cacheWriteTokens: 0 }
      : key === 'sessionStats'
        ? {
          turns: 1,
          steps: 2,
          llmMs: 3_800,
          toolMs: 0,
          ttftMs: 800,
          ttftSteps: 1,
          decodeMs: 3_000,
          decodeTokens: 60,
        }
        : undefined) as UseProjection
    const view = render(<TpsLine useProjection={settled} t={t} />)
    expect(view.container.textContent).toBe('TPS 20 tok/s')
  })

  it('prefers the current streamed rate over settled throughput', () => {
    const streaming = ((key: string): unknown => key === 'liveTokenUsage'
      ? {
        estimated: true,
        uncachedInputTokens: 10,
        outputTokens: 20,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        tokensPerSecond: 42.64,
      }
      : key === 'sessionStats'
        ? {
          turns: 1,
          steps: 2,
          llmMs: 3_800,
          toolMs: 0,
          ttftMs: 800,
          ttftSteps: 1,
          decodeMs: 3_000,
          decodeTokens: 60,
        }
        : undefined) as UseProjection
    const view = render(<TpsLine useProjection={streaming} t={t} />)
    expect(view.container.textContent).toBe('TPS 42.6 tok/s')
  })
})

describe('plugin-owned statistics row', () => {
  it('formats compact readings and preserves an unabridged cumulative total', () => {
    expect(formatTokens(517)).toBe('517')
    expect(formatTokens(12_200)).toBe('12.2K')
    expect(formatFullTokens(11_404_840)).toBe('11,404,840')
    expect(formatDuration(162_000)).toBe('2m42s')
  })

  it('renders whole-session stats, durable cache accounting, and live token estimates', () => {
    const values = {
      sessionStats: {
        turns: 1,
        steps: 2,
        llmMs: 1_500,
        toolMs: 500,
        ttftMs: 800,
        ttftSteps: 2,
        decodeMs: 9_999,
        decodeTokens: 9_999,
      },
      tokenUsage: {
        uncachedInputTokens: 10,
        outputTokens: 5,
        cacheReadTokens: 90,
        cacheWriteTokens: 0,
      },
      liveTokenUsage: {
        uncachedInputTokens: 11_404_000,
        outputTokens: 840,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        estimated: true,
        tokensPerSecond: 42.64,
      },
    }
    const useProjection = ((key: keyof typeof values): unknown => values[key]) as UseProjection
    const view = render(<LiveStatsLine useProjection={useProjection} t={t} />)
    const text = view.container.textContent ?? ''
    expect(text).toContain('Turns 1 · Steps 2')
    expect(text).toContain('LLM 1.5s · Tools 0.5s')
    expect(text).toContain('TTFT avg 0.4s')
    expect(text).not.toContain('999.9 tok/s')
    expect(text).toContain('Cache hit 90%')
    expect(text).toContain('Input ~11.4M · Output ~840 · Total ~11,404,840 tok')
  })

  it('shadows the built-in stats cell through the documented slot priority', () => {
    const register = vi.fn(() => () => {})
    const injectSlot = vi.fn((_name: string, install: () => unknown) => install())
    const registerLocale = vi.fn(() => () => {})
    const effects: Array<() => void> = []
    const ctx = {
      effect: (factory: () => () => void) => {
        effects.push(factory())
      },
      locale: { register: registerLocale },
      slots: { inject: injectSlot, register },
    } as unknown as ClientContext
    apply(ctx)
    expect(registerLocale).toHaveBeenCalledWith(LIVE_STATS_NS, expect.any(Object))
    expect(injectSlot).toHaveBeenCalledTimes(2)
    expect(injectSlot).toHaveBeenNthCalledWith(1, 'conversation.composer.dock', expect.any(Function))
    expect(injectSlot).toHaveBeenNthCalledWith(2, 'conversation.composer.dock', expect.any(Function))
    expect(register.mock.calls[0]?.[0]).toMatchObject({
      name: 'conversation.composer.dock',
      id: 'stats',
      order: 0,
      priority: -1,
      locale: LIVE_STATS_NS,
    })
    expect(register.mock.calls[1]?.[0]).toMatchObject({
      name: 'conversation.composer.dock',
      id: 'live-tps',
      order: 1,
      locale: LIVE_STATS_NS,
    })
    for (const dispose of effects.reverse()) dispose()
  })
})
