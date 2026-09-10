import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { AgentPresets } from '@deepseek-ai/dsh-agent-presets'
import type { LlmCallConfig, Message } from '@deepseek-ai/dsh-llm'
import { describe, expect, it, vi } from 'vitest'
import { MedicalModeCoordinator } from '../src/mode.ts'
import type { MedicalSettings } from '../src/types.ts'

const settings: MedicalSettings = {
  enabled: true,
  provider: 'anthropic',
  model: 'anthropic/claude-fable-5.1',
  reasoningEffort: 'high',
}

interface ModeHarness {
  agent: Agent
  agentPresets: Pick<AgentPresets, 'composedPreset'>
  append: ReturnType<typeof vi.fn>
  select: (id: string) => void
}

const testPresetByContext = new WeakMap<Context, string>()
const testAgentPresets: Pick<AgentPresets, 'composedPreset'> = {
  composedPreset: context => testPresetByContext.get(context),
}

function modeAgent(id: string): ModeHarness {
  let preset = id
  const events: { type: string; data: LlmCallConfig }[] = []
  const append = vi.fn((type: string, data: LlmCallConfig) => {
    events.push({ type, data })
  })
  const agentContext = {} as Context
  testPresetByContext.set(agentContext, id)
  const agent = {
    id: 'medical-mode-test',
    options: { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
    ctx: agentContext,
    session: {
      header: { id: 'medical-mode-test', version: 0, createdAt: 1, agentPreset: id },
      requestHeader: () => undefined,
      snapshotEvents: () => events,
      append,
    },
  } as unknown as Agent
  return {
    agent,
    agentPresets: testAgentPresets,
    append,
    select: (next) => {
      preset = next
      testPresetByContext.set(agentContext, preset)
    },
  }
}

describe('Medical Agent Preset routing', () => {
  it('pins the Fable selection and deterministic title before the first step enters the log', () => {
    const harness = modeAgent('medical')
    const rename = vi.fn()
    const coordinator = new MedicalModeCoordinator(() => settings, harness.agentPresets, {
      get: vi.fn(() => undefined),
      rename,
    })
    coordinator.prepareStep(harness.agent, [{
      role: 'user',
      content: [{ type: 'text', text: '  咳嗽   3 天  ' }],
      source: { kind: 'user', rpcId: 'request-1' },
      id: 'message-1',
    } as Message])
    expect(harness.append).toHaveBeenCalledWith('model/selection',
      expect.objectContaining({ provider: 'anthropic', model: 'anthropic/claude-fable-5.1' }))
    expect(rename).toHaveBeenCalledWith(harness.agent.session, '医学病例 · 咳嗽 3 天')
  })

  it('keeps one Fable selection across multiple user turns without writing request headers', async () => {
    const harness = modeAgent('medical')
    const coordinator = new MedicalModeCoordinator(() => settings, harness.agentPresets)
    coordinator.sync(harness.agent)
    expect(harness.append).toHaveBeenCalledWith('model/selection',
      expect.objectContaining({ provider: 'anthropic', model: 'anthropic/claude-fable-5.1' }))
    await expect(coordinator.routeRequest(harness.agent, async () => ({
      provider: 'deepseek-official', model: 'deepseek-v4-pro', maxTokens: 8_000,
    }))).resolves.toMatchObject({
      provider: 'anthropic', model: 'anthropic/claude-fable-5.1', reasoningEffort: 'high',
    })
    expect((await coordinator.routeRequest(harness.agent, async () => ({
      provider: 'deepseek-official', model: 'deepseek-v4-pro', maxTokens: 8_000,
    }))).maxTokens).toBeUndefined()
    coordinator.sync(harness.agent)
    expect(harness.append).toHaveBeenCalledTimes(1)
  })

  it('rejects a new Medical-mode request while disabled and leaves ordinary presets unchanged', async () => {
    const medical = modeAgent('medical')
    const disabled = new MedicalModeCoordinator(
      () => ({ ...settings, enabled: false }),
      medical.agentPresets,
    )
    await expect(disabled.routeRequest(medical.agent, async () => ({
      provider: 'deepseek-official', model: 'deepseek-v4-pro',
    }))).rejects.toThrow('当前已关闭')

    const ordinary = modeAgent('standard')
    const original = { provider: 'deepseek-official', model: 'deepseek-v4-pro' }
    await expect(disabled.routeRequest(ordinary.agent, async () => original)).resolves.toBe(original)
    expect(ordinary.append).not.toHaveBeenCalled()
  })

  it('restores the original route when a blank session switches away from Medical mode', async () => {
    const harness = modeAgent('medical')
    const coordinator = new MedicalModeCoordinator(() => settings, harness.agentPresets)
    coordinator.sync(harness.agent)
    harness.select('standard')
    coordinator.sync(harness.agent)
    expect(harness.append).toHaveBeenLastCalledWith('model/selection', {
      provider: 'deepseek-official', model: 'deepseek-v4-pro',
    })
    await expect(coordinator.routeRequest(harness.agent, async () => ({
      provider: 'anthropic', model: 'anthropic/claude-fable-5.1', reasoningEffort: 'high',
    } as LlmCallConfig))).resolves.toEqual({ provider: 'deepseek-official', model: 'deepseek-v4-pro' })
  })
})
