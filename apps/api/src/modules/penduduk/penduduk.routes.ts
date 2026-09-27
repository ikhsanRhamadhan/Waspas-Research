import { Router } from 'express';

import { authenticate, authorize } from '../../shared/middleware/auth';
import { apiRateLimiter } from '../../shared/middleware/rateLimit';
import { validate } from '../../shared/middleware/validate';
import * as controller from './penduduk.controller';
import {
  createPengajuanSchema,
  listPengajuanSchema,
  paramsSchema,
  updatePengajuanSchema,
} from './penduduk.validation';
import { updateProfileSchema } from '../auth/auth.validation';

export const pendudukRouter = Router();

pendudukRouter.use(authenticate, authorize('penduduk'), apiRateLimiter);

pendudukRouter.get('/dashboard', controller.dashboard);

pendudukRouter.get('/profile', controller.profile);
pendudukRouter.put(
  '/profile',
  validate({ body: updateProfileSchema }),
  controller.updateProfile,
);

pendudukRouter.get(
  '/pengajuan',
  validate({ query: listPengajuanSchema }),
  controller.listPengajuan,
);
pendudukRouter.post(
  '/pengajuan',
  validate({ body: createPengajuanSchema }),
  controller.create,
);
pendudukRouter.get(
  '/pengajuan/:id',
  validate({ params: paramsSchema }),
  controller.detail,
);
pendudukRouter.put(
  '/pengajuan/:id',
  validate({ params: paramsSchema, body: updatePengajuanSchema }),
  controller.update,
);

pendudukRouter.get('/status', controller.status);
pendudukRouter.get('/ranking', controller.ranking);
