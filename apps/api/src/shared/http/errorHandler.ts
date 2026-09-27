import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { AppError, NotFoundError, ValidationError } from '../errors/AppError';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`));
};

/**
 * Bentuk error Postgres minimal yang dibutuhkan pemetaan. Sengaja didefinisikan
 * lokal supaya tidak bergantung pada re-export internal driver.
 */
interface PostgresErrorLike {
  code?: string;
  detail?: string;
  constraint?: string;
}

const isPostgresError = (error: unknown): error is PostgresErrorLike =>
  error instanceof Error && 'code' in error && typeof (error as PostgresErrorLike).code === 'string';

/** Memetakan error database Postgres ke error domain yang bisa dimengerti user. */
const mapPostgresError = (error: PostgresErrorLike): AppError | null => {
  switch (error.code) {
    case '23505':
      return new AppError('Data dengan nilai unik tersebut sudah terdaftar', {
        statusCode: 409,
        code: 'DUPLICATE_VALUE',
      });
    case '23503':
      return new AppError('Data masih terhubung dengan data lain', {
        statusCode: 409,
        code: 'FOREIGN_KEY_VIOLATION',
      });
    case '23514':
      return new AppError('Nilai tidak memenuhi aturan data yang berlaku', {
        statusCode: 422,
        code: 'CHECK_VIOLATION',
      });
    case '22P02':
      return new ValidationError('Format salah satu field tidak dikenali');
    default:
      return null;
  }
};

// Express 5 meneruskan error async secara otomatis, jadi handler ini cukup satu fungsi.
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const requestId = req.requestId;

  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : '_';
      (errors[key] ??= []).push(issue.message);
    }
    res.status(422).json({ success: false, message: 'Data yang dikirim tidak valid', errors, requestId });
    return;
  }

  if (error instanceof MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? `Ukuran berkas melebihi batas ${env.MAX_UPLOAD_MB} MB`
        : `Upload gagal: ${error.message}`;
    res.status(422).json({ success: false, message, requestId });
    return;
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ err: error, requestId, path: req.originalUrl }, 'Request gagal');
    }
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.errors ? { errors: error.errors } : {}),
      requestId,
    });
    return;
  }

  if (isPostgresError(error)) {
    const mapped = mapPostgresError(error);
    if (mapped) {
      res.status(mapped.statusCode).json({ success: false, message: mapped.message, requestId });
      return;
    }
  }

  logger.error({ err: error, requestId, path: req.originalUrl }, 'Terjadi kesalahan tidak terduga');

  // Detail internal tidak pernah dibocorkan ke client di produksi.
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
    ...(env.isProduction ? {} : { debug: error instanceof Error ? error.message : String(error) }),
    requestId,
  });
};
