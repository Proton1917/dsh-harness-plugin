import type { SessionFace } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import { describe, expect, it, vi } from 'vitest'
import {
  createMedicalSubmitter, medicalPromptContent, MedicalClientController, type MedicalClientContext,
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
  it('creates, titles, prompts, and opens one fresh Medical session in order', async () => {
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
      withSession: async (_id, operation) => {
        order.push('retain')
        try { await operation(session) } finally { order.push('release') }
      },
      openSession: () => { order.push('open') },
    })
    const id = await submit(input, [], 'workspace-1' as WorkspaceId)
    expect(typeof id).toBe('string')
    expect(order).toEqual(['create', 'retain', 'rename', 'prompt', 'open', 'release'])
    expect(createSession).toHaveBeenCalledWith(expect.any(String), 'workspace-1', 'medical')
    expect(rename).toHaveBeenCalledWith('医学病例 · 发热伴咳嗽 5 天')
    expect(prompt.mock.calls[0]?.[0][0]).toMatchObject({
      type: 'text', text: expect.stringContaining('# 医学病例分析请求'),
    })
    expect(prompt).toHaveBeenCalledWith(expect.any(Array), 'queue')
  })

  it('does not open or prompt an admitted session whose deterministic rename failed', async () => {
    const openSession = vi.fn()
    const prompt = vi.fn()
    const session = {
      rename: vi.fn(async () => ({
        ok: false as const,
        error: { code: 'title-invalid', message: 'invalid title', details: {} },
      })),
      prompt,
    } as unknown as SessionFace
    const submit = createMedicalSubmitter({
      createSession: async (_sessionId: SessionId) => {},
      withSession: async (_id, operation) => { await operation(session) },
      openSession,
    })
    await expect(submit(input, [])).rejects.toThrow('会话命名失败')
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
      withSession: async (_id, operation) => { await operation(session) },
      openSession,
    })
    await expect(submit(input, [])).rejects.toThrow('病例提交失败')
    expect(openSession).not.toHaveBeenCalled()
  })

  it.each(['ready', 'rename', 'prompt', 'success'])('releases the cold Session reference after %s', async stage => {
    const order: string[] = []
    const ok = { ok: true as const, value: {} }
    const failure = { ok: false as const, error: { message: 'rejected' } }
    const session = {
      rename: vi.fn(async () => { order.push('rename'); return stage === 'rename' ? failure : ok }),
      prompt: vi.fn(async () => { order.push('prompt'); return stage === 'prompt' ? failure : ok }),
    }
    const current = 'selected-session' as SessionId
    const create = vi.fn(async () => ({ ok: true, value: {} }))
    const ctx = {
      remote: { session: { create } },
      sessions: {
        list: { getSnapshot: () => ({ byId: { [current]: { id: current, retainedBy: { mainView: 1 } } } }) },
        using: async (_id: SessionId, options: unknown, operation: (reference: unknown) => Promise<void>) => {
          expect(options).toEqual({ source: 'controllerOperation' })
          order.push('retain')
          try {
            await operation({ ready: stage === 'ready' ? Promise.reject(new Error('history unavailable')) : Promise.resolve({ session }) })
          } finally { order.push('release') }
        },
      },
      workspaces: { list: { getSnapshot: () => ({ items: [{ workspaceId: 'workspace-1', sessionIds: [current] }] }) } },
      uiWorkspace: { openSession: vi.fn(() => { order.push('open') }) },
    } as unknown as MedicalClientContext
    const submission = new MedicalClientController(ctx).submitCase(input, [])
    if (stage === 'success') await submission
    else await expect(submission).rejects.toThrow()
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 'workspace-1', agentPreset: 'medical' }))
    expect(order[0]).toBe('retain')
    expect(order.at(-1)).toBe('release')
    expect(ctx.uiWorkspace.openSession).toHaveBeenCalledTimes(stage === 'success' ? 1 : 0)
    expect(session.prompt).toHaveBeenCalledTimes(stage === 'success' || stage === 'prompt' ? 1 : 0)
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
  })
})
