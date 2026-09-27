import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import { env } from '../config/env';

/**
 * Menghapus direktori data PGlite. Karena isinya database lokal, langkah ini
 * equivalen DROP DATABASE — hanya untuk-development, tidak pernah dipakai di produksi.
 */
const run = async (): Promise<void> => {
  if (env.isProduction) {
    throw new Error('db:reset dilarang dijalankan pada NODE_ENV=production');
  }

  const target = resolve(process.cwd(), env.PGLITE_DATA_DIR);
  await rm(target, { recursive: true, force: true });
  console.log(`Direktori data PGlite dihapus: ${target}`);
};

run().catch((error: unknown) => {
  console.error('Reset database gagal:', error);
  process.exit(1);
});
