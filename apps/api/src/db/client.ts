import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { logger } from '../config/logger';
import { env } from '../config/env';

import { schema } from './schema';

// PGlite tidak membuat direktori induknya sendiri, jadi kita siapkan sebelum instance dibuat.
await mkdir(resolve(process.cwd(), env.PGLITE_DATA_DIR), { recursive: true });

const client = new PGlite(env.PGLITE_DATA_DIR);

// Semua kolom di schema sudah dinamai eksplisit dalam snake_case, jadi opsi `casing`
// sengaja tidak dipakai agar drizzle-kit dan runtime menghasilkan SQL yang identik.
export const db = drizzle(client, { schema });

export type Database = typeof db;

/**
 * Menutup koneksi PGlite dengan rapi. PGlite menyimpan data ke direktori lokal,
 * jadi proses harus keluar sebelum data selesai ditulis.
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    await client.close();
  } catch (error) {
    logger.error({ err: error }, 'Gagal menutup koneksi database');
  }
};

/**
 * Membuktikan koneksi database hidup sebelum server mulai menerima request.
 */
export const pingDatabase = async (): Promise<void> => {
  const result = await db.execute<{ ok: number }>('SELECT 1 AS ok');
  if (result.rows[0]?.ok !== 1) {
    throw new Error('Health check database gagal: respons tidak valid');
  }
};
