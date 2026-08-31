import { useState } from 'react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { MedicalSettings } from '../types.ts'
import { MEDICAL_LOCALE_NAMESPACE } from './locales.ts'
import { useMedicalSettings } from './settings.ts'

/** User-editable model route fields. */
export type MedicalRouteSettings = Pick<MedicalSettings, 'provider' | 'model' | 'reasoningEffort'>

/** Data and write path injected into the General settings row. */
export interface MedicalSettingsRowInjected {
  settings: SettingsScope<MedicalSettings>
  setEnabled: (enabled: boolean) => Promise<void>
  setRoute: (route: MedicalRouteSettings) => Promise<void>
}

/** Full settings-row props. */
export type MedicalSettingsRowProps = PropsRuntime<'settings.general.item'>
  & PropsLocale<typeof MEDICAL_LOCALE_NAMESPACE>
  & MedicalSettingsRowInjected

/** Render the durable medical-plugin enable switch and exact model route. */
export function MedicalSettingsRow({ settings, setEnabled, setRoute, t }: MedicalSettingsRowProps) {
  const snapshot = useMedicalSettings(settings)
  const [saving, setSaving] = useState(false)
  const [routeSaving, setRouteSaving] = useState(false)
  const [draft, setDraft] = useState<MedicalRouteSettings | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  if (snapshot.status === 'unavailable') return null
  const enabled = snapshot.value?.enabled ?? false
  const route = snapshot.value
  const unavailable = snapshot.status !== 'ready' || !snapshot.writable

  const toggle = (): void => {
    if (saving || unavailable) return
    setSaving(true)
    void setEnabled(!enabled).finally(() => { setSaving(false) })
  }

  const editRoute = (): void => {
    if (route === undefined) return
    setRouteError(null)
    setDraft({
      provider: route.provider,
      model: route.model,
      reasoningEffort: route.reasoningEffort,
    })
  }

  const saveRoute = (): void => {
    if (draft === null || routeSaving) return
    const normalized = {
      provider: draft.provider.trim(),
      model: draft.model.trim(),
      reasoningEffort: draft.reasoningEffort.trim(),
    }
    if (normalized.provider === '' || normalized.model === '' || normalized.reasoningEffort === '') {
      setRouteError(t('settings.routeRequired'))
      return
    }
    setRouteSaving(true)
    setRouteError(null)
    void setRoute(normalized).then(
      () => { setDraft(null) },
      () => { setRouteError(t('settings.routeSaveFailed')) },
    ).finally(() => { setRouteSaving(false) })
  }

  return (
    <div className="dsh-medical-settings-row">
      <div className="dsh-medical-settings-copy">
        <div className="dsh-medical-settings-title">{t('settings.title')}</div>
        <div className="dsh-medical-settings-desc">
          {snapshot.status === 'loading' ? t('settings.loading') : t('settings.description')}
        </div>
        {route !== undefined && draft === null && (
          <div className="dsh-medical-settings-route-row">
            <div className="dsh-medical-settings-route">
              {t('settings.route', {
                provider: route.provider,
                model: route.model,
                effort: route.reasoningEffort,
              })}
            </div>
            <button type="button" className="dsh-medical-route-edit" onClick={editRoute}>
              {t('settings.configure')}
            </button>
          </div>
        )}
        {draft !== null && (
          <div className="dsh-medical-route-editor">
            <div className="dsh-medical-route-fields">
              <label>
                <span>{t('settings.provider')}</span>
                <input
                  value={draft.provider}
                  onChange={event => { setDraft({ ...draft, provider: event.target.value }) }}
                />
              </label>
              <label>
                <span>{t('settings.model')}</span>
                <input
                  value={draft.model}
                  onChange={event => { setDraft({ ...draft, model: event.target.value }) }}
                />
              </label>
              <label>
                <span>{t('settings.effort')}</span>
                <input
                  value={draft.reasoningEffort}
                  onChange={event => { setDraft({ ...draft, reasoningEffort: event.target.value }) }}
                />
              </label>
            </div>
            <div className="dsh-medical-route-help">{t('settings.routeHelp')}</div>
            {routeError !== null && <div className="dsh-medical-route-error" role="alert">{routeError}</div>}
            <div className="dsh-medical-route-actions">
              <button
                type="button"
                disabled={routeSaving}
                onClick={() => { setDraft(null); setRouteError(null) }}
              >
                {t('settings.cancel')}
              </button>
              <button type="button" disabled={routeSaving} onClick={saveRoute}>
                {routeSaving ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
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
