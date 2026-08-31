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

/** Wait until the Host-backed scope exposes the route needed by a staged Medical-mode session. */
export function waitForMedicalSettings(
  settings: SettingsScope<MedicalSettings>,
  timeoutMs = 10_000,
): Promise<MedicalSettings> {
  const immediate = settings.getSnapshot()
  if (immediate.value !== undefined) return Promise.resolve(immediate.value)
  if (immediate.status === 'unavailable') return Promise.reject(new Error('医学设置当前不可用。'))
  return new Promise<MedicalSettings>((resolve, reject) => {
    let settled = false
    let stop = (): void => {}
    const finish = (value?: MedicalSettings, error?: Error): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      stop()
      if (value !== undefined) resolve(value)
      else reject(error ?? new Error('等待医学设置超时。'))
    }
    const check = (): void => {
      const snapshot = settings.getSnapshot()
      if (snapshot.value !== undefined) finish(snapshot.value)
      else if (snapshot.status === 'unavailable') finish(undefined, new Error('医学设置当前不可用。'))
    }
    const timeout = setTimeout(() => { finish() }, timeoutMs)
    stop = settings.subscribe(check)
    check()
  })
}
