import type { Request, RequestHandler, Response } from 'express';

import { created, ok, paginated } from '../../shared/http/ApiResponse';
import * as service from './petugas.service';
import type { LaporanQuery, ListVerifikasiQuery, VerifikasiInput } from './petugas.validation';

const idDari = (req: Request): string => req.params.id as string;

export const dashboard: RequestHandler = async (_req: Request, res: Response) => {
  ok(res, await service.statistik(), 'Berhasil');
};

export const list: RequestHandler = async (req: Request, res: Response) => {
  const data = await service.listVerifikasi(req.query as unknown as ListVerifikasiQuery);
  paginated(res, data.items, data.meta, 'Berhasil');
};

export const detail: RequestHandler = async (req: Request, res: Response) => {
  ok(res, await service.getDetail(idDari(req)), 'Berhasil');
};

export const verifikasi: RequestHandler = async (req: Request, res: Response) => {
  ok(
    res,
    await service.verifikasi(req, req.auth!.userId, idDari(req), req.body as VerifikasiInput),
    'Verifikasi tersimpan',
  );
};

export const uploadDokumen: RequestHandler = async (req: Request, res: Response) => {
  const jenis = String(req.body?.jenis ?? '');
  created(
    res,
    await service.uploadDokumen(req, req.auth!.userId, idDari(req), jenis, req.file),
    'Dokumen berhasil diunggah',
  );
};

export const downloadDokumen: RequestHandler = async (req: Request, res: Response) => {
  const dokumen = await service.readDokumenStream(idDari(req));
  res.setHeader('Content-Type', dokumen.mimeType);
  res.setHeader('Content-Length', String(dokumen.ukuranBytes));
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(dokumen.namaFile)}"`);
  dokumen.stream.on('error', (error: Error) => res.destroy(error));
  dokumen.stream.pipe(res);
};

export const laporan: RequestHandler = async (req: Request, res: Response) => {
  ok(res, await service.laporan(req.query as unknown as LaporanQuery), 'Berhasil');
};
