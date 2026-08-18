import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type { MedicalSettings } from '../types.ts'
import { medicalModelSelection, MedicalClientController, type MedicalClientContext } from './controller.ts'
import { MedicalLauncher } from './MedicalLauncher.tsx'
import { MedicalSettingsRow } from './MedicalSettingsRow.tsx'
import { en, MEDICAL_LOCALE_NAMESPACE, zh } from './locales.ts'
import { installMedicalStyles } from './styles.ts'

export {
  createMedicalSubmitter, medicalCommandLine, medicalModelSelection, medicalPromptContent,
  MedicalClientController,
} from './controller.ts'
export { MedicalLauncher } from './MedicalLauncher.tsx'
export { MedicalSettingsRow } from './MedicalSettingsRow.tsx'
export { MEDICAL_STYLES } from './styles.ts'

/** Client services required by the medical settings and launcher surfaces. */
export const inject = [
  'slots', 'locale', 'settingsScope', 'connection', 'modelDirectories', 'remote', 'remote.commands',
  'sessions', 'workspaces',
]

/** Install the medical settings row, sidebar launcher, and case desk. */
export function apply(ctx: ClientContext): void {
  installMedicalStyles(ctx)
  ctx.effect(
    () => ctx.locale.register(MEDICAL_LOCALE_NAMESPACE, { zh, en }),
    'medical: dictionaries',
  )
  const settings = ctx.settingsScope.bind<MedicalSettings>({ namespace: 'medical' })
  const controller = new MedicalClientController(ctx as unknown as MedicalClientContext)
  const injected = () => ({
    settings,
    setEnabled: (enabled: boolean) => settings.set('enabled', enabled),
    submitCase: async (
      input: Parameters<MedicalClientController['submitCase']>[0],
      images: Parameters<MedicalClientController['submitCase']>[1],
    ) => {
      await controller.submitCase(input, images)
    },
  })

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'medical',
    order: 10,
    locale: MEDICAL_LOCALE_NAMESPACE,
    inject: injected,
  }, MedicalSettingsRow))
  ctx.effect(() => ctx.remote.$on('agent-preset/selected', (sessionId, agentPreset) => {
    if (agentPreset !== 'medical') return
    const value = settings.getSnapshot().value
    if (value === undefined) return
    void Promise.resolve()
      .then(() => ctx.modelDirectories.directoryFor(sessionId).select(medicalModelSelection(value)))
      .catch(() => { /* ModelDirectory owns the visible selection error. */ })
  }), 'medical: Medical-mode model selection echo')
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'medical',
    order: 10,
    locale: MEDICAL_LOCALE_NAMESPACE,
    inject: injected,
  }, MedicalLauncher))
}
