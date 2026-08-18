import type { Agent } from '@deepseek-ai/dsh-agent'
import { resolveSessionPreset } from '@deepseek-ai/dsh-agent-presets'
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
export function isMedicalMode(agent: Agent): boolean {
  return resolveSessionPreset(agent.session) === MEDICAL_PRESET_ID
}

function sameRoute(left: LlmCallConfig | undefined, right: LlmCallConfig): boolean {
  return left?.provider === right.provider
    && left.model === right.model
    && left.reasoningEffort === right.reasoningEffort
}

/** Keep the Medical Agent Preset on Fable without changing other presets. */
export class MedicalModeCoordinator {
  private readonly original = new Map<Agent, LlmCallConfig | undefined>()

  /** @param currentSettings - latest persisted medical settings. */
  constructor(
    private readonly currentSettings: () => MedicalSettings,
    private readonly titles?: Pick<SessionTitleService, 'get' | 'rename'>,
  ) {}

  /** Pin the route and deterministic title before a Medical-mode step enters the log. */
  prepareStep(agent: Agent, messages: readonly Message[]): void {
    if (!isMedicalMode(agent)) return
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

  /** Apply or withdraw the durable request header after preset composition changes. */
  sync(agent: Agent): void {
    if (!isMedicalMode(agent)) {
      if (!this.original.has(agent)) return
      const restore = this.original.get(agent)
      this.original.delete(agent)
      if (restore !== undefined && !sameRoute(agent.session.requestHeader()?.config, restore)) {
        agent.session.append('request/header', { header: { config: restore }, reason: 'change' })
      }
      return
    }

    const route = medicalRouteConfig(this.currentSettings())
    if (!this.original.has(agent)) {
      const current = agent.session.requestHeader()?.config
      const fallback = agent.options.provider !== undefined && agent.options.model !== undefined
        ? { provider: agent.options.provider, model: agent.options.model }
        : undefined
      this.original.set(agent, sameRoute(current, route) ? fallback : current ?? fallback)
    }
    const current = agent.session.requestHeader()?.config
    if (!sameRoute(current, route)) {
      agent.session.append('request/header', {
        header: { config: route },
        reason: current === undefined ? 'initial' : 'change',
      })
    }
  }

  /** Route every user turn in Medical mode to one configured Fable request. */
  async routeRequest(agent: Agent, next: () => Promise<LlmCallConfig>): Promise<LlmCallConfig> {
    const resolved = await next()
    if (!isMedicalMode(agent)) return resolved
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
  }

  /** Release every retained Agent reference during plugin teardown. */
  dispose(): void {
    this.original.clear()
  }
}
