// @vitest-environment jsdom
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply, BACKGROUND_TOKENS, backgroundStyles } from '../src/client/index.ts'

describe('web background client plugin', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  it('adds the backdrop and retracts only its own DOM and token layer', () => {
    document.body.innerHTML = '<div id="root"><div data-conversation-scroll></div></div>'
    const conversation = document.querySelector('[data-conversation-scroll]')
    if (conversation === null) throw new Error('missing conversation fixture')
    conversation.getBoundingClientRect = () => ({
      bottom: 800, height: 800, left: 280, right: 1_280, top: 0, width: 1_000,
      x: 280, y: 0, toJSON: () => ({}),
    })
    const tokenDispose = vi.fn()
    const overrideTokens = vi.fn(() => tokenDispose)
    const effects: Array<() => void> = []
    const ctx = {
      theme: { overrideTokens },
      effect: (install: () => (() => void)) => {
        effects.push(install())
      },
    } as unknown as ClientContext

    apply(ctx)

    expect(overrideTokens).toHaveBeenCalledWith(
      '@proton1917/dsh-web-background',
      BACKGROUND_TOKENS,
    )
    expect(document.querySelectorAll('[data-dsh-web-background]')).toHaveLength(1)
    expect(document.querySelectorAll('[data-dsh-web-background-layer]')).toHaveLength(3)
    const backdrop = document.querySelector<HTMLElement>('[data-dsh-web-background]')
    expect(backdrop?.style.getPropertyValue('--dsh-background-conversation-left')).toBe('280px')
    expect(backdrop?.style.getPropertyValue('--dsh-background-conversation-width')).toBe('1000px')
    expect(document.querySelector('[data-dsh-web-background-style]')?.textContent)
      .toContain('background.webp')
    expect(document.querySelector('#root')).not.toBeNull()

    for (const dispose of effects.reverse()) dispose()

    expect(tokenDispose).toHaveBeenCalledOnce()
    expect(document.querySelector('[data-dsh-web-background]')).toBeNull()
    expect(document.querySelector('[data-dsh-web-background-style]')).toBeNull()
    expect(document.querySelector('#root')).not.toBeNull()
  })

  it('supports responsive and accessibility media queries', () => {
    const styles = backgroundStyles('data:image/webp;base64,AAAA')

    expect(styles).toContain('@media (max-width: 720px)')
    expect(styles).toContain('@media (prefers-contrast: more)')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).toContain("body[data-ds-dark-theme]")
    expect(styles).toContain('var(--dsh-background-conversation-left, 0px)')
    expect(styles).toContain("[data-dsh-web-background-layer='portrait'] {\n  top: 0;\n  bottom: 0;")
    expect(styles).toContain("[data-dsh-web-background-layer='scrim'] {\n  inset: 0;")
    expect(styles).not.toContain("[data-dsh-web-background] > [data-dsh-web-background-layer] {\n  position: absolute;\n  inset: 0;")
  })
})
