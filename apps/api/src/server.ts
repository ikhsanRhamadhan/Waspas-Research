import { env } from './config/env';
import { logger } from './config/logger';
import { createApp } from './app';
import { closeDatabase, pingDatabase } from './db/client';
import { runMigrations } from './db/migrate';
import { ensureUploadDir } from './modules/petugas/petugas.upload';

const start = async (): Promise<void> => {
  await runMigrations();
  await pingDatabase();
  await ensureUploadDir();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, driver: env.DB_DRIVER },
      'SPK Bansos API berjalan',
    );
  });

  /**
   * Server ditutup rapi sebelum keluar supaya PGlite sempat menutup basis datanya.
   * Tanpa ini, PGlite bisa meninggalkan berkas WAL yang rusak pada proses berikutnya.
   */
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Mematikan server');
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Server tidak menutup dalam 10 detik, keluar paksa.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Gagal menjalankan server');
  process.exit(1);
});
