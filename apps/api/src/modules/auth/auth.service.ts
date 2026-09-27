import { and, eq, isNull, lt } from 'drizzle-orm';

import type { AuthSession, AuthUser } from '@spk-bansos/shared';

import { env } from '../../config/env';
import { db } from '../../db/client';
import { refreshTokens } from '../../db/schema';
import { ConflictError, InvalidCredentialsError, UnauthorizedError, ValidationError } from '../../shared/errors/AppError';
import { hashPassword, verifyPassword } from '../../shared/utils/password';
import { AUDIT_ACTION, recordAudit } from '../../shared/utils/audit';
import type { RequestFingerprint } from '../../shared/utils/requestFingerprint';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterPendudukInput,
} from './auth.validation';
import {
  durationToSeconds,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from './auth.token';
import { DrizzleAuthRepository } from './auth.repository.impl';
import type { AuthRepository, UserRecord } from './auth.repository';
import type { AuthSessionResponse } from './auth.dto';

const repository: AuthRepository = new DrizzleAuthRepository();

const toAuthUser = (user: UserRecord): AuthUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  nama: user.nama,
  noTelp: user.noTelp,
  isActive: user.isActive,
  lastLogin: user.lastLogin?.toISOString() ?? null,
  createdAt: user.createdAt.toISOString(),
});

const issueSession = async (user: UserRecord, fingerprint: RequestFingerprint): Promise<AuthSessionResponse> => {
  const accessToken = await signAccessToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    nama: user.nama,
  });
  const refreshToken = generateRefreshToken();

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + durationToSeconds(env.JWT_REFRESH_EXPIRE) * 1000),
    ipAddress: fingerprint.ipAddress,
    userAgent: fingerprint.userAgent,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: durationToSeconds(env.JWT_ACCESS_EXPIRE),
    user: toAuthUser(user),
    profile: user.profile,
  };
};

export const registerPenduduk = async (
  input: RegisterPendudukInput,
  fingerprint: RequestFingerprint,
): Promise<AuthSessionResponse> => {
  const existing = await repository.existsByUsernameOrEmail(input.username, input.email);
  const errors: Record<string, string[]> = {};
  if (existing.username) errors.username = ['Username sudah digunakan'];
  if (existing.email) errors.email = ['Email sudah terdaftar'];
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Pendaftaran gagal', errors);
  }

  const nikBentrok = await db.query.penduduk.findFirst({
    where: (table, { eq: sama }) => sama(table.nik, input.nik),
  });
  if (nikBentrok) {
    throw new ConflictError('NIK sudah terdaftar. Silakan masuk menggunakan akun Anda.');
  }

  const user = await repository.createWithProfile({
    username: input.username,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: 'penduduk',
    nama: input.namaLengkap,
    noTelp: input.noTelp ?? null,
    profile: {
      nik: input.nik,
      namaLengkap: input.namaLengkap,
      jenisKelamin: input.jenisKelamin ?? null,
      tanggalLahir: input.tanggalLahir ?? null,
      alamat: input.alamat,
      desa: input.desa ?? null,
      kecamatan: input.kecamatan ?? null,
      kabupaten: input.kabupaten ?? null,
      noTelp: input.noTelp ?? null,
    },
  });

  await recordAudit({
    userId: user.id,
    action: AUDIT_ACTION.REGISTER,
    entityType: 'users',
    entityId: user.id,
    newValues: { username: user.username, email: user.email, role: user.role },
    ...fingerprint,
  });

  return issueSession(user, fingerprint);
};

export const login = async (input: LoginInput, fingerprint: RequestFingerprint): Promise<AuthSessionResponse> => {
  const user = await repository.findByIdentifier(input.username);

  // Pesan error sengaja disamakan agar endpoint ini tidak bisa dipakai menebak
  // username mana yang terdaftar (user enumeration).
  if (!user) {
    await recordAudit({
      action: AUDIT_ACTION.LOGIN_FAILED,
      newValues: { identifier: input.username },
      ...fingerprint,
    });
    throw new InvalidCredentialsError();
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);
  if (!passwordValid) {
    await recordAudit({ userId: user.id, action: AUDIT_ACTION.LOGIN_FAILED, ...fingerprint });
    throw new InvalidCredentialsError();
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Akun Anda dinonaktifkan. Hubungi petugas desa.');
  }

  await repository.touchLastLogin(user.id);
  await recordAudit({
    userId: user.id,
    action: AUDIT_ACTION.LOGIN,
    entityType: 'users',
    entityId: user.id,
    ...fingerprint,
  });

  return issueSession({ ...user, lastLogin: new Date() }, fingerprint);
};

export const refreshSession = async (
  refreshToken: string,
  fingerprint: RequestFingerprint,
): Promise<AuthSessionResponse> => {
  const rows = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, hashRefreshToken(refreshToken)), isNull(refreshTokens.revokedAt)))
    .limit(1);

  const stored = rows[0];
  if (!stored) throw new UnauthorizedError('Refresh token tidak valid');
  if (stored.expiresAt.getTime() <= Date.now()) {
    throw new UnauthorizedError('Refresh token sudah kedaluwarsa. Silakan masuk kembali.');
  }

  const user = await repository.findById(stored.userId);
  if (!user) throw new UnauthorizedError('Akun tidak ditemukan');
  if (!user.isActive) throw new UnauthorizedError('Akun Anda dinonaktifkan');

  // Rotasi token: token lama langsung dicabut agar tidak bisa dipakai ulang bila bocor.
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.id, stored.id), isNull(refreshTokens.revokedAt)));

  return issueSession(user, fingerprint);
};

export const logout = async (refreshToken: string | undefined, userId: string | null): Promise<void> => {
  await recordAudit({ userId, action: AUDIT_ACTION.LOGOUT });

  if (!refreshToken) return;

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, hashRefreshToken(refreshToken)), isNull(refreshTokens.revokedAt)));
};

export const getCurrentUser = async (userId: string): Promise<Pick<AuthSessionResponse, 'user' | 'profile'>> => {
  const user = await repository.findById(userId);
  if (!user) throw new UnauthorizedError('Akun tidak ditemukan');
  return { user: toAuthUser(user), profile: user.profile };
};

export const changePassword = async (userId: string, input: ChangePasswordInput): Promise<void> => {
  const user = await repository.findById(userId);
  if (!user) throw new UnauthorizedError('Akun tidak ditemukan');

  const valid = await verifyPassword(input.passwordLama, user.passwordHash);
  if (!valid) throw new ValidationError('Gagal mengganti kata sandi', { passwordLama: ['Kata sandi lama salah'] });

  await repository.updatePasswordHash(userId, await hashPassword(input.passwordBaru));

  // Mengganti kata sandi berarti seluruh sesi lama harus mati, jadi semua refresh token dicabut.
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));

  await recordAudit({ userId, action: 'auth.password_changed', entityType: 'users', entityId: userId });
};

/** Membersihkan token yang sudah kedaluwarsa; dijalankan berkala oleh scheduler. */
export const purgeExpiredTokens = async (): Promise<number> => {
  const deleted = await db
    .delete(refreshTokens)
    .where(lt(refreshTokens.expiresAt, new Date()))
    .returning({ id: refreshTokens.id });
  return deleted.length;
};
