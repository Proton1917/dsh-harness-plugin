import type { Agent, ModelSelection } from '@deepseek-ai/dsh-agent'
import type { AgentPresetRegistry } from '@deepseek-ai/dsh-agent-preset-registry'
import type {} from '@deepseek-ai/dsh-api-session-controller'
import { ReasoningEffortId, type LlmCallConfig, type Message } from '@deepseek-ai/dsh-llm'
import type { SessionTitleService } from '@deepseek-ai/dsh-session-title'
import { medicalSessionTitle } from './shared.ts'
import type { MedicalSettings } from './types.ts'

/** Stable id of the direct-submission Agent Preset. */
export const MEDICAL_PRESET_ID = 'medical'

/** Exact Fable route used by structured turns and the Medical Agent Preset. */
export function medicalRouteConfig(settings: MedicalSettings): LlmCallConfig {
  return {
    provider: settings.provider,
    model: settings.model,
    reasoningEffort: ReasoningEffortId(settings.reasoningEffort),
  }
}

/** Whether an Agent currently runs the Medical Agent Preset. */
export function isMedicalMode(
  agent: Agent,
  agentPresets: Pick<AgentPresetRegistry, 'composedPreset'>,
): boolean {
  return agentPresets.composedPreset(agent.ctx) === MEDICAL_PRESET_ID
}

function sameRoute(left: LlmCallConfig | undefined, right: LlmCallConfig): boolean {
  return left?.provider === right.provider
    && left.model === right.model
    && left.reasoningEffort === right.reasoningEffort
}

function selectedRoute(agent: Agent): ModelSelection | undefined {
  const event = agent.session.snapshotEvents().findLast(event =>
    event.type === 'model/selection' || event.type === 'request/header')
  const config = event?.type === 'model/selection'
    ? event.data
    : event?.type === 'request/header' ? event.data.header.config : undefined
  if (config === undefined) return undefined
  return {
    provider: config.provider,
    model: config.model,
    ...(config.reasoningEffort === undefined ? {} : { reasoningEffort: ReasoningEffortId(config.reasoningEffort) }),
  }
}

/** Keep the Medical Agent Preset on Fable without changing other presets. */
export class MedicalModeCoordinator {
  private readonly original = new Map<Agent, ModelSelection | undefined>()
  private readonly restoring = new Map<Agent, ModelSelection>()

  /** @param currentSettings - latest persisted medical settings. */
  constructor(
    private readonly currentSettings: () => MedicalSettings,
    private readonly agentPresets: Pick<AgentPresetRegistry, 'composedPreset'>,
    private readonly titles?: Pick<SessionTitleService, 'get' | 'rename'>,
  ) {}

  /** Pin the route and deterministic title before a Medical-mode step enters the log. */
  prepareStep(agent: Agent, messages: readonly Message[]): void {
    if (!isMedicalMode(agent, this.agentPresets)) return
    this.sync(agent)
    if (this.titles === undefined || this.titles.get(agent.session)?.source.kind === 'user') return
    const text: string[] = []
    for (const message of messages) {
      if (message.role !== 'user' || message.source.kind !== 'user') continue
      for (const block of message.content) {
        if (block.type === 'text') text.push(block.text)
      }
    }
    this.titles.rename(agent.session, medicalSessionTitle(text.join(' ')))
  }

  /** Record Session-local route intent; the Agent Loop owns turn-enclosed request headers. */
  sync(agent: Agent): void {
    if (!isMedicalMode(agent, this.agentPresets)) {
      if (!this.original.has(agent)) return
      const restore = this.original.get(agent)
      this.original.delete(agent)
      if (restore !== undefined && !sameRoute(selectedRoute(agent), restore)) {
        agent.session.append('model/selection', restore)
        this.restoring.set(agent, restore)
      }
      return
    }

    const route = medicalRouteConfig(this.currentSettings())
    this.restoring.delete(agent)
    if (!this.original.has(agent)) {
      const current = selectedRoute(agent)
      const fallback = agent.options.provider !== undefined && agent.options.model !== undefined
        ? {
            provider: agent.options.provider,
            model: agent.options.model,
            ...(agent.options.reasoningEffort === undefined ? {} : { reasoningEffort: agent.options.reasoningEffort }),
          }
        : undefined
      this.original.set(agent, sameRoute(current, route) ? fallback : current ?? fallback)
    }
    const current = selectedRoute(agent)
    if (!sameRoute(current, route)) {
      agent.session.append('model/selection', route)
    }
  }

  /** Route every user turn in Medical mode through the configured Fable route. */
  async routeRequest(agent: Agent, next: () => Promise<LlmCallConfig>): Promise<LlmCallConfig> {
    const resolved = await next()
    if (!isMedicalMode(agent, this.agentPresets)) {
      const restore = this.restoring.get(agent)
      if (restore === undefined) return resolved
      if (!sameRoute(selectedRoute(agent), restore) || sameRoute(resolved, restore)) {
        this.restoring.delete(agent)
        return resolved
      }
      // A pending selection is durable before the Host's last-used header changes.
      const { reasoningEffort: _inheritedEffort, ...withoutInheritedEffort } = resolved
      return { ...withoutInheritedEffort, ...restore }
    }
    const settings = this.currentSettings()
    if (!settings.enabled) {
      throw new Error('医学模式当前已关闭，请在设置中启用“医学病例分析”。')
    }
    const { maxTokens: _inheritedMaxTokens, ...withoutInheritedMaxTokens } = resolved
    return { ...withoutInheritedMaxTokens, ...medicalRouteConfig(settings) }
  }

  /** Release bookkeeping when an Agent leaves the live registry. */
  disposeAgent(agent: Agent): void {
    this.original.delete(agent)
    this.restoring.delete(agent)
  }

  /** Release every retained Agent reference during plugin teardown. */
  dispose(): void {
    this.original.clear()
    this.restoring.clear()
  }
}
