import { closeDatabase } from '../db/client';
import { runMigrations } from '../db/migrate';
import { bersihkan, jalankanSeed } from '../db/seed/data';

/**
 * Menyiapkan database uji yang bersih: migrasi lalu seed. Dipanggil di `beforeAll`
 * supaya seluruh rangkaian uji memakai data demo yang sama.
 */
export const siapkanDatabaseUji = async (): Promise<void> => {
  await runMigrations();
  await bersihkan();
  await jalankanSeed();
};

export const tutupDatabaseUji = closeDatabase;
