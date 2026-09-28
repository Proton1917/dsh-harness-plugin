/** 统计按钮和弹窗使用 Harness 的语义颜色与字体尺寸。 */
export const LIVE_STATS_STYLE = `
.dsh-live-stats {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  min-width: 0; max-width: 100%; box-sizing: border-box;
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 1px);
  line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px));
}
.dsh-live-stat-anchor { display: inline-flex; min-width: 0; }
.dsh-live-stat-anchor > span { min-width: 0; }
.dsh-live-stat-pill {
  display: inline-flex; align-items: center; gap: 6px; box-sizing: border-box;
  max-width: 100%; padding: 1px 8px; border: 0; border-radius: 999px;
  background: transparent; color: var(--dsw-alias-label-tertiary);
  font: inherit; font-variant-numeric: tabular-nums; line-height: inherit;
  white-space: nowrap; cursor: pointer;
}
.dsh-live-stat-pill:hover, .dsh-live-stat-pill[aria-expanded='true'] {
  background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary);
}
.dsh-live-stat-pill svg, .dsh-live-stat-title svg { width: 14px; height: 14px; flex: none; }
.dsh-live-stat-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.dsh-live-stat-panel {
  position: fixed; z-index: 1100; box-sizing: border-box; width: max-content;
  min-width: min(300px, calc(100vw - 24px)); max-width: min(440px, calc(100vw - 24px));
  max-height: calc(100vh - 24px); overflow: auto; padding: 16px;
  border: 0; border-radius: var(--dsw-radius-lg); background: var(--dsw-specific-menu);
  backdrop-filter: var(--dsw-menu-backdrop-filter);
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1);
  box-shadow: var(--dsw-elevation-prominent); font-size: 12px; line-height: 18px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-live-stat-title {
  display: flex; align-items: center; gap: 6px; margin-bottom: 10px; padding-bottom: 10px;
  border-bottom: .5px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); font-weight: 500;
}
.dsh-live-stat-details { display: grid; grid-template-columns: minmax(76px, auto) minmax(0, 1fr); gap: 6px 16px; margin: 0; }
.dsh-live-stat-details dt { margin: 0; color: var(--dsw-alias-label-tertiary); }
.dsh-live-stat-details dd { margin: 0; min-width: 0; text-align: right; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
`
