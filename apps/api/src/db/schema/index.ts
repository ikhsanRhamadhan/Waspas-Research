import { hasil, hasilRelations } from './hasil';
import { kriteria, kriteriaRelations, subkriteria, subkriteriaRelations } from './kriteria';
import { notifications, notificationsRelations } from './notification';
import { auditLog, auditLogRelations } from './audit-log';
import { penduduk } from './penduduk';
import { pengajuan } from './pengajuan';
import { refreshTokens, refreshTokensRelations } from './auth-token';
import { users } from './users';
import { usersRelations } from './relations-users';
import {
  perhitunganWaspas,
  perhitunganWaspasDetail,
  perhitunganWaspasDetailRelations,
  perhitunganWaspasRelations,
} from './waspas';
import {
  dokumenVerifikasi,
  dokumenVerifikasiRelations,
  verifikasi,
  verifikasiRelations,
} from './verifikasi';

export * from './enums';
export * from './users';
export * from './penduduk';
export * from './pengajuan';
export * from './verifikasi';
export * from './kriteria';
export * from './waspas';
export * from './hasil';
export * from './audit-log';
export * from './notification';
export * from './auth-token';

export const schema = {
  users,
  penduduk,
  pengajuan,
  verifikasi,
  dokumenVerifikasi,
  kriteria,
  subkriteria,
  perhitunganWaspas,
  perhitunganWaspasDetail,
  hasil,
  auditLog,
  notifications,
  refreshTokens,
  usersRelations,
  hasilRelations,
  kriteriaRelations,
  subkriteriaRelations,
  perhitunganWaspasRelations,
  perhitunganWaspasDetailRelations,
  verifikasiRelations,
  dokumenVerifikasiRelations,
  auditLogRelations,
  notificationsRelations,
  refreshTokensRelations,
} as const;

export type AppSchema = typeof schema;
