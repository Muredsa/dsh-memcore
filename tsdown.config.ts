import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client.tsx',
  },
  dts: true,
  format: 'esm',
  outDir: 'dist',
  external: ['react'],
  clean: true,
})
