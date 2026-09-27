import { LAMBDA_DEFAULT, type StatusPengajuan, type UserRole } from '@spk-bansos/shared';

/** Satu tahap alur bantuan sosial. Setiap tahap dimiliki tepat satu role. */
export interface TahapAlur {
  role: UserRole;
  urutan: number;
  judul: string;
  ringkasan: string;
  langkah: readonly string[];
  /** Status pengajuan setelah tahap ini selesai, untuk memperjelas batas antar tahap. */
  statusKeluar: readonly StatusPengajuan[];
  catatan: readonly string[];
  halamanMulai: string;
  halamanMulaiLabel: string;
}

/**
 * Alur mengikuti urutan yang benar-benar dijalankan server, bukan urutan dokumen
 * spesifikasi: status "cadangan" tidak pernah menjadi penerima final, dan pengajuan
 * yang ditolak masih bisa diperbaiki pemohon lalu diverifikasi ulang.
 */
export const ALUR: readonly TahapAlur[] = [
  {
    role: 'penduduk',
    urutan: 1,
    judul: 'Warga mengajukan bantuan',
    ringkasan:
      'Warga mengisi data ekonomi dan melampirkan dokumen pendukung. Pengajuan yang dikirim langsung masuk ke antrean verifikasi petugas.',
    langkah: [
      'Buka menu Pengajuan, lalu pilih pendaftaran pengajuan baru.',
      'Isi penghasilan bulanan sebagai angka bulat, misalnya 1500000. Jangan memakai titik atau huruf.',
      'Isi jumlah tanggungan dengan angka bulat. Nilai maksimal 50 orang.',
      'Pilih kondisi rumah: Layak Huni atau Tidak Layak Huni.',
      'Tambahkan catatan bila ada keterangan yang perlu diketahui petugas, misalnya kondisi khusus yang tidak tercakup pilihan.',
      'Unggah dokumen pendukung: Surat Pernyataan Tidak Mampu, Kartu Keluarga, dan Foto Rumah.',
      'Kirim pengajuan. Status berubah menjadi Menunggu Verifikasi dan pemohon menerima notifikasi.',
    ],
    statusKeluar: ['menunggu_verifikasi'],
    catatan: [
      'Pengajuan masih bisa diperbaiki selama statusnya Menunggu Verifikasi atau Ditolak. Setelah petugas memeriksa, data dikunci.',
      'Unggahan yang tidak ada boleh dikosongkan, tetapi verifikasi cenderung lebih lama bila dokumen kurang.',
    ],
    halamanMulai: '/pengajuan',
    halamanMulaiLabel: 'Menu Pengajuan',
  },
  {
    role: 'petugas',
    urutan: 2,
    judul: 'Petugas memverifikasi data',
    ringkasan:
      'Petugas membandingkan data pemohon dengan dokumen yang dilampirkan, lalu memutuskan apakah pengajuan tersebut sah untuk masuk perhitungan.',
    langkah: [
      'Buka menu Antrean verifikasi untuk melihat pengajuan yang menunggu.',
      'Pilih pengajuan yang akan diperiksa.',
      'Cocokkan penghasilan, jumlah tanggungan, dan kondisi rumah dengan dokumen yang dilampirkan.',
      'Tulis catatan hasil pemeriksaan agar keputusan dapat ditelusuri kembali.',
      'Pilih Validasi bila data dan dokumen sesuai, atau Tolak bila tidak memenuhi syarat.',
      'Simpan hasil verifikasi. Pemohon menerima notifikasi dan status pengajuan berubah sesuai keputusan.',
    ],
    statusKeluar: ['data_terverifikasi', 'ditolak'],
    catatan: [
      'Pengajuan yang ditolak bisa diperbaiki pemohon lalu dikirim ulang, sehingga penolakan tidak bersifat permanen.',
      'Dokumen yang telah diunggah tetap bisa diunduh dari halaman pengajuan.',
    ],
    halamanMulai: '/petugas',
    halamanMulaiLabel: 'Antrean Verifikasi',
  },
  {
    role: 'admin',
    urutan: 3,
    judul: 'Kepala desa menghitung dan menetapkan penerima',
    ringkasan:
      'Kepala desa menetapkan bobot kriteria, menjalankan perhitungan WASPAS, lalu menetapkan penerima berdasarkan peringkat yang dihasilkan.',
    langkah: [
      'Tetapkan bobot tiap kriteria pada menu Kriteria dan bobot. Total bobot seluruh kriteria aktif wajib sama dengan 1.',
      'Pada menu Perhitungan WASPAS, pilih nilai lambda lalu jalankan perhitungan.',
      'Sistem memetakan nilai mentah tiap pengajuan ke score subkriteria, lalu menghitung WS, WP, dan skor akhir.',
      'Peringkat disusun otomatis dari skor akhir.',
      'Pada menu Penerima dan keputusan, tetapkan tiap pengajuan menjadi diterima, cadangan, atau ditolak.',
      'Sistem mencatat jejak audit, menyediakan laporan PDF, dan mengirim notifikasi kepada pemohon.',
    ],
    statusKeluar: ['diterima', 'ditolak', 'diproses'],
    catatan: [
      'WS = jumlah dari (bobot x score), WP = hasil kali (score^pembobot), skor akhir = lambda x WS + (1 - lambda) x WP.',
      `Nilai lambda bawaan adalah ${LAMBDA_DEFAULT}, yang memberi WS dan WP bobot sama. Nilainya bisa diubah setiap kali menghitung.`,
      'Score tiap subkriteria bernilai 0 sampai 1, sedangkan bobot kriteria bernilai lebih besar dari 0 sampai 1.',
      'Perhitungan hanya memakai pengajuan berstatus Data Terverifikasi dan Diproses.',
      'Keputusan cadangan sengaja dibiarkan berstatus Diproses supaya tidak salah dibaca sebagai penerima final.',
      'Peringkat yang seri dipecah berurutan: skor turun, jumlah tanggungan turun, penghasilan naik, nama naik. Jadi peringkat tidak bergeser antar-jalankan.',
    ],
    halamanMulai: '/admin/waspas',
    halamanMulaiLabel: 'Perhitungan WASPAS',
  },
];
