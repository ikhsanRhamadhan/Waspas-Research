import { closeDatabase } from '../client';
import { runMigrations } from '../migrate';
import { AKUN_DEFAULT, jalankanSeed } from './data';

const run = async (): Promise<void> => {
  console.log('Menjalankan seed data demo...');
  await runMigrations();
  await jalankanSeed();

  console.log('\nSeed selesai. Akun yang tersedia:');
  for (const akun of AKUN_DEFAULT) {
    console.log(`  ${akun.role.padEnd(8)} ${akun.username.padEnd(8)} ${akun.password}`);
  }

  await closeDatabase();
};

run().catch((error: unknown) => {
  console.error('Seed gagal:', error);
  process.exit(1);
});
