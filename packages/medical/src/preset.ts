import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import { MEDICAL_SYSTEM_PROMPT } from './prompt.ts'

/** Agent-plane services consumed by the Medical Agent Preset. */
export const inject = ['systemPrompt', 'tools']

/** Install the complete medical prompt and a no-tools, one-step loop policy. */
export function apply(ctx: Context): void {
  ctx.systemPrompt.section({
    name: 'medical:mode',
    order: 0,
    complete: true,
    text: MEDICAL_SYSTEM_PROMPT,
  })
  ctx.systemPrompt.suppressRuntimeContext()
  ctx.tools.restrict({ allow: [] })
  ctx.tools.guard(() => '医学模式不允许执行工具。')
  ctx.on('agent/pre-step', ({ step }, next) => (
    step > 1 ? Promise.resolve({ kind: 'reject' }) : next()
  ))
}
