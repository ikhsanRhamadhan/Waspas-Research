import { JENIS_DOKUMEN, paginationSchema } from '@spk-bansos/shared';
import { z } from 'zod';

export const KONDIISI_VERIFIKASI = ['valid', 'tidak_valid'] as const;

export const verifikasiSchema = z.object({
  statusVerifikasi: z.enum(KONDIISI_VERIFIKASI, {
    errorMap: () => ({ message: 'Status verifikasi harus "valid" atau "tidak_valid"' }),
  }),
  catatanVerifikasi: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .superRefine((value, ctx) => {
      if (value !== undefined && value.length > 0 && value.length < 10) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Catatan verifikasi minimal 10 karakter' });
      }
    }),
});

export const updateVerifikasiSchema = verifikasiSchema;

export const paramsSchema = z.object({ id: z.string().uuid('ID tidak valid') });
export const dokumenParamsSchema = z.object({ id: z.string().uuid('ID tidak valid') });

export const listVerifikasiSchema = paginationSchema.extend({
  status: z.enum(['menunggu_verifikasi', 'data_terverifikasi', 'ditolak', 'diproses', 'diterima']).optional(),
  kondisiRumah: z.enum(['layak', 'tidak_layak']).optional(),
  hasilVerifikasi: z.enum(KONDIISI_VERIFIKASI).optional(),
});

export const uploadDokumenSchema = z.object({
  pengajuanId: z.string().uuid('ID pengajuan tidak valid'),
  jenis: z.enum(JENIS_DOKUMEN, {
    errorMap: () => ({ message: `Jenis dokumen harus salah satu dari: ${JENIS_DOKUMEN.join(', ')}` }),
  }),
});

export const laporanSchema = paginationSchema.extend({
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
    .optional(),
});

export type VerifikasiInput = z.infer<typeof verifikasiSchema>;
export type ListVerifikasiQuery = z.infer<typeof listVerifikasiSchema>;
export type LaporanQuery = z.infer<typeof laporanSchema>;
