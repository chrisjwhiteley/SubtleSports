import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],   // shebang (#!/usr/bin/env node) is preserved from here
  format: ['esm'],            // package is "type": "module" -> emits dist/index.js
  target: 'node18',           // we rely on global fetch (Node 18+)
  outDir: 'dist',
  clean: true,
  dts: false,
  splitting: false,
  minify: false,
  // react and ink stay external (installed as dependencies at consume time),
  // which tsup does automatically for anything in "dependencies".
});
