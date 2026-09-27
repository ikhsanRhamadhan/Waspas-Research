import { randomUUID } from 'node:crypto';

import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { env } from './config/env';
import { logger } from './config/logger';
import { adminRouter } from './modules/admin/admin.routes';
import { authRouter } from './modules/auth/auth.routes';
import { kriteriaRouter } from './modules/kriteria/kriteria.routes';
import { notificationRouter } from './modules/notification/notification.routes';
import { petugasRouter } from './modules/petugas/petugas.routes';
import { pendudukRouter } from './modules/penduduk/penduduk.routes';
import { publicRouter } from './modules/public/public.routes';
import { errorHandler, notFoundHandler } from './shared/http/errorHandler';
import { ok } from './shared/http/ApiResponse';

/**
 * Setiap domain API punya prefix sendiri supaya daftar route mudah dibaca dan tidak
 * menumpuk di satu file. Middleware umum dipasang sekali di sini, lalu tiap modul
 * menambahkan lapisan role dan rate limit-nya sendiri.
 */
export const createApp = (): Express => {
  const app = express();

  // Di belakang reverse proxy (Nginx/Cloudflare) req.ip harus mengikuti X-Forwarded-For
  // agar rate limit dan audit log mencatat IP asli, bukan IP proxy.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // API ini disajikan lewat Vite proxy pada development, jadi CSP dihelmet
      // tidak relevan dan hanya bisa memicu error yang membingungkan.
      contentSecurityPolicy: env.isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
    }),
  );

  app.get('/health', (_req, res) => {
    ok(res, { status: 'ok', uptime: Math.round(process.uptime()), env: env.NODE_ENV }, 'SPK Bansos API siap');
  });

  app.use('/api/public', publicRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/penduduk', pendudukRouter);
  app.use('/api/petugas', petugasRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/kriteria', kriteriaRouter);
  app.use('/api/notifications', notificationRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
