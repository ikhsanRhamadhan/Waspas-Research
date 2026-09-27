import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
// Database uji dipisah dari database development supaya test tidak menghapus data demo.
process.env.PGLITE_DATA_DIR = './storage/pgdata-test';
process.env.JWT_SECRET = 'kunci-rahasia-untuk-uji-smoke-otomatis-minimal-32-karakter';
// Berkas unggahan uji juga dipisah supaya pengujian tidak meninggalkan berkas di folder
// yang sedang dipakai developer.
process.env.UPLOAD_DIR = './storage/verifikasi-test';

mkdirSync(resolve(process.cwd(), process.env.PGLITE_DATA_DIR), { recursive: true });
mkdirSync(resolve(process.cwd(), process.env.UPLOAD_DIR), { recursive: true });
