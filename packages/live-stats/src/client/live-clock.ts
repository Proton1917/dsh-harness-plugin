import { useEffect, useState } from 'react'
import { z } from 'zod'
import type { Config } from '../index.ts'

const refreshSchema = z.object({ refreshIntervalMs: z.number().int().min(16).max(1000).default(250) })

/**
 * 验证 Client 配置并确定用时刷新间隔。
 * @param request - Profile 中的插件配置。
 * @returns 刷新间隔，单位为毫秒。
 */
export function resolveRefreshInterval(request: Config): number {
  return refreshSchema.parse(request).refreshIntervalMs
}

/**
 * 在有模型请求或工具运行时刷新计时，并在结束及卸载时释放定时器。
 * @param active - 当前是否存在未结束计时。
 * @param intervalMs - 已验证的刷新间隔。
 * @returns Client 当前时间，单位为毫秒。
 */
export function useLiveClock(active: boolean, intervalMs: number): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => { setNow(Date.now()) }, intervalMs)
    return () => { window.clearInterval(timer) }
  }, [active, intervalMs])
  return active ? Math.max(now, Date.now()) : now
}
