import type { Request } from 'express';

export interface RequestFingerprint {
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Di belakang reverse proxy, `req.ip` bisa berupa IP proxy. Express 5 sudah
 * mempercayai X-Forwarded-For sesuai konfigurasi `trust proxy` di app.ts.
 */
export const fingerprintOf = (req: Request): RequestFingerprint => {
  const header = req.headers['x-forwarded-for'];
  const forwarded = Array.isArray(header) ? header[0] : header;

  return {
    ipAddress: (forwarded?.split(',')[0]?.trim() ?? req.ip ?? req.socket.remoteAddress ?? null)?.slice(0, 45) ?? null,
    userAgent: req.get('user-agent')?.slice(0, 500) ?? null,
  };
};
