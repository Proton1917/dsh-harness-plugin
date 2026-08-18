import type { Agent, AgentStatus, PreStepDecision } from '@deepseek-ai/dsh-agent'
import type { CommandDefinition } from '@deepseek-ai/dsh-commands'
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm'
import { medicalRouteConfig } from './mode.ts'
import { MEDICAL_SYSTEM_PROMPT } from './prompt.ts'
import type { MedicalSettings } from './types.ts'

interface ActiveMedicalTurn {
  readonly settings: MedicalSettings
  readonly hasImages: boolean
  readonly originalAtArm: LlmCallConfig | undefined
  readonly cleanup: () => void
  started: boolean
  routed: boolean
  preflightLogged: boolean
  restoreConfig: LlmCallConfig | undefined
  armTimer: ReturnType<typeof setTimeout> | undefined
}

/** Own exact-Agent admission, one-request routing, and scope teardown. */
export class MedicalTurnCoordinator {
  private readonly active = new Map<Agent, ActiveMedicalTurn>()

  /** @param currentSettings - latest Host settings snapshot. */
  constructor(private readonly currentSettings: () => MedicalSettings) {}

  /** Whether one Agent is already armed or running a medical analysis. */
  has(agent: Agent): boolean {
    return this.active.has(agent)
  }

  /** Install the medical prompt and tool policy before the Client sends a standard Prompt. */
  arm(agent: Agent, hasImages: boolean): void {
    if (this.active.has(agent)) throw new Error('当前会话已有医学分析正在运行。')
    const settings = this.currentSettings()
    const disposers: Array<() => void> = []
    let cleaned = false
    let state!: ActiveMedicalTurn
    const cleanup = (): void => {
      if (cleaned) return
      cleaned = true
      this.active.delete(agent)
      if (state.armTimer !== undefined) clearTimeout(state.armTimer)
      for (const dispose of disposers.reverse()) dispose()
      const restore = state.restoreConfig ?? state.originalAtArm
      const shouldRestore = !state.hasImages || !state.started
      if (shouldRestore && restore !== undefined && (state.routed || state.preflightLogged)) {
        agent.session.append('request/header', {
          header: { config: restore },
          reason: 'change',
        })
      }
    }
    const persisted = agent.session.requestHeader()?.config
    const fallback = agent.options.provider !== undefined && agent.options.model !== undefined
      ? { provider: agent.options.provider, model: agent.options.model }
      : undefined
    state = {
      settings,
      hasImages,
      originalAtArm: persisted ?? fallback,
      cleanup,
      started: false,
      routed: false,
      preflightLogged: false,
      restoreConfig: undefined,
      armTimer: undefined,
    }
    this.active.set(agent, state)
    try {
      disposers.push(agent.ctx.systemPrompt.section({
        name: 'medical:analysis',
        order: 0,
        complete: true,
        text: MEDICAL_SYSTEM_PROMPT,
      }))
      disposers.push(agent.ctx.systemPrompt.suppressRuntimeContext())
      disposers.push(agent.ctx.tools.restrict({ allow: [] }))
      disposers.push(agent.ctx.tools.guard(() => '医学病例分析轮不允许执行工具。'))
      if (hasImages) {
        agent.session.append('request/header', {
          header: { config: medicalRouteConfig(settings) },
          reason: persisted === undefined ? 'initial' : 'change',
        })
        state.preflightLogged = true
      }
      state.armTimer = setTimeout(() => {
        if (!state.started) cleanup()
      }, settings.armTimeoutMs)
    } catch (error: unknown) {
      cleanup()
      throw error
    }
  }

  /** Override exactly the first request issued by an armed Agent. */
  async routeRequest(agent: Agent, next: () => Promise<LlmCallConfig>): Promise<LlmCallConfig> {
    const resolved = await next()
    const state = this.active.get(agent)
    if (state === undefined || state.routed) return resolved
    state.routed = true
    state.restoreConfig = resolved
    const { maxTokens: _inheritedMaxTokens, ...withoutInheritedMaxTokens } = resolved
    return {
      ...withoutInheritedMaxTokens,
      ...medicalRouteConfig(state.settings),
    }
  }

  /** Prevent any tool-continuation or other second model request in the medical turn. */
  preStep(
    agent: Agent,
    step: number,
    next: () => Promise<PreStepDecision>,
  ): Promise<PreStepDecision> {
    const state = this.active.get(agent)
    if (state !== undefined && state.routed && step > 1) {
      return Promise.resolve({ kind: 'reject' })
    }
    return next()
  }

  /** Follow the armed Agent from Prompt admission through final idle. */
  status(agent: Agent, status: AgentStatus): void {
    const state = this.active.get(agent)
    if (state === undefined) return
    if (status === 'running') {
      state.started = true
      if (state.armTimer !== undefined) {
        clearTimeout(state.armTimer)
        state.armTimer = undefined
      }
      return
    }
    if (state.started) state.cleanup()
  }

  /** Remove an armed scope when its Agent leaves the registry. */
  disposeAgent(agent: Agent): void {
    this.active.get(agent)?.cleanup()
  }

  /** Remove every owned scope during plugin teardown. */
  dispose(): void {
    for (const state of [...this.active.values()]) state.cleanup()
  }
}

/** Build the human command that arms one Agent for its next standard Prompt. */
export function createMedicalCommand(
  currentSettings: () => MedicalSettings,
  coordinator: MedicalTurnCoordinator,
): CommandDefinition {
  return {
    name: 'medical-analyze',
    description: '准备下一条标准消息进行一次结构化医学病例分析',
    recordInput: false,
    handler: ({ agent, rawInput, signal }) => {
      signal.throwIfAborted()
      const settings = currentSettings()
      if (!settings.enabled) {
        return { kind: 'error', text: '医学分析插件当前已关闭，请在设置中启用。' }
      }
      if (coordinator.has(agent)) {
        return { kind: 'error', text: '当前会话已有医学分析正在运行。' }
      }
      const mode = rawInput.trim()
      if (mode !== 'text' && mode !== 'image') {
        return { kind: 'error', text: '医学分析命令参数必须是 text 或 image。' }
      }
      coordinator.arm(agent, mode === 'image')
      return { kind: 'success', text: '医学分析作用域已准备，等待病例消息。' }
    },
  }
}
