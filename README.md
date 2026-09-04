# DSH Community Plugins

English | [中文](README.zh.md)

[![CI](https://github.com/Proton1917/dsh-harness-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/Proton1917/dsh-harness-plugin/actions/workflows/ci.yml)

This public repository contains four independently installable plugins for DeepSeek Harness. Each package owns one `dsh.bundle` layer and can be installed, removed, or upgraded without changing the Harness source tree. This is a third-party community project and is not an official DeepSeek product or endorsement.

## Plugins

| Package | What it adds |
|---|---|
| `@proton1917/dsh-live-stats` | Live input, output, total-token, cache, latency, and streaming-throughput statistics |
| `@proton1917/dsh-web-background` | A conversation-aligned background and semantic glass-theme overrides |
| `@proton1917/dsh-brand-mascot` | Optional sidebar mascot, brand treatment, and agent persona |
| `@proton1917/dsh-medical` | A disabled-by-default medical case desk and a toolless Medical Agent Preset |

The packages do not import source or mutable runtime state from one another. Removing one package retracts only the Cordis registrations, DOM, styles, projections, commands, or slots that it owns.

## Install the release packages

The `v0.1.0` release targets the registry-installable DSH `0.1.1-rc.2` line. Install one or more prebuilt tarballs directly into the Web Profile:

```sh
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-live-stats-0.1.0.tgz
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-web-background-0.1.0.tgz
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-brand-mascot-0.1.0.tgz
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-medical-0.1.0.tgz
```

Restart `dsh web` after changing Profile Bundle membership. Inspect the composed layers without starting the server:

```sh
dsh --profile web --dump-config
```

### Enable the Medical Agent Preset

The medical package ships a separate preset installer because user Agent Presets live outside Profile dependencies. Install the package first, then run:

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-medical-preset install
```

Open Settings → General, configure an exact Provider ID, Model ID, and reasoning effort available in the DSH model selector, then enable Medical case analysis. The current `main` checkout defaults to the OpenRouter route `anthropic / anthropic/claude-fable-5.1 / high`, locked to Anthropic; immutable `v0.1.0` assets retain their published defaults. The plugin accepts another configured DSH route and does not require Fable.

Before removing the medical package, remove its managed preset:

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-medical-preset remove
dsh plugin --profile web remove @proton1917/dsh-medical
```

The installer updates or removes only a directory carrying its management marker. It refuses to overwrite or delete an unmanaged `medical` preset.

## Install from a checkout

Clone the repository and install the package directories you want:

```sh
git clone https://github.com/Proton1917/dsh-harness-plugin.git
cd dsh-harness-plugin
pnpm install
pnpm run build
dsh plugin --profile web add ./packages/live-stats
dsh plugin --profile web add ./packages/web-background
dsh plugin --profile web add ./packages/brand-mascot
dsh plugin --profile web add ./packages/medical
pnpm run medical:preset:install
```

The workspace root is not a DSH Bundle and cannot be installed as a fifth package.

## Medical data and output boundaries

Medical analysis is off after installation. On the current `main` checkout, each structured case creates a fresh Medical-mode Session with a deterministic title and the standard Session Log. The same complete medical prompt, configured route, and history remain active for cache-friendly follow-up turns while no model-callable tools are exposed.

De-identify every case before submission. Do not enter names, identity numbers, phone numbers, addresses, hospital numbers, or other direct identifiers. Users remain responsible for organizational policy, patient authorization, provider data terms, and applicable law.

The output supports medical education, research, and clinician-reviewed decision support. Urgent findings require direct clinical assessment. The model must mark missing facts, avoid invented case details, and avoid claiming current guideline or literature retrieval that did not occur.

## Compatibility

The immutable `v0.1.0` release assets remain built and verified for DSH `0.1.1-rc.2`. The current `main` checkout targets DSH `0.1.2-rc.1`: its exact development dependencies use the npm `next` packages and its Client code follows the split Session Controller, Workspace Controller, Settings, and renderer APIs introduced in the `0.1.2` line. Use the release tarballs with rc.2 and install from the current checkout only with rc.1 until another release states otherwise.

## Development

```sh
pnpm install
pnpm run ci
pnpm run pack:check
git diff --check
```

`pnpm run ci` runs package type checks, unit tests, and builds. `pnpm run pack:check` inspects the files shipped by every tarball. User-visible changes also require validation in the real Harness Web application.

## Brand and licenses

The source is distributed under BSD-3-Clause. Tokenizer provenance is recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Image permissions and limitations are recorded in [ASSET_NOTICE.md](ASSET_NOTICE.md) and the package-level notices.

“DeepSeek Harness” identifies compatibility with the upstream project. The name and official brand materials remain subject to the upstream [brand guidelines](https://github.com/deepseek-ai/deepseek-harness/blob/master/BRAND_GUIDELINES.md). This repository does not claim official sponsorship, partnership, or endorsement.
