import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import type { Paginated } from '@spk-bansos/shared';
import type { Request } from 'express';

import { env } from '../../config/env';
import { NotFoundError, PayloadTooLargeError, ValidationError } from '../../shared/errors/AppError';
import { AUDIT_ACTION, recordAuditFromRequest } from '../../shared/utils/audit';
import { buildPaginated } from '../../shared/utils/pagination';
import { createNotification } from '../notification/notification.service';
import { DrizzlePetugasRepository } from './petugas.repository.impl';
import type { BarisVerifikasi, PetugasRepository } from './petugas.repository';
import type { LaporanQuery, ListVerifikasiQuery, VerifikasiInput } from './petugas.validation';

const repository: PetugasRepository = new DrizzlePetugasRepository();

const STATUS_TERKUNCI = ['diproses', 'diterima'] as const;

const toRingkasan = (row: BarisVerifikasi) => ({
  id: row.id,
  namaLengkap: row.namaLengkap,
  nik: row.nik,
  penghasilanBulanan: row.penghasilanBulanan,
  jumlahTanggungan: row.jumlahTanggungan,
  kondisiRumah: row.kondisiRumah,
  statusPengajuan: row.statusPengajuan,
  tanggalPengajuan: row.tanggalPengajuan.toISOString(),
  tanggalVerifikasi: row.tanggalVerifikasi?.toISOString() ?? null,
  statusVerifikasi: row.statusVerifikasi,
  jumlahDokumen: Number(row.jumlahDokumen),
  keputusan: row.keputusan,
});

const isTerkunci = (row: BarisVerifikasi): boolean =>
  (STATUS_TERKUNCI as readonly string[]).includes(row.statusPengajuan);

export const listVerifikasi = async (
  query: ListVerifikasiQuery,
): Promise<Paginated<ReturnType<typeof toRingkasan>>> => {
  const result = await repository.listVerifikasi(query);
  return buildPaginated({ items: result.items.map(toRingkasan), total: result.total }, query);
};

export const getDetail = async (id: string) => {
  const row = await repository.findVerifikasiDetail(id);
  if (!row) throw new NotFoundError('Pengajuan tidak ditemukan');

  const verifikasiId = await repository.findVerifikasiIdByPengajuanId(id);
  const dokumen = verifikasiId ? await repository.listDokumenByVerifikasiId(verifikasiId) : [];

  return {
    ...toRingkasan(row),
    alamat: row.alamat,
    desa: row.desa,
    noTelp: row.noTelp,
    catatanPenduduk: row.catatanPenduduk,
    catatanVerifikasi: row.catatanVerifikasi,
    namaPetugas: row.namaPetugas,
    terkunci: isTerkunci(row),
    dokumen: dokumen.map((item) => ({
      id: item.id,
      jenis: item.jenis,
      namaFile: item.namaFile,
      ukuranBytes: Number(item.ukuranBytes),
      mimeType: item.mimeType,
      diunggahPada: item.createdAt.toISOString(),
    })),
  };
};

