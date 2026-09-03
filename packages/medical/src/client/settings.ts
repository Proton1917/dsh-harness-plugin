import { useSyncExternalStore } from 'react'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { MedicalSettings } from '../types.ts'

/** Subscribe to one Host-backed medical settings scope. */
export function useMedicalSettings(
  settings: SettingsScope<MedicalSettings>,
): SettingsScopeSnapshot<MedicalSettings> {
  return useSyncExternalStore(
    listener => settings.subscribe(listener),
    () => settings.getSnapshot(),
    () => settings.getSnapshot(),
  )
}
