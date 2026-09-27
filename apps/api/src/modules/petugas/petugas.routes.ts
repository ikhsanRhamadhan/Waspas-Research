import { Router } from 'express';

import { authenticate, authorize } from '../../shared/middleware/auth';
import { apiRateLimiter } from '../../shared/middleware/rateLimit';
import { validate } from '../../shared/middleware/validate';
import * as controller from './petugas.controller';
import { uploadDokumen } from './petugas.upload';
import {
  dokumenParamsSchema,
  laporanSchema,
  listVerifikasiSchema,
  paramsSchema,
  updateVerifikasiSchema,
} from './petugas.validation';

export const petugasRouter = Router();

petugasRouter.use(authenticate, authorize('petugas'), apiRateLimiter);

petugasRouter.get('/dashboard', controller.dashboard);

petugasRouter.get(
  '/verifikasi',
  validate({ query: listVerifikasiSchema }),
  controller.list,
);
petugasRouter.get(
  '/verifikasi/:id',
  validate({ params: paramsSchema }),
  controller.detail,
);
petugasRouter.put(
  '/verifikasi/:id',
  validate({ params: paramsSchema, body: updateVerifikasiSchema }),
  controller.verifikasi,
);

petugasRouter.post(
  '/dokumen/:id',
  uploadDokumen,
  controller.uploadDokumen,
);
petugasRouter.get(
  '/dokumen/:id/download',
  validate({ params: dokumenParamsSchema }),
  controller.downloadDokumen,
);

petugasRouter.get(
  '/laporan/verifikasi',
  validate({ query: laporanSchema }),
  controller.laporan,
);
