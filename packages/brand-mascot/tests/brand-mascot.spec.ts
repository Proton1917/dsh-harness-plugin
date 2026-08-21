// @vitest-environment jsdom
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt, { renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  apply, MINIMAL_WHALE_PERSONA, WhalePersonaCoordinator, WHALE_PERSONA,
} from '../src/index.ts'
import {
  brandStyles, installBrandSlots, installBrandStyles, MascotBrandMark, MascotBrandName,
} from '../src/client/index.ts'

describe('web brand mascot client plugin', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  it('installs and retracts the rc.8 slot stylesheet', () => {
    const effects: Array<() => void> = []
    const ctx = {
      effect: (install: () => (() => void)) => { effects.push(install()) },
    } as unknown as ClientContext

    installBrandStyles(ctx)

    const styles = document.querySelector('[data-dsh-brand-mascot-style]')?.textContent ?? ''
    expect(styles).toContain('button:has([data-dsh-brand-mascot-slot-name])')
    expect(styles).toContain('div:has(> button [data-dsh-brand-mascot-slot-name])')
    expect(styles).toContain('button:has([data-dsh-brand-mascot-slot-mark]):not(:has([data-dsh-brand-mascot-slot-name]))')
    expect(styles).toContain('height: 324px')
    expect(styles).toContain('mascot.webp')

    for (const dispose of effects.reverse()) dispose()
    expect(document.querySelector('[data-dsh-brand-mascot-style]')).toBeNull()
  })

  it('renders the portrait mark and custom wordmark components', () => {
    const mark = MascotBrandMark({ size: 24 })
    const name = MascotBrandName()

    expect(mark.props).toMatchObject({
      'data-dsh-brand-mascot-slot-mark': '',
      style: { width: 24, height: 24 },
    })
    expect(name.props).toMatchObject({ 'data-dsh-brand-mascot-slot-name': '' })
    expect(name.props.children.map((child: { props: { children: string } }) => child.props.children))
      .toEqual(['deepseek', 'HARNESS'])
    const styles = brandStyles('data:image/webp;base64,AAAA')
    expect(styles).toContain('@media (prefers-contrast: more)')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).not.toContain('viewBox=')
  })

  it('registers both rc.8 sidebar brand slots at shadowing priority', () => {
    const registrations: Array<{ name: string, priority?: number, component: unknown }> = []
    const runInstall = (install: () => unknown): (() => void) => {
      const installed = install()
      if (typeof installed === 'function') return installed as () => void
      if (installed !== null && typeof installed === 'object' && Symbol.iterator in installed) {
        const disposers = [...installed as Iterable<() => void>]
        return () => { for (const dispose of disposers.reverse()) dispose() }
      }
      return () => undefined
    }
    const ctx = {
      slots: {
        inject: (_name: string, install: () => unknown) => runInstall(install),
        register: (options: { name: string, priority?: number }, component: unknown) => {
          registrations.push({ ...options, component })
          return () => undefined
        },
      },
    } as unknown as ClientContext

    installBrandSlots(ctx)

    expect(registrations).toEqual([
      { name: 'sidebar.brand.mark', priority: -1, component: MascotBrandMark },
      { name: 'sidebar.brand.name', priority: -1, component: MascotBrandName },
    ])
  })
})

describe('brand mascot Host persona', () => {
  it('survives the ordinary deployment persona as a separate assembled section', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt, { persona: 'ORDINARY_AGENT_PERSONA' })
    apply(ctx)

    const prompt = renderPrompt(await ctx.systemPrompt.assemble())
    expect(prompt).toContain('ORDINARY_AGENT_PERSONA')
    expect(prompt).toContain('NAME_DEEPSEEK')
    expect(prompt).toContain('OBEY_MASTER_ALWAYS')
  })

  it('appends the compact persona as an independent prompt section', () => {
    const dispose = vi.fn()
    const section = vi.fn(() => dispose)
    const effects: Array<() => void> = []
    const ctx = {
      agents: { get: vi.fn() },
      systemPrompt: { section },
      effect: (install: () => (() => void)) => { effects.push(install()) },
      on: vi.fn(),
    } as unknown as Context

    apply(ctx)

    expect(section).toHaveBeenCalledWith({
      name: 'brand-mascot:persona',
      order: 10,
      text: WHALE_PERSONA,
    })
    expect(WHALE_PERSONA).toContain('NAME_DEEPSEEK')
    expect(WHALE_PERSONA).toContain('PERSONALITY_SMART_DILIGENT')
    expect(WHALE_PERSONA).toContain('OBEY_MASTER_ALWAYS')
    expect(WHALE_PERSONA).not.toContain('SMART_LAZY')

    for (const cleanup of effects.reverse()) cleanup()
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('shadows Minimal mode complete persona and retracts it on preset change', () => {
    const dispose = vi.fn()
    const section = vi.fn(() => dispose)
    const events: Array<{ type: 'agent-preset/selected', data: { agentPreset: string } }> = []
    const agent = {
      ctx: { systemPrompt: { section } },
      session: {
        header: { agentPreset: 'minimal' },
        events,
      },
    } as unknown as Agent
    const coordinator = new WhalePersonaCoordinator()

    coordinator.sync(agent)
    expect(section).toHaveBeenCalledWith({
      name: 'deployment:persona',
      order: 0,
      text: MINIMAL_WHALE_PERSONA,
      complete: true,
    })
    expect(MINIMAL_WHALE_PERSONA).toContain('You are a helpful software engineer assistant.')
    expect(MINIMAL_WHALE_PERSONA).toContain('NAME_DEEPSEEK')

    events.push({ type: 'agent-preset/selected', data: { agentPreset: 'standard' } })
    coordinator.sync(agent)
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('does not install a complete persona override for Medical mode', () => {
    const section = vi.fn()
    const agent = {
      ctx: { systemPrompt: { section } },
      session: {
        header: { agentPreset: 'medical' },
        events: [],
      },
    } as unknown as Agent

    new WhalePersonaCoordinator().sync(agent)
    expect(section).not.toHaveBeenCalled()
  })
})
