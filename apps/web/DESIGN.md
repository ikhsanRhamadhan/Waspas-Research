# DESIGN.md — SPK Bantuan Sosial Desa

Arah ini berasal dari pemilik produk, bukan pilihan agent.

## Identitas

Administrasi desa. Tiga pengguna dengan tingkat kecemasan yang berbeda: warga perlu tahu
posisinya, petugas desa membutuhkan antrean yang tidak mungkin salah baca, kepala desa
membutuhkan ranking yang bisa ia pertahankan dalam rapat. Antarmuka ini adalah meja
layanan umum, bukan dashboard perusahaan startups: tenang, tertata, dan mudah dibaca di
bawah lampu neon yang terang.

Kepribadian: resmi, tidak membosankan, tidak menggurui. Setiap angka harus bisa ditelusuri
kembali ke metode WASPAS, karena kepala desa harus menjelaskan ranking itu kepada warga
yang tidak setuju.



## Dials

ENERGY 1 / RHYTHM 2 / MOTION 1

- ENERGY 1: layanan publik menyapa lewat kejelasan, bukan lewat volume.
- RHYTHM 2: grid seragam untuk tabel dan form (kepredictable itu fitur untuk pemakaian
  harian), dengan jeda yang disengaja pada dua layar yang membawa cerita: timeline warga
  dan ranking WASPAS. Hanya dua layar itu yang boleh memakai komposisi asimetris.
- MOTION 1: hover dan focus saja. Tidak ada scroll reveal, tidak ada parallax, tidak ada
  animasi masuk. Warga yang membuka ini lewat koneksi 3G di lapangan tidak boleh menunggu
  dekorasi.

## Palette

| Peran | Nilai | Alasan |
|---|---|---|
| Core 1: brand | teal `brand-500 #348372` | Warna layanan publik pemerintahan, bukan warna produk korporat. Dipakai hanya untuk aksi utama dan navigasi aktif. |
| Core 2: netral | slate | Teks, border, permukaan. Netral tidak dihitung sebagai warna palette. |
| Aksen | amber-600 `#d97706` | Satu-satunya warna hangat. Wajib untuk satu momen fokus per layar: aksi yang tidak bisa dibatalkan (jalankan WASPAS) dan status "menunggu". Warna lain akan bersaing, lalu admin tidak tahu mana yang penting. |
| Status | emerald / rose / slate | Fungsional, bukan dekorasi: diterima / ditolak / diproses. |
| Peringatan | rose-700 | Hanya untuk aksi destruktif (hapus kriteria) dan error. |

Gradient: tidak ada. Tidak ada glow, tidak ada glassmorphism, tidak ada background grid.
Alasan: layanan ini dipakai berjam-jam di ruang rapat yang terang, dan dekorasi di sana
merupakan gangguan, bukan identitas.

## Tipografi

Inter dengan `font-variant-numeric: tabular-nums` pada semua angka.
Alasan: separuh layar ini adalah tabel skor (skorWs, skorWp, skorAkhir, ranking). Angka
tabular membuat kolom angka sejajar vertikal sehingga dapat dibandingkan tanpa membaca
labelnya. Ini pilihan keterbacaan data, bukan pilihan estetika.

- Judul halaman: 28px/700, tracking rapat
- Label section: 13px/600, uppercase, tracking lebar
- Body: 15px/400
- Angka besar: 30px/600 tabular

## Radius dan spacing

- Radius: 6px (kontrol), 10px (card), 999px hanya untuk badge status. Tidak semua elemen
  berbentuk pil. Alasan: badge status harus terbaca sekilas, form tidak boleh terlihat
  seperti chip.
- Spacing: kelipatan 4px. Jarak antar section 32px, antar field 16px, padding card 20px.
- Elevation: shadow hanya pada sidebar, dropdown notifikasi, dan modal. Ketiganya benar-benar
  melayang di atas konten. Card tidak diberi shadow, mereka memakai border 1px.

## Motif

Pola yang diulang: **baris data bertanda** (garis rambut horizontal, label kapital kecil di
kiri, angka tabular di kanan). Dipakai di kartu statistik, ringkasan profil, dan baris
detail. Alasan: pola ini mengarahkan mata dari label ke angka tanpa perlu kotak, dan
konsisten dengan tabel yang mengisi 80% tampilan aplikasi ini.

## Peta halaman

| Route | Peran | Fokus layar |
|---|---|---|
| `/` | publik | Angka nyata: total penerima, metode, daftar penerima dengan NIK disensor |
| `/masuk` | publik | Form login |
| `/daftar` | publik | Form pendaftaran warga |
| `/dashboard` | penduduk | Status pengajuan terakhir dan timeline |
| `/pengajuan` | penduduk | Daftar pengajuan dan form kirim |
| `/ranking` | penduduk | Posisi dan skor, atau pesan belum dihitung |
| `/profil` | penduduk | Data diri: nama, alamat, kontak |
| `/petugas` | petugas | Antrean verifikasi dan statistik |
| `/petugas/verifikasi/:id` | petugas | Data lengkap, form verifikasi, unggah dokumen |
| `/petugas/laporan` | petugas | Rekap harian per tanggal |
| `/admin` | admin | Statistik desa dan status perhitungan |
| `/admin/waspas` | admin | Jalankan WASPAS (aksen amber), ranking, rincian skor |
| `/admin/penerima` | admin | Tetapkan keputusan per baris ranking |
| `/admin/kriteria` | admin | Editor bobot dan subkriteria |
| `/notifikasi` | semua | Daftar notifikasi |

## Identitas visual

- Wordmark: teks "SPK Bansos" dengan `brand-800` weight 700. Belum ada asset logo resmi,
  jadi memakai teks (lihat catatan di bawah).
- Avatar: inisial dua huruf, background `brand-100`. Tidak ada foto profil.
- Bahasa: Bahasa Indonesia seluruhnya. Angka memakai format Indonesia (1.500.000).

## Keputusan yang belum diambil (perlu konfirmasi pemilik)

- Logo aplikasi: memakai wordmark teks sampai ada asset resmi.
- Nama desa di landing page memakai Sukamaju sebagai placeholder, perlu diganti dengan nama
  desa sebenarnya sebelum rilis.
- Tidak ada testimoni dan tidak ada statistik pemasaran. Satu-satunya angka yang tampil
  adalah angka nyata dari database.
