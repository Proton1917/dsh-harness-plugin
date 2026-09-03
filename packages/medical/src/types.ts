/** Persisted settings owned by the medical analysis plugin. */
export interface MedicalSettings {
  /** Whether new medical analyses are admitted. */
  enabled: boolean
  /** Provider route kept stable across Medical-mode turns. */
  provider: string
  /** Provider-owned model id kept stable across Medical-mode turns. */
  model: string
  /** Adapter-owned reasoning effort kept stable across Medical-mode turns. */
  reasoningEffort: string
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
