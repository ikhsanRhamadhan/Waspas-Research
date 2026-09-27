import type { Request, RequestHandler, Response } from 'express';

import { ok, paginated } from '../../shared/http/ApiResponse';
import { buildPaginated } from '../../shared/utils/pagination';
import * as service from './admin.service';
import type {
  AuditLogQuery,
  DaftarPenerimaQuery,
  ExportPdfInput,
  HitungInput,
  TetapkanInput,
} from './admin.validation';

export const dashboard: RequestHandler = async (_req: Request, res: Response) => {
  ok(res, await service.dashboard(), 'Berhasil');
};

export const jalankanHitung: RequestHandler = async (req: Request, res: Response) => {
  ok(res, await service.jalankanHitung(req, req.body as HitungInput), 'Perhitungan WASPAS selesai');
};

export const daftarPenerima: RequestHandler = async (req: Request, res: Response) => {
  const result = await service.daftarPenerima(req.query as unknown as DaftarPenerimaQuery);
  const data = buildPaginated(result, req.query as unknown as DaftarPenerimaQuery);
  paginated(res, data.items, data.meta, 'Berhasil');
};

export const tetapkanKeputusan: RequestHandler = async (req: Request, res: Response) => {
  ok(res, await service.tetapkanKeputusan(req, req.body as TetapkanInput), 'Keputusan ditetapkan');
};

export const statistik: RequestHandler = async (_req: Request, res: Response) => {
  ok(res, await service.statistik(), 'Berhasil');
};

export const auditLog: RequestHandler = async (req: Request, res: Response) => {
  const result = await service.daftarAuditLog(req.query as unknown as AuditLogQuery);
  const data = buildPaginated(result, req.query as unknown as AuditLogQuery);
  paginated(res, data.items, data.meta, 'Berhasil');
};

/**
 * PDF dikirim sebagai stream dengan disposition attachment, bukan dibungkus envelope JSON:
 * berkas ini untuk diunduh manusia, dan dibungkus JSON hanya menambah langkah tidak perlu.
 */
export const exportPdf: RequestHandler = async (req: Request, res: Response) => {
  const { namaBerkas, dokumen } = await service.pdfKeputusan(req, req.body as ExportPdfInput);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${namaBerkas}"`);
  dokumen.on('error', (kesalahan: Error) => res.destroy(kesalahan));
  dokumen.pipe(res);
};
