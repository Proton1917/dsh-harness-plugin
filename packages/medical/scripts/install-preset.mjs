#!/usr/bin/env node

import { access, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, stringify } from 'yaml'

const MARKER = '.managed-by-proton1917-dsh-medical'
const BUNDLE = '@proton1917/dsh-medical-preset'
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const source = join(packageRoot, 'agent-presets', 'medical')
const configuredHome = process.env.DSH_HOME?.trim()
const dshHomeInput = configuredHome === undefined || configuredHome === ''
  ? join(homedir(), '.dsh')
  : configuredHome.startsWith('~/') ? join(homedir(), configuredHome.slice(2)) : configuredHome
const dshHome = resolve(dshHomeInput)
const target = join(dshHome, '.agent-presets', 'medical')
const marker = join(target, MARKER)
const action = process.argv[2] ?? 'install'

if (!['install', 'remove', '--remove'].includes(action)) {
  throw new Error('Usage: dsh-medical-preset [install|remove]')
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

function plugin(...args) {
  execFileSync('dsh', ['plugin', '--profile', 'web', ...args], { stdio: 'inherit' })
}

if (action === 'remove' || action === '--remove') {
  if (!await exists(target)) {
    process.stdout.write(`Medical Agent Preset is already absent: ${target}\n`)
    process.exit(0)
  }
  if (!await exists(marker)) {
    throw new Error(`Refusing to remove unmanaged Agent Preset directory: ${target}`)
  }
  if (await exists(join(target, 'package.json'))) plugin('remove', BUNDLE)
  await rm(target, { recursive: true })
  process.stdout.write(`Removed Medical Agent Preset: ${target}\n`)
  process.exit(0)
}

if (await exists(target) && !await exists(marker)) {
  throw new Error(`Refusing to overwrite unmanaged Agent Preset directory: ${target}`)
}
const metadata = parse(await readFile(join(source, 'preset.yml'), 'utf8'))
const plugins = parse(await readFile(join(source, 'agent.cordis.yml'), 'utf8'))
const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
await mkdir(target, { recursive: true })
for (const name of ['agent.cordis.yml', 'preset.yml']) {
  await copyFile(join(source, name), join(target, name))
}
await writeFile(join(target, 'cordis.patch.yml'), stringify([{ insert: [{
  id: 'preset-medical',
  name: '@deepseek-ai/dsh-agent-preset',
  config: { id: 'medical', ...metadata, plugins },
}] }]))
await writeFile(join(target, 'package.json'), JSON.stringify({
  name: BUNDLE,
  version: manifest.version,
  private: true,
  type: 'module',
  dsh: { bundle: { patch: './cordis.patch.yml' } },
  dependencies: {
    '@deepseek-ai/dsh-agent-preset': manifest.devDependencies['@deepseek-ai/dsh-agent-preset'],
    '@proton1917/dsh-medical': `link:${packageRoot}`,
  },
}, null, 2) + '\n')
await writeFile(marker, `@proton1917/dsh-medical ${manifest.version}\n`, 'utf8')
plugin('add', target)
process.stdout.write(`Installed Medical Agent Preset bundle: ${target}\n`)
