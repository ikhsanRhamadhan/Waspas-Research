import { LAMBDA_DEFAULT, tautanPengajuan } from '@spk-bansos/shared';
import type { Request } from 'express';

import { hitungSemua } from '../../domain/waspas/waspas.service';
import { urutkanRanking } from '../../domain/waspas/WaspasCalculator';
import { env } from '../../config/env';
import { BusinessRuleError, NotFoundError } from '../../shared/errors/AppError';
import { AUDIT_ACTION, recordAuditFromRequest } from '../../shared/utils/audit';
import { bobotAktif } from '../kriteria/kriteria.service';
import { createNotificationsBulk } from '../notification/notification.service';
import { DrizzleAdminRepository } from './admin.repository.impl';
import type { AdminRepository, BarisPenerima } from './admin.repository.impl';
import type { AuditLogQuery, DaftarPenerimaQuery, ExportPdfInput, HitungInput, TetapkanInput } from './admin.validation';
import { buatPdfKeputusan, namaBerkasKeputusan } from './laporan-pdf';

const repository: AdminRepository = new DrizzleAdminRepository();

export const dashboard = () => repository.statistik();

/**
 * Menjalankan WASPAS untuk seluruh pengajuan yang lolos verifikasi.
 *
 * Urutannya penting: validasi bobot dulu (kalau total bobot bukan 1, WASPAS tidak boleh
 * menghasilkan ranking yang menyesatkan), baru hitung skor, baru urutkan. Semua dalam
 * satu jalur supaya admin tidak pernah melihat separuh hasil.
 */
export const jalankanHitung = async (req: Request, input: HitungInput) => {
  const bobot = await bobotAktif();
  if (bobot.jumlahKriteria === 0) {
    throw new BusinessRuleError(
      'Belum ada kriteria WASPAS aktif. Tambahkan kriteria beserta subkriteria terlebih dahulu.',
      'KRITERIA_KOSONG',
    );
  }
  if (!bobot.valid) {
    throw new BusinessRuleError(
      `Total bobot kriteria aktif harus sama dengan 1. Saat ini ${bobot.total.toFixed(4)}. ` +
        'Perbaiki bobot pada menu Kriteria sebelum menghitung.',
      'BOBOT_TIDAK_VALID',
    );
  }

  const kandidat = await repository.kandidatWaspas();
  if (kandidat.length === 0) {
    throw new BusinessRuleError(
      'Tidak ada pengajuan yang lolos verifikasi petugas, sehingga WASPAS belum dapat dihitung.',
      'TIDAK_ADA_KANDIDAT',
    );
  }

  const lambda = input.lambda ?? LAMBDA_DEFAULT;
  const hasil = await hitungSemua(
    kandidat.map((row) => ({
      id: row.id,
      penghasilanBulanan: row.penghasilanBulanan,
      jumlahTanggungan: row.jumlahTanggungan,
      kondisiRumah: row.kondisiRumah,
    })),
    lambda,
  );

  const skorPerId = new Map(hasil.map((item) => [item.pengajuanId, item]));
  const terurut = urutkanRanking(
    kandidat.map((row) => {
      const item = skorPerId.get(row.id);
      if (!item) throw new NotFoundError(`Hasil perhitungan untuk pengajuan ${row.id} tidak terbentuk.`);
      return {
        pengajuanId: row.id,
        skorAkhir: item.skorAkhir,
        jumlahTanggungan: row.jumlahTanggungan,
        penghasilanBulanan: row.penghasilanBulanan,
        nama: row.namaLengkap,
        userId: row.userId,
        hasil: item,
      };
    }),
  );

  await repository.simpanPerhitungan(
    terurut.map((row, index) => ({
      pengajuanId: row.pengajuanId,
      lambda: row.hasil.lambda,
      skorWs: row.hasil.skorWs,
      skorWp: row.hasil.skorWp,
      skorAkhir: row.hasil.skorAkhir,
      ranking: index + 1,
      detail: row.hasil.detail,
    })),
    req.auth!.userId,
  );

  await repository.tandaiDiproses(terurut.map((row) => row.pengajuanId));

  recordAuditFromRequest(req, {
    action: AUDIT_ACTION.WASPAS_HITUNG,
    entityType: 'perhitungan_waspas',
    entityId: null,
    newValues: { jumlah_pengajuan: terurut.length, lambda, total_bobot: bobot.total },
  });

  return {
    lambda,
    totalBobotKriteria: bobot.total,
    jumlahPengajuan: terurut.length,
    ranking: terurut.map((row, index) => ({
      ranking: index + 1,
      pengajuanId: row.pengajuanId,
      namaLengkap: row.nama,
      penghasilanBulanan: row.penghasilanBulanan,
      jumlahTanggungan: row.jumlahTanggungan,
      skorWs: row.hasil.skorWs,
      skorWp: row.hasil.skorWp,
      skorAkhir: row.hasil.skorAkhir,
      detail: row.hasil.detail,
    })),
  };
};

