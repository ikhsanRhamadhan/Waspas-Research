/**
 * Error domain untuk seluruh API. Semua error yang diharapkan sudah-known harus
 * dilempar sebagai AppError subclass supaya error handler bisa memetakan ke
 * status code dan pesan yang tepat tanpa menebak-nebak dari string error.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly errors: Record<string, string[]> | undefined;
  readonly isOperational: boolean;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      errors?: Record<string, string[]>;
      isOperational?: boolean;
    } = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.errors = options.errors;
    this.isOperational = options.isOperational ?? this.statusCode < 500;
    Error.captureStackTrace(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Data yang dikirim tidak valid', errors?: Record<string, string[]>) {
    super(message, { statusCode: 422, code: 'VALIDATION_ERROR', errors });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Anda harus masuk terlebih dahulu') {
    super(message, { statusCode: 401, code: 'UNAUTHORIZED' });
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Username atau kata sandi salah') {
    super(message, { statusCode: 401, code: 'INVALID_CREDENTIALS' });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Anda tidak memiliki izin untuk aksi ini') {
    super(message, { statusCode: 403, code: 'FORBIDDEN' });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Data yang diminta tidak ditemukan') {
    super(message, { statusCode: 404, code: 'NOT_FOUND' });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Data sudah ada / bentrok dengan data lain') {
    super(message, { statusCode: 409, code: 'CONFLICT' });
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, code = 'BUSINESS_RULE_VIOLATION') {
    super(message, { statusCode: 422, code });
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Ukuran berkas melebihi batas yang diizinkan') {
    super(message, { statusCode: 413, code: 'PAYLOAD_TOO_LARGE' });
  }
}
