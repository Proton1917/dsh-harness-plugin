import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import backgroundImage from '../assets/background.webp'

const PACKAGE_ID = '@proton1917/dsh-web-background'
const BACKDROP_ATTRIBUTE = 'data-dsh-web-background'
const LAYER_ATTRIBUTE = 'data-dsh-web-background-layer'

/** Client services required by the semantic background theme. */
export const inject = ['theme']

/** Semantic glass surfaces applied on top of the built-in light and dark palettes. */
export const BACKGROUND_TOKENS: ThemeTokenOverrides = Object.freeze({
  '--dsw-alias-bg-base': { light: 'rgba(246, 249, 255, 0.48)', dark: 'rgba(8, 12, 22, 0.38)' },
  '--dsw-alias-bg-layer-1': { light: 'rgba(255, 255, 255, 0.72)', dark: 'rgba(17, 22, 34, 0.72)' },
  '--dsw-alias-bg-layer-2': { light: 'rgba(252, 253, 255, 0.80)', dark: 'rgba(23, 28, 42, 0.80)' },
  '--dsw-alias-bg-layer-3': { light: 'rgba(250, 252, 255, 0.88)', dark: 'rgba(29, 34, 49, 0.88)' },
  '--dsw-alias-bg-overlay': { light: 'rgba(250, 252, 255, 0.94)', dark: 'rgba(31, 36, 51, 0.94)' },
  '--dsw-alias-bg-module-platform': { light: 'rgba(248, 251, 255, 0.82)', dark: 'rgba(27, 32, 47, 0.84)' },
  '--dsw-specific-sidebar-fill': { light: 'rgba(241, 246, 255, 0.68)', dark: 'rgba(10, 15, 27, 0.70)' },
  '--dsw-specific-input-major': { light: 'rgba(255, 255, 255, 0.82)', dark: 'rgba(26, 31, 46, 0.82)' },
  '--dsw-specific-menu': { light: 'rgba(250, 252, 255, 0.95)', dark: 'rgba(31, 36, 51, 0.95)' },
  '--dsw-specific-bubble': { light: 'rgba(232, 241, 255, 0.76)', dark: 'rgba(26, 37, 57, 0.78)' },
})

/**
 * Build the plugin-owned stylesheet around the bundled image URL.
 * @param imageUrl - bundled data URL for the user-supplied background.
 * @returns complete isolated stylesheet for the backdrop and root stacking.
 */
export function backgroundStyles(imageUrl: string): string {
  return `
body {
  background: #dce5f4 !important;
}

body[data-ds-dark-theme] {
  background: #080d17 !important;
}

body > #root {
  position: relative;
  z-index: 1;
  background: transparent;
}

body > [${BACKDROP_ATTRIBUTE}] {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: #dbe5f4;
  animation: dsh-web-background-reveal 480ms ease-out both;
}

body[data-ds-dark-theme] > [${BACKDROP_ATTRIBUTE}] {
  background: #080d17;
}

[${BACKDROP_ATTRIBUTE}] > [${LAYER_ATTRIBUTE}] {
  position: absolute;
  pointer-events: none;
}

[${LAYER_ATTRIBUTE}='ambient'] {
  inset: -4% !important;
  background-image: url("${imageUrl}");
  background-position: center 28%;
  background-repeat: no-repeat;
  background-size: cover;
  filter: blur(30px) saturate(0.92);
  opacity: 0.62;
  transform: scale(1.08);
}

[${LAYER_ATTRIBUTE}='portrait'] {
  top: 0;
  bottom: 0;
  left: var(--dsh-background-conversation-left, 0px);
  right: auto;
  width: var(--dsh-background-conversation-width, 100vw);
  background-image: url("${imageUrl}");
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  filter: saturate(0.90) contrast(0.98);
  opacity: 0.78;
}

[${LAYER_ATTRIBUTE}='scrim'] {
  inset: 0;
  background:
    linear-gradient(90deg, rgba(237, 244, 255, 0.54) 0%, rgba(237, 244, 255, 0.10) 48%, rgba(231, 239, 251, 0.34) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(220, 230, 247, 0.26) 100%);
}

body[data-ds-dark-theme] [${LAYER_ATTRIBUTE}='ambient'] {
  filter: blur(30px) saturate(0.90) brightness(0.78);
  opacity: 0.82;
}

body[data-ds-dark-theme] [${LAYER_ATTRIBUTE}='portrait'] {
  filter: saturate(0.88) brightness(0.86) contrast(1.02);
  opacity: 0.90;
}

body[data-ds-dark-theme] [${LAYER_ATTRIBUTE}='scrim'] {
  background:
    linear-gradient(90deg, rgba(5, 9, 17, 0.56) 0%, rgba(7, 11, 20, 0.08) 48%, rgba(5, 9, 17, 0.38) 100%),
    linear-gradient(180deg, rgba(5, 8, 15, 0.02) 0%, rgba(5, 8, 15, 0.34) 100%);
}

@keyframes dsh-web-background-reveal {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 720px) {
  [${LAYER_ATTRIBUTE}='portrait'] {
    background-position: 52% 18%;
    background-size: cover;
    opacity: 0.68;
  }
}

@media (prefers-contrast: more) {
  [${LAYER_ATTRIBUTE}='scrim'] {
    background: rgba(242, 247, 255, 0.62);
  }

  body[data-ds-dark-theme] [${LAYER_ATTRIBUTE}='scrim'] {
    background: rgba(5, 8, 15, 0.66);
  }
}

@media (prefers-reduced-motion: reduce) {
  body > [${BACKDROP_ATTRIBUTE}] {
    animation: none;
  }
}
`
}

