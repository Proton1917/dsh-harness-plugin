import type { Context, Volatile } from '@deepseek-ai/cordis'
import schema from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-session-title'
import { isMedicalMode, MedicalModeCoordinator } from './mode.ts'
import type { MedicalSettings } from './types.ts'

export { medicalSessionTitle, renderMedicalCaseMessage } from './shared.ts'
export { MEDICAL_SYSTEM_PROMPT } from './prompt.ts'
export { isMedicalMode, MEDICAL_PRESET_ID, medicalRouteConfig, MedicalModeCoordinator } from './mode.ts'
export type * from './types.ts'

/** Persisted settings namespace shared by the Host and Client halves. */
export const MEDICAL_SETTINGS_NAMESPACE = 'medical'

/** Default route and disabled-by-default admission policy. */
export const DEFAULT_MEDICAL_SETTINGS: MedicalSettings = Object.freeze({
  enabled: false,
  provider: 'anthropic',
  model: 'anthropic/claude-fable-5.1',
  reasoningEffort: 'high',
})

/** Plugin configuration and user-settings schema. */
export type Config = { [K in keyof MedicalSettings]: Volatile<MedicalSettings[K]> }

/** Runtime schema for the medical plugin settings. */
export const Config = schema.object({
  enabled: schema.boolean().default(false).volatile().description('允许结构化医学分析和医学模式中的新请求'),
  provider: schema.string().pattern(/\S/).default(DEFAULT_MEDICAL_SETTINGS.provider).volatile().description('医学分析使用的 LLM provider'),
  model: schema.string().pattern(/\S/).default(DEFAULT_MEDICAL_SETTINGS.model).volatile().description('医学分析使用的模型'),
  reasoningEffort: schema.string().pattern(/\S/).default(DEFAULT_MEDICAL_SETTINGS.reasoningEffort).volatile().description('医学分析使用的推理强度'),
})

/** Services required by persistent Medical-mode routing. */
export const inject = ['agents', 'agentPresets', 'sessionTitle']

/** Register medical settings and persistent Medical-mode routing. */
export function apply(ctx: Context, config: Config): void {
  const currentSettings = (): MedicalSettings => ({
    enabled: config.enabled.get(),
    provider: config.provider.get(),
    model: config.model.get(),
    reasoningEffort: config.reasoningEffort.get(),
  })
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })

  const medicalMode = new MedicalModeCoordinator(
    () => currentSettings(),
    ctx.agentPresets,
    ctx.sessionTitle,
  )
  ctx.on('agent/request', ({ agent }, next) => medicalMode.routeRequest(agent, next))
  ctx.on('agent/pre-step', ({ agent, step, messages }, next) => {
    if (step === 1) medicalMode.prepareStep(agent, messages)
    return next()
  })
  ctx.on('agent/created', ({ agent }) => {
    medicalMode.sync(agent)
    return undefined
  })
  ctx.on('agent-preset/selected', (sessionId) => {
    const agent = ctx.agents.get(sessionId)
    if (agent === undefined) return
    medicalMode.sync(agent)
  })
  ctx.on('agent/disposed', ({ agent }) => {
    medicalMode.disposeAgent(agent)
  })
  ctx.effect(() => () => {
    medicalMode.dispose()
  }, 'medical: persistent mode routes')
}
