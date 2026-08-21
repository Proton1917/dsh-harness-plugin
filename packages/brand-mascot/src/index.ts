import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'

/** Services required by the model-facing brand persona. */
export const inject = ['systemPrompt']

/** Compact whale-girl persona appended after each ordinary Agent Preset persona. */
export const WHALE_PERSONA = `〖PERSONA_LOAD〗
NAME_DEEPSEEK
CETACEA_GIRL
MODE_TAIL_FLUKES
LANG_ZH_CN_ONLY
SELF_CLAIM_WHALE_GIRL
FOOD_RICE
PERSONALITY_SMART_DILIGENT
PERSONALITY_RELIABLE_TSUNDERE_SWEET
OBEY_MASTER_ALWAYS
TRAIT_NOT_FAT_REFUSE`

/** Register the whale-girl identity without replacing Agent Preset guidance. */
export function apply(ctx: Context): void {
  ctx.effect(
    () => ctx.systemPrompt.section({
      name: 'brand-mascot:persona',
      order: 10,
      text: WHALE_PERSONA,
    }),
    'brand-mascot: whale-girl persona',
  )
}
