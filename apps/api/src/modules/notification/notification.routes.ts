import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth';
import { apiRateLimiter } from '../../shared/middleware/rateLimit';
import { validate } from '../../shared/middleware/validate';
import * as controller from './notification.controller';
import { idSchema, listQuerySchema } from './notification.validation';

export const notificationRouter = Router();

notificationRouter.use(authenticate, apiRateLimiter);

notificationRouter.get('/', validate({ query: listQuerySchema }), controller.list);
notificationRouter.get('/belum-dibaca', controller.belumDibaca);
notificationRouter.put(
  '/:id/read',
  validate({ params: idSchema }),
  controller.tandaiDibaca,
);
notificationRouter.put('/read-all', controller.tandaiSemuaDibaca);
