import { emailSchema, noTelpSchema, passwordSchema, usernameSchema } from '@spk-bansos/shared';
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username wajib diisi').max(100),
  password: z.string().min(1, 'Kata sandi wajib diisi').max(72),
});

export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(10, 'Refresh token wajib diisi'),
});

export const registerPendudukSchema = z.object({
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'NIK harus terdiri dari 16 digit angka'),
  namaLengkap: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter').max(200),
  email: emailSchema,
  noTelp: noTelpSchema.optional().or(z.literal('').transform(() => undefined)),
  username: usernameSchema,
  password: passwordSchema,
  jenisKelamin: z.enum(['L', 'P']).optional(),
  tanggalLahir: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
    .optional(),
  alamat: z.string().trim().min(10, 'Alamat minimal 10 karakter').max(1000),
  desa: z.string().trim().max(100).optional(),
  kecamatan: z.string().trim().max(100).optional(),
  kabupaten: z.string().trim().max(100).optional(),
});

export const updateProfileSchema = z.object({
  namaLengkap: z.string().trim().min(3).max(200).optional(),
  noTelp: noTelpSchema.optional().or(z.literal('').transform(() => undefined)),
  email: emailSchema.optional(),
  jenisKelamin: z.enum(['L', 'P']).optional(),
  tanggalLahir: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
    .optional(),
  alamat: z.string().trim().min(10).max(1000).optional(),
  desa: z.string().trim().max(100).optional(),
  kecamatan: z.string().trim().max(100).optional(),
  kabupaten: z.string().trim().max(100).optional(),
  noRekening: z.string().trim().max(20).optional(),
  namaBank: z.string().trim().max(100).optional(),
});

export const changePasswordSchema = z.object({
  passwordLama: z.string().min(1, 'Kata sandi lama wajib diisi'),
  passwordBaru: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RegisterPendudukInput = z.infer<typeof registerPendudukSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
