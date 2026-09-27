/**
 * Route frontend dipakai backend untuk menyusun tautan notifikasi. Alasan ruta ini
 * diletakkan di shared: kalau URL halaman pengajuan berubah, notifikasi ikut berubah
 * karena keduanya membaca konstanta yang sama, bukan menyalin string.
 */
export const ROUTE_PENGAJUAN = '/pengajuan';

/** Nama query param yang dipakai PengajuanPage untuk membuka rincian pengajuan tertentu. */
export const PARAM_FOKUS_PENGAJUAN = 'fokus';

/**
 * Penduduk tidak punya route `/pengajuan/:id`, jadi notifikasi yang menunjuk pengajuan
 * tertentu membuka daftar sambil menyorot baris yang dimaksud lewat query param.
 */
export const tautanPengajuan = (pengajuanId: string): string =>
  `${ROUTE_PENGAJUAN}?${PARAM_FOKUS_PENGAJUAN}=${encodeURIComponent(pengajuanId)}`;
