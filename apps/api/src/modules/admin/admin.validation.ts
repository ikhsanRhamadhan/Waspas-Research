import { STATUS_KEPUTUSAN, paginationSchema } from '@spk-bansos/shared';
import { z } from 'zod';

export const paramsSchema = z.object({ id: z.string().uuid('ID tidak valid') });

export const hitungSchema = z.object({
  lambda: z.number().min(0, 'lambda minimal 0').max(1, 'lambda maksimal 1').default(0.5),
});

export const tetapkanSchema = z.object({
  daftarPenerima: z
    .array(
      z.object({
        pengajuanId: z.string().uuid('ID pengajuan tidak valid'),
        statusKeputusan: z.enum(STATUS_KEPUTUSAN, {
          errorMap: () => ({ message: `statusKeputusan harus salah satu dari: ${STATUS_KEPUTUSAN.join(', ')}` }),
        }),
        catatanAdmin: z.string().trim().max(1000).nullish(),
      }),
    )
    .min(1, 'Minimal satu keputusan penerima harus diisi')
    .refine(
      (daftar) => new Set(daftar.map((item) => item.pengajuanId)).size === daftar.length,
      'Tidak boleh ada pengajuanId yang sama lebih dari sekali',
    ),
});

export const daftarPenerimaQuerySchema = paginationSchema.extend({
  status: z.enum(STATUS_KEPUTUSAN).optional(),
});

/**
 * Jejak audit dibaca sebagai halaman, bukan satu dump. Admin perlu memfilter aksi dan
 * jenis entitas saat menelusuri perubahan data, dan administrator tidak boleh menarik
 * seluruh tabel sekaligus.
 */
export const auditLogQuerySchema = paginationSchema.extend({
  action: z.string().trim().min(1).max(100).optional(),
  entityType: z.string().trim().min(1).max(100).optional(),
  userId: z.string().uuid('ID pengguna tidak valid').optional(),
});

export const exportPdfSchema = z.object({
  status: z.enum(STATUS_KEPUTUSAN).optional(),
});

export type HitungInput = z.infer<typeof hitungSchema>;
export type TetapkanInput = z.infer<typeof tetapkanSchema>;
export type DaftarPenerimaQuery = z.infer<typeof daftarPenerimaQuerySchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
export type ExportPdfInput = z.infer<typeof exportPdfSchema>;
