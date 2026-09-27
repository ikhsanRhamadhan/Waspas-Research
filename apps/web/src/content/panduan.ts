import { LAMBDA_DEFAULT, type UserRole } from '@spk-bansos/shared';

export interface TugasPanduan {
  judul: string;
  detail: string;
  /** Route halaman yang mengerjakan tugas ini, dipakai sebagai tombol shortcut. */
  ke?: string;
}

export interface PanduanRole {
  perkenalan: string;
  tugas: readonly TugasPanduan[];
  penting: readonly string[];
}

/**
 * Isi panduan mengikuti role, bukan satu teks untuk semua. Aturan di "penting" diambil
 * dari validasi backend supaya tidak menulis aturan yang server sebenarnya tolak.
 */
export const PANDUAN: Record<UserRole, PanduanRole> = {
  penduduk: {
    perkenalan:
      'Bagian ini merangkum apa yang bisa Anda lakukan sebagai warga dan bagaimana pengajuan Anda berjalan sampai keputusan keluar.',
    tugas: [
      {
        judul: 'Mengajukan bantuan',
        detail: 'Kirim data ekonomi dan dokumen pendukung untuk diperiksa petugas desa.',
        ke: '/pengajuan',
      },
      {
        judul: 'Memantau status pengajuan',
        detail: 'Lihat tahap yang sedang dilalui pengajuan Anda beserta notifikasi yang masuk.',
        ke: '/dashboard',
      },
      {
        judul: 'Melihat peringkat',
        detail: 'Periksa posisi Anda di antara pengajuan yang lolos verifikasi beserta skor akhirnya.',
        ke: '/ranking',
      },
      {
        judul: 'Mengubah data diri',
        detail: 'Perbarui alamat, nomor rekening, dan data lain yang dipakai pada dokumen.',
        ke: '/profil',
      },
    ],
    penting: [
      'Penghasilan bulanan diisi sebagai angka bulat tanpa titik atau huruf, misalnya 1500000.',
      'Jumlah tanggungan maksimal 50 orang dan tidak boleh negatif.',
      'Kondisi rumah hanya bisa Layak Huni atau Tidak Layak Huni.',
      'Pengajuan masih bisa diperbaiki selama statusnya Menunggu Verifikasi atau Ditolak. Setelah petugas memeriksa, data dikunci.',
      'Dokumen yang dilampirkan tetap bisa diunduh selama pengajuan tidak dihapus.',
    ],
  },
  petugas: {
    perkenalan:
      'Bagian ini merangkum cara memeriksa pengajuan yang masuk dan apa yang boleh dilakukan terhadap datanya.',
    tugas: [
      {
        judul: 'Memeriksa antrean verifikasi',
        detail: 'Lihat pengajuan yang menunggu beserta data ekonomi dan dokumen pemohon.',
        ke: '/petugas',
      },
      {
        judul: 'Memverifikasi pengajuan',
        detail: 'Catat hasil pemeriksaan lalu tetapkan valid atau ditolak dengan alasan.',
        ke: '/petugas',
      },
      {
        judul: 'Menyusun laporan harian',
        detail: 'Rekap pengajuan yang masuk dan sudah diverifikasi pada periode berjalan.',
        ke: '/petugas/laporan',
      },
    ],
    penting: [
      'Hanya pengajuan berstatus Menunggu Verifikasi yang menunggu keputusan Anda.',
      'Pilihan Validasi dan Tolak sama-sama tercatat pada jejak audit, jadi tulis catatan yang bisa dipahami orang lain.',
      'Menolak pengajuan tidak menutup pintu: pemohon masih bisa memperbaiki dan mengirim ulang.',
      'Dokumen hanya boleh diunggah pada pengajuan yang sedang Anda periksa.',
      'Perubahan data pengajuan hanya bisa dilakukan selama masih menunggu verifikasi.',
    ],
  },
  admin: {
    perkenalan:
      'Bagian ini merangkum cara menetapkan bobot, menghitung skor, dan menetapkan penerima secara terbuka.',
    tugas: [
      {
        judul: 'Menetapkan bobot kriteria',
        detail: 'Tentukan skor tiap subkriteria dan bobot tiap kriteria yang aktif.',
        ke: '/admin/kriteria',
      },
      {
        judul: 'Menjalankan perhitungan WASPAS',
        detail: 'Pilih nilai lambda, hitung skor akhir, dan susun peringkat otomatis.',
        ke: '/admin/waspas',
      },
      {
        judul: 'Menetapkan penerima',
        detail: 'Tetapkan tiap pengajuan menjadi diterima, cadangan, atau ditolak.',
        ke: '/admin/penerima',
      },
      {
        judul: 'Memeriksa jejak audit',
        detail: 'Lihat siapa mengubah bobot, menjalankan perhitungan, dan menetapkan keputusan.',
        ke: '/admin/audit',
      },
      {
        judul: 'Melihat statistik desa',
        detail: 'Pantau jumlah pengajuan, kelulusan verifikasi, dan penerima yang ditetapkan.',
        ke: '/admin',
      },
    ],
    penting: [
      'Total bobot seluruh kriteria aktif wajib sama dengan 1. Perhitungan ditolak selama totalnya bukan 1.',
      'Bobot tiap kriteria harus lebih besar dari 0 dan maksimal 1, sedangkan score tiap subkriteria bernilai 0 sampai 1.',
      'Rentang subkriteria tidak boleh tumpang tindih dan nilaiMin tidak boleh lebih besar dari nilaiMax.',
      'Nilai pengajuan yang tidak tercakup rentang manapun membuat perhitungan berhenti dengan pesan jelas, bukan dianggap score 0.',
      'Perhitungan hanya memakai pengajuan berstatus Data Terverifikasi dan Diproses.',
      `Nilai lambda bawaan adalah ${LAMBDA_DEFAULT}. Nilai 0 berarti hanya WP yang dipakai, nilai 1 berarti hanya WS.`,
      'Keputusan cadangan dibiarkan berstatus Diproses supaya tidak salah dibaca sebagai penerima final.',
      'Setiap penggantian bobot, perhitungan, dan keputusan tercatat pada jejak audit.',
    ],
  },
};
