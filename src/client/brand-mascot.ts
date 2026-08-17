import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import mascotImage from '../assets/mascot.webp'

const BRAND_ATTRIBUTE = 'data-dsh-brand-mascot'
const BRAND_WORDMARK_SELECTOR = 'svg[viewBox="0 0 182 24"]'

/**
 * Build the isolated brand-card stylesheet.
 * @param imageUrl - bundled data URL for the user-supplied square portrait.
 * @returns CSS that places the official wordmark over the full mascot card.
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
  height: 104px;
  min-height: 104px;
  padding: 0 12px 12px;
  box-sizing: border-box;
  overflow: hidden !important;
  border: 1px solid rgba(111, 143, 220, 0.72);
  border-radius: 20px;
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
  height: 120px;
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
  background-position: center, center 31%;
  background-repeat: no-repeat;
  background-size: cover, cover;
  transform: scale(1.02);
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

@media (prefers-contrast: more) {
  button[${BRAND_ATTRIBUTE}] {
    border-width: 2px;
  }

  button[${BRAND_ATTRIBUTE}]::after {
    background: linear-gradient(180deg, transparent 28%, rgba(1, 5, 18, 0.96) 100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  button[${BRAND_ATTRIBUTE}] {
    transition: none;
  }
}
`
}

function markWordmarks(root: ParentNode, marked: Set<HTMLButtonElement>): void {
  const wordmarks: Element[] = []
  if (root instanceof Element && root.matches(BRAND_WORDMARK_SELECTOR)) wordmarks.push(root)
  wordmarks.push(...root.querySelectorAll(BRAND_WORDMARK_SELECTOR))

  for (const wordmark of wordmarks) {
    const button = wordmark.parentElement
    if (!(button instanceof HTMLButtonElement) || wordmark.parentElement !== button) continue
    button.setAttribute(BRAND_ATTRIBUTE, '')
    marked.add(button)
  }
}

/** Install the portrait brand card and track wordmarks mounted after client activation. */
export function installBrandMascot(ctx: ClientContext): void {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-dsh-brand-mascot-style', '')
    style.textContent = brandStyles(mascotImage)
    document.head.append(style)

    const marked = new Set<HTMLButtonElement>()
    markWordmarks(document, marked)

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) markWordmarks(node, marked)
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      for (const button of marked) button.removeAttribute(BRAND_ATTRIBUTE)
      style.remove()
    }
  }, 'harness-brand: mascot card')
}
