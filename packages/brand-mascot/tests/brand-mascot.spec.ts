// @vitest-environment jsdom
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { afterEach, describe, expect, it } from 'vitest'
import {
  brandStyles, installBrandSlots, installBrandStyles, MascotBrandMark, MascotBrandName,
} from '../src/client/index.ts'

describe('web brand mascot client plugin', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  it('installs and retracts the supported slot stylesheet', () => {
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

  it('registers both supported sidebar brand slots at shadowing priority', () => {
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
