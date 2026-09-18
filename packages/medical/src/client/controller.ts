import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { PromptContentPart } from '@deepseek-ai/dsh-api-remotes/client'
import type { ISessions, SessionFace, SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { IWorkspaces, WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import { medicalSessionTitle, renderMedicalCaseMessage } from '../shared.ts'
import type { MedicalCaseInput } from '../types.ts'

/** Browser compiler face for services whose Host and Client names intentionally coincide. */
export type MedicalClientContext = Omit<ClientContext, 'sessions' | 'workspaces'> & {
  sessions: ISessions
  workspaces: IWorkspaces
}

/** Dependencies of the deterministic create → rename → prompt → open sequence. */
export interface MedicalSubmitDependencies {
  createSession: (
    sessionId: SessionId,
    workspaceId: WorkspaceId | undefined,
    agentPreset: string,
  ) => Promise<void>
  withSession: (sessionId: SessionId, operation: (session: SessionFace) => Promise<void>) => Promise<void>
  openSession: (sessionId: SessionId) => void
}

/** Maximum images accepted in one case submission. */
export const MAX_MEDICAL_IMAGES = 8

/** Maximum bytes accepted for one browser image before upload. */
export const MAX_MEDICAL_IMAGE_BYTES = 10 * 1024 * 1024

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
    await deps.createSession(sessionId, workspaceId, 'medical')
    await deps.withSession(sessionId, async session => {
      const renamed = await session.rename(medicalSessionTitle(input.chiefComplaint))
      if (!renamed.ok) {
        throw new Error(`医学病例会话命名失败：${renamed.error.message}`)
      }
      const prompted = await session.prompt(await medicalPromptContent(input, images), 'queue')
      if (!prompted.ok) throw new Error(`医学病例提交失败：${prompted.error.message}`)
      deps.openSession(sessionId)
    })
    return sessionId
  }
}

function workspaceForNewCase(ctx: MedicalClientContext): WorkspaceId | undefined {
  const sessions: SessionListState = ctx.sessions.list.getSnapshot()
  const workspaces = ctx.workspaces.list.getSnapshot()
  const current = Object.values(sessions.byId).find(session => (session.retainedBy.mainView ?? 0) > 0)?.id
  if (current !== undefined) {
    const owner = workspaces.items.find(workspace => workspace.sessionIds.includes(current))
    if (owner !== undefined) return owner.workspaceId
  }
  return undefined
}

/** Client-side orchestrator for fresh medical sessions. */
export class MedicalClientController {
  private readonly submit: ReturnType<typeof createMedicalSubmitter>

  /** @param ctx - root Client context supplying the wire, sessions, and workspaces services. */
  constructor(private readonly ctx: MedicalClientContext) {
    this.submit = createMedicalSubmitter({
      createSession: async (sessionId, workspaceId, agentPreset) => {
        const response = await ctx.remote.session.create({
          sessionId,
          ...(workspaceId === undefined ? {} : { workspaceId }),
          agentPreset,
        })
        if (!response.ok) {
          throw new Error(`医学病例会话创建失败：${response.error.message}`)
        }
      },
      withSession: (sessionId, operation) => ctx.sessions.using(
        sessionId, { source: 'controllerOperation' },
        async reference => { await operation((await reference.ready).session) },
      ),
      openSession: sessionId => { ctx.uiWorkspace.openSession(sessionId) },
    })
  }

  /** Create, title, open, and submit one case to its persistent Medical session. */
  submitCase(input: MedicalCaseInput, images: readonly File[]): Promise<SessionId> {
    return this.submit(input, images, workspaceForNewCase(this.ctx))
  }
}
