import type {
  ClientContext, ISessions, IWorkspaces, SessionFace, SessionId, WorkspaceId,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle, ModelSelection, PromptContentPart } from '@deepseek-ai/dsh-api-remotes/client'
import { medicalSessionTitle, renderMedicalCaseMessage } from '../shared.ts'
import type { MedicalCaseInput, MedicalSettings } from '../types.ts'

/** Browser compiler face for services whose Host and Client names intentionally coincide. */
export type MedicalClientContext = Omit<ClientContext, 'sessions' | 'workspaces'> & {
  sessions: ISessions
  workspaces: IWorkspaces
}

/** Dependencies of the deterministic create → arm → rename → prompt → open sequence. */
export interface MedicalSubmitDependencies {
  createSession: (
    sessionId: SessionId,
    workspaceId: WorkspaceId | undefined,
    agentPreset: string,
  ) => Promise<void>
  waitForSession: (sessionId: SessionId) => Promise<SessionFace>
  openSession: (sessionId: SessionId) => void
  armSession: (sessionId: SessionId, hasImages: boolean) => Promise<void>
}

/** Human command used only to arm the target Agent; case data stays out of command records. */
export function medicalCommandLine(hasImages: boolean): string {
  return `/medical-analyze ${hasImages ? 'image' : 'text'}`
}

/** Maximum images accepted in one case submission. */
export const MAX_MEDICAL_IMAGES = 8

/** Maximum bytes accepted for one browser image before upload. */
export const MAX_MEDICAL_IMAGE_BYTES = 10 * 1024 * 1024

/** Project persisted medical settings into the official session model-selection value. */
export function medicalModelSelection(settings: MedicalSettings): ModelSelection {
  return {
    provider: settings.provider,
    model: settings.model,
    reasoningEffort: settings.reasoningEffort as NonNullable<ModelSelection['reasoningEffort']>,
  }
}

const MEDICAL_IMAGE_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
type MedicalImageMediaType = typeof MEDICAL_IMAGE_MEDIA_TYPES[number]

function mediaTypeOf(file: File): MedicalImageMediaType {
  if ((MEDICAL_IMAGE_MEDIA_TYPES as readonly string[]).includes(file.type)) {
    return file.type as MedicalImageMediaType
  }
  throw new Error(`不支持的图片格式：${file.type || file.name || '未知格式'}`)
}

function bytesToBase64(data: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let offset = 0; offset < data.length; offset += chunk) {
    binary += String.fromCharCode(...data.subarray(offset, offset + chunk))
  }
  return btoa(binary)
}

/** Serialize text and browser images through the standard Prompt upload vocabulary. */
export async function medicalPromptContent(
  input: MedicalCaseInput,
  images: readonly File[],
): Promise<PromptContentPart[]> {
  if (images.length > MAX_MEDICAL_IMAGES) {
    throw new Error(`每个病例最多上传 ${MAX_MEDICAL_IMAGES} 张图片。`)
  }
  const imageParts = await Promise.all(images.map(async (file): Promise<PromptContentPart> => {
    if (file.size > MAX_MEDICAL_IMAGE_BYTES) {
      throw new Error(`图片“${file.name}”超过 10 MiB。`)
    }
    return {
      type: 'image',
      mediaType: mediaTypeOf(file),
      data: bytesToBase64(new Uint8Array(await file.arrayBuffer())),
      ...(file.name === '' ? {} : { name: file.name }),
    }
  }))
  return [
    { type: 'text', text: renderMedicalCaseMessage(input) },
    ...imageParts,
  ]
}

/** Build the ordered submission operation used by the real Client and unit tests. */
export function createMedicalSubmitter(deps: MedicalSubmitDependencies) {
  return async (
    input: MedicalCaseInput,
    images: readonly File[],
    workspaceId?: WorkspaceId,
  ): Promise<SessionId> => {
    const sessionId = crypto.randomUUID() as SessionId
    await deps.createSession(sessionId, workspaceId, 'standard')
    const session = await deps.waitForSession(sessionId)
    await deps.armSession(sessionId, images.length > 0)
    const renamed = await session.rename(medicalSessionTitle(input.chiefComplaint))
    if (!renamed.ok) {
      throw new Error(`医学病例会话命名失败：${renamed.error.message}`)
    }
    const prompted = await session.prompt(await medicalPromptContent(input, images), 'queue')
    if (!prompted.ok) throw new Error(`医学病例提交失败：${prompted.error.message}`)
    deps.openSession(sessionId)
    return sessionId
  }
}

function workspaceForNewCase(ctx: MedicalClientContext): WorkspaceId | undefined {
  const sessions = ctx.sessions.list.getSnapshot()
  const workspaces = ctx.workspaces.list.getSnapshot()
  const current = sessions.current
  if (current !== undefined) {
    const owner = workspaces.items.find(workspace => workspace.sessionIds.includes(current))
    if (owner !== undefined) return owner.workspaceId
  }
  return workspaces.recentWorkspaceId
}

function waitForSession(ctx: MedicalClientContext, sessionId: SessionId): Promise<SessionFace> {
  const immediate = ctx.sessions.binding(sessionId)?.session
  if (immediate !== undefined) return Promise.resolve(immediate)
  return new Promise<SessionFace>((resolve, reject) => {
    let settled = false
    let stop = (): void => {}
    const finish = (session?: SessionFace): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      stop()
      if (session === undefined) {
        reject(new Error(`医学病例会话 ${sessionId} 未出现在客户端会话目录中。`))
      } else {
        resolve(session)
      }
    }
    const check = (): void => {
      const session = ctx.sessions.binding(sessionId)?.session
      if (session !== undefined) finish(session)
    }
    const timeout = setTimeout(() => { finish() }, 10_000)
    stop = ctx.sessions.list.subscribe(check)
    check()
  })
}

/** Client-side orchestrator for fresh medical sessions. */
export class MedicalClientController {
  private readonly submit: ReturnType<typeof createMedicalSubmitter>

  /** @param ctx - root Client context supplying the wire, sessions, and workspaces services. */
  constructor(private readonly ctx: MedicalClientContext) {
    const connection = ctx.get('connection') as ConnectionHandle
    this.submit = createMedicalSubmitter({
      createSession: async (sessionId, workspaceId, agentPreset) => {
        const response = await connection.api.sessions.create({
          sessionId,
          ...(workspaceId === undefined ? {} : { workspaceId }),
          agentPreset,
        })
        if (!response.result.ok) {
          throw new Error(`医学病例会话创建失败：${response.result.error.message}`)
        }
      },
      waitForSession: sessionId => waitForSession(ctx, sessionId),
      openSession: sessionId => { ctx.sessions.open(sessionId) },
      armSession: async (sessionId, hasImages) => {
        const result = await ctx.remote.commands.execute(sessionId, medicalCommandLine(hasImages), [])
        if (!result.ok) throw new Error(`医学分析命令失败：${result.error.message}`)
        if (result.value === undefined) throw new Error('医学分析命令未注册。')
        if (result.value.result.kind === 'error') {
          throw new Error(result.value.result.text)
        }
      },
    })
  }

  /** Create, title, open, and submit one case to its own session. */
  submitCase(input: MedicalCaseInput, images: readonly File[]): Promise<SessionId> {
    return this.submit(input, images, workspaceForNewCase(this.ctx))
  }
}
