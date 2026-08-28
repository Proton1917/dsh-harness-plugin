import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { createElement, type ReactElement } from 'react'
import mascotImage from '../assets/mascot.webp'

const SLOT_MARK_ATTRIBUTE = 'data-dsh-brand-mascot-slot-mark'
const SLOT_NAME_ATTRIBUTE = 'data-dsh-brand-mascot-slot-name'
const SLOT_WORD_ATTRIBUTE = 'data-dsh-brand-mascot-word'
const SLOT_BADGE_ATTRIBUTE = 'data-dsh-brand-mascot-badge'

/** Required service: the UI slot registry. */
export const inject = ['slots']

/** Portrait artwork occupying the sidebar mark slot. */
export function MascotBrandMark({ size }: SidebarBrandMarkOwnerProps): ReactElement {
  return createElement('span', {
    [SLOT_MARK_ATTRIBUTE]: '',
    'aria-hidden': true,
    style: { width: size, height: size },
  })
}

/** Custom wordmark occupying the expanded sidebar name slot. */
export function MascotBrandName(): ReactElement {
  return createElement(
    'span',
    { [SLOT_NAME_ATTRIBUTE]: '', 'aria-hidden': true },
    createElement('span', { [SLOT_WORD_ATTRIBUTE]: '' }, 'deepseek'),
    createElement('span', { [SLOT_BADGE_ATTRIBUTE]: '' }, 'HARNESS'),
  )
}

/**
 * Build the supported sidebar brand stylesheet.
 * @param imageUrl - bundled data URL for the repository portrait.
 * @returns CSS for the expanded card and collapsed portrait mark.
 */
export function brandStyles(imageUrl: string): string {
  const mark = `[${SLOT_MARK_ATTRIBUTE}]`
  const name = `[${SLOT_NAME_ATTRIBUTE}]`
  const word = `[${SLOT_WORD_ATTRIBUTE}]`
  const badge = `[${SLOT_BADGE_ATTRIBUTE}]`
  const card = `button:has(${name})`
  const cardRow = `div:has(> button ${name})`
  const rail = `button:has(${mark}):not(:has(${name}))`
  return `
${card} {
  position: relative;
  isolation: isolate;
  flex: 1 1 auto;
  align-items: flex-end;
  justify-content: center;
  min-width: 0;
  height: 324px;
  min-height: 324px;
  padding: 0 12px 16px;
  box-sizing: border-box;
  overflow: hidden !important;
  border: 1px solid rgba(111, 143, 220, 0.72);
  border-radius: 24px;
  color: rgba(249, 251, 255, 0.98) !important;
  background: transparent !important;
  box-shadow:
    0 0 0 1px rgba(109, 141, 223, 0.12),
    0 7px 20px rgba(20, 37, 90, 0.32),
    inset 0 1px rgba(255, 255, 255, 0.36);
  transform: translateY(0);
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}

${cardRow} {
  height: 340px;
}

${card}::before,
${card}::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

${card}::before {
  z-index: 0;
  background-image:
    radial-gradient(circle at 76% 10%, rgba(255, 255, 255, 0.38), transparent 34%),
    url("${imageUrl}");
  background-position: center, center;
  background-repeat: no-repeat;
  background-size: cover, cover;
}

${card}::after {
  z-index: 1;
  background:
    linear-gradient(180deg, rgba(5, 10, 25, 0.04) 0%, rgba(5, 10, 25, 0.20) 46%, rgba(5, 10, 25, 0.90) 100%),
    linear-gradient(90deg, rgba(4, 9, 23, 0.28) 0%, transparent 42%, rgba(4, 9, 23, 0.16) 100%);
}

${card} ${mark} {
  position: relative;
  z-index: 2;
  flex: none;
  width: 24px !important;
  height: 24px !important;
  box-sizing: border-box;
  border: 1px solid rgba(170, 194, 255, 0.88);
  border-radius: 7px;
  background: url("${imageUrl}") center / cover no-repeat;
  box-shadow: 0 1px 4px rgba(1, 5, 18, 0.72);
}

${name} {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 24px;
  white-space: nowrap;
  filter: drop-shadow(0 1px 3px rgba(1, 5, 18, 0.96));
}

${word} {
  font-size: 24px;
  font-weight: 650;
  line-height: 24px;
  letter-spacing: -0.04em;
}

${badge} {
  display: inline-flex;
  align-items: center;
  height: 16px;
  padding: 0 4px;
  border-radius: 3px;
  color: rgba(16, 22, 35, 0.96);
  background: rgba(249, 251, 255, 0.96);
  font-size: 9px;
  font-weight: 700;
  line-height: 16px;
  letter-spacing: 0.06em;
}

body[data-ds-dark-theme] ${card} {
  border-color: rgba(132, 160, 235, 0.54);
  box-shadow:
    0 0 0 1px rgba(101, 133, 222, 0.10),
    0 7px 22px rgba(0, 5, 22, 0.46),
    inset 0 1px rgba(255, 255, 255, 0.24);
  filter: brightness(0.98) saturate(0.98);
}

${card}:hover {
  border-color: rgba(145, 178, 255, 0.92);
  box-shadow:
    0 0 0 1px rgba(123, 157, 245, 0.24),
    0 9px 24px rgba(33, 58, 133, 0.40),
    inset 0 1px rgba(255, 255, 255, 0.44);
  filter: brightness(1.06) saturate(1.06);
  transform: translateY(-2px);
}

${card}:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}

${rail} {
  overflow: hidden;
}

${rail} ${mark} {
  width: 26px !important;
  height: 34px !important;
  box-sizing: border-box;
  border: 1px solid rgba(122, 155, 236, 0.78);
  border-radius: 7px;
  background-image:
    linear-gradient(180deg, rgba(7, 14, 34, 0.02) 48%, rgba(7, 14, 34, 0.38) 100%),
    url("${imageUrl}");
  background-position: center, center;
  background-repeat: no-repeat;
  background-size: cover, cover;
  box-shadow:
    0 0 0 1px rgba(113, 145, 229, 0.10),
    0 3px 9px rgba(15, 30, 75, 0.34),
    inset 0 1px rgba(255, 255, 255, 0.28);
}

@media (prefers-contrast: more) {
  ${card},
  ${rail} ${mark} {
    border-width: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  ${card} {
    transition: none;
  }
}
`
}

/** Install the portrait stylesheet through the Client root lifecycle. */
export function installBrandStyles(ctx: ClientContext): void {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-dsh-brand-mascot-style', '')
    style.textContent = brandStyles(mascotImage)
    document.head.append(style)
    return () => { style.remove() }
  }, 'harness-brand: mascot styles')
}

/** Register the supported sidebar brand occupants ahead of the shipped entries. */
export function installBrandSlots(ctx: ClientContext): void {
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', function* () {
      yield ctx.slots.register({ name: 'sidebar.brand.mark', priority: -1 }, MascotBrandMark)
      yield ctx.slots.register({ name: 'sidebar.brand.name', priority: -1 }, MascotBrandName)
    }))
}

/** Install the sidebar brand mascot Client plugin. */
export function apply(ctx: ClientContext): void {
  installBrandStyles(ctx)
  installBrandSlots(ctx)
}
