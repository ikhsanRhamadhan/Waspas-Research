import type { UserRole } from '@spk-bansos/shared';

export interface AuthContext {
  userId: string;
  username: string;
  role: UserRole;
  nama: string;
}

declare global {
  namespace Express {
    interface Request {
      /** Diisi oleh middleware `authenticate`. Karena opsional, route yang butuh auth
       *  selalu lewat middleware itu juga, sehingga `req.auth` dijamin ada di downstream. */
      auth?: AuthContext;
      requestId?: string;
    }
  }
}

export {};
