import type { RequestHandler, Response } from 'express';

import { ok } from '../../shared/http/ApiResponse';
import * as service from './public.service';

export const statistik: RequestHandler = async (_req, res: Response) => {
  ok(res, await service.statistik(), 'Berhasil');
};

export const daftarPenerima: RequestHandler = async (_req, res: Response) => {
  ok(res, await service.daftarPenerima(), 'Berhasil');
};

export const metode: RequestHandler = async (_req, res: Response) => {
  ok(res, service.ringkasanMetode(), 'Berhasil');
};
