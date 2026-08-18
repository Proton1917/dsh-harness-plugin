import type { Agent } from '@deepseek-ai/dsh-agent'
import type { LlmCallConfig, Message } from '@deepseek-ai/dsh-llm'
import { describe, expect, it, vi } from 'vitest'
import { MedicalModeCoordinator } from '../src/mode.ts'
import type { MedicalSettings } from '../src/types.ts'

const settings: MedicalSettings = {
  enabled: true,
  provider: 'cc-api',
  model: 'claude-fable-5',
  reasoningEffort: 'high',
  armTimeoutMs: 30_000,
}

interface ModeHarness {
  agent: Agent
  append: ReturnType<typeof vi.fn>
  select: (id: string) => void
}

function modeAgent(id: string): ModeHarness {
  const events: Array<{ type: 'agent-preset/selected'; data: { agentPreset: string } }> = []
  let config: LlmCallConfig | undefined
  const append = vi.fn((type: string, data: { header?: { config: LlmCallConfig } }) => {
    if (type === 'request/header') config = data.header?.config
  })
  const agent = {
    id: 'medical-mode-test',
    options: { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
    session: {
      header: { id: 'medical-mode-test', version: 0, createdAt: 1, agentPreset: id },
      events,
      requestHeader: () => config === undefined ? undefined : { config },
      append,
    },
  } as unknown as Agent
  return {
    agent,
    append,
    select: (next) => { events.push({ type: 'agent-preset/selected', data: { agentPreset: next } }) },
  }
}

describe('Medical Agent Preset routing', () => {
  it('pins the Fable header and deterministic title before the first step enters the log', () => {
    const harness = modeAgent('medical')
    const rename = vi.fn()
    const coordinator = new MedicalModeCoordinator(() => settings, {
      get: vi.fn(() => undefined),
      rename,
    })
    coordinator.prepareStep(harness.agent, [{
      role: 'user',
      content: [{ type: 'text', text: '  咳嗽   3 天  ' }],
      source: { kind: 'user', rpcId: 'request-1' },
      id: 'message-1',
    } as Message])
    expect(harness.append).toHaveBeenCalledWith('request/header', {
      header: { config: expect.objectContaining({ provider: 'cc-api', model: 'claude-fable-5' }) },
      reason: 'initial',
    })
    expect(rename).toHaveBeenCalledWith(harness.agent.session, '医学病例 · 咳嗽 3 天')
  })

  it('pins the header and every request to Fable without an inherited token cap', async () => {
    const harness = modeAgent('medical')
    const coordinator = new MedicalModeCoordinator(() => settings)
    coordinator.sync(harness.agent)
    expect(harness.append).toHaveBeenCalledWith('request/header', {
      header: { config: expect.objectContaining({ provider: 'cc-api', model: 'claude-fable-5' }) },
      reason: 'initial',
    })
    await expect(coordinator.routeRequest(harness.agent, async () => ({
      provider: 'deepseek-official', model: 'deepseek-v4-pro', maxTokens: 8_000,
    }))).resolves.toMatchObject({
      provider: 'cc-api', model: 'claude-fable-5', reasoningEffort: 'high',
    })
    expect((await coordinator.routeRequest(harness.agent, async () => ({
      provider: 'deepseek-official', model: 'deepseek-v4-pro', maxTokens: 8_000,
    }))).maxTokens).toBeUndefined()
  })

  it('rejects a new Medical-mode request while disabled and leaves ordinary presets unchanged', async () => {
    const medical = modeAgent('medical')
    const disabled = new MedicalModeCoordinator(() => ({ ...settings, enabled: false }))
    await expect(disabled.routeRequest(medical.agent, async () => ({
      provider: 'deepseek-official', model: 'deepseek-v4-pro',
    }))).rejects.toThrow('当前已关闭')

    const ordinary = modeAgent('standard')
    const original = { provider: 'deepseek-official', model: 'deepseek-v4-pro' }
    await expect(disabled.routeRequest(ordinary.agent, async () => original)).resolves.toBe(original)
    expect(ordinary.append).not.toHaveBeenCalled()
  })

  it('restores the original route when a blank session switches away from Medical mode', () => {
    const harness = modeAgent('medical')
    const coordinator = new MedicalModeCoordinator(() => settings)
    coordinator.sync(harness.agent)
    harness.select('standard')
    coordinator.sync(harness.agent)
    expect(harness.append).toHaveBeenLastCalledWith('request/header', {
      header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } },
      reason: 'change',
    })
  })
})
