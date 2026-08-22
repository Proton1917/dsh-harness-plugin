import type { MedicalCaseInput } from './types.ts'

/** Build a deterministic, byte-bounded title without another model request. */
export function medicalSessionTitle(source: string): string {
  const normalized = source.replace(/\s+/gu, ' ').trim()
  const excerpt = [...normalized].slice(0, 16).join('')
  return excerpt === '' ? '医学病例分析' : `医学病例 · ${excerpt}`
}

const SEX_LABEL: Record<MedicalCaseInput['sex'], string> = {
  female: '女',
  male: '男',
  other: '其他',
  unknown: '未提供',
}

const MODE_INSTRUCTION: Record<MedicalCaseInput['mode'], string> = {
  comprehensive: '完成综合临床分析，兼顾诊断、鉴别、风险分层和诊疗计划。',
  'first-course': '按首次病程规范重点完成初步诊断、逐项诊断依据、第一诊断的高质量鉴别和诊疗计划。',
  differential: '重点构建有排序的鉴别诊断，并逐项给出支持证据、反对证据和下一步区分检查。',
  medication: '重点审查现用药、适应证、潜在禁忌、相互作用、监测指标和调整原则。',
}

function field(label: string, value: string): string {
  const normalized = value.trim()
  return `## ${label}\n${normalized === '' ? '未提供/待补充' : normalized}`
}

/** Render one Client-owned case as the text block of the standard Prompt. */
export function renderMedicalCaseMessage(input: MedicalCaseInput): string {
  const demographics = [
    input.age.trim() === '' ? '年龄未提供' : `${input.age.trim()}岁`,
    SEX_LABEL[input.sex],
  ].join('，')
  return [
    '# 医学病例分析请求',
    `分析侧重点：${MODE_INSTRUCTION[input.mode]}`,
    '病例资料已经过去标识化处理；下列未提供内容必须明确标记为待补充，不得臆造。',
    field('基本资料', demographics),
    field('主诉', input.chiefComplaint),
    field('现病史', input.presentIllness),
    field('既往史', input.pastHistory),
    field('现用药', input.medicationHistory),
    field('过敏史', input.allergyHistory),
    field('体格检查', input.physicalExamination),
    field('辅助检查', input.auxiliaryExaminations),
    field('危险因素与相关史', input.riskFactors),
    field('用户特别关注', input.focus),
  ].join('\n\n')
}
