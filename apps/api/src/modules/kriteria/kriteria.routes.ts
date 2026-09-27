import { Router } from 'express';

import { authenticate, authorize } from '../../shared/middleware/auth';
import { apiRateLimiter } from '../../shared/middleware/rateLimit';
import { validate } from '../../shared/middleware/validate';
import * as controller from './kriteria.controller';
import {
  kriteriaSchema,
  paramsSchema,
  simpanSchema,
  updateKriteriaSchema,
} from './kriteria.validation';

export const kriteriaRouter = Router();

kriteriaRouter.use(authenticate, apiRateLimiter);

kriteriaRouter.get('/', controller.list);
kriteriaRouter.get('/ringkasan-bobot', controller.ringkasanBobot);
kriteriaRouter.get('/:id', validate({ params: paramsSchema }), controller.detail);

kriteriaRouter.post(
  '/',
  authorize('admin'),
  validate({ body: kriteriaSchema }),
  controller.create,
);
kriteriaRouter.put(
  '/:id',
  authorize('admin'),
  validate({ params: paramsSchema, body: updateKriteriaSchema }),
  controller.update,
);
kriteriaRouter.delete(
  '/:id',
  authorize('admin'),
  validate({ params: paramsSchema }),
  controller.remove,
);
kriteriaRouter.post(
  '/simpan-semua',
  authorize('admin'),
  validate({ body: simpanSchema }),
  controller.simpanSemua,
);
