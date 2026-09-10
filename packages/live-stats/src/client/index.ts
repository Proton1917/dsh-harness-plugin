import { createElement } from 'react'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useLiveUsage } from './live-usage.ts'
import type { TpsLineProps } from './TpsLine.tsx'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the locale service into ClientContext.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-session-stats/client'
import type {} from '../types.ts'
import { LiveStatsLine } from './LiveStatsLine.tsx'
import { en, LIVE_STATS_NS, zh } from './locales.ts'
import { TpsLine } from './TpsLine.tsx'

export {
  billedInputTokens, cacheHitPercent, formatDuration, formatFullTokens, formatTokens,
  LiveStatsLine,
} from './LiveStatsLine.tsx'
export { TpsLine, formatTokensPerSecond } from './TpsLine.tsx'

/** Client services required by the composer dock contribution. */
export const inject = ['slots', 'conversation', 'locale', 'sessions']

/** Install the live statistics rows. */
export function apply(ctx: ClientContext): void {
  const wrap = (Component: typeof TpsLine) => function LiveRow(props: TpsLineProps & { sessionId: SessionId }) {
    const binding = (ctx as unknown as { sessions: ISessions }).sessions.binding(props.sessionId)
    if (binding === undefined) throw new Error('live-stats: Session binding is unavailable')
    const durable = props.useProjection('liveTokenUsage')
    const liveUsage = useLiveUsage(binding.eventSource, durable)
    return createElement(Component, { ...props, liveUsage })
  }
  ctx.effect(
    () => ctx.locale.register(LIVE_STATS_NS, { zh, en }),
    'live-stats: dictionaries',
  )
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock',
    id: 'stats',
    order: 0,
    priority: -1,
    locale: LIVE_STATS_NS,
  }, wrap(LiveStatsLine)))
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock',
    id: 'live-tps',
    order: 1,
    locale: LIVE_STATS_NS,
  }, wrap(TpsLine)))
}
