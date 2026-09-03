import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { MedicalSettings } from '../types.ts'
import { MedicalClientController, type MedicalClientContext } from './controller.ts'
import { MedicalLauncher } from './MedicalLauncher.tsx'
import { MedicalSettingsRow, type MedicalRouteSettings } from './MedicalSettingsRow.tsx'
import { en, MEDICAL_LOCALE_NAMESPACE, zh } from './locales.ts'
import { installMedicalStyles } from './styles.ts'

export {
  createMedicalSubmitter, medicalPromptContent,
  MedicalClientController,
} from './controller.ts'
export { MedicalLauncher } from './MedicalLauncher.tsx'
export { MedicalSettingsRow } from './MedicalSettingsRow.tsx'
export { MEDICAL_STYLES } from './styles.ts'

/** Client services required by the medical settings and launcher surfaces. */
export const inject = [
  'slots', 'locale', 'settingsScope', 'remote',
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
  const client = ctx as unknown as MedicalClientContext
  const controller = new MedicalClientController(client)
  const injected = () => ({
    settings,
    setEnabled: (enabled: boolean) => settings.set('enabled', enabled),
    setRoute: async (route: MedicalRouteSettings) => {
      await settings.set('provider', route.provider)
      await settings.set('model', route.model)
      await settings.set('reasoningEffort', route.reasoningEffort)
    },
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
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'medical',
    order: 10,
    locale: MEDICAL_LOCALE_NAMESPACE,
    inject: injected,
  }, MedicalLauncher))
}
