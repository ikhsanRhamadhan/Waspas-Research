import { z } from 'zod';

import { USER_ROLES } from '../constants/role';

export const nikSchema = z
  .string()
  .trim()
  .regex(/^\d{16}$/, 'NIK harus terdiri dari 16 digit angka');

export const passwordSchema = z
  .string()
  .min(8, 'Kata sandi minimal 8 karakter')
  .max(72, 'Kata sandi maksimal 72 karakter')
  .regex(/[A-Za-z]/, 'Kata sandi harus memuat minimal satu huruf')
  .regex(/\d/, 'Kata sandi harus memuat minimal satu angka');

export const noTelpSchema = z
  .string()
  .trim()
  .regex(/^[0-9+][0-9+\-]{6,14}$/, 'Nomor telepon tidak valid');

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username minimal 3 karakter')
  .max(100, 'Username maksimal 100 karakter')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh huruf, angka, titik, underscore, atau strip');

export const emailSchema = z.string().trim().toLowerCase().email('Format email tidak valid');

export const roleSchema = z.enum(USER_ROLES);

export const tanggalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

/**
 * Nilai uang dalam Rupiah.ZSOD membolehkan string karena input form datang
 * sebagai teks ("1500000") dan angka dengan pemisah ribuan ("1.500.000").
 */
export const nominalSchema = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    const normalized =
      typeof value === 'number' ? value : Number(value.replace(/[^\d]/g, ''));

    if (!Number.isFinite(normalized)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nominal harus berupa angka' });
      return z.NEVER;
    }
    return normalized;
  })
  .pipe(z.number().int().min(0, 'Nominal tidak boleh negatif'));

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  sort: z.string().trim().max(50).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;
