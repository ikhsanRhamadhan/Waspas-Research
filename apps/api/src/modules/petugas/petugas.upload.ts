import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import { JENIS_DOKUMEN } from '@spk-bansos/shared';
import multer from 'multer';

import { env } from '../../config/env';
import { ValidationError } from '../../shared/errors/AppError';

const MITIGATED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

export const ensureUploadDir = async (): Promise<string> => {
  const target = resolve(process.cwd(), env.UPLOAD_DIR);
  await mkdir(target, { recursive: true });
  return target;
};

/**
 * Nama berkas di server dibuat dari UUID, bukan dari nama asli yang dikirim user.
 * Ini mencegah path traversal dan tabrakan nama ketika banyak petugas mengunggah
 * berkas dengan nama sama.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureUploadDir()
      .then((target) => callback(null, target))
      .catch((error: unknown) => callback(error as Error, ''));
  },
  filename: (_req, file, callback) => {
    const ext = extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${randomUUID()}${MITIGATED_EXTENSIONS.has(ext) ? ext : '.bin'}`);
  },
});

export const uploadDokumen = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!MITIGATED_EXTENSIONS.has(ext)) {
      callback(
        new ValidationError(`Format berkas tidak didukung. Gunakan: ${[...MITIGATED_EXTENSIONS].join(', ')}`),
      );
      return;
    }
    callback(null, true);
  },
}).single('dokumen');

export const EKTENSI_DOKUMEN = [...MITIGATED_EXTENSIONS];
export const JENIS_DOKUMEN_TERSEDIA = JENIS_DOKUMEN;
