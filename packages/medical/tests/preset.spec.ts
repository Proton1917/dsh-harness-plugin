import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/preset.ts'

describe('Medical Agent Preset policy', () => {
  it('installs a complete prompt, no-tools policy, and one-step limit', async () => {
    let preStep: ((payload: { step: number }, next: () => Promise<{ kind: 'enter' }>) => Promise<unknown>) | undefined
    const ctx = {
      systemPrompt: {
        section: vi.fn(() => vi.fn()),
        suppressRuntimeContext: vi.fn(() => vi.fn()),
      },
      tools: {
        restrict: vi.fn(() => vi.fn()),
        guard: vi.fn(() => vi.fn()),
      },
      on: vi.fn((name: string, listener: typeof preStep) => {
        if (name === 'agent/pre-step') preStep = listener
        return vi.fn()
      }),
    } as unknown as Context

    apply(ctx)
    expect(ctx.systemPrompt.section).toHaveBeenCalledWith(expect.objectContaining({
      name: 'medical:mode', complete: true,
    }))
    expect(ctx.systemPrompt.suppressRuntimeContext).toHaveBeenCalledOnce()
    expect(ctx.tools.restrict).toHaveBeenCalledWith({ allow: [] })
    expect(ctx.tools.guard).toHaveBeenCalledOnce()

    const next = vi.fn(async () => ({ kind: 'enter' as const }))
    await expect(preStep?.({ step: 1 }, next)).resolves.toEqual({ kind: 'enter' })
    await expect(preStep?.({ step: 2 }, next)).resolves.toEqual({ kind: 'reject' })
    expect(next).toHaveBeenCalledOnce()
  })
})
