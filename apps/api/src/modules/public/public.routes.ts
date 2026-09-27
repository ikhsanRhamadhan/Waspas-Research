import { Router } from 'express';

import { publicRateLimiter } from '../../shared/middleware/rateLimit';
import * as controller from './public.controller';

export const publicRouter = Router();

/** Halaman publik tidak butuh autentikasi, tapi tetap dibatasi rate limit agar tidak disalahgunakan. */
publicRouter.use(publicRateLimiter);

publicRouter.get('/statistik', controller.statistik);
publicRouter.get('/penerima', controller.daftarPenerima);
publicRouter.get('/metode', controller.metode);
