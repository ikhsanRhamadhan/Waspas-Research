import { paginationSchema } from '@spk-bansos/shared';
import { z } from 'zod';

export const KONDISI_RUMAH_VALUES = ['layak', 'tidak_layak'] as const;

export const createPengajuanSchema = z.object({
  penghasilanBulanan: z.coerce
    .number({ invalid_type_error: 'Penghasilan harus berupa angka' })
    .int('Penghasilan harus bilangan bulat')
    .min(0, 'Penghasilan tidak boleh negatif')
    .max(1_000_000_000, 'Nilai penghasilan tidak wajar'),
  jumlahTanggungan: z.coerce
    .number({ invalid_type_error: 'Jumlah tanggungan harus berupa angka' })
    .int('Jumlah tanggungan harus bilangan bulat')
    .min(0, 'Jumlah tanggungan tidak boleh negatif')
    .max(50, 'Jumlah tanggungan maksimal 50'),
  kondisiRumah: z.enum(KONDISI_RUMAH_VALUES, {
    errorMap: () => ({ message: 'Kondisi rumah harus "layak" atau "tidak_layak"' }),
  }),
  catatanPenduduk: z.string().trim().max(1000).optional(),
});

export const updatePengajuanSchema = createPengajuanSchema.partial();

export const paramsSchema = z.object({ id: z.string().uuid('ID tidak valid') });

export const listPengajuanSchema = paginationSchema.extend({
  status: z.enum(['menunggu_verifikasi', 'data_terverifikasi', 'ditolak', 'diproses', 'diterima']).optional(),
});

export type CreatePengajuanInput = z.infer<typeof createPengajuanSchema>;
export type UpdatePengajuanInput = z.infer<typeof updatePengajuanSchema>;
export type ListPengajuanQuery = z.infer<typeof listPengajuanSchema>;
