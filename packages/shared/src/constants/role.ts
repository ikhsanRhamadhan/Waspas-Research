export const USER_ROLES = ['penduduk', 'petugas', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABEL: Record<UserRole, string> = {
  penduduk: 'Penduduk',
  petugas: 'Petugas Desa',
  admin: 'Kepala Desa',
};

export const ROLE_HOME: Record<UserRole, string> = {
  penduduk: '/dashboard',
  petugas: '/petugas',
  admin: '/admin',
};

export type Permission =
  | 'view:own_pengajuan'
  | 'create:pengajuan'
  | 'view:own_ranking'
  | 'view:all_pengajuan'
  | 'verify:pengajuan'
  | 'upload:dokumen'
  | 'manage:kriteria'
  | 'view:all'
  | 'calculate:waspas'
  | 'make:decision'
  | 'view:audit';

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  penduduk: ['view:own_pengajuan', 'create:pengajuan', 'view:own_ranking'],
  petugas: ['view:all_pengajuan', 'verify:pengajuan', 'upload:dokumen', 'manage:kriteria'],
  admin: ['view:all', 'calculate:waspas', 'make:decision', 'view:audit'],
};

export const hasPermission = (role: UserRole, permission: Permission): boolean =>
  ROLE_PERMISSIONS[role].includes(permission);
