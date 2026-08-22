import { access, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MARKER = '.managed-by-proton1917-dsh-medical'
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const source = join(packageRoot, 'agent-presets', 'medical')
const configuredHome = process.env.DSH_HOME?.trim()
const dshHomeInput = configuredHome === undefined || configuredHome === ''
  ? join(homedir(), '.dsh')
  : configuredHome.startsWith('~/') ? join(homedir(), configuredHome.slice(2)) : configuredHome
const dshHome = resolve(dshHomeInput)
const target = join(dshHome, '.agent-presets', 'medical')
const marker = join(target, MARKER)

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

if (process.argv.includes('--remove')) {
  if (!await exists(target)) {
    process.stdout.write(`Medical Agent Preset is already absent: ${target}\n`)
    process.exit(0)
  }
  if (!await exists(marker)) {
    throw new Error(`Refusing to remove unmanaged Agent Preset directory: ${target}`)
  }
  await rm(target, { recursive: true })
  process.stdout.write(`Removed Medical Agent Preset: ${target}\n`)
  process.exit(0)
}

if (await exists(target) && !await exists(marker)) {
  throw new Error(`Refusing to overwrite unmanaged Agent Preset directory: ${target}`)
}
await mkdir(target, { recursive: true })
for (const name of ['agent.cordis.yml', 'preset.yml']) {
  await copyFile(join(source, name), join(target, name))
}
const version = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8')).version
await writeFile(marker, `@proton1917/dsh-medical ${version}\n`, 'utf8')
process.stdout.write(`Installed Medical Agent Preset: ${target}\n`)
