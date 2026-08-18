# AGENTS.md

This open-source repository owns the user's DeepSeek Harness extensions. It is installed into the local `web` profile by link and remains separate from the upstream Harness fork.

## Repository scope

- Keep one package named `@proton1917/dsh-harness-plugin` and one bundle entry named `harness-plugin`.
- Keep Host projection, live token and TPS UI, background, theme overrides, and brand treatment in this package. Do not create a `packages/` directory or split these features into separate repositories.
- Do not copy this source, its images, or its package into `~/deepseek-harness/packages/`. Upstream Harness updates must remain independent of this repository.
- Public redistribution of both repository-owned image derivatives is authorized under BSD-3-Clause. Preserve `ASSET_NOTICE.md` and do not imply rights in third-party trademarks, characters, or source works beyond that authorization.

## Product invariants

- `src/assets/background.webp` is the blue-sky flower runtime background. Preserve the full composition and Retina-ready resolution; do not replace it with the brand portrait.
- The clear background layer is centered and sized from the live `[data-conversation-scroll]` rectangle. Sidebar collapse, expansion, detail panels, and window resizing must update that rectangle.
- `src/assets/mascot.webp` is the glasses-character brand portrait. In the expanded sidebar, display the full image underneath the complete official `DeepSeek HARNESS` wordmark. In the collapsed rail, reuse the full composition as a 26×34 rounded portrait mark and reveal the official panel toggle on hover; do not crop either treatment to the face.
- Keep text and input surfaces readable through semantic theme-token overrides and scrims. Preserve light, dark, high-contrast, and reduced-motion behavior.
- Register DOM, observers, slots, locale dictionaries, projections, and theme overrides through Cordis effects with complete disposal. HMR must not accumulate duplicate nodes, styles, listeners, or registrations.
- Live token counts may estimate in-progress usage, but final provider usage replaces the estimate. TPS uses real streamed output deltas and arrival time rather than whole-response averages.

## Local integration

- The `web` profile mounts `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, and this package only once. Inspect `dsh --profile web --dump-config` before changing profile wiring.
- QQ Bot lives in the separate `~/.dsh/profiles/qqbot` profile. Never commit its AppID, AppSecret, generated patch, or other credentials here.
- Treat upstream selector changes as compatibility work. If the official wordmark, collapsed fish, or conversation marker changes, update the narrow selector and preserve safe no-op behavior when the target is absent.

## Development and delivery

- Inspect `git status`, the active branch, and the relevant source and tests before editing. Preserve unrelated user changes.
- Run `pnpm run ci`, `pnpm pack --dry-run`, and `git diff --check` after source or asset changes. Asset-only changes still require a rebuild because images are inlined into `lib/client.js`.
- Validate user-visible changes in the real Harness Web application. Check expanded and collapsed sidebars, background alignment, one installed personal bundle, and absence of duplicate plugin DOM.
- Commit intentional changes, push the current feature branch to `Proton1917/dsh-harness-plugin`, and update the existing pull request when one covers the work. Do not claim `main` contains a change until it is merged.
