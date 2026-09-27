import { ROLE_HOME, type AuthSession, type AuthUser } from '@spk-bansos/shared';
import { create } from 'zustand';

import { getApi, hapusSesi, postApi, simpanSesi } from './api';

interface AuthState {
  user: AuthUser | null;
  /** True selama startup masih menanyakan sesi ke server, supaya guard tidak memantulkan user. */
  sedangMemuat: boolean;
  masuk: (input: { username: string; password: string }) => Promise<AuthUser>;
  daftar: (input: unknown) => Promise<AuthUser>;
  keluar: () => Promise<void>;
  pulihkanSesi: () => Promise<void>;
}

const simpanUser = (session: AuthSession): AuthUser => {
  simpanSesi({ accessToken: session.accessToken, refreshToken: session.refreshToken });
  return session.user;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  sedangMemuat: true,

  masuk: async (input) => {
    const session = await postApi<AuthSession>('/auth/login', input);
    set({ user: simpanUser(session), sedangMemuat: false });
    return session.user;
  },

  daftar: async (input) => {
    const session = await postApi<AuthSession>('/auth/register', input);
    set({ user: simpanUser(session), sedangMemuat: false });
    return session.user;
  },

  keluar: async () => {
    try {
      await postApi('/auth/logout');
    } catch {
      // Logout lokal tetap dijalankan: sesi server yang sudah tidak berlaku tidak
      // boleh menahan pengguna keluar dari perambannya.
    }
    hapusSesi();
    set({ user: null, sedangMemuat: false });
  },

  pulihkanSesi: async () => {
    try {
      const user = await getApi<AuthUser>('/auth/me');
      set({ user, sedangMemuat: false });
    } catch {
      hapusSesi();
      set({ user: null, sedangMemuat: false });
    }
  },
}));

export const tujuanSetelahMasuk = (role: AuthUser['role']): string => ROLE_HOME[role];
