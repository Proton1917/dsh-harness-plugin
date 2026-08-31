import type { SessionFace } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import { describe, expect, it, vi } from 'vitest'
import {
  createMedicalSubmitter, medicalCommandLine, medicalModelSelection, medicalPromptContent,
} from '../src/client/controller.ts'
import type { MedicalCaseInput } from '../src/types.ts'

const input: MedicalCaseInput = {
  age: '45',
  sex: 'female',
  chiefComplaint: '发热伴咳嗽 5 天',
  presentIllness: '最高体温 39℃',
  pastHistory: '',
  medicationHistory: '',
  allergyHistory: '',
  physicalExamination: '',
  auxiliaryExaminations: '',
  riskFactors: '',
  focus: '',
  mode: 'differential',
}

describe('medical Client submission', () => {
  it('projects the persisted route into the official model-selection value', () => {
    expect(medicalModelSelection({
      enabled: true,
      provider: 'cc-api',
      model: 'claude-fable-5',
      reasoningEffort: 'high',
      armTimeoutMs: 30_000,
    })).toEqual({ provider: 'cc-api', model: 'claude-fable-5', reasoningEffort: 'high' })
  })

  it('creates, arms, titles, prompts, and opens one fresh session in order', async () => {
    const order: string[] = []
    const createSession = vi.fn(async () => { order.push('create') })
    const rename = vi.fn(async () => {
      order.push('rename')
      return { ok: true as const, value: { title: '医学病例', seq: 1 } }
    })
    const prompt = vi.fn(async () => {
      order.push('prompt')
      return { ok: true as const, value: { accepted: true as const } }
    })
    const session = { rename, prompt } as unknown as SessionFace
    const submit = createMedicalSubmitter({
      createSession,
      waitForSession: async () => {
        order.push('wait')
        return session
      },
      openSession: () => { order.push('open') },
      armSession: async () => { order.push('arm') },
    })
    const id = await submit(input, [], 'workspace-1' as WorkspaceId)
    expect(typeof id).toBe('string')
    expect(order).toEqual(['create', 'wait', 'arm', 'rename', 'prompt', 'open'])
    expect(createSession).toHaveBeenCalledWith(expect.any(String), 'workspace-1', 'standard')
    expect(rename).toHaveBeenCalledWith('医学病例 · 发热伴咳嗽 5 天')
    expect(prompt.mock.calls[0]?.[0][0]).toMatchObject({
      type: 'text', text: expect.stringContaining('# 医学病例分析请求'),
    })
    expect(prompt).toHaveBeenCalledWith(expect.any(Array), 'queue')
  })

  it('does not open or prompt an admitted session whose deterministic rename failed', async () => {
    const openSession = vi.fn()
    const prompt = vi.fn()
    const armSession = vi.fn()
    const session = {
      rename: vi.fn(async () => ({
        ok: false as const,
        error: { code: 'title-invalid', message: 'invalid title', details: {} },
      })),
      prompt,
    } as unknown as SessionFace
    const submit = createMedicalSubmitter({
      createSession: async (_sessionId: SessionId) => {},
      waitForSession: async () => session,
      openSession,
      armSession,
    })
    await expect(submit(input, [])).rejects.toThrow('会话命名失败')
    expect(openSession).not.toHaveBeenCalled()
    expect(armSession).toHaveBeenCalledOnce()
    expect(prompt).not.toHaveBeenCalled()
  })

  it('does not rename, open, or prompt a session whose medical admission failed', async () => {
    const rename = vi.fn()
    const openSession = vi.fn()
    const prompt = vi.fn()
    const session = { rename, prompt } as unknown as SessionFace
    const submit = createMedicalSubmitter({
      createSession: async (_sessionId: SessionId) => {},
      waitForSession: async () => session,
      openSession,
      armSession: async () => { throw new Error('admission failed') },
    })
    await expect(submit(input, [])).rejects.toThrow('admission failed')
    expect(rename).not.toHaveBeenCalled()
    expect(openSession).not.toHaveBeenCalled()
    expect(prompt).not.toHaveBeenCalled()
  })

  it('does not open a session whose medical Prompt was rejected', async () => {
    const openSession = vi.fn()
    const session = {
      rename: vi.fn(async () => ({ ok: true as const, value: { title: '医学病例', seq: 1 } })),
      prompt: vi.fn(async () => ({
        ok: false as const,
        error: { code: 'prompt-rejected', message: 'rejected', details: {} },
      })),
    } as unknown as SessionFace
    const submit = createMedicalSubmitter({
      createSession: async (_sessionId: SessionId) => {},
      waitForSession: async () => session,
      openSession,
      armSession: async () => {},
    })
    await expect(submit(input, [])).rejects.toThrow('病例提交失败')
    expect(openSession).not.toHaveBeenCalled()
  })

  it('serializes supported images beside the case text', async () => {
    const image = {
      name: 'ecg.png',
      type: 'image/png',
      size: 4,
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
    } as File
    const content = await medicalPromptContent(input, [image])
    expect(content).toHaveLength(2)
    expect(content[0]).toMatchObject({ type: 'text' })
    expect(content[1]).toMatchObject({
      type: 'image', mediaType: 'image/png', name: 'ecg.png', data: 'AQIDBA==',
    })
    expect(medicalCommandLine(false)).toBe('/medical-analyze text')
    expect(medicalCommandLine(true)).toBe('/medical-analyze image')
  })
})
