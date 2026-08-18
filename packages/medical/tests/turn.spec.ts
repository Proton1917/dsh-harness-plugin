import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMedicalCommand, MedicalTurnCoordinator } from '../src/turn.ts'
import type { MedicalSettings } from '../src/types.ts'

const settings: MedicalSettings = {
  enabled: true,
  provider: 'cc-api',
  model: 'claude-fable-5',
  reasoningEffort: 'high',
  armTimeoutMs: 30_000,
}

interface FakeAgentHarness {
  agent: Agent
  disposers: ReturnType<typeof vi.fn>[]
  append: ReturnType<typeof vi.fn>
}

function fakeAgent(): FakeAgentHarness {
  const disposers: ReturnType<typeof vi.fn>[] = []
  const register = (): (() => void) => {
    const dispose = vi.fn()
    disposers.push(dispose)
    return dispose
  }
  const context = {
    systemPrompt: {
      section: vi.fn(register),
      suppressRuntimeContext: vi.fn(register),
    },
    tools: {
      restrict: vi.fn(register),
      guard: vi.fn(register),
    },
  } as unknown as Context
  const append = vi.fn()
  const agent = {
    id: 'medical-test',
    options: { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
    session: { requestHeader: vi.fn(() => undefined), append },
    inbox: {},
    status: 'idle',
    ctx: context,
    cancel: vi.fn(),
    whenIdle: vi.fn(),
    runMaintenance: vi.fn(),
    send: vi.fn(),
    followup: vi.fn(),
    steer: vi.fn(),
    inject: vi.fn(),
  } as unknown as Agent
  return { agent, disposers, append }
}

describe('/medical-analyze and coordinator', () => {
  let coordinator: MedicalTurnCoordinator

  beforeEach(() => { coordinator = new MedicalTurnCoordinator(() => settings) })

  it('arms the target Agent without sending case data through the command', async () => {
    const harness = fakeAgent()
    const command = createMedicalCommand(() => settings, coordinator)
    const result = await command.handler({
      commandId: 'command-1' as never,
      agent: harness.agent,
      rawInput: ' text',
      signal: new AbortController().signal,
    })
    expect(result).toEqual({ kind: 'success', text: '医学分析作用域已准备，等待病例消息。' })
    expect(command.recordInput).toBe(false)
    expect(harness.agent.followup).not.toHaveBeenCalled()
    expect((harness.agent.ctx.systemPrompt.section as ReturnType<typeof vi.fn>))
      .toHaveBeenCalledWith(expect.objectContaining({ complete: true, name: 'medical:analysis' }))
    expect((harness.agent.ctx.tools.restrict as ReturnType<typeof vi.fn>))
      .toHaveBeenCalledWith({ allow: [] })
    expect(coordinator.has(harness.agent)).toBe(true)
    coordinator.dispose()
  })

  it('routes only the first request and rejects a second model step', async () => {
    const harness = fakeAgent()
    coordinator.arm(harness.agent, false)
    const original = { provider: 'deepseek-official', model: 'deepseek-v4-pro', maxTokens: 12_000 }
    await expect(coordinator.routeRequest(harness.agent, async () => original)).resolves.toMatchObject({
      provider: 'cc-api', model: 'claude-fable-5', reasoningEffort: 'high',
    })
    await expect(coordinator.routeRequest(harness.agent, async () => original)).resolves.toEqual(original)
    const next = vi.fn(async () => ({ kind: 'enter' as const, messages: [] }))
    await expect(coordinator.preStep(harness.agent, 2, next)).resolves.toEqual({ kind: 'reject' })
    expect(next).not.toHaveBeenCalled()
    coordinator.dispose()
  })

  it('cleans the temporary scope after running reaches idle', () => {
    const harness = fakeAgent()
    coordinator.arm(harness.agent, false)
    coordinator.status(harness.agent, 'running')
    coordinator.status(harness.agent, 'idle')
    expect(coordinator.has(harness.agent)).toBe(false)
    expect(harness.disposers).toHaveLength(4)
    expect(harness.disposers.every(dispose => dispose.mock.calls.length === 1)).toBe(true)
  })

  it('expires an armed scope when no Prompt arrives', () => {
    vi.useFakeTimers()
    const harness = fakeAgent()
    const short = new MedicalTurnCoordinator(() => ({ ...settings, armTimeoutMs: 1_000 }))
    short.arm(harness.agent, false)
    vi.advanceTimersByTime(1_000)
    expect(short.has(harness.agent)).toBe(false)
    vi.useRealTimers()
  })

  it('refuses disabled and duplicate arming', async () => {
    const harness = fakeAgent()
    const disabled = createMedicalCommand(() => ({ ...settings, enabled: false }), coordinator)
    expect(await disabled.handler({
      commandId: 'disabled' as never,
      agent: harness.agent,
      rawInput: ' text',
      signal: new AbortController().signal,
    })).toMatchObject({ kind: 'error', text: expect.stringContaining('已关闭') })

    const enabled = createMedicalCommand(() => settings, coordinator)
    await enabled.handler({
      commandId: 'first' as never,
      agent: harness.agent,
      rawInput: ' text',
      signal: new AbortController().signal,
    })
    expect(await enabled.handler({
      commandId: 'duplicate' as never,
      agent: harness.agent,
      rawInput: '',
      signal: new AbortController().signal,
    })).toMatchObject({ kind: 'error', text: expect.stringContaining('正在运行') })
    coordinator.dispose()
  })
})