export const verifikasi = async (
  req: Request,
  petugasId: string,
  pengajuanId: string,
  input: VerifikasiInput,
) => {
  const row = await repository.findVerifikasiDetail(pengajuanId);
  if (!row) throw new NotFoundError('Pengajuan tidak ditemukan');

  if (isTerkunci(row)) {
    throw new ValidationError(
      `Pengajuan sudah berstatus "${row.statusPengajuan}" sehingga verifikasi tidak dapat diubah lagi.`,
    );
  }

  if (input.statusVerifikasi === 'tidak_valid' && !input.catatanVerifikasi) {
    throw new ValidationError('Catatan verifikasi wajib diisi bila pengajuan dinyatakan tidak valid.');
  }

  const statusPengajuan = input.statusVerifikasi === 'valid' ? 'data_terverifikasi' : 'ditolak';

  await repository.saveVerifikasi({
    pengajuanId,
    petugasId,
    statusVerifikasi: input.statusVerifikasi,
    catatanVerifikasi: input.catatanVerifikasi ?? null,
    statusPengajuan,
  });

  const pendudukId = await repository.findPendudukIdByPengajuanId(pengajuanId);
  const userId = pendudukId ? await repository.findUserIdByPendudukId(pendudukId) : null;

  if (userId) {
    const valid = input.statusVerifikasi === 'valid';
    await createNotification({
      userId,
      title: valid ? 'Pengajuan Anda terverifikasi' : 'Pengajuan Anda tidak valid',
      message: valid
        ? 'Pengajuan bantuan sosial Anda telah diverifikasi petugas dan dilanjutkan ke tahap perhitungan WASPAS.'
        : input.catatanVerifikasi ?? 'Silakan perbaiki data pengajuan Anda lalu kirim ulang.',
      type: valid ? 'success' : 'warning',
      actionUrl: `/penduduk/pengajuan/${pengajuanId}`,
    });
  }

  recordAuditFromRequest(req, {
    action: AUDIT_ACTION.VERIFIKASI_CREATED,
    entityType: 'verifikasi',
    entityId: pengajuanId,
    oldValues: {
      status_verifikasi: row.statusVerifikasi,
      catatan_verifikasi: row.catatanVerifikasi,
      status_pengajuan: row.statusPengajuan,
    },
    newValues: {
      status_verifikasi: input.statusVerifikasi,
      catatan_verifikasi: input.catatanVerifikasi ?? null,
      status_pengajuan: statusPengajuan,
    },
  });

  return {
    id: pengajuanId,
    statusVerifikasi: input.statusVerifikasi,
    catatanVerifikasi: input.catatanVerifikasi ?? null,
    statusPengajuan,
    pesan:
      statusPengajuan === 'data_terverifikasi'
        ? 'Verifikasi berhasil. Pengajuan masuk antrean perhitungan WASPAS.'
        : 'Verifikasi berhasil. Pengajuan ditandai tidak valid dan warga diberi tahu.',
  };
};

export const uploadDokumen = async (
  req: Request,
  petugasId: string,
  pengajuanId: string,
  jenis: string,
  file: Express.Multer.File | undefined,
) => {
  if (!file) throw new ValidationError('Berkas dokumen wajib diunggah.');

  const row = await repository.findVerifikasiDetail(pengajuanId);
  if (!row) throw new NotFoundError('Pengajuan tidak ditemukan');
  if (isTerkunci(row)) {
    throw new ValidationError('Dokumen tidak dapat diunggah karena pengajuan sudah final.');
  }

  const verifikasiId = await repository.findVerifikasiIdByPengajuanId(pengajuanId);
  if (!verifikasiId) {
    throw new ValidationError('Lakukan verifikasi terlebih dahulu sebelum mengunggah dokumen.');
  }

  const tersimpan = await repository.insertDokumen({
    verifikasiId,
    jenis,
    namaFile: file.originalname,
    pathRelatif: file.filename,
    mimeType: file.mimetype,
    ukuranBytes: file.size,
    uploadedBy: petugasId,
  });

  recordAuditFromRequest(req, {
    action: AUDIT_ACTION.DOKUMEN_UPLOADED,
    entityType: 'dokumen_verifikasi',
    entityId: tersimpan.id,
    newValues: {
      pengajuan_id: pengajuanId,
      jenis,
      nama_file: file.originalname,
      ukuran_bytes: file.size,
    },
  });

  return {
    id: tersimpan.id,
    jenis: tersimpan.jenis,
    namaFile: tersimpan.namaFile,
    mimeType: tersimpan.mimeType,
    ukuranBytes: tersimpan.ukuranBytes,
    diunggahPada: tersimpan.createdAt.toISOString(),
  };
};

/**
 * Path berkas dihitung ulang dari UPLOAD_DIR + pathRelatif, bukan dari nilai yang
 * disimpan mentah atau dikirim client, supaya tidak ada yang bisa keluar dari folder
 * upload lewat `../`.
 */
export const readDokumenStream = async (id: string) => {
  const dokumen = await repository.findDokumenById(id);
  if (!dokumen) throw new NotFoundError('Dokumen tidak ditemukan');

  const target = resolve(env.UPLOAD_DIR, basename(dokumen.pathRelatif));
  const info = await stat(target).catch(() => null);
  if (!info?.isFile()) throw new NotFoundError('Berkas dokumen tidak ditemukan di penyimpanan');

  if (info.size > env.MAX_UPLOAD_MB * 1024 * 1024) {
    throw new PayloadTooLargeError();
  }

  return {
    stream: createReadStream(target),
    namaFile: dokumen.namaFile,
    mimeType: dokumen.mimeType,
    ukuranBytes: info.size,
  };
};

export const statistik = () => repository.statistik();

export const laporan = (query: LaporanQuery) => repository.laporan(query);
