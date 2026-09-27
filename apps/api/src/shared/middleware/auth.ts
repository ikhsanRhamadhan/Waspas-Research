import type { UserRole } from '@spk-bansos/shared';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { verifyAccessToken } from '../../modules/auth/auth.token';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token tidak ditemukan. Silakan masuk kembali.');
    }

    const token = header.slice('Bearer '.length).trim();
    req.auth = await verifyAccessToken(token);
    next();
  } catch (error) {
    next(
      error instanceof UnauthorizedError
        ? error
        : new UnauthorizedError('Token tidak valid atau sudah kedaluwarsa'),
    );
  }
};

export const authorize =
  (...roles: readonly UserRole[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new UnauthorizedError());
      return;
    }

    if (!roles.includes(req.auth.role)) {
      next(new ForbiddenError('Peran akun Anda tidak diizinkan mengakses menu ini'));
      return;
    }

    next();
  };
