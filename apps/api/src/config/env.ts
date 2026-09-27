import 'dotenv/config';
import { randomBytes } from 'node:crypto';

import { z } from 'zod';

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === 'boolean' ? value : ['1', 'true', 'yes'].includes(value.toLowerCase())));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DB_DRIVER: z.enum(['pglite', 'postgres']).default('pglite'),
  PGLITE_DATA_DIR: z.string().min(1).default('./storage/pgdata'),
  DATABASE_URL: z.string().min(1).optional(),

  JWT_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_EXPIRE: z.string().min(2).default('15m'),
  JWT_REFRESH_EXPIRE: z.string().min(2).default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(10),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  /** Nama desa untuk kop laporan PDF. Sengaja tidak ditebak supaya dokumen resmi tidak pernah salah. */
  NAMA_DESA: z.string().trim().min(1).default('Desa'),

  UPLOAD_DIR: z.string().min(1).default('./storage/verifikasi'),
  MAX_UPLOAD_MB: z.coerce.number().min(1).max(50).default(5),

  WASPAS_LAMBDA_DEFAULT: z.coerce.number().min(0).max(1).default(0.5),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  SEED_DEMO_PASSWORD: booleanish.default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detail = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Konfigurasi environment tidak valid:\n${detail}`);
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === 'production';

/**
 * JWT secret wajib ada di produksi. Di development, secret acak dibuat per-proses
 * supaya developer tidak perlu menyalin .env hanya untuk menjalankan server — konsekuensinya
 * semua token jadi tidak valid setiap restart, dan itu wajar untuk mode dev.
 */
const jwtSecret = (() => {
  if (raw.JWT_SECRET) return raw.JWT_SECRET;
  if (isProduction) {
    throw new Error('JWT_SECRET wajib diisi pada NODE_ENV=production (minimal 32 karakter).');
  }
  return randomBytes(48).toString('hex');
})();

if (raw.DB_DRIVER === 'postgres' && !raw.DATABASE_URL) {
  throw new Error('DB_DRIVER=postgres wajib diikuti DATABASE_URL.');
}

export const env = {
  ...raw,
  isProduction,
  isTest: raw.NODE_ENV === 'test',
  jwtSecret,
  corsOrigins: raw.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  smtp: raw.SMTP_HOST
    ? {
        host: raw.SMTP_HOST,
        port: raw.SMTP_PORT ?? 587,
        user: raw.SMTP_USER,
        pass: raw.SMTP_PASS,
        from: raw.SMTP_FROM ?? 'SPK Bansos <noreply@localhost>',
      }
    : null,
} as const;

export type Env = typeof env;
