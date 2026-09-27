import type { Request, RequestHandler, Response } from 'express';

import { created, noContent, ok } from '../../shared/http/ApiResponse';
import * as service from './kriteria.service';
import type {
  KriteriaInput,
  SimpanKriteriaInput,
  UpdateKriteriaInput,
} from './kriteria.validation';

export const list: RequestHandler = async (_req: Request, res: Response) => {
  ok(res, await service.list(), 'Berhasil');
};

export const detail: RequestHandler = async (req: Request, res: Response) => {
  ok(res, await service.detail(req.params.id as string), 'Berhasil');
};

export const create: RequestHandler = async (req: Request, res: Response) => {
  created(res, await service.create(req, req.body as KriteriaInput), 'Kriteria berhasil ditambahkan');
};

export const update: RequestHandler = async (req: Request, res: Response) => {
  ok(
    res,
    await service.update(req, req.params.id as string, req.body as UpdateKriteriaInput),
    'Kriteria berhasil diperbarui',
  );
};

export const remove: RequestHandler = async (req: Request, res: Response) => {
  await service.remove(req, req.params.id as string);
  noContent(res);
};

export const simpanSemua: RequestHandler = async (req: Request, res: Response) => {
  ok(res, await service.simpanSemua(req, req.body as SimpanKriteriaInput), 'Konfigurasi kriteria tersimpan');
};

export const ringkasanBobot: RequestHandler = async (_req: Request, res: Response) => {
  ok(res, await service.bobotAktif(), 'Berhasil');
};
