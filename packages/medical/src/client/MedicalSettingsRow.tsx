import { useState } from 'react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { MedicalSettings } from '../types.ts'
import { MEDICAL_LOCALE_NAMESPACE } from './locales.ts'
import { useMedicalSettings } from './settings.ts'

/** Data and write path injected into the General settings row. */
export interface MedicalSettingsRowInjected {
  settings: SettingsScope<MedicalSettings>
  setEnabled: (enabled: boolean) => Promise<void>
}

/** Full settings-row props. */
export type MedicalSettingsRowProps = PropsRuntime<'settings.general.item'>
  & PropsLocale<typeof MEDICAL_LOCALE_NAMESPACE>
  & MedicalSettingsRowInjected

/** Render the durable medical-plugin enable switch and exact model route. */
export function MedicalSettingsRow({ settings, setEnabled, t }: MedicalSettingsRowProps) {
  const snapshot = useMedicalSettings(settings)
  const [saving, setSaving] = useState(false)
  if (snapshot.status === 'unavailable') return null
  const enabled = snapshot.value?.enabled ?? false
  const route = snapshot.value
  const unavailable = snapshot.status !== 'ready' || !snapshot.writable

  const toggle = (): void => {
    if (saving || unavailable) return
    setSaving(true)
    void setEnabled(!enabled).finally(() => { setSaving(false) })
  }

  return (
    <div className="dsh-medical-settings-row">
      <div className="dsh-medical-settings-copy">
        <div className="dsh-medical-settings-title">{t('settings.title')}</div>
        <div className="dsh-medical-settings-desc">
          {snapshot.status === 'loading' ? t('settings.loading') : t('settings.description')}
        </div>
        {route !== undefined && (
          <div className="dsh-medical-settings-route">
            {t('settings.route', {
              provider: route.provider,
              model: route.model,
              effort: route.reasoningEffort,
            })}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        className="dsh-medical-switch"
        aria-label={enabled ? t('settings.on') : t('settings.off')}
        aria-checked={enabled}
        disabled={saving || unavailable}
        onClick={toggle}
      />
    </div>
  )
}