function makeLayer(name: 'ambient' | 'portrait' | 'scrim'): HTMLDivElement {
  const layer = document.createElement('div')
  layer.setAttribute(LAYER_ATTRIBUTE, name)
  return layer
}

function installConversationAlignment(backdrop: HTMLDivElement): () => void {
  let target: Element | null = null
  let frame: number | null = null

  const write = (): void => {
    frame = null
    if (target === null) {
      backdrop.style.removeProperty('--dsh-background-conversation-left')
      backdrop.style.removeProperty('--dsh-background-conversation-width')
      return
    }
    const rect = target.getBoundingClientRect()
    if (rect.width <= 0) return
    backdrop.style.setProperty('--dsh-background-conversation-left', `${rect.left}px`)
    backdrop.style.setProperty('--dsh-background-conversation-width', `${rect.width}px`)
  }
  const schedule = (): void => {
    frame ??= requestAnimationFrame(write)
  }

  const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule)
  let discovery: MutationObserver | undefined
  const findTarget = (): void => {
    const next = document.querySelector('[data-conversation-scroll]')
    if (next === target) return
    resize?.disconnect()
    target = next
    if (target !== null) {
      resize?.observe(target)
      discovery?.disconnect()
    }
    write()
  }

  findTarget()
  if (target === null) {
    discovery = new MutationObserver(findTarget)
    discovery.observe(document.body, { childList: true, subtree: true })
  }
  window.addEventListener('resize', schedule)

  return () => {
    window.removeEventListener('resize', schedule)
    discovery?.disconnect()
    resize?.disconnect()
    if (frame !== null) cancelAnimationFrame(frame)
  }
}

/** Install the bundled background and theme-token layer for this client fiber. */
export function installBackground(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.theme.overrideTokens(PACKAGE_ID, BACKGROUND_TOKENS),
    'web-background: semantic glass tokens',
  )

  ctx.effect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-dsh-web-background-style', '')
    style.textContent = backgroundStyles(backgroundImage)

    const backdrop = document.createElement('div')
    backdrop.setAttribute(BACKDROP_ATTRIBUTE, '')
    backdrop.setAttribute('aria-hidden', 'true')
    backdrop.append(makeLayer('ambient'), makeLayer('portrait'), makeLayer('scrim'))

    document.head.append(style)
    document.body.prepend(backdrop)
    const disposeAlignment = installConversationAlignment(backdrop)

    return () => {
      disposeAlignment()
      backdrop.remove()
      style.remove()
    }
  }, 'web-background: backdrop DOM')
}

/** Install the Web background Client plugin. */
export function apply(ctx: ClientContext): void {
  installBackground(ctx)
}
