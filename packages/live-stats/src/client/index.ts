import { createElement, useMemo, useSyncExternalStore } from 'react'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useLiveUsage } from './live-usage.ts'
import type { LiveStatsPillsProps } from './LiveStatsPills.tsx'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the locale service into ClientContext.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-session-stats/client'
import type {} from '../types.ts'
import { LiveStatsPills } from './LiveStatsPills.tsx'
import { en, LIVE_STATS_NS, zh } from './locales.ts'
import { LIVE_STATS_STYLE } from './styles.ts'
import { resolveRefreshInterval } from './live-clock.ts'
import type { Config } from '../index.ts'

export {
  billedInputTokens, cacheHitPercent, formatDuration, formatFullTokens, formatTokens,
  formatTokensPerSecond,
} from './format.ts'
export { LiveStatsPills } from './LiveStatsPills.tsx'

/** Client services required by the composer dock contribution. */
export const inject = ['slots', 'conversation', 'locale', 'sessions']

/** 安装实时统计按钮及其样式。 */
export function apply(ctx: ClientContext, config: Config = {}): void {
  const refreshIntervalMs = resolveRefreshInterval(config)
  function LiveRow(props: Omit<LiveStatsPillsProps, 'refreshIntervalMs' | 'sessionRunning'> & { sessionId: SessionId }) {
    const binding = (ctx as unknown as { sessions: ISessions }).sessions.binding(props.sessionId)
    if (binding === undefined) throw new Error('live-stats: Session binding is unavailable')
    const subscribe = useMemo(() => binding.session.subscribe.bind(binding.session), [binding])
    const getSnapshot = useMemo(() => binding.session.getSnapshot.bind(binding.session), [binding])
    const snapshot = useSyncExternalStore(subscribe, getSnapshot)
    const durable = props.useProjection('liveTokenUsage')
    const liveUsage = useLiveUsage(binding.eventSource, durable)
    return createElement(LiveStatsPills, { ...props, liveUsage, refreshIntervalMs, sessionRunning: snapshot.running })
  }
  ctx.effect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-dsh-live-stats-style', '')
    style.textContent = LIVE_STATS_STYLE
    document.head.append(style)
    return () => { style.remove() }
  }, 'live-stats: styles')
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
  }, LiveRow))
}
