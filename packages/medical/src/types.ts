/** Persisted settings owned by the medical analysis plugin. */
export interface MedicalSettings {
  /** Whether new medical analyses are admitted. */
  enabled: boolean
  /** Provider route used for the one medical model request. */
  provider: string
  /** Provider-owned model id used for the one medical model request. */
  model: string
  /** Adapter-owned reasoning effort used for the one medical model request. */
  reasoningEffort: string
  /** Maximum delay between command admission and the standard Prompt. */
  armTimeoutMs: number
}

/** Analysis emphasis selected by the case form. */
export type MedicalAnalysisMode = 'comprehensive' | 'first-course' | 'differential' | 'medication'

/** De-identified case material submitted by the medical panel. */
export interface MedicalCaseInput {
  age: string
  sex: 'female' | 'male' | 'other' | 'unknown'
  chiefComplaint: string
  presentIllness: string
  pastHistory: string
  medicationHistory: string
  allergyHistory: string
  physicalExamination: string
  auxiliaryExaminations: string
  riskFactors: string
  focus: string
  mode: MedicalAnalysisMode
}
