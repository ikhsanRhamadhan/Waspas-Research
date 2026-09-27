import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth';
import { authRateLimiter } from '../../shared/middleware/rateLimit';
import { validate } from '../../shared/middleware/validate';
import * as controller from './auth.controller';
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerPendudukSchema,
} from './auth.validation';

export const authRouter = Router();

authRouter.post('/login', authRateLimiter, validate({ body: loginSchema }), controller.login);
authRouter.post('/refresh', authRateLimiter, validate({ body: refreshSchema }), controller.refresh);
authRouter.post('/logout', controller.logout);
authRouter.post(
  '/register',
  authRateLimiter,
  validate({ body: registerPendudukSchema }),
  controller.register,
);
authRouter.get('/me', authenticate, controller.me);
authRouter.post(
  '/change-password',
  authenticate,
  authRateLimiter,
  validate({ body: changePasswordSchema }),
  controller.changePassword,
);
