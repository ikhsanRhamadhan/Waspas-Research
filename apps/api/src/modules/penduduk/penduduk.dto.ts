import type { StatusPengajuan } from '@spk-bansos/shared';

export interface PengajuanSummary {
  id: string;
  penghasilanBulanan: number;
  jumlahTanggungan: number;
  kondisiRumah: string;
  statusPengajuan: StatusPengajuan;
  catatanPenduduk: string | null;
  tanggalPengajuan: string;
  updatedAt: string;
}

export interface PengajuanDetail extends PengajuanSummary {
  namaLengkap: string;
  nik: string;
  alamat: string;
  desa: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  noTelp: string | null;
  verifikasi: {
    statusVerifikasi: string;
    catatanVerifikasi: string | null;
    namaPetugas: string;
    tanggalVerifikasi: string;
    dokumen: { id: string; jenis: string; namaFile: string }[];
  } | null;
  hasil: {
    ranking: number;
    skorWaspas: number;
    statusKeputusan: string;
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

export interface StatusPenduduk {
  totalPengajuan: number;
  pengajuanAktif: StatusPengajuan | null;
  statusVerifikasi: string | null;
  statusKeputusan: string | null;
  ranking: number | null;
  skorAkhir: number | null;
  totalTerperiksa: number;
  timeline: TimelineItem[];
}

export interface TimelineItem {
  judul: string;
  keterangan: string | null;
  waktu: string;
  selesai: boolean;
}

export interface DashboardPenduduk {
  ringkasan: StatusPenduduk;
  pengajuanTerakhir: PengajuanSummary | null;
  totalDiterima: number;
  totalMenunggu: number;
  totalDitolak: number;
}
