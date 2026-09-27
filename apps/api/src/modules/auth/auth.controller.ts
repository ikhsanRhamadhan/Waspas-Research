import type { Request, RequestHandler, Response } from 'express';

import { ok } from '../../shared/http/ApiResponse';
import { fingerprintOf } from '../../shared/utils/requestFingerprint';
import * as authService from './auth.service';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterPendudukInput,
} from './auth.validation';

export const login: RequestHandler = async (req: Request, res: Response) => {
  const session = await authService.login(req.body as LoginInput, fingerprintOf(req));
  ok(res, session, 'Login berhasil');
};

export const refresh: RequestHandler = async (req: Request, res: Response) => {
  const session = await authService.refreshSession(req.body.refreshToken as string, fingerprintOf(req));
  ok(res, session, 'Sesi diperpanjang');
};

export const logout: RequestHandler = async (req: Request, res: Response) => {
  await authService.logout(req.body?.refreshToken as string | undefined, req.auth?.userId ?? null);
  ok(res, null, 'Anda telah keluar');
};

export const me: RequestHandler = async (req: Request, res: Response) => {
  const data = await authService.getCurrentUser(req.auth!.userId);
  ok(res, data, 'Berhasil');
};

export const register: RequestHandler = async (req: Request, res: Response) => {
  const session = await authService.registerPenduduk(req.body as RegisterPendudukInput, fingerprintOf(req));
  res.status(201).json({
    success: true,
    message: 'Pendaftaran berhasil. Selamat datang!',
    data: session,
  });
};

export const changePassword: RequestHandler = async (req: Request, res: Response) => {
  await authService.changePassword(req.auth!.userId, req.body as ChangePasswordInput);
  ok(res, null, 'Kata sandi berhasil diubah. Silakan masuk kembali.');
};
