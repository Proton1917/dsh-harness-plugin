import { describe, expect, it } from 'vitest'
import { medicalSessionTitle, renderMedicalCaseMessage } from '../src/shared.ts'
import { MEDICAL_SYSTEM_PROMPT } from '../src/prompt.ts'
import type { MedicalCaseInput } from '../src/types.ts'

const structuredCase: MedicalCaseInput = {
  age: ' 67 ',
  sex: 'male',
  chiefComplaint: ' 胸痛 3 天 ',
  presentIllness: ' 活动后加重，休息后缓解。 ',
  pastHistory: '',
  medicationHistory: '阿司匹林',
  allergyHistory: '',
  physicalExamination: 'BP 150/90 mmHg',
  auxiliaryExaminations: '心电图待完善',
  riskFactors: '吸烟 30 年',
  focus: '评估急性冠脉综合征可能性',
  mode: 'first-course',
}

describe('medical case contract', () => {
  it('renders a structured case and marks missing values without invention', () => {
    const message = renderMedicalCaseMessage(structuredCase)
    expect(message).toContain('分析侧重点：按首次病程规范')
    expect(message).toContain('## 主诉\n胸痛 3 天')
    expect(message).toContain('## 既往史\n未提供/待补充')
    expect(message).toContain('## 基本资料\n67岁，男')
  })

  it('produces a stable short title without another model request', () => {
    expect(medicalSessionTitle('  反复   胸痛 3 天  ')).toBe('医学病例 · 反复 胸痛 3 天')
    expect([...medicalSessionTitle('一二三四五六七八九十一二三四五六七八九')].length)
      .toBeLessThanOrEqual(23)
  })

  it('pins raw-data, safety, no-tools, evidence, and citation boundaries', () => {
    expect(MEDICAL_SYSTEM_PROMPT).toContain('红旗征象')
    expect(MEDICAL_SYSTEM_PROMPT).toContain('未整理的原始资料')
    expect(MEDICAL_SYSTEM_PROMPT).toContain('相互矛盾的描述')
    expect(MEDICAL_SYSTEM_PROMPT).toContain('当前请求不提供联网检索或外部工具')
    expect(MEDICAL_SYSTEM_PROMPT).toContain('不得编造 PMID、DOI')
    expect(MEDICAL_SYSTEM_PROMPT).toContain('不展示隐藏推理过程')
  })
})