export const daftarPenerima = (query: DaftarPenerimaQuery) => repository.daftarPenerima(query);

export const daftarAuditLog = (query: AuditLogQuery) => repository.daftarAuditLog(query);

/**
 * PDF memakai satu snapshot data yang sama dengan yang dibaca admin di layar, bukan
 * menebak ulang angka. Filter status diteruskan supaya admin bisa mengunduh, misalnya,
 * hanya daftar cadangan.
 */
export const pdfKeputusan = async (req: Request, input: ExportPdfInput) => {
  const penerima = await repository.semuaPenerima({ ...input, page: 1, limit: 100, order: 'asc' });
  const dibuatPada = new Date();

  recordAuditFromRequest(req, {
    action: AUDIT_ACTION.LAPORAN_DOWNLOAD,
    entityType: 'hasil',
    entityId: null,
    newValues: { jenis_laporan: 'keputusan', jumlah_baris: penerima.length, status_filter: input.status ?? null },
  });

  return {
    namaBerkas: namaBerkasKeputusan(dibuatPada),
    dokumen: buatPdfKeputusan({
      namaDesa: env.NAMA_DESA,
      namaAdmin: req.auth!.nama,
      statusFilter: input.status ?? null,
      penerima,
      dibuatPada,
    }),
  };
};

/**
 * Penetapan penerima. Setiap pemohon yang ditetapkan diberi tahu lewat notifikasi,
 * jadi keputusan tidak hanya tersimpan di database tapi juga sampai ke akunnya.
 */
export const tetapkanKeputusan = async (req: Request, input: TetapkanInput) => {
  const pengajuanIds = input.daftarPenerima.map((item) => item.pengajuanId);
  const terpilih = await repository.ambilPenerimaTerpilih(pengajuanIds);

  if (terpilih.length === 0) {
    throw new NotFoundError('Pengajuan yang dipilih belum pernah dihitung WASPAS.');
  }

  const terkunci = await repository.tetapkanKeputusan(input, req.auth!.userId);

  const peta = new Map(terpilih.map((row) => [row.pengajuanId, row]));
  await createNotificationsBulk(
    input.daftarPenerima
      .filter((item) => peta.has(item.pengajuanId))
      .map((item) => {
        const row = peta.get(item.pengajuanId)!;
        return {
          userId: row.userId,
          title:
            item.statusKeputusan === 'diterima'
              ? 'Selamat, Anda menjadi penerima bantuan'
              : item.statusKeputusan === 'cadangan'
                ? 'Anda masuk daftar cadangan penerima'
                : 'Keputusan pengajuan Anda',
          message:
            item.catatanAdmin ??
            (item.statusKeputusan === 'diterima'
              ? `Pengajuan Anda ditetapkan sebagai penerima dengan peringkat ${row.ranking}.`
              : item.statusKeputusan === 'cadangan'
                ? 'Anda diprioritaskan sebagai cadangan dan akan dihubungi bila ada penerima yang mundur.'
                : 'Mohon maaf, pengajuan Anda tidak dapat dilanjutkan.'),
          type: item.statusKeputusan === 'diterima' ? 'success' : 'info',
          actionUrl: tautanPengajuan(item.pengajuanId),
        };
      }),
  );

  recordAuditFromRequest(req, {
    action: AUDIT_ACTION.KEPUTUSAN_TETAPKAN,
    entityType: 'hasil',
    entityId: null,
    newValues: {
      jumlah: terkunci.length,
      keputusan: input.daftarPenerima.map((item) => ({
        pengajuan_id: item.pengajuanId,
        status: item.statusKeputusan,
      })),
    },
  });

  return {
    jumlahDitetapkan: terkunci.length,
    pengajuanIds: terkunci,
    pesan: `${terkunci.length} keputusan penerima berhasil ditetapkan.`,
  };
};

export const statistik = () => repository.statistik();
