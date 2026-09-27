export const STATUS_PENGAJUAN = [
  'menunggu_verifikasi',
  'data_terverifikasi',
  'ditolak',
  'diproses',
  'diterima',
] as const;
export type StatusPengajuan = (typeof STATUS_PENGAJUAN)[number];

/** Hanya status ini yang boleh masuk perhitungan WASPAS. */
export const STATUS_PENGAJUAN_WASPAS: StatusPengajuan[] = ['data_terverifikasi', 'diproses'];

/** Pengajuan dianggap "masih bisa diubah pemohon" selama belum disentuh petugas. */
export const STATUS_PENGAJUAN_BISA_EDIT: StatusPengajuan[] = ['menunggu_verifikasi', 'ditolak'];

export const STATUS_VERIFIKASI = ['valid', 'tidak_valid'] as const;
export type StatusVerifikasi = (typeof STATUS_VERIFIKASI)[number];

export const STATUS_KEPUTUSAN = ['diterima', 'ditolak', 'cadangan'] as const;
export type StatusKeputusan = (typeof STATUS_KEPUTUSAN)[number];

/**
 * Status keputusan admin belum tentu sama dengan status pengajuan. "cadangan"
 * misalnya tetap menjadi "diproses" supaya tidak salah dibaca sebagai penerima final.
 */
export const STATUS_KEPUTUSAN_TO_PENGAJUAN: Record<StatusKeputusan, StatusPengajuan> = {
  diterima: 'diterima',
  ditolak: 'ditolak',
  cadangan: 'diproses',
};

export const TIPE_KRITERIA = ['benefit', 'cost'] as const;
export type TipeKriteria = (typeof TIPE_KRITERIA)[number];

export const JENIS_DOKUMEN = ['spt', 'kartu_keluarga', 'foto_rumah', 'lainnya'] as const;
export type JenisDokumen = (typeof JENIS_DOKUMEN)[number];

export const JENIS_NOTIFIKASI = ['info', 'success', 'warning', 'error'] as const;
export type JenisNotifikasi = (typeof JENIS_NOTIFIKASI)[number];

/** Sumber nilai sebuah kriteria menentukan cara pencocokan subkriteria. */
export const SUMBER_NILAI_KRITERIA = ['number', 'kode'] as const;
export type SumberNilaiKriteria = (typeof SUMBER_NILAI_KRITERIA)[number];

/**
 * Kunci stabil untuk setiap kriteria. AngkaMENTAH pengajuan dipetakan ke kriteria
 * lewat kunci ini, bukan lewat nama kriteria — supaya nama kriteria masih boleh
 * diubah admin tanpa membuat perhitungan WASPAS salah.
 */
export const KUNCI_KRITERIA = ['penghasilan', 'tanggungan', 'kondisi_rumah'] as const;
export type KunciKriteria = (typeof KUNCI_KRITERIA)[number];

export const KUNCI_KRITERIA_LABEL: Record<KunciKriteria, string> = {
  penghasilan: 'Penghasilan Bulanan',
  tanggungan: 'Jumlah Tanggungan',
  kondisi_rumah: 'Kondisi Rumah',
};

/** Lambda default: 0.5 berarti WS dan WP diberi bobot sama. */
export const LAMBDA_DEFAULT = 0.5;
