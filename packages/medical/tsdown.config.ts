import { defineConfig } from 'tsdown'

const CLIENT_ID = '@proton1917/dsh-medical'

export default defineConfig([
  {
    entry: { index: 'src/index.ts', preset: 'src/preset.ts' },
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
    deps: {
      neverBundle: [
        '@deepseek-ai/cordis',
        '@deepseek-ai/dsh-api-remotes',
        '@deepseek-ai/dsh-api-remotes/client',
        '@deepseek-ai/dsh-api-session-controller',
        '@deepseek-ai/dsh-api-session-controller/client',
        '@deepseek-ai/dsh-api-workspace-controller',
        '@deepseek-ai/dsh-api-workspace-controller/client',
        '@deepseek-ai/dsh-client-connection',
        '@deepseek-ai/dsh-client-connection/client',
        '@deepseek-ai/dsh-client-locale',
        '@deepseek-ai/dsh-client-locale/client',
        '@deepseek-ai/dsh-client-ui-model-selection',
        '@deepseek-ai/dsh-client-ui-model-selection/client',
        '@deepseek-ai/dsh-client-ui-renderer',
        '@deepseek-ai/dsh-client-ui-renderer/client',
        '@deepseek-ai/dsh-client-ui-settings',
        '@deepseek-ai/dsh-client-ui-settings/client',
        '@deepseek-ai/dsh-client-ui-sidebar',
        '@deepseek-ai/dsh-client-ui-sidebar/client',
        'react',
        'react-dom',
        'react/jsx-runtime',
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
