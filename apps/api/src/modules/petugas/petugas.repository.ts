import type { DokumenVerifikasiRow } from '../../db/schema/verifikasi';
import type { PageResult } from '../../shared/utils/pagination';
import type { ListVerifikasiQuery, LaporanQuery } from './petugas.validation';

export interface BarisVerifikasi {
  id: string;
  penghasilanBulanan: number;
  jumlahTanggungan: number;
  kondisiRumah: string;
  statusPengajuan: string;
  catatanPenduduk: string | null;
  tanggalPengajuan: Date;
  namaLengkap: string;
  nik: string;
  alamat: string;
  desa: string | null;
  noTelp: string | null;
  statusVerifikasi: string | null;
  catatanVerifikasi: string | null;
  namaPetugas: string | null;
  tanggalVerifikasi: Date | null;
  jumlahDokumen: number;
  keputusan: string | null;
}

export interface StatistikPetugas {
  totalPending: number;
  totalDiverifikasiHariIni: number;
  totalDitolak: number;
  totalBulanIni: number;
  rataRataWaktuVerifikasiJam: number | null;
}

export interface RincianLaporan {
  pengajuanId: string;
  namaLengkap: string;
  nik: string;
  statusVerifikasi: string;
  catatanVerifikasi: string | null;
  tanggalVerifikasi: Date;
  namaPetugas: string;
}

export interface LaporanHarian {
  tanggal: string;
  totalDiverifikasi: number;
  totalValid: number;
  totalTidakValid: number;
  rincian: RincianLaporan[];
}

export interface InputDokumen {
  verifikasiId: string;
  jenis: string;
  namaFile: string;
  pathRelatif: string;
  mimeType: string;
  ukuranBytes: number;
  uploadedBy: string;
}

export interface InputVerifikasi {
  pengajuanId: string;
  petugasId: string;
  statusVerifikasi: 'valid' | 'tidak_valid';
  catatanVerifikasi: string | null;
  statusPengajuan: 'data_terverifikasi' | 'ditolak';
}

/**
 * Kontrak repository modul petugas. Semua query lintas pengguna (antrean verifikasi,
 * statistik, laporan) terkumpul di sini supaya batas role tidak tersebar di service.
 */
export interface PetugasRepository {
  listVerifikasi(query: ListVerifikasiQuery): Promise<PageResult<BarisVerifikasi>>;
  findVerifikasiDetail(id: string): Promise<BarisVerifikasi | null>;
  statistik(): Promise<StatistikPetugas>;
  laporan(query: LaporanQuery): Promise<LaporanHarian>;
  findDokumenById(id: string): Promise<DokumenVerifikasiRow | null>;
  listDokumenByVerifikasiId(verifikasiId: string): Promise<DokumenVerifikasiRow[]>;
  saveVerifikasi(input: InputVerifikasi): Promise<{ verifikasiId: string; changed: boolean }>;
  insertDokumen(input: InputDokumen): Promise<DokumenVerifikasiRow>;
  findVerifikasiIdByPengajuanId(pengajuanId: string): Promise<string | null>;
  findUserIdByPendudukId(pendudukId: string): Promise<string | null>;
  findPendudukIdByPengajuanId(pengajuanId: string): Promise<string | null>;
}
