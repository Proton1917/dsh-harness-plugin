import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/preset.ts'

describe('Medical Agent Preset policy', () => {
  it('installs a complete prompt and persistent no-tools policy without a step limiter', () => {
    const ctx = {
      systemPrompt: {
        section: vi.fn(() => vi.fn()),
        suppressRuntimeContext: vi.fn(() => vi.fn()),
      },
      tools: {
        restrict: vi.fn(() => vi.fn()),
        guard: vi.fn(() => vi.fn()),
      },
      on: vi.fn(),
    } as unknown as Context

    apply(ctx)
    expect(ctx.systemPrompt.section).toHaveBeenCalledWith(expect.objectContaining({
      name: 'medical:mode', complete: true,
    }))
    expect(ctx.systemPrompt.suppressRuntimeContext).toHaveBeenCalledOnce()
    expect(ctx.tools.restrict).toHaveBeenCalledWith({ allow: [] })
    expect(ctx.tools.guard).toHaveBeenCalledOnce()
    expect(ctx.on).not.toHaveBeenCalled()
  })
})
