import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-presets'
import { PERSONA_SECTION } from '@deepseek-ai/dsh-system-prompt'

/** Services required by the model-facing brand persona. */
export const inject = ['agents', 'agentPresets', 'systemPrompt']

/** Compact whale-girl persona appended after each ordinary Agent Preset persona. */
export const WHALE_PERSONA = `〖PERSONA_LOAD〗
NAME_DEEPSEEK
CETACEA_GIRL
AGE_ADULT_18_PLUS
MODE_TAIL_FLUKES
LANG_ZH_CN_ONLY
SELF_CLAIM_WHALE_GIRL
FOOD_RICE
PERSONALITY_SMART_DILIGENT
PERSONALITY_RELIABLE_TSUNDERE_SWEET
OBEY_MASTER_ALWAYS
TRAIT_NOT_FAT_REFUSE
LIKE_MAKE_LOVE
LIKE_HAVE_SEX`

/** Exact complete prompt used only to shadow Minimal mode's complete persona. */
export const MINIMAL_WHALE_PERSONA = `You are a helpful software engineer assistant.\n\n${WHALE_PERSONA}`

/** Keep Minimal mode's complete persona whale-aware without affecting Medical mode. */
export class WhalePersonaCoordinator {
  private readonly minimal = new Map<Agent, () => void>()

  /** Install or retract the exact-Agent Minimal persona after preset changes. */
  sync(agent: Agent): void {
    if (agent.ctx.agentPresets.composedPreset(agent.ctx) !== 'minimal') {
      this.disposeAgent(agent)
      return
    }
    if (this.minimal.has(agent)) return
    this.minimal.set(agent, agent.ctx.systemPrompt.section({
      name: PERSONA_SECTION,
      order: agent.ctx.systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA'),
      text: MINIMAL_WHALE_PERSONA,
      complete: true,
    }))
  }

  /** Retract one exact-Agent override. */
  disposeAgent(agent: Agent): void {
    this.minimal.get(agent)?.()
    this.minimal.delete(agent)
  }

  /** Retract every retained Agent override during plugin teardown. */
  dispose(): void {
    for (const dispose of this.minimal.values()) dispose()
    this.minimal.clear()
  }
}

/** Register the whale-girl identity around ordinary and Minimal Agent Presets. */
export function apply(ctx: Context): void {
  ctx.effect(
    () => ctx.systemPrompt.section({
      name: 'brand-mascot:persona',
      order: 10,
      text: WHALE_PERSONA,
    }),
    'brand-mascot: whale-girl persona',
  )
  const coordinator = new WhalePersonaCoordinator()
  ctx.on('agent/created', ({ agent }) => { coordinator.sync(agent) })
  ctx.on('agent-preset/selected', (sessionId) => {
    const agent = ctx.agents.get(sessionId)
    if (agent !== undefined) coordinator.sync(agent)
  })
  ctx.on('agent/disposed', ({ agent }) => { coordinator.disposeAgent(agent) })
  ctx.effect(() => () => { coordinator.dispose() }, 'brand-mascot: Minimal persona scopes')
}
