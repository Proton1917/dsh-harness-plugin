import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
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
import { waitForMedicalSettings } from './settings.ts'
import { installMedicalStyles } from './styles.ts'

export {
  createMedicalSubmitter, medicalCommandLine, medicalModelSelection, medicalPromptContent,
  MedicalClientController,
} from './controller.ts'
export { MedicalLauncher } from './MedicalLauncher.tsx'
export { MedicalSettingsRow } from './MedicalSettingsRow.tsx'
export { waitForMedicalSettings } from './settings.ts'
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
  const client = ctx as unknown as MedicalClientContext
  const controller = new MedicalClientController(client)
  const connection = ctx.get('connection') as ConnectionHandle
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
  ctx.effect(() => {
    const active = new Set<SessionId>()
    const sync = (): void => {
      const snapshot = client.sessions.list.getSnapshot()
      for (const sessionId of [...active]) {
        if (snapshot.byId[sessionId]?.agentPreset !== 'medical') active.delete(sessionId)
      }
      for (const sessionId of snapshot.ids) {
        if (snapshot.byId[sessionId]?.agentPreset !== 'medical' || active.has(sessionId)) continue
        active.add(sessionId)
        void waitForMedicalSettings(settings).then(async (value) => {
          const selection = medicalModelSelection(value)
          const response = await connection.api.sessions.selectModel({ sessionId, ...selection })
          if (!response.result.ok) throw new Error(response.result.error.message)
          await ctx.modelDirectories.directoryFor(sessionId).load()
        }).catch(() => {
          // A later session-list or settings update retries the official selection path.
          active.delete(sessionId)
        })
      }
    }
    const stopList = client.sessions.list.subscribe(sync)
    const stopSettings = ctx.remote.$on('settings/document-updated', (namespace) => {
      if (namespace !== 'medical') return
      active.clear()
      sync()
    })
    sync()
    return () => {
      stopSettings()
      stopList()
      active.clear()
    }
  }, 'medical: Medical-mode model selection echo')
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'medical',
    order: 10,
    locale: MEDICAL_LOCALE_NAMESPACE,
    inject: injected,
  }, MedicalLauncher))
}
