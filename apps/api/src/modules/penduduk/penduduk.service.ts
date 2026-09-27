import type { Paginated, StatusPengajuan } from '@spk-bansos/shared';
import type { Request } from 'express';

import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../shared/errors/AppError';
import { AUDIT_ACTION, recordAuditFromRequest } from '../../shared/utils/audit';
import { buildPaginated } from '../../shared/utils/pagination';
import { DrizzleAuthRepository } from '../auth/auth.repository.impl';
import { DrizzlePendudukRepository } from './penduduk.repository.impl';
import type { PendudukRepository, PengajuanWithPeminjam } from './penduduk.repository.impl';
import type {
  CreatePengajuanInput,
  ListPengajuanQuery,
  UpdatePengajuanInput,
} from './penduduk.validation';
import type { UpdateProfileInput } from '../auth/auth.validation';
import type {
  DashboardPenduduk,
  PengajuanDetail,
  PengajuanSummary,
  StatusPenduduk,
  TimelineItem,
} from './penduduk.dto';

const repository: PendudukRepository = new DrizzlePendudukRepository();
const authRepository = new DrizzleAuthRepository();

const toSummary = (row: PengajuanWithPeminjam): PengajuanSummary => ({
  id: row.id,
  penghasilanBulanan: row.penghasilanBulanan,
  jumlahTanggungan: row.jumlahTanggungan,
  kondisiRumah: row.kondisiRumah,
  statusPengajuan: row.statusPengajuan,
  catatanPenduduk: row.catatanPenduduk,
  tanggalPengajuan: row.tanggalPengajuan.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const requirePenduduk = async (userId: string) => {
  const data = await repository.findPendudukByUserId(userId);
  if (!data) {
    throw new NotFoundError('Data penduduk tidak ditemukan. Silakan lengkapi profil terlebih dahulu.');
  }
  return data;
};

export const getProfile = async (userId: string) => {
  const data = await requirePenduduk(userId);
  const akun = await authRepository.findById(userId);

  return {
    nik: data.nik,
    namaLengkap: data.namaLengkap,
    email: akun?.email ?? null,
    jenisKelamin: data.jenisKelamin,
    tanggalLahir: data.tanggalLahir,
    alamat: data.alamat,
    desa: data.desa,
    kecamatan: data.kecamatan,
    kabupaten: data.kabupaten,
    noTelp: data.noTelp,
    noRekening: data.noRekening,
    namaBank: data.namaBank,
  };
};

export const updateProfile = async (req: Request, userId: string, data: UpdateProfileInput) => {
  const before = await getProfile(userId);
  const updated = await authRepository.updateProfile(userId, data);

  recordAuditFromRequest(req, {
    action: 'penduduk.profile_updated',
    entityType: 'penduduk',
    entityId: before.nik,
    oldValues: before as unknown as Record<string, unknown>,
    newValues: (updated.profile ?? {}) as Record<string, unknown>,
  });

  return updated.profile;
};

export const listPengajuan = async (
  userId: string,
  query: ListPengajuanQuery,
): Promise<Paginated<PengajuanSummary>> => {
  const result = await repository.listPengajuan(userId, query);
  return buildPaginated({ items: result.items.map(toSummary), total: result.total }, query);
};

export const createPengajuan = async (
  req: Request,
  userId: string,
  input: CreatePengajuanInput,
): Promise<PengajuanSummary> => {
  const penduduk = await requirePenduduk(userId);
  const created = await repository.createPengajuan(penduduk.id, input);

  recordAuditFromRequest(req, {
    action: AUDIT_ACTION.PENGADUAN_CREATED,
    entityType: 'pengajuan',
    entityId: created.id,
    newValues: {
      penghasilan_bulanan: created.penghasilanBulanan,
      jumlah_tanggungan: created.jumlahTanggungan,
      kondisi_rumah: created.kondisiRumah,
    },
  });

  return toSummary(created);
};

const loadOwnedPengajuan = async (userId: string, id: string): Promise<PengajuanWithPeminjam> => {
  const row = await repository.findPengajuanById(id);
  if (!row) throw new NotFoundError('Pengajuan tidak ditemukan');
  if (row.userId !== userId) throw new ForbiddenError('Pengajuan ini bukan milik Anda');
  return row;
};

export const getPengajuanDetail = async (userId: string, id: string): Promise<PengajuanDetail> => {
  const row = await loadOwnedPengajuan(userId, id);
  const [riwayat, dokumen] = await Promise.all([
    repository.findStatusTerperiksa(userId),
    repository.getDokumenByPengajuanId(id),
  ]);
  const verifikasi = await repository.findVerifikasiByPengajuanId(id);

  return {
    ...toSummary(row),
    namaLengkap: row.namaLengkap,
    nik: row.nik,
    alamat: row.alamat,
    desa: row.desa,
    kecamatan: row.kecamatan,
    kabupaten: row.kabupaten,
    noTelp: row.noTelp,
    verifikasi: verifikasi
      ? {
          statusVerifikasi: verifikasi.statusVerifikasi,
          catatanVerifikasi: verifikasi.catatanVerifikasi,
          namaPetugas: verifikasi.namaPetugas,
          tanggalVerifikasi: verifikasi.tanggalVerifikasi.toISOString(),
          dokumen,
        }
      : null,
    hasil:
      riwayat?.hasil && riwayat.waspas
        ? {
            ranking: riwayat.hasil.ranking,
            skorWaspas: riwayat.hasil.skorWaspas,
            statusKeputusan: riwayat.hasil.statusKeputusan,
            tanggalKeputusan: riwayat.hasil.tanggalKeputusan.toISOString(),
          }
        : null,
    waspas: riwayat?.waspas
      ? {
          skorWs: riwayat.waspas.skorWs,
          skorWp: riwayat.waspas.skorWp,
          skorAkhir: riwayat.waspas.skorAkhir,
          lambda: riwayat.waspas.lambda,
          ranking: riwayat.waspas.ranking,
        }
      : null,
  };
};

export const updatePengajuan = async (
  req: Request,
  userId: string,
  id: string,
  input: UpdatePengajuanInput,
): Promise<PengajuanSummary> => {
  const before = await loadOwnedPengajuan(userId, id);

  if (before.statusPengajuan !== 'menunggu_verifikasi' && before.statusPengajuan !== 'ditolak') {
    throw new BusinessRuleError(
      `Pengajuan berstatus "${before.statusPengajuan}" tidak dapat diubah lagi. ` +
        'Hubungi petugas desa bila terdapat perubahan data.',
      'PENGAJUAN_TERKUNCI',
    );
  }

  const updated = await repository.updatePengajuan(id, input);

  recordAuditFromRequest(req, {
    action: AUDIT_ACTION.PENGADUAN_UPDATED,
    entityType: 'pengajuan',
    entityId: id,
    oldValues: {
      penghasilan_bulanan: before.penghasilanBulanan,
      jumlah_tanggungan: before.jumlahTanggungan,
      kondisi_rumah: before.kondisiRumah,
    },
    newValues: {
      penghasilan_bulanan: updated.penghasilanBulanan,
      jumlah_tanggungan: updated.jumlahTanggungan,
      kondisi_rumah: updated.kondisiRumah,
    },
  });

  return toSummary(updated);
};

const buildTimeline = (
  row: PengajuanWithPeminjam,
  status: Pick<StatusPenduduk, 'statusVerifikasi' | 'statusKeputusan' | 'skorAkhir'>,
): TimelineItem[] => {
  const belumDiverifikasi = row.statusPengajuan === 'menunggu_verifikasi';

  return [
    {
      judul: 'Pengajuan dikirim',
      keterangan: row.catatanPenduduk,
      waktu: row.tanggalPengajuan.toISOString(),
      selesai: true,
    },
    {
      judul: 'Verifikasi lapangan',
      keterangan: belumDiverifikasi
        ? 'Menunggu pemeriksaan petugas desa'
        : status.statusVerifikasi === 'valid'
          ? 'Data valid sesuai pemeriksaan petugas'
          : 'Data tidak memenuhi syarat',
      waktu: row.updatedAt.toISOString(),
      selesai: !belumDiverifikasi,
    },
    {
      judul: 'Perhitungan WASPAS',
      keterangan:
        status.skorAkhir !== null
          ? `Skor akhir ${status.skorAkhir.toFixed(4)}`
          : 'Menunggu seluruh pengajuan terverifikasi',
      waktu: row.updatedAt.toISOString(),
      selesai: status.skorAkhir !== null,
    },
    {
      judul: 'Keputusan kepala desa',
      keterangan: status.statusKeputusan,
      waktu: row.updatedAt.toISOString(),
      selesai: status.statusKeputusan !== null,
    },
  ];
};

export const getStatus = async (userId: string): Promise<StatusPenduduk> => {
  const [row, riwayat, totalTerperiksa] = await Promise.all([
    repository.findLatestPengajuan(userId),
    repository.findStatusTerperiksa(userId),
    repository.hitungTotalTerperiksa(),
  ]);

  if (!row) {
    return {
      totalPengajuan: 0,
      pengajuanAktif: null,
      statusVerifikasi: null,
      statusKeputusan: null,
      ranking: null,
      skorAkhir: null,
      totalTerperiksa,
      timeline: [],
    };
  }

  const statusVerifikasi = riwayat?.verifikasi?.statusVerifikasi ?? null;
  const statusKeputusan = riwayat?.hasil?.statusKeputusan ?? null;
  const skorAkhir = riwayat?.waspas?.skorAkhir ?? null;

  return {
    totalPengajuan: 1,
    pengajuanAktif: row.statusPengajuan as StatusPengajuan,
    statusVerifikasi,
    statusKeputusan,
    ranking: riwayat?.hasil?.ranking ?? riwayat?.waspas?.ranking ?? null,
    skorAkhir,
    totalTerperiksa,
    timeline: buildTimeline(row, { statusVerifikasi, statusKeputusan, skorAkhir }),
  };
};

export const getDashboard = async (userId: string): Promise<DashboardPenduduk> => {
  const [ringkasan, terakhir, jumlahPerStatus] = await Promise.all([
    getStatus(userId),
    repository.findLatestPengajuan(userId),
    repository.countByStatus(userId),
  ]);

  return {
    ringkasan,
    pengajuanTerakhir: terakhir ? toSummary(terakhir) : null,
    totalDiterima: jumlahPerStatus.diterima ?? 0,
    totalMenunggu: jumlahPerStatus.menunggu_verifikasi ?? 0,
    totalDitolak: jumlahPerStatus.ditolak ?? 0,
  };
};

export const getRanking = async (userId: string) => {
  const [riwayat, totalTerperiksa] = await Promise.all([
    repository.findStatusTerperiksa(userId),
    repository.hitungTotalTerperiksa(),
  ]);

  if (!riwayat?.waspas) {
    return {
      tersedia: false,
      pesan:
        'Ranking belum tersedia. Perhitungan WASPAS belum dilakukan atau pengajuan Anda belum lolos verifikasi.',
      posisi: null,
      skorWs: null,
      skorWp: null,
      skorAkhir: null,
      lambda: null,
      statusKeputusan: null,
      totalTerperiksa,
    };
  }

  return {
    tersedia: true,
    pesan: null,
    posisi: riwayat.hasil?.ranking ?? riwayat.waspas.ranking,
    skorWs: riwayat.waspas.skorWs,
    skorWp: riwayat.waspas.skorWp,
    skorAkhir: riwayat.waspas.skorAkhir,
    lambda: riwayat.waspas.lambda,
    statusKeputusan: riwayat.hasil?.statusKeputusan ?? null,
    totalTerperiksa,
  };
};
