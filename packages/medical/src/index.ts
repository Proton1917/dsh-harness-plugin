import type { Context } from '@deepseek-ai/cordis'
import type z from 'schemastery'
import schema from 'schemastery'
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
export type Config = MedicalSettings

/** Runtime schema for the medical plugin settings. */
export const Config: z<Config> = schema.object({
  enabled: schema.boolean().default(false).description('允许结构化医学分析和医学模式中的新请求'),
  provider: schema.string().default(DEFAULT_MEDICAL_SETTINGS.provider).description('医学分析使用的 LLM provider'),
  model: schema.string().default(DEFAULT_MEDICAL_SETTINGS.model).description('医学分析使用的模型'),
  reasoningEffort: schema.string().default(DEFAULT_MEDICAL_SETTINGS.reasoningEffort).description('医学分析使用的推理强度'),
})

/** Services required by persistent Medical-mode routing. */
export const inject = ['agents', 'agentPresets', 'sessionTitle']

/** Register medical settings and persistent Medical-mode routing. */
export function apply(ctx: Context, config: Config = DEFAULT_MEDICAL_SETTINGS): void {
  const entry: MedicalSettings = Object.freeze({
    enabled: config.enabled ?? DEFAULT_MEDICAL_SETTINGS.enabled,
    provider: config.provider ?? DEFAULT_MEDICAL_SETTINGS.provider,
    model: config.model ?? DEFAULT_MEDICAL_SETTINGS.model,
    reasoningEffort: config.reasoningEffort ?? DEFAULT_MEDICAL_SETTINGS.reasoningEffort,
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
  ctx.on('agent/created', ({ agent }) => { medicalMode.sync(agent) })
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
