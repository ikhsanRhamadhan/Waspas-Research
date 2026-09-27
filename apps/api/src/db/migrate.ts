import { migrate } from 'drizzle-orm/pglite/migrator';

import { closeDatabase, db } from './client';

/** Dijalankan otomatis saat server boot supaya schema selalu sinkron dengan kode. */
export const runMigrations = async (): Promise<void> => {
  await migrate(db, { migrationsFolder: './drizzle' });
};

const run = async (): Promise<void> => {
  console.log('Menjalankan migrasi database...');
  await runMigrations();
  console.log('Migrasi selesai.');
  await closeDatabase();
};

if (process.argv[1]?.includes('migrate')) {
  run().catch((error: unknown) => {
    console.error('Migrasi gagal:', error);
    process.exit(1);
  });
}
