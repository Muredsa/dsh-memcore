import { defineConfig } from 'tsdown'

const CLIENT_ID = 'dsh-memcore'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    dts: true,
    format: 'esm',
    outDir: 'dist',
    platform: 'node',
    clean: true,
  },
  {
    entry: { client: 'src/client.tsx' },
    dts: true,
    format: 'cjs',
    outDir: 'dist',
    platform: 'browser',
    clean: false,
    plugins: [{
      name: 'dsh-client-react-external',
      resolveId(source: string) {
        return source === 'react' || source === 'react/jsx-runtime' ? { id: source, external: true } : null
      },
    }],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(CLIENT_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
