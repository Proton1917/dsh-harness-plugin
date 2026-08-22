import {
  useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { MedicalAnalysisMode, MedicalCaseInput, MedicalSettings } from '../types.ts'
import { MAX_MEDICAL_IMAGES, MAX_MEDICAL_IMAGE_BYTES } from './controller.ts'
import { MEDICAL_LOCALE_NAMESPACE } from './locales.ts'
import { useMedicalSettings } from './settings.ts'

/** Data and submission path injected into the sidebar launcher. */
export interface MedicalLauncherInjected {
  settings: SettingsScope<MedicalSettings>
  submitCase: (input: MedicalCaseInput, images: readonly File[]) => Promise<void>
}

/** Full launcher props. */
export type MedicalLauncherProps = PropsRuntime<'sidebar.footer.action'>
  & PropsLocale<typeof MEDICAL_LOCALE_NAMESPACE>
  & MedicalLauncherInjected

const EMPTY_CASE: MedicalCaseInput = {
  age: '',
  sex: 'unknown',
  chiefComplaint: '',
  presentIllness: '',
  pastHistory: '',
  medicationHistory: '',
  allergyHistory: '',
  physicalExamination: '',
  auxiliaryExaminations: '',
  riskFactors: '',
  focus: '',
  mode: 'comprehensive',
}

function MedicalMark() {
  return <span className="dsh-medical-mark" aria-hidden>+</span>
}

interface ModeChoice {
  id: MedicalAnalysisMode
  label: Parameters<TranslateNS<typeof MEDICAL_LOCALE_NAMESPACE>>[0]
  description: Parameters<TranslateNS<typeof MEDICAL_LOCALE_NAMESPACE>>[0]
}

const MODES: ModeChoice[] = [
  { id: 'comprehensive', label: 'mode.comprehensive', description: 'mode.comprehensiveDesc' },
  { id: 'first-course', label: 'mode.firstCourse', description: 'mode.firstCourseDesc' },
  { id: 'differential', label: 'mode.differential', description: 'mode.differentialDesc' },
  { id: 'medication', label: 'mode.medication', description: 'mode.medicationDesc' },
]

interface FieldProps {
  label: string
  value: string
  placeholder: string
  wide?: boolean
  multiline?: boolean
  onChange: (value: string) => void
}

function Field({ label, value, placeholder, wide = false, multiline = false, onChange }: FieldProps) {
  const id = useId()
  const input = multiline
    ? (
      <textarea
        id={id}
        className="dsh-medical-textarea"
        value={value}
        placeholder={placeholder}
        maxLength={50_000}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { onChange(event.target.value) }}
      />
    )
    : (
      <input
        id={id}
        className="dsh-medical-input"
        value={value}
        placeholder={placeholder}
        maxLength={20_000}
        onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange(event.target.value) }}
      />
    )
  return (
    <div className={`dsh-medical-field${wide ? ' dsh-medical-field-wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {input}
    </div>
  )
}

interface MedicalDialogProps {
  settings: MedicalSettings | undefined
  enabled: boolean
  close: () => void
  submitCase: (input: MedicalCaseInput, images: readonly File[]) => Promise<void>
  t: TranslateNS<typeof MEDICAL_LOCALE_NAMESPACE>
}

function MedicalDialog({ settings, enabled, close, submitCase, t }: MedicalDialogProps) {
  const titleId = useId()
  const sexId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [input, setInput] = useState<MedicalCaseInput>(EMPTY_CASE)
  const [images, setImages] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !submitting) close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [close, submitting])

  const change = <Key extends keyof MedicalCaseInput>(key: Key, value: MedicalCaseInput[Key]): void => {
    setInput(current => ({ ...current, [key]: value }))
    if (error !== null) setError(null)
  }

  const onBackdrop = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget && !submitting) close()
  }

  const submit = (event: FormEvent): void => {
    event.preventDefault()
    if (input.chiefComplaint.trim() === '' || input.presentIllness.trim() === '') {
      setError(t('validation.required'))
      return
    }
    setSubmitting(true)
    setError(null)
    void submitCase(input, images).then(
      () => { close() },
      (reason: unknown) => {
        setSubmitting(false)
        setError(reason instanceof Error ? reason.message : String(reason))
      },
    )
  }

  const addImages = (files: FileList | null): void => {
    if (files === null) return
    const next = [...images]
    for (const file of Array.from(files)) {
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
        setError(`不支持的图片格式：${file.type || file.name}`)
        continue
      }
      if (file.size > MAX_MEDICAL_IMAGE_BYTES) {
        setError(`图片“${file.name}”超过 10 MiB。`)
        continue
      }
      if (next.length >= MAX_MEDICAL_IMAGES) {
        setError(`每个病例最多上传 ${MAX_MEDICAL_IMAGES} 张图片。`)
        break
      }
      next.push(file)
    }
    setImages(next)
  }

  return createPortal(
    <div className="dsh-medical-overlay" onMouseDown={onBackdrop}>
      <form
        className="dsh-medical-desk"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
      >
        <header className="dsh-medical-header">
          <div>
            <div className="dsh-medical-eyebrow">{t('dialog.eyebrow')}</div>
            <h2 className="dsh-medical-heading" id={titleId}>{t('dialog.title')}</h2>
            <div className="dsh-medical-subtitle">{t('dialog.subtitle')}</div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="dsh-medical-close"
            aria-label={t('dialog.close')}
            disabled={submitting}
            onClick={close}
          >
            ×
          </button>
        </header>

        <div className="dsh-medical-body">
          {!enabled ? (
            <div className="dsh-medical-disabled">
              <h3>{t('dialog.disabledTitle')}</h3>
              <p>{t('dialog.disabledBody')}</p>
            </div>
          ) : (
            <>
              <div className="dsh-medical-privacy">
                <span className="dsh-medical-privacy-index">PHI</span>
                <div>
                  <strong>{t('privacy.title')}</strong>
                  <p>{t('privacy.body')}</p>
                </div>
              </div>
              <div className="dsh-medical-route-strip">
                {settings !== undefined && (
                  <span className="dsh-medical-pill">
                    {settings.provider} / {settings.model} / {settings.reasoningEffort}
                  </span>
                )}
                <span className="dsh-medical-pill">{t('route.internal')}</span>
                <span className="dsh-medical-pill">{t('route.single')}</span>
              </div>

              <section className="dsh-medical-section">
                <div className="dsh-medical-section-title">{t('section.identity')}</div>
                <div className="dsh-medical-grid">
                  <Field
                    label={t('field.age')}
                    value={input.age}
                    placeholder={t('field.agePlaceholder')}
                    onChange={value => { change('age', value) }}
                  />
                  <div className="dsh-medical-field">
                    <label htmlFor={sexId}>{t('field.sex')}</label>
                    <select
                      id={sexId}
                      className="dsh-medical-select"
                      value={input.sex}
                      onChange={(event) => { change('sex', event.target.value as MedicalCaseInput['sex']) }}
                    >
                      <option value="unknown">{t('sex.unknown')}</option>
                      <option value="female">{t('sex.female')}</option>
                      <option value="male">{t('sex.male')}</option>
                      <option value="other">{t('sex.other')}</option>
                    </select>
                  </div>
                  <Field
                    wide
                    label={t('field.chiefComplaint')}
                    value={input.chiefComplaint}
                    placeholder={t('field.chiefComplaintPlaceholder')}
                    onChange={value => { change('chiefComplaint', value) }}
                  />
                </div>
              </section>

              <section className="dsh-medical-section">
                <div className="dsh-medical-section-title">{t('section.history')}</div>
                <div className="dsh-medical-grid">
                  <Field wide multiline label={t('field.presentIllness')} value={input.presentIllness} placeholder={t('field.presentIllnessPlaceholder')} onChange={value => { change('presentIllness', value) }} />
                  <Field multiline label={t('field.pastHistory')} value={input.pastHistory} placeholder={t('field.pastHistoryPlaceholder')} onChange={value => { change('pastHistory', value) }} />
                  <Field multiline label={t('field.medication')} value={input.medicationHistory} placeholder={t('field.medicationPlaceholder')} onChange={value => { change('medicationHistory', value) }} />
                  <Field wide multiline label={t('field.allergy')} value={input.allergyHistory} placeholder={t('field.allergyPlaceholder')} onChange={value => { change('allergyHistory', value) }} />
                </div>
              </section>

              <section className="dsh-medical-section">
                <div className="dsh-medical-section-title">{t('section.evidence')}</div>
                <div className="dsh-medical-grid">
                  <Field multiline label={t('field.exam')} value={input.physicalExamination} placeholder={t('field.examPlaceholder')} onChange={value => { change('physicalExamination', value) }} />
                  <Field multiline label={t('field.tests')} value={input.auxiliaryExaminations} placeholder={t('field.testsPlaceholder')} onChange={value => { change('auxiliaryExaminations', value) }} />
                  <Field wide multiline label={t('field.risk')} value={input.riskFactors} placeholder={t('field.riskPlaceholder')} onChange={value => { change('riskFactors', value) }} />
                </div>
              </section>

              <section className="dsh-medical-section">
                <div className="dsh-medical-section-title">{t('images.title')}</div>
                <div className="dsh-medical-upload">
                  <label className="dsh-medical-upload-button">
                    <span aria-hidden>＋</span>
                    {t('images.add')}
                    <input
                      type="file"
                      aria-label={t('images.add')}
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      multiple
                      onChange={(event) => {
                        addImages(event.target.files)
                        event.target.value = ''
                      }}
                    />
                  </label>
                  <div className="dsh-medical-upload-hint">{t('images.hint')}</div>
                </div>
                {images.length > 0 && (
                  <div className="dsh-medical-image-list">
                    {images.map((file, index) => (
                      <div className="dsh-medical-image-chip" key={`${file.name}:${file.size}:${index}`}>
                        <span>{file.name || `image-${index + 1}`}</span>
                        <button
                          type="button"
                          aria-label={t('images.remove', { name: file.name || String(index + 1) })}
                          onClick={() => { setImages(current => current.filter((_, at) => at !== index)) }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="dsh-medical-section">
                <div className="dsh-medical-section-title">{t('section.intent')}</div>
                <div className="dsh-medical-modes">
                  {MODES.map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      className="dsh-medical-mode"
                      aria-pressed={input.mode === mode.id}
                      onClick={() => { change('mode', mode.id) }}
                    >
                      <strong>{t(mode.label)}</strong>
                      <span>{t(mode.description)}</span>
                    </button>
                  ))}
                </div>
                <div className="dsh-medical-grid" style={{ marginTop: 14 }}>
                  <Field wide multiline label={t('field.focus')} value={input.focus} placeholder={t('field.focusPlaceholder')} onChange={value => { change('focus', value) }} />
                </div>
              </section>
              {error !== null && <div className="dsh-medical-error" role="alert">{error}</div>}
            </>
          )}
        </div>

        <footer className="dsh-medical-footer">
          <div className="dsh-medical-footer-copy">{enabled ? t('submit.note') : t('dialog.disabledBody')}</div>
          {enabled && (
            <button type="submit" className="dsh-medical-submit" disabled={submitting}>
              {submitting ? t('submit.busy') : t('submit.idle')}
            </button>
          )}
          <div className="dsh-medical-disclaimer">{t('disclaimer')}</div>
        </footer>
      </form>
    </div>,
    document.body,
  )
}

/** Render the root-scoped launcher and its portal-owned case desk. */
export function MedicalLauncher({ wide, settings, submitCase, t }: MedicalLauncherProps) {
  const snapshot = useMedicalSettings(settings)
  const [open, setOpen] = useState(false)
  const enabled = snapshot.value?.enabled ?? false
  return (
    <>
      <button
        type="button"
        className="dsh-medical-footer-button"
        aria-label={t('launcher.aria')}
        aria-expanded={open}
        onClick={() => { setOpen(true) }}
      >
        <MedicalMark />
        {wide && <span>{t('launcher.label')}</span>}
      </button>
      {open && (
        <MedicalDialog
          settings={snapshot.value}
          enabled={enabled}
          close={() => { setOpen(false) }}
          submitCase={submitCase}
          t={t}
        />
      )}
    </>
  )
}
