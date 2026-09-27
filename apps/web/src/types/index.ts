import type {
  JenisDokumen,
  JenisNotifikasi,
  KunciKriteria,
  StatusKeputusan,
  StatusPengajuan,
  StatusVerifikasi,
  TipeKriteria,
} from '@spk-bansos/shared';

/**
 * Bentuk data yang dikembalikan API. Disalin sebagai kontrak di sisi web supaya
 * perubahan pada modul backend tidak ikut diam-diam merusak halaman tanpa error type.
 */

export interface RingkasanPengajuan {
  id: string;
  penghasilanBulanan: number;
  jumlahTanggungan: number;
  kondisiRumah: string;
  statusPengajuan: StatusPengajuan;
  catatanPenduduk: string | null;
  tanggalPengajuan: string;
  updatedAt: string;
}

export interface DokumenVerifikasi {
  id: string;
  jenis: JenisDokumen;
  namaFile: string;
  ukuranBytes: number;
  mimeType: string;
  diunggahPada: string;
}

export interface DetailPengajuan extends RingkasanPengajuan {
  namaLengkap: string;
  nik: string;
  alamat: string;
  desa: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  noTelp: string | null;
  verifikasi: {
    statusVerifikasi: StatusVerifikasi;
    catatanVerifikasi: string | null;
    namaPetugas: string;
    tanggalVerifikasi: string;
    dokumen: DokumenVerifikasi[];
  } | null;
  hasil: {
    ranking: number;
    skorWaspas: number;
    statusKeputusan: StatusKeputusan;
    tanggalKeputusan: string;
  } | null;
  waspas: {
    skorWs: number;
    skorWp: number;
    skorAkhir: number;
    lambda: number;
    ranking: number | null;
  } | null;
}

export interface ItemTimeline {
  judul: string;
  keterangan: string | null;
  waktu: string;
  selesai: boolean;
}

export interface RingkasanStatusWarga {
  totalPengajuan: number;
  pengajuanAktif: StatusPengajuan | null;
  statusVerifikasi: StatusVerifikasi | null;
  statusKeputusan: StatusKeputusan | null;
  ranking: number | null;
  skorAkhir: number | null;
  totalTerperiksa: number;
  timeline: ItemTimeline[];
}

export interface DashboardWarga {
  ringkasan: RingkasanStatusWarga;
  pengajuanTerakhir: RingkasanPengajuan | null;
  totalDiterima: number;
  totalMenunggu: number;
  totalDitolak: number;
}

export interface PosisiRanking {
  tersedia: boolean;
  pesan: string | null;
  posisi: number | null;
  skorWs: number | null;
  skorWp: number | null;
  skorAkhir: number | null;
  lambda: number | null;
  statusKeputusan: StatusKeputusan | null;
  totalTerperiksa: number;
}

export interface ProfilWarga {
  nik: string;
  namaLengkap: string;
  email: string | null;
  jenisKelamin: string | null;
  tanggalLahir: string | null;
  alamat: string;
  desa: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  noTelp: string | null;
  noRekening: string | null;
  namaBank: string | null;
}

export interface StatistikPetugas {
  totalPending: number;
  totalDiverifikasiHariIni: number;
  totalDitolak: number;
  totalBulanIni: number;
  rataRataWaktuVerifikasiJam: number | null;
}

export interface BarisVerifikasi {
  id: string;
  namaLengkap: string;
  nik: string;
  penghasilanBulanan: number;
  jumlahTanggungan: number;
  kondisiRumah: string;
  statusPengajuan: StatusPengajuan;
  tanggalPengajuan: string;
  tanggalVerifikasi: string | null;
  statusVerifikasi: StatusVerifikasi | null;
  jumlahDokumen: number;
  keputusan: StatusKeputusan | null;
}

export interface DetailVerifikasi extends BarisVerifikasi {
  alamat: string;
  desa: string | null;
  noTelp: string | null;
  catatanPenduduk: string | null;
  catatanVerifikasi: string | null;
  namaPetugas: string | null;
  terkunci: boolean;
  dokumen: DokumenVerifikasi[];
}

export interface RincianLaporan {
  pengajuanId: string;
  namaLengkap: string;
  nik: string;
  statusVerifikasi: StatusVerifikasi;
  catatanVerifikasi: string | null;
  tanggalVerifikasi: string;
  namaPetugas: string;
}

export interface LaporanHarian {
  tanggal: string;
  totalDiverifikasi: number;
  totalValid: number;
  totalTidakValid: number;
  rincian: RincianLaporan[];
}

export interface StatistikAdmin {
  totalPenduduk: number;
  totalPengajuan: number;
  menungguVerifikasi: number;
  terverifikasi: number;
  totalDiterima: number;
  totalSudahDihitung: number;
  rasioPenerima: number | null;
}

export interface RincianPerhitungan {
  kriteriaId: string;
  namaKriteria: string;
  bobot: number;
  nilaiMentah: number | null;
  kodeNilai: string | null;
  score: number;
  kontribusiWs: number;
  kontribusiWp: number;
}

export interface BarisRankingHitung {
  ranking: number;
  pengajuanId: string;
  namaLengkap: string;
  penghasilanBulanan: number;
  jumlahTanggungan: number;
  skorWs: number;
  skorWp: number;
  skorAkhir: number;
  detail: RincianPerhitungan[];
}

export interface HasilHitungWaspas {
  lambda: number;
  totalBobotKriteria: number;
  jumlahPengajuan: number;
  ranking: BarisRankingHitung[];
}

export interface BarisPenerima {
  pengajuanId: string;
  ranking: number;
  skorWs: number;
  skorWp: number;
  skorAkhir: number;
  namaLengkap: string;
  nik: string;
  penghasilanBulanan: number;
  jumlahTanggungan: number;
  kondisiRumah: string;
  alamat: string;
  tanggalPengajuan: string;
  statusKeputusan: StatusKeputusan | null;
  tanggalKeputusan: string | null;
  catatanAdmin: string | null;
  namaAdmin: string | null;
  userId: string;
}

export interface Subkriteria {
  id: string;
  kodeNilai: string | null;
  label: string | null;
  nilaiMin: number | null;
  nilaiMax: number | null;
  score: number;
}

export interface Kriteria {
  id: string;
  kunci: KunciKriteria;
  namaKriteria: string;
  deskripsi: string | null;
  bobot: number;
  tipeKriteria: TipeKriteria;
  prioritas: number;
  isActive: boolean;
  subkriteria: Subkriteria[];
}

export interface RingkasanBobot {
  total: number;
  valid: boolean;
  jumlahKriteria: number;
}

export interface ItemNotifikasi {
  id: string;
  judul: string;
  pesan: string;
  tipe: JenisNotifikasi;
  actionUrl: string | null;
  isRead: boolean;
  dibacaPada: string | null;
  dibuatPada: string;
}

export interface ItemAuditLog {
  id: string;
  userId: string | null;
  namaUser: string | null;
  role: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}
