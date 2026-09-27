import type {
  JenisDokumen,
  JenisNotifikasi,
  StatusKeputusan,
  StatusPengajuan,
  StatusVerifikasi,
  TipeKriteria,
} from './status';

export const STATUS_PENGAJUAN_LABEL: Record<StatusPengajuan, string> = {
  menunggu_verifikasi: 'Menunggu Verifikasi',
  data_terverifikasi: 'Data Terverifikasi',
  ditolak: 'Ditolak',
  diproses: 'Diproses',
  diterima: 'Diterima',
};

export const STATUS_VERIFIKASI_LABEL: Record<StatusVerifikasi, string> = {
  valid: 'Valid',
  tidak_valid: 'Tidak Valid',
};

export const STATUS_KEPUTUSAN_LABEL: Record<StatusKeputusan, string> = {
  diterima: 'Diterima',
  ditolak: 'Ditolak',
  cadangan: 'Cadangan',
};

export const TIPE_KRITERIA_LABEL: Record<TipeKriteria, string> = {
  benefit: 'Benefit',
  cost: 'Cost',
};

export const JENIS_DOKUMEN_LABEL: Record<JenisDokumen, string> = {
  spt: 'Surat Pernyataan Tidak Mampu',
  kartu_keluarga: 'Kartu Keluarga',
  foto_rumah: 'Foto Rumah',
  lainnya: 'Dokumen Lainnya',
};

export const JENIS_NOTIFIKASI_LABEL: Record<JenisNotifikasi, string> = {
  info: 'Informasi',
  success: 'Berhasil',
  warning: 'Perhatian',
  error: 'Gagal',
};

export const KONDISI_RUMAH_LABEL: Record<string, string> = {
  layak: 'Layak Huni',
  tidak_layak: 'Tidak Layak Huni',
};

export const JENIS_KELAMIN_LABEL: Record<string, string> = {
  L: 'Laki-laki',
  P: 'Perempuan',
};
