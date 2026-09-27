import { createHash, randomUUID } from 'node:crypto';

import type { UserRole } from '@spk-bansos/shared';
import { jwtVerify, SignJWT } from 'jose';

import { env } from '../../config/env';
import type { AuthContext } from '../../types/express';

const secretKey = new TextEncoder().encode(env.jwtSecret);
const ISSUER = 'spk-bansos';
const AUDIENCE = 'spk-bansos-web';

export interface AccessTokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  nama: string;
}

export const signAccessToken = async (payload: AccessTokenPayload): Promise<string> =>
  new SignJWT({ username: payload.username, role: payload.role, nama: payload.nama })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRE)
    .sign(secretKey);

export const verifyAccessToken = async (token: string): Promise<AuthContext> => {
  const { payload } = await jwtVerify(token, secretKey, {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: ['HS256'],
  });

  const role = payload.role;
  const username = payload.username;
  const nama = payload.nama;

  if (!payload.sub || (role !== 'penduduk' && role !== 'petugas' && role !== 'admin')) {
    throw new Error('Payload token tidak lengkap');
  }
  if (typeof username !== 'string' || typeof nama !== 'string') {
    throw new Error('Payload token tidak lengkap');
  }

  return { userId: payload.sub, username, role, nama };
};

/** Refresh token dibuat opaque (bukan JWT) agar bisa dicabut satu per satu di database. */
export const generateRefreshToken = (): string => `${randomUUID()}.${createHash('sha256').update(randomUUID()).digest('hex')}`;

export const hashRefreshToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/** Mengubah durasi '15m' / '7d' menjadi detik. */
export const durationToSeconds = (input: string): number => {
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) return 900;

  const value = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
  return value * multiplier;
};
