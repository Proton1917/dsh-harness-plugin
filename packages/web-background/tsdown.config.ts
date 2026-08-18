import { defineConfig } from 'tsdown'

const CLIENT_ID = '@proton1917/dsh-web-background'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    clean: false,
    dts: false,
  },
  {
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    clean: false,
    dts: false,
    sourcemap: true,
    loader: {
      '.webp': 'dataurl',
    },
    deps: {
      neverBundle: [
        '@deepseek-ai/cordis',
        '@deepseek-ai/dsh-client-runtime',
        '@deepseek-ai/dsh-client-runtime/client',
        '@deepseek-ai/dsh-client-ui-theme',
        '@deepseek-ai/dsh-client-ui-theme/client',
      ],
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(CLIENT_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
