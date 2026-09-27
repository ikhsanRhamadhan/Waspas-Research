import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Shared package berisi TS source, jadi harus ikut di-bundle agar tidak dicari dari node_modules.
  noExternal: ['@spk-bansos/shared'],
});
