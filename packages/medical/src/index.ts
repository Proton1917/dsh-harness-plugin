import type { Context } from '@deepseek-ai/cordis'
import type z from 'schemastery'
import schema from 'schemastery'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-commands'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-session-title'
import { isMedicalMode, MedicalModeCoordinator } from './mode.ts'
import { createMedicalCommand, MedicalTurnCoordinator } from './turn.ts'
import type { MedicalSettings } from './types.ts'

export { medicalSessionTitle, renderMedicalCaseMessage } from './shared.ts'
export { MEDICAL_SYSTEM_PROMPT } from './prompt.ts'
export { isMedicalMode, MEDICAL_PRESET_ID, medicalRouteConfig, MedicalModeCoordinator } from './mode.ts'
export { createMedicalCommand } from './turn.ts'
export type * from './types.ts'

/** Persisted settings namespace shared by the Host and Client halves. */
export const MEDICAL_SETTINGS_NAMESPACE = 'medical'

/** Default route and disabled-by-default admission policy. */
export const DEFAULT_MEDICAL_SETTINGS: MedicalSettings = Object.freeze({
  enabled: false,
  provider: 'cc-api',
  model: 'claude-fable-5',
  reasoningEffort: 'high',
  armTimeoutMs: 30_000,
})

/** Plugin configuration and user-settings schema. */
export type Config = MedicalSettings

/** Runtime schema for the medical plugin settings. */
export const Config: z<Config> = schema.object({
  enabled: schema.boolean().default(false).description('允许结构化医学分析和医学模式中的新请求'),
  provider: schema.string().default(DEFAULT_MEDICAL_SETTINGS.provider).description('医学分析使用的 LLM provider'),
  model: schema.string().default(DEFAULT_MEDICAL_SETTINGS.model).description('医学分析使用的模型'),
  reasoningEffort: schema.string().default(DEFAULT_MEDICAL_SETTINGS.reasoningEffort).description('医学分析使用的推理强度'),
  armTimeoutMs: schema.number().min(1_000).default(DEFAULT_MEDICAL_SETTINGS.armTimeoutMs).description('命令准备后等待病例 Prompt 的毫秒数'),
})

/** Services required by the Host command and one-turn scope. */
export const inject = ['agents', 'agentPresets', 'commands', 'sessionTitle', 'systemPrompt', 'tools']

/** Register medical settings, structured submissions, and Medical-mode routing. */
export function apply(ctx: Context, config: Config = DEFAULT_MEDICAL_SETTINGS): void {
  const entry: MedicalSettings = Object.freeze({
    enabled: config.enabled ?? DEFAULT_MEDICAL_SETTINGS.enabled,
    provider: config.provider ?? DEFAULT_MEDICAL_SETTINGS.provider,
    model: config.model ?? DEFAULT_MEDICAL_SETTINGS.model,
    reasoningEffort: config.reasoningEffort ?? DEFAULT_MEDICAL_SETTINGS.reasoningEffort,
    armTimeoutMs: config.armTimeoutMs ?? DEFAULT_MEDICAL_SETTINGS.armTimeoutMs,
  })
  let currentSettings = (): MedicalSettings => entry
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.installSection(ctx, MEDICAL_SETTINGS_NAMESPACE, Config, entry, {
      setSource: (current) => { currentSettings = current },
      onChange: () => {},
      validate: (value) => {
        if (value.provider.trim() === '') throw new Error('medical provider must not be empty')
        if (value.model.trim() === '') throw new Error('medical model must not be empty')
        if (value.reasoningEffort.trim() === '') throw new Error('medical reasoningEffort must not be empty')
      },
    })
  })

  const coordinator = new MedicalTurnCoordinator(() => currentSettings())
  const medicalMode = new MedicalModeCoordinator(() => currentSettings(), ctx.sessionTitle)
  ctx.commands.register(createMedicalCommand(() => currentSettings(), coordinator))
  ctx.on('agent/request', ({ agent }, next) => coordinator.routeRequest(agent, next))
  ctx.on('agent/request', ({ agent }, next) => medicalMode.routeRequest(agent, next))
  ctx.on('agent/pre-step', ({ agent, step, messages }, next) => {
    if (step === 1) medicalMode.prepareStep(agent, messages)
    return coordinator.preStep(agent, step, next)
  })
  ctx.on('agent/status', ({ agent, status }) => { coordinator.status(agent, status) })
  ctx.on('agent/created', ({ agent }) => { medicalMode.sync(agent) })
  ctx.on('agent-preset/selected', (sessionId) => {
    const agent = ctx.agents.get(sessionId)
    if (agent === undefined) return
    coordinator.presetSelected(agent)
    medicalMode.sync(agent)
  })
  ctx.on('agent/disposed', ({ agent }) => {
    coordinator.disposeAgent(agent)
    medicalMode.disposeAgent(agent)
  })
  ctx.effect(() => () => {
    coordinator.dispose()
    medicalMode.dispose()
  }, 'medical: active analysis scopes and mode routes')
}
