import {
  JENIS_DOKUMEN,
  JENIS_NOTIFIKASI,
  KUNCI_KRITERIA,
  STATUS_KEPUTUSAN,
  STATUS_PENGAJUAN,
  STATUS_VERIFIKASI,
  TIPE_KRITERIA,
  USER_ROLES,
} from '@spk-bansos/shared';
import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', USER_ROLES);
export const statusPengajuanEnum = pgEnum('status_pengajuan', STATUS_PENGAJUAN);
export const statusVerifikasiEnum = pgEnum('status_verifikasi', STATUS_VERIFIKASI);
export const statusKeputusanEnum = pgEnum('status_keputusan', STATUS_KEPUTUSAN);
export const tipeKriteriaEnum = pgEnum('tipe_kriteria', TIPE_KRITERIA);
export const kunciKriteriaEnum = pgEnum('kunci_kriteria', KUNCI_KRITERIA);
export const jenisDokumenEnum = pgEnum('jenis_dokumen', JENIS_DOKUMEN);
export const jenisNotifikasiEnum = pgEnum('jenis_notifikasi', JENIS_NOTIFIKASI);
