// @vitest-environment jsdom
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { afterEach, describe, expect, it } from 'vitest'
import { brandStyles, installBrandMascot } from '../src/client/brand-mascot.ts'

describe('web brand mascot client plugin', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  it('marks the official wordmark and retracts its attribute and style', () => {
    document.body.innerHTML = `
      <button aria-label="New Session">
        <svg viewBox="0 0 182 24"></svg>
      </button>
      <button aria-label="Unrelated"><svg viewBox="0 0 24 24"></svg></button>
    `
    const effects: Array<() => void> = []
    const ctx = {
      effect: (install: () => (() => void)) => {
        effects.push(install())
      },
    } as unknown as ClientContext

    installBrandMascot(ctx)

    expect(document.querySelectorAll('button[data-dsh-brand-mascot]')).toHaveLength(1)
    expect(document.querySelector('[data-dsh-brand-mascot-style]')?.textContent)
      .toContain('mascot.webp')
    expect(document.querySelector('[data-dsh-brand-mascot-style]')?.textContent)
      .toContain('height: 324px')

    for (const dispose of effects.reverse()) dispose()

    expect(document.querySelector('[data-dsh-brand-mascot]')).toBeNull()
    expect(document.querySelector('[data-dsh-brand-mascot-style]')).toBeNull()
    expect(document.querySelector('[aria-label="Unrelated"]')).not.toBeNull()
  })

  it('marks wordmarks mounted later and supports accessibility preferences', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const effects: Array<() => void> = []
    const ctx = {
      effect: (install: () => (() => void)) => {
        effects.push(install())
      },
    } as unknown as ClientContext
    installBrandMascot(ctx)

    const button = document.createElement('button')
    button.innerHTML = '<svg viewBox="0 0 182 24"></svg>'
    document.querySelector('#root')?.append(button)
    await Promise.resolve()

    expect(button.hasAttribute('data-dsh-brand-mascot')).toBe(true)
    const styles = brandStyles('data:image/webp;base64,AAAA')
    expect(styles).toContain('@media (prefers-contrast: more)')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).toContain('body[data-ds-dark-theme]')
    expect(styles).toContain('button[data-dsh-brand-mascot]::before')
    expect(styles).toContain('background-position: center, center')
    expect(styles).toContain('z-index: 2')
    expect(styles).not.toContain("content: 'HARNESS'")
    expect(styles).not.toContain('clip-path:')
    expect(styles).not.toContain('transform: scale')

    for (const dispose of effects.reverse()) dispose()
  })
})
