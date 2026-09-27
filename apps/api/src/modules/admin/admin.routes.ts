import { Router } from 'express';

import { authenticate, authorize } from '../../shared/middleware/auth';
import { apiRateLimiter } from '../../shared/middleware/rateLimit';
import { validate } from '../../shared/middleware/validate';
import * as controller from './admin.controller';
import {
  auditLogQuerySchema,
  daftarPenerimaQuerySchema,
  exportPdfSchema,
  hitungSchema,
  tetapkanSchema,
} from './admin.validation';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('admin'), apiRateLimiter);

adminRouter.get('/dashboard', controller.dashboard);
adminRouter.get('/statistik', controller.statistik);

adminRouter.post(
  '/waspas/hitung',
  validate({ body: hitungSchema }),
  controller.jalankanHitung,
);

adminRouter.get(
  '/penerima',
  validate({ query: daftarPenerimaQuerySchema }),
  controller.daftarPenerima,
);
adminRouter.post(
  '/penerima/tetapkan',
  validate({ body: tetapkanSchema }),
  controller.tetapkanKeputusan,
);

adminRouter.get(
  '/audit-log',
  validate({ query: auditLogQuerySchema }),
  controller.auditLog,
);
adminRouter.post(
  '/export-pdf',
  validate({ body: exportPdfSchema }),
  controller.exportPdf,
);
