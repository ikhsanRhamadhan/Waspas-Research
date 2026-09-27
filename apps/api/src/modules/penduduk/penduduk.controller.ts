import type { Request, RequestHandler, Response } from 'express';

import { ok, paginated } from '../../shared/http/ApiResponse';
import * as service from './penduduk.service';
import type { CreatePengajuanInput, ListPengajuanQuery, UpdatePengajuanInput } from './penduduk.validation';
import type { UpdateProfileInput } from '../auth/auth.validation';

export const profile: RequestHandler = async (req: Request, res: Response) => {
  ok(res, await service.getProfile(req.auth!.userId), 'Berhasil');
};

export const updateProfile: RequestHandler = async (req: Request, res: Response) => {
  ok(res, await service.updateProfile(req, req.auth!.userId, req.body as UpdateProfileInput), 'Profil berhasil diperbarui');
};

export const dashboard: RequestHandler = async (req: Request, res: Response) => {
  ok(res, await service.getDashboard(req.auth!.userId), 'Berhasil');
};

export const listPengajuan: RequestHandler = async (req: Request, res: Response) => {
  const data = await service.listPengajuan(req.auth!.userId, req.query as unknown as ListPengajuanQuery);
  paginated(res, data.items, data.meta, 'Berhasil');
};

export const create: RequestHandler = async (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    message: 'Pengajuan berhasil dikirim dan menunggu verifikasi petugas',
    data: await service.createPengajuan(req, req.auth!.userId, req.body as CreatePengajuanInput),
  });
};

export const detail: RequestHandler = async (req: Request, res: Response) => {
  ok(res, await service.getPengajuanDetail(req.auth!.userId, req.params.id as string), 'Berhasil');
};

export const update: RequestHandler = async (req: Request, res: Response) => {
  ok(
    res,
    await service.updatePengajuan(
      req,
      req.auth!.userId,
      req.params.id as string,
      req.body as UpdatePengajuanInput,
    ),
    'Pengajuan berhasil diperbarui',
  );
};

export const status: RequestHandler = async (req: Request, res: Response) => {
  ok(res, await service.getStatus(req.auth!.userId), 'Berhasil');
};

export const ranking: RequestHandler = async (req: Request, res: Response) => {
  ok(res, await service.getRanking(req.auth!.userId), 'Berhasil');
};
