# AGENTS.md

This open-source repository owns independently installable DeepSeek Harness plugins. It is a pnpm workspace installed into local profiles by linking individual `packages/*` directories and remains separate from the upstream Harness fork.

## Repository scope

- Keep exactly four plugin packages in this repository: `@proton1917/dsh-live-stats`, `@proton1917/dsh-web-background`, `@proton1917/dsh-brand-mascot`, and `@proton1917/dsh-medical`.
- Each `packages/*` directory owns one npm package, one `dsh.bundle` patch, one Cordis plugin row, and its own Host/Client lifecycle. The workspace root is not a DSH plugin and must not declare `dsh.bundle`.
- Keep the four packages independent. Do not import source files or mutable runtime state across package directories; shared behavior must first justify a separate shared package rather than an implicit coupling.
- Future capabilities belong in new packages under this repository, not inside an unrelated current package. Update this file, the root README, workspace configuration, and Profile installation procedure in the same change.
- Do not copy these packages, their images, or their source into `~/deepseek-harness/packages/`. Upstream Harness updates must remain independent of this repository.
- Public redistribution of both repository-owned image derivatives is authorized under BSD-3-Clause. Preserve the root and package-level asset notices and do not imply rights in third-party trademarks, characters, or source works beyond that authorization.

## Package ownership

- `packages/live-stats` owns the replayable live token projection, DeepSeek tokenizer, cache/latency/token row, TPS row, locale namespace, and their tests.
- `packages/web-background` owns `background.webp`, conversation-aligned backdrop DOM, semantic theme-token overrides, and their tests.
- `packages/brand-mascot` owns `mascot.webp`, official-wordmark and collapsed-rail fish detection, mascot-card and portrait-mark DOM/CSS treatment, and their tests.
- `packages/medical` owns medical admission settings, `/medical-analyze`, the one-request structured-case scope, the `medical` Agent Preset source and sync script, persistent Medical-mode routing, case validation and prompt rendering, the sidebar structured-case desk, the General settings row, and their tests.
- Every package exposes `./client` only when it has a browser half. Browser-only packages retain an empty Host `apply()` so the Loader owns their activation and lifecycle.
- Every package keeps exact dependency and `dsh.client.inject` metadata for the services it actually consumes. Client injection metadata never substitutes for `slots.inject()` when registering into a slot declared by another package.

## Product invariants

- `packages/web-background/src/assets/background.webp` is the blue-sky flower runtime background. Preserve the full composition and Retina-ready resolution; do not replace it with the brand portrait.
- The clear background layer is centered and sized from the live `[data-conversation-scroll]` rectangle. Sidebar collapse, expansion, detail panels, and window resizing must update that rectangle.
- `packages/brand-mascot/src/assets/mascot.webp` is the glasses-character brand portrait. In the expanded sidebar, display the full image underneath the complete official `DeepSeek HARNESS` wordmark. In the collapsed rail, reuse the full composition as a 26×34 rounded portrait mark and reveal the official panel toggle on hover; do not crop either treatment to the face.
- Keep text and input surfaces readable through semantic theme-token overrides and scrims. Preserve light, dark, high-contrast, and reduced-motion behavior.
- Register DOM, observers, slots, locale dictionaries, projections, and theme overrides through Cordis effects with complete disposal. Registrations into host-owned slots use `ctx.slots.inject()`. HMR must not accumulate duplicate nodes, styles, listeners, or registrations.
- Live token counts may estimate in-progress usage, but final provider usage replaces the estimate. TPS uses real streamed output deltas and arrival time rather than whole-response averages.
- Medical analysis is disabled by default. Disabling it rejects new structured submissions and new Medical-mode requests but never aborts an admitted turn. Every structured case creates a fresh `standard` DSH session, pins a deterministic title before the first prompt, records the case as a standard `user/message`, and uses `cc-api` / `claude-fable-5` / `high` for one request by default.
- The sidebar launcher owns structured input only. Unorganized direct submission belongs to the real `medical` Agent Preset, which appears fifth in the official preset roster. Its source lives under `packages/medical/agent-presets/medical`; the managed runtime copy lives under `${DSH_HOME:-$HOME/.dsh}/.agent-presets/medical`.
- Every medical request uses a complete medical system prompt, suppresses runtime context, exposes no tool schemas, and denies tool execution. A second model step for the same user message is rejected. Structured-case contributions unwind when the Agent returns to idle; Medical-mode policy persists only while the Agent remains composed on the `medical` preset.
- Medical input must be de-identified before submission. The UI warning is non-blocking; no name, identity number, phone number, address, hospital number, or other direct identifier belongs in a case. The model must not invent missing clinical facts, current guideline retrieval, PMID, DOI, or other unperformed-source claims.

## Local integration

- The `web` profile mounts `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, and each of the four personal plugin packages exactly once. Inspect `dsh --profile web --dump-config` before changing Profile wiring.
- Install and remove plugin links with `dsh plugin --profile web add <package-directory>` and `dsh plugin --profile web remove <package-name>`; never hand-edit generated Profile dependencies or bundle arrays.
- Install and remove the fifth mode with `pnpm run medical:preset:install` and `pnpm run medical:preset:remove`. The scripts may update or delete only a directory carrying their management marker; an unmanaged same-name preset is never overwritten or removed.
- QQ Bot lives in the separate `~/.dsh/profiles/qqbot` profile. Never commit its AppID, AppSecret, generated patch, or other credentials here.
- Treat upstream selector changes as compatibility work. If the official wordmark, collapsed fish, or conversation marker changes, update the narrow selector and preserve safe no-op behavior when the target is absent.

## Development and delivery

- Inspect `git status`, the active branch, and the relevant package source and tests before editing. Preserve unrelated user changes.
- Run `pnpm run ci`, `pnpm run pack:check`, and `git diff --check` after source, manifest, or asset changes. Asset-only changes still require a rebuild because images are inlined into each owning package's `lib/client.js`.
- Validate user-visible changes in the real Harness Web application. Check expanded and collapsed sidebars, background alignment, live statistics, the medical enable switch and case desk, four independently installed personal bundles, and absence of duplicate plugin DOM.
- Package-level acceptance includes an isolated install/remove check: removing one package must retract only that package's capability while the other three remain active. Removing the medical package also requires removing its managed Agent Preset first.
- Commit intentional changes, push the current feature branch to `Proton1917/dsh-harness-plugin`, and open or update the pull request that owns the change. Do not add an unrelated refactor to the brand/background repair pull request and do not claim `main` contains a change until it is merged.
