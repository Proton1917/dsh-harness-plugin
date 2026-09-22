import { useSyncExternalStore } from 'react'
import type { ConfigForm, ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { MedicalSettings } from '../types.ts'

/** Subscribe to one Host-backed medical settings scope. */
export function useMedicalSettings(
  settings: ConfigForm<MedicalSettings>,
): ConfigFormSnapshot<MedicalSettings> {
  return useSyncExternalStore(
    listener => settings.subscribe(listener),
    () => settings.getSnapshot(),
    () => settings.getSnapshot(),
  )
}
