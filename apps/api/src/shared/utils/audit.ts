import type { Request } from 'express';

import { db } from '../../db/client';
import { auditLog } from '../../db/schema';

export interface AuditInput {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Kolom yang tidak boleh masuk jejak audit karena memuat data sensitif. */
const REDACTED_FIELDS = new Set(['passwordHash', 'password', 'tokenHash', 'refreshToken']);

const sanitize = (values: Record<string, unknown> | null | undefined): Record<string, unknown> | null => {
  if (!values) return null;
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, REDACTED_FIELDS.has(key) ? '[REDACTED]' : value]));
};

/**
 * Audit log ditulis di background (tidak di-await) supaya kegagalan pencatatan
 * tidak membatalkan transaksi bisnis, tapi errornya tetap tercatat di log server.
 */
export const recordAudit = async (input: AuditInput): Promise<void> => {
  try {
    await db.insert(auditLog).values({
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      oldValues: sanitize(input.oldValues),
      newValues: sanitize(input.newValues),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (error) {
    console.error('[audit] gagal menulis jejak audit:', error);
  }
};

/** Pembungkus yang mengambil sidik jari request secara otomatis. */
export const recordAuditFromRequest = (req: Request, input: Omit<AuditInput, 'userId' | 'ipAddress' | 'userAgent'>): void => {
  void recordAudit({
    ...input,
    userId: req.auth?.userId ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  });
};

export const AUDIT_ACTION = {
  LOGIN: 'auth.login',
  LOGIN_FAILED: 'auth.login_failed',
  LOGOUT: 'auth.logout',
  REGISTER: 'auth.register',
  PENGADUAN_CREATED: 'pengajuan.created',
  PENGADUAN_UPDATED: 'pengajuan.updated',
  PENGADUAN_DELETED: 'pengajuan.deleted',
  VERIFIKASI_CREATED: 'verifikasi.created',
  VERIFIKASI_UPDATED: 'verifikasi.updated',
  DOKUMEN_UPLOADED: 'dokumen.uploaded',
  KRITERIA_SAVED: 'kriteria.saved',
  KRITERIA_DELETED: 'kriteria.deleted',
  WASPAS_HITUNG: 'waspas.hitung',
  KEPUTUSAN_TETAPKAN: 'keputusan.tetapkan',
  LAPORAN_DOWNLOAD: 'laporan.download',
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];
