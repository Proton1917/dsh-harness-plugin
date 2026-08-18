import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import mascotImage from '../assets/mascot.webp'

const BRAND_ATTRIBUTE = 'data-dsh-brand-mascot'
const RAIL_ATTRIBUTE = 'data-dsh-brand-mascot-rail'
const BRAND_WORDMARK_SELECTOR = 'svg[viewBox="0 0 182 24"]'
const RAIL_FISH_SELECTOR = 'svg[viewBox="0 0 23.16 17.04"]'

/**
 * Build the isolated brand-card stylesheet.
 * @param imageUrl - bundled data URL for the user-supplied portrait artwork.
 * @returns CSS for the expanded brand card and collapsed portrait mark.
 */
export function brandStyles(imageUrl: string): string {
  return `
button[${BRAND_ATTRIBUTE}] {
  position: relative;
  isolation: isolate;
  flex: 1 1 auto;
  align-items: flex-end;
  justify-content: center;
  gap: 0;
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
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    filter 160ms ease;
}

div:has(> button[${BRAND_ATTRIBUTE}]) {
  height: 340px;
}

button[${BRAND_ATTRIBUTE}] > ${BRAND_WORDMARK_SELECTOR} {
  position: relative;
  z-index: 2;
  flex: none;
  width: min(182px, calc(100% - 8px));
  height: auto;
  margin: 0;
  color: inherit;
  filter: drop-shadow(0 1px 3px rgba(1, 5, 18, 0.96));
}

button[${BRAND_ATTRIBUTE}]::before,
button[${BRAND_ATTRIBUTE}]::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

button[${BRAND_ATTRIBUTE}]::before {
  z-index: 0;
  background-image:
    radial-gradient(circle at 76% 10%, rgba(255, 255, 255, 0.38), transparent 34%),
    url("${imageUrl}");
  background-position: center, center;
  background-repeat: no-repeat;
  background-size: cover, cover;
}

button[${BRAND_ATTRIBUTE}]::after {
  z-index: 1;
  background:
    linear-gradient(180deg, rgba(5, 10, 25, 0.04) 0%, rgba(5, 10, 25, 0.20) 46%, rgba(5, 10, 25, 0.90) 100%),
    linear-gradient(90deg, rgba(4, 9, 23, 0.28) 0%, transparent 42%, rgba(4, 9, 23, 0.16) 100%);
}

body[data-ds-dark-theme] button[${BRAND_ATTRIBUTE}] {
  border-color: rgba(132, 160, 235, 0.54);
  box-shadow:
    0 0 0 1px rgba(101, 133, 222, 0.10),
    0 7px 22px rgba(0, 5, 22, 0.46),
    inset 0 1px rgba(255, 255, 255, 0.24);
  filter: brightness(0.98) saturate(0.98);
}

button[${BRAND_ATTRIBUTE}]:hover {
  border-color: rgba(145, 178, 255, 0.92);
  box-shadow:
    0 0 0 1px rgba(123, 157, 245, 0.24),
    0 9px 24px rgba(33, 58, 133, 0.40),
    inset 0 1px rgba(255, 255, 255, 0.44);
  filter: brightness(1.06) saturate(1.06);
  transform: translateY(-2px);
}

button[${BRAND_ATTRIBUTE}]:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}

button[${RAIL_ATTRIBUTE}] {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

button[${RAIL_ATTRIBUTE}]::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: 1px;
  left: 5px;
  width: 26px;
  height: 34px;
  box-sizing: border-box;
  pointer-events: none;
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
  opacity: 1;
  transform: scale(1);
  transition: opacity 120ms ease, transform 120ms ease;
}

button[${RAIL_ATTRIBUTE}] > ${RAIL_FISH_SELECTOR} {
  position: relative;
  z-index: 1;
  opacity: 0;
}

button[${RAIL_ATTRIBUTE}] > svg:not(${RAIL_FISH_SELECTOR}) {
  position: relative;
  z-index: 1;
}

button[${RAIL_ATTRIBUTE}]:hover::before {
  opacity: 0;
  transform: scale(0.88);
}

@media (prefers-contrast: more) {
  button[${BRAND_ATTRIBUTE}] {
    border-width: 2px;
  }

  button[${BRAND_ATTRIBUTE}]::after {
    background: linear-gradient(180deg, transparent 28%, rgba(1, 5, 18, 0.96) 100%);
  }

  button[${RAIL_ATTRIBUTE}]::before {
    border-width: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  button[${BRAND_ATTRIBUTE}] {
    transition: none;
  }

  button[${RAIL_ATTRIBUTE}]::before {
    transition: none;
  }
}
`
}

function markLogoButtons(
  root: ParentNode,
  selector: string,
  attribute: string,
  marked: Set<HTMLButtonElement>,
): void {
  const logos: Element[] = []
  if (root instanceof Element && root.matches(selector)) logos.push(root)
  logos.push(...root.querySelectorAll(selector))

  for (const logo of logos) {
    const button = logo.parentElement
    if (!(button instanceof HTMLButtonElement) || logo.parentElement !== button) continue
    button.setAttribute(attribute, '')
    marked.add(button)
  }
}

function hasDirectLogo(button: HTMLButtonElement, selector: string): boolean {
  return Array.from(button.children).some(child => child.matches(selector))
}

/** Install the portrait brand card and track wordmarks mounted after client activation. */
export function installBrandMascot(ctx: ClientContext): void {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-dsh-brand-mascot-style', '')
    style.textContent = brandStyles(mascotImage)
    document.head.append(style)

    const markedCards = new Set<HTMLButtonElement>()
    const markedRailButtons = new Set<HTMLButtonElement>()
    markLogoButtons(document, BRAND_WORDMARK_SELECTOR, BRAND_ATTRIBUTE, markedCards)
    markLogoButtons(document, RAIL_FISH_SELECTOR, RAIL_ATTRIBUTE, markedRailButtons)

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue
          markLogoButtons(node, BRAND_WORDMARK_SELECTOR, BRAND_ATTRIBUTE, markedCards)
          markLogoButtons(node, RAIL_FISH_SELECTOR, RAIL_ATTRIBUTE, markedRailButtons)
        }
        if (record.target instanceof HTMLButtonElement
          && markedRailButtons.has(record.target)
          && !hasDirectLogo(record.target, RAIL_FISH_SELECTOR)) {
          record.target.removeAttribute(RAIL_ATTRIBUTE)
          markedRailButtons.delete(record.target)
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      for (const button of markedCards) button.removeAttribute(BRAND_ATTRIBUTE)
      for (const button of markedRailButtons) button.removeAttribute(RAIL_ATTRIBUTE)
      style.remove()
    }
  }, 'harness-brand: mascot card')
}
