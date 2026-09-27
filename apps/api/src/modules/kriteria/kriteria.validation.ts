import { KUNCI_KRITERIA, TIPE_KRITERIA, paginationSchema } from '@spk-bansos/shared';
import { z } from 'zod';

export const paramsSchema = z.object({ id: z.string().uuid('ID tidak valid') });

const bobotSchema = z.number().min(0.0001, 'Bobot harus lebih besar dari 0').max(1, 'Bobot maksimal 1');

const subkriteriaSchema = z
  .object({
    kodeNilai: z.string().trim().min(1).max(30).nullish(),
    label: z.string().trim().min(1).max(100).nullish(),
    nilaiMin: z.number().int().nullish(),
    nilaiMax: z.number().int().nullish(),
    score: z.number().min(0).max(1),
  })
  .superRefine((value, ctx) => {
    const berbasisKode = value.kodeNilai !== undefined && value.kodeNilai !== null;
    const berbasisRentang = value.nilaiMin !== undefined && value.nilaiMax !== undefined;

    if (!berbasisKode && !berbasisRentang) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Subkriteria harus diisi dengan kodeNilai ATAU rentang nilaiMin..nilaiMax',
      });
      return;
    }

    if (berbasisKode && berbasisRentang) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Subkriteria tidak boleh memakai kodeNilai dan rentang angka sekaligus',
      });
      return;
    }

    if (berbasisRentang && value.nilaiMin! > value.nilaiMax!) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'nilaiMin tidak boleh lebih besar dari nilaiMax',
      });
    }
  });

export const kriteriaSchema = z.object({
  kunci: z.enum(KUNCI_KRITERIA, {
    errorMap: () => ({ message: `kunci harus salah satu dari: ${KUNCI_KRITERIA.join(', ')}` }),
  }),
  namaKriteria: z.string().trim().min(3, 'Nama kriteria minimal 3 karakter').max(100),
  deskripsi: z.string().trim().max(1000).nullish(),
  bobot: bobotSchema,
  tipeKriteria: z.enum(TIPE_KRITERIA, {
    errorMap: () => ({ message: `tipeKriteria harus salah satu dari: ${TIPE_KRITERIA.join(', ')}` }),
  }),
  prioritas: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  subkriteria: z.array(subkriteriaSchema).min(1, 'Minimal satu subkriteria diperlukan'),
});

export const updateKriteriaSchema = z.object({
  namaKriteria: z.string().trim().min(3).max(100).optional(),
  deskripsi: z.string().trim().max(1000).nullish(),
  bobot: bobotSchema.optional(),
  tipeKriteria: z.enum(TIPE_KRITERIA).optional(),
  prioritas: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  subkriteria: z.array(subkriteriaSchema).min(1).optional(),
});

export const simpanSchema = z
  .object({
    kriteria: z.array(kriteriaSchema).min(1, 'Minimal satu kriteria diperlukan'),
    lambda: z.number().min(0).max(1).default(0.5),
  })
  .superRefine((value, ctx) => {
    const kunciTerpakai = new Set(value.kriteria.map((item) => item.kunci));
    if (kunciTerpakai.size !== value.kriteria.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['kriteria'], message: 'Kunci kriteria tidak boleh duplikat' });
    }

    const totalBobot = value.kriteria.reduce((total, item) => total + item.bobot, 0);
    if (Math.abs(totalBobot - 1) > 0.0001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['kriteria'],
        message: `Total bobot kriteria harus sama dengan 1. Saat ini ${totalBobot.toFixed(4)}.`,
      });
    }
  });

export const listKriteriaSchema = paginationSchema;

export type KriteriaInput = z.infer<typeof kriteriaSchema>;
export type UpdateKriteriaInput = z.infer<typeof updateKriteriaSchema>;
export type SimpanKriteriaInput = z.infer<typeof simpanSchema>;
