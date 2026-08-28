import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'

/** Isolated class-based stylesheet for the medical settings row and case desk. */
export const MEDICAL_STYLES = `
.dsh-medical-footer-button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 34px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-subtle);
  border-radius: 11px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-button-tool-bar-fill-invisible);
  font: var(--dsw-font-s-14);
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease, transform 150ms ease;
}
.dsh-medical-footer-button:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l2);
  transform: translateY(-1px);
}
.dsh-medical-mark {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-family: ui-serif, 'Songti SC', serif;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}
.dsh-medical-mark::after {
  content: '';
  position: absolute;
  right: -3px;
  bottom: -2px;
  width: 5px;
  height: 5px;
  border: 1px solid var(--dsw-alias-bg-base);
  border-radius: 50%;
  background: var(--dsw-alias-state-success-primary);
}
.dsh-medical-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 70px;
  padding: 12px 0;
  border-bottom: 1px solid var(--dsw-alias-border-subtle);
}
.dsh-medical-settings-copy { min-width: 0; }
.dsh-medical-settings-title {
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-base-strong-16);
}
.dsh-medical-settings-desc,
.dsh-medical-settings-route {
  margin-top: 4px;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-s-14);
}
.dsh-medical-settings-route { font-family: var(--dsw-font-mono); font-size: 11px; }
.dsh-medical-settings-route-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.dsh-medical-route-edit,
.dsh-medical-route-actions button {
  border: 1px solid var(--dsw-alias-border-subtle);
  border-radius: 8px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  cursor: pointer;
  font: var(--dsw-font-s-14);
}
.dsh-medical-route-edit { margin-top: 4px; padding: 3px 8px; font-size: 11px; }
.dsh-medical-route-editor { display: grid; gap: 8px; margin-top: 10px; }
.dsh-medical-route-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
.dsh-medical-route-fields label { display: grid; gap: 4px; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.dsh-medical-route-fields input {
  min-width: 0;
  padding: 7px 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-specific-input-major);
  font-family: var(--dsw-font-mono);
  font-size: 11px;
}
.dsh-medical-route-help { color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dsh-medical-route-error { color: var(--dsw-alias-state-error-primary); font-size: 11px; }
.dsh-medical-route-actions { display: flex; justify-content: flex-end; gap: 8px; }
.dsh-medical-route-actions button { padding: 5px 10px; }
.dsh-medical-route-actions button:disabled { cursor: not-allowed; opacity: .48; }
.dsh-medical-switch {
  position: relative;
  flex: none;
  width: 46px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-3);
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease;
}
.dsh-medical-switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--dsw-alias-label-quaternary);
  box-shadow: 0 2px 7px color-mix(in srgb, var(--dsw-alias-label-primary) 18%, transparent);
  transition: transform 180ms cubic-bezier(.2,.8,.2,1), background 160ms ease;
}
.dsh-medical-switch[aria-checked='true'] {
  border-color: var(--dsw-alias-state-success-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 28%, var(--dsw-alias-bg-layer-2));
}
.dsh-medical-switch[aria-checked='true']::after {
  transform: translateX(20px);
  background: var(--dsw-alias-state-success-primary);
}
.dsh-medical-switch:disabled { cursor: not-allowed; opacity: .48; }
.dsh-medical-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  padding: 22px;
  background: color-mix(in srgb, var(--dsw-alias-bg-mask-drop) 78%, transparent);
  backdrop-filter: blur(16px) saturate(.82);
  animation: dsh-medical-fade 180ms ease-out both;
}
.dsh-medical-desk {
  --dsh-medical-accent: var(--dsw-alias-state-success-primary);
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(940px, calc(100vw - 44px));
  max-height: min(900px, calc(100vh - 44px));
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 24px;
  color: var(--dsw-alias-label-primary);
  background:
    linear-gradient(var(--dsw-alias-border-subtle) 1px, transparent 1px),
    linear-gradient(90deg, var(--dsw-alias-border-subtle) 1px, transparent 1px),
    var(--dsw-alias-bg-overlay);
  background-size: 24px 24px, 24px 24px, auto;
  box-shadow: 0 32px 96px color-mix(in srgb, var(--dsw-alias-label-primary) 26%, transparent);
  animation: dsh-medical-rise 220ms cubic-bezier(.2,.75,.2,1) both;
}
.dsh-medical-header {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  padding: 28px 32px 22px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  background: color-mix(in srgb, var(--dsw-alias-bg-overlay) 92%, transparent);
}
.dsh-medical-header::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: var(--dsh-medical-accent);
}
.dsh-medical-eyebrow {
  color: var(--dsh-medical-accent);
  font-family: var(--dsw-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
}
.dsh-medical-heading {
  margin: 5px 0 0;
  font-family: 'Iowan Old Style', 'Songti SC', 'Noto Serif CJK SC', serif;
  font-size: clamp(27px, 4vw, 38px);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -.025em;
}
.dsh-medical-subtitle {
  margin-top: 8px;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-s-14);
}
.dsh-medical-close {
  width: 36px;
  height: 36px;
  border: 1px solid var(--dsw-alias-border-subtle);
  border-radius: 50%;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  font-size: 22px;
  cursor: pointer;
}
.dsh-medical-body {
  overflow: auto;
  padding: 26px 32px 32px;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent;
}
.dsh-medical-privacy {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--dsw-alias-state-warn-primary);
  border-radius: 14px;
  background: var(--dsw-alias-state-warn-tertiary);
}
.dsh-medical-privacy-index {
  color: var(--dsw-alias-state-warn-label);
  font-family: var(--dsw-font-mono);
  font-size: 11px;
  font-weight: 700;
}
.dsh-medical-privacy strong { display: block; font-size: 13px; }
.dsh-medical-privacy p { margin: 3px 0 0; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.55; }
.dsh-medical-route-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0 4px;
}
.dsh-medical-pill {
  padding: 5px 9px;
  border: 1px solid var(--dsw-alias-border-subtle);
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  font-family: var(--dsw-font-mono);
  font-size: 10px;
}
.dsh-medical-section { margin-top: 28px; }
.dsh-medical-section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 13px;
  color: var(--dsh-medical-accent);
  font-family: var(--dsw-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.dsh-medical-section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--dsw-alias-border-subtle);
}
.dsh-medical-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.dsh-medical-field { display: grid; gap: 7px; }
.dsh-medical-field-wide { grid-column: 1 / -1; }
.dsh-medical-field label {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  font-weight: 600;
}
.dsh-medical-input,
.dsh-medical-select,
.dsh-medical-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  color: var(--dsw-alias-label-primary);
  background: color-mix(in srgb, var(--dsw-specific-input-major) 88%, transparent);
  font: var(--dsw-font-s-14);
  outline: none;
  transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
}
.dsh-medical-input,
.dsh-medical-select { height: 42px; padding: 0 12px; }
.dsh-medical-textarea { min-height: 94px; padding: 11px 12px; line-height: 1.55; resize: vertical; }
.dsh-medical-input:focus,
.dsh-medical-select:focus,
.dsh-medical-textarea:focus {
  border-color: var(--dsh-medical-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsh-medical-accent) 16%, transparent);
  background: var(--dsw-alias-bg-layer-1);
}
.dsh-medical-modes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.dsh-medical-mode {
  min-height: 82px;
  padding: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 14px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
  text-align: left;
  cursor: pointer;
}
.dsh-medical-mode[aria-pressed='true'] {
  border-color: var(--dsh-medical-accent);
  background: color-mix(in srgb, var(--dsh-medical-accent) 11%, var(--dsw-alias-bg-layer-2));
  box-shadow: inset 0 0 0 1px var(--dsh-medical-accent);
}
.dsh-medical-mode strong { display: block; font-size: 13px; }
.dsh-medical-mode span { display: block; margin-top: 5px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1.35; }
.dsh-medical-upload {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px dashed var(--dsw-alias-border-l2);
  border-radius: 14px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 76%, transparent);
}
.dsh-medical-upload-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  height: 34px;
  padding: 0 11px;
  border: 1px solid var(--dsh-medical-accent);
  border-radius: 10px;
  color: var(--dsh-medical-accent);
  background: var(--dsw-alias-bg-layer-1);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.dsh-medical-upload-button input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.dsh-medical-upload-hint { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1.5; }
.dsh-medical-image-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.dsh-medical-image-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 260px;
  padding: 6px 8px 6px 10px;
  border: 1px solid var(--dsw-alias-border-subtle);
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  font-size: 11px;
}
.dsh-medical-image-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-medical-image-chip button {
  flex: none;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--dsw-alias-label-tertiary);
  background: transparent;
  cursor: pointer;
}
.dsh-medical-image-chip button:hover { color: var(--dsw-alias-label-error); background: var(--dsw-alias-interactive-bg-hover-danger); }
.dsh-medical-error {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--dsw-alias-label-error);
  background: var(--dsw-alias-state-error-secondary);
  font-size: 12px;
}
.dsh-medical-disabled {
  margin: 32px auto;
  max-width: 520px;
  padding: 28px;
  border: 1px dashed var(--dsw-alias-border-l2);
  border-radius: 18px;
  background: var(--dsw-alias-bg-layer-2);
  text-align: center;
}
.dsh-medical-disabled h3 { margin: 0; font-family: 'Iowan Old Style', 'Songti SC', serif; font-size: 24px; }
.dsh-medical-disabled p { margin: 10px 0 0; color: var(--dsw-alias-label-tertiary); line-height: 1.6; }
.dsh-medical-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 22px;
  padding: 18px 32px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  background: color-mix(in srgb, var(--dsw-alias-bg-overlay) 94%, transparent);
}
.dsh-medical-footer-copy { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1.5; }
.dsh-medical-submit {
  min-width: 220px;
  height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 12px;
  color: var(--dsw-alias-label-inverse);
  background: var(--dsh-medical-accent);
  font: var(--dsw-font-s-strong-14);
  cursor: pointer;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--dsh-medical-accent) 26%, transparent);
}
.dsh-medical-submit:disabled { cursor: wait; opacity: .58; }
.dsh-medical-disclaimer {
  grid-column: 1 / -1;
  color: var(--dsw-alias-label-quaternary);
  font-size: 10px;
  text-align: right;
}
@keyframes dsh-medical-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes dsh-medical-rise { from { opacity: 0; transform: translateY(12px) scale(.985); } to { opacity: 1; transform: none; } }
@media (max-width: 760px) {
  .dsh-medical-overlay { padding: 0; place-items: stretch; }
  .dsh-medical-desk { width: 100vw; max-height: 100vh; min-height: 100vh; border: 0; border-radius: 0; }
  .dsh-medical-header, .dsh-medical-body, .dsh-medical-footer { padding-left: 18px; padding-right: 18px; }
  .dsh-medical-grid, .dsh-medical-modes { grid-template-columns: 1fr; }
  .dsh-medical-footer { grid-template-columns: 1fr; }
  .dsh-medical-submit { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-medical-overlay, .dsh-medical-desk { animation: none; }
  .dsh-medical-footer-button, .dsh-medical-switch, .dsh-medical-switch::after { transition: none; }
}
`

/** Install and fully dispose the medical plugin stylesheet. */
export function installMedicalStyles(ctx: ClientContext): void {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-dsh-medical-style', '')
    style.textContent = MEDICAL_STYLES
    document.head.append(style)
    return () => { style.remove() }
  }, 'medical: client styles')
}
