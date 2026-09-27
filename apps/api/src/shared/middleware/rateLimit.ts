import { rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';

import { env } from '../../config/env';

const message = (text: string) => ({
  success: false as const,
  message: text,
});

const base = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  // Menonzakkan header RateLimit saat sedang diuji membuat respons flaky.
  skip: () => env.isTest,
};

/**
 * Brute force pada endpoint kredensial adalah risiko utama sistem 3-role ini,
 * jadi limit-nya jauh lebih ketat dibanding API umum.
 */
export const authRateLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(message('Terlalu banyak percobaan masuk. Silakan coba lagi dalam 15 menit.'));
  },
});

export const apiRateLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(message('Terlalu banyak permintaan. Silakan coba beberapa saat lagi.'));
  },
});

export const uploadRateLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 30,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(message('Batas upload per jam tercapai. Silakan coba lagi nanti.'));
  },
});

/** Landing page dibaca anonim dalam jumlah besar, jadi limitnya longgar tapi tetap ada. */
export const publicRateLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(message('Terlalu banyak permintaan ke halaman publik. Silakan coba lagi nanti.'));
  },
});
