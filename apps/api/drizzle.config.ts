import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const dataDir = process.env.PGLITE_DATA_DIR ?? './storage/pgdata';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  // PGlite = Postgres asli (WASM) yang jalan in-process, jadi drizzle-kit memakai driver-nya langsung.
  // Untuk produksi: hapus `driver` dan ganti dbCredentials menjadi { url: process.env.DATABASE_URL }.
  driver: 'pglite',
  dbCredentials: { url: dataDir },
  verbose: true,
  strict: true,
});
