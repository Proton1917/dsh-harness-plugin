import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import mascotImage from '../assets/mascot.webp'

const BRAND_ATTRIBUTE = 'data-dsh-brand-mascot'
const BRAND_WORDMARK_SELECTOR = 'svg[viewBox="0 0 182 24"]'

/**
 * Build the isolated mascot badge stylesheet.
 * @param imageUrl - bundled data URL for the user-supplied square portrait.
 * @returns CSS that replaces only the HARNESS plate of the official wordmark.
 */
export function brandStyles(imageUrl: string): string {
  return `
button[${BRAND_ATTRIBUTE}] {
  gap: 6px;
  min-height: 84px;
  overflow: visible !important;
}

div:has(> button[${BRAND_ATTRIBUTE}]) {
  height: 100px;
}

button[${BRAND_ATTRIBUTE}] > ${BRAND_WORDMARK_SELECTOR} {
  flex: none;
  clip-path: inset(0 60px 0 0);
  margin-right: -60px;
}

button[${BRAND_ATTRIBUTE}]::after {
  content: 'HARNESS';
  flex: none;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: clamp(72px, calc(100% - 128px), 84px);
  height: 84px;
  padding: 0 0 5px 0.1em;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid rgba(111, 143, 220, 0.72);
  border-radius: 18px;
  color: rgba(249, 251, 255, 0.98);
  font-family: ui-monospace, 'SFMono-Regular', monospace;
  font-size: 8px;
  font-weight: 700;
  line-height: 9px;
  letter-spacing: 0.1em;
  text-indent: 0.1em;
  text-shadow: 0 1px 3px rgba(1, 5, 18, 0.95);
  background-image:
    linear-gradient(180deg, transparent 48%, rgba(5, 10, 25, 0.12) 60%, rgba(5, 10, 25, 0.90) 100%),
    radial-gradient(circle at 72% 8%, rgba(255, 255, 255, 0.42), transparent 35%),
    url("${imageUrl}");
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  box-shadow:
    0 0 0 1px rgba(109, 141, 223, 0.12),
    0 5px 14px rgba(20, 37, 90, 0.28),
    inset 0 1px rgba(255, 255, 255, 0.36);
  transform: translateY(0);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    filter 160ms ease;
}

body[data-ds-dark-theme] button[${BRAND_ATTRIBUTE}]::after {
  border-color: rgba(132, 160, 235, 0.54);
  box-shadow:
    0 0 0 1px rgba(101, 133, 222, 0.10),
    0 5px 16px rgba(0, 5, 22, 0.42),
    inset 0 1px rgba(255, 255, 255, 0.24);
  filter: brightness(0.98) saturate(0.98);
}

button[${BRAND_ATTRIBUTE}]:hover::after {
  border-color: rgba(145, 178, 255, 0.92);
  box-shadow:
    0 0 0 1px rgba(123, 157, 245, 0.24),
    0 7px 18px rgba(33, 58, 133, 0.36),
    inset 0 1px rgba(255, 255, 255, 0.44);
  filter: brightness(1.06) saturate(1.06);
  transform: translateY(-2px);
}

button[${BRAND_ATTRIBUTE}]:focus-visible::after {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}

@media (prefers-contrast: more) {
  button[${BRAND_ATTRIBUTE}]::after {
    border-width: 2px;
    background-image:
      linear-gradient(180deg, transparent 42%, rgba(1, 5, 18, 0.95) 100%),
      url("${imageUrl}");
  }
}

@media (prefers-reduced-motion: reduce) {
  button[${BRAND_ATTRIBUTE}]::after {
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

/** Install the portrait badge and track wordmarks mounted after client activation. */
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
  }, 'web-brand-mascot: wordmark badge')
}
