# SPK Bansos

Sistem Pendukung Keputusan Penerimaan Bantuan Sosial Desa. Aplikasi web full-stack
untuk memproses pengajuan bantuan sosial dengan metode **WASPAS** (Weighted Aggregate
Suitability for Priority Allocation of Social Assistance), dimulai dari warga
mendaftar, petugas memverifikasi berkas, sampai kepala desa menetapkan penerima
dan mengunduh laporan resmi berbentuk PDF.

Metode WASPAS dipakai karena setiap kriteria punya bobot yang berbeda dan cara
penggabungan skor harus bisa dipertanggungjawabkan, bukan sekadar "skor tertinggi
dapat bantuan".

## Cara Menjalankan

Prasyarat: Node.js >= 18.18 dan npm. Tidak perlu Docker dan tidak perlu server
database terpisah — API memakai [PGlite](https://pglite.dev) (PostgreSQL embedded).

```bash
npm install
cp apps/api/.env.example apps/api/.env   # isi minimal JWT_SECRET bila produksi
npm run db:setup                          # migrasi + seed data demo
npm run dev                               # API :5000, web :5173
```

Buka http://localhost:5173. Vite mem-proxy `/api` ke API, jadi tidak ada CORS
yang perlu diatur saat pengembangan.

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Jalankan API dan web sekaligus |
| `npm run build` | Build produksi API (`dist/`) dan web |
| `npm run typecheck` | Typecheck seluruh workspace |
| `npm test` | Jalankan test API |
| `npm run db:setup` | Migrasi schema + seed data demo |
| `npm run db:reset` | Hapus dan buat ulang database development (**berbahaya, data hilang**) |

## Akun Demo

| Role | Username | Password |
| --- | --- | --- |
| Kepala Desa (admin) | `admin` | `Admin123!` |
| Petugas desa | `petugas` | `Petugas123!` |
| Warga | `warga` | `Warga123!` |

Seluruh NIK, nomor telepon, dan nama dalam seed bersifat fiktif dan hanya untuk
menjalankan alur program.

## Arsitektur

Monorepo npm workspace dengan tiga paket:

- `apps/api` — Express 5 + Drizzle ORM, TypeScript. Router dipisah per domain
  (`auth`, `penduduk`, `petugas`, `admin`, `kriteria`, `public`, `notifications`).
  Lapisan bisnis memakai pola service + repository contract, validasi `zod`,
  dan respons berbentuk amplop `{ success, message, data }`.
- `apps/web` — React 18 + Vite + React Router + TanStack Table + Zustand.
  Tampilan berbahasa Indonesia, responsif, dan mendukung mode gelap.
- `packages/shared` — konstanta, label, fungsi format, dan skema yang dipakai
  bersama API dan web agar tidak ada duplikasi definisi.

Alur utama: warga mengajukan → petugas memverifikasi (bisa menolak dengan alasan)
→ admin mengatur kriteria WASPAS dan bobotnya → admin menjalankan perhitungan →
admin menetapkan penerima/cadangan → warga melihat hasil, mengunduh bukti
verifikasi, dan menerima notifikasi. Setiap aksi penting tercatat di tabel audit.

Endpoint yang dapat diakses publik hanya health check dan data kriteria; sisanya
memerlukan JWT dan pembatasan role (`penduduk`, `petugas`, `admin`).

## Metode WASPAS

Setiap kriteria `i` punya bobot `b` dan skor `s` (0–1, makin tinggi makin
memprioritaskan):

- `WS = Σ(b × s)` — jumlah berbobot
- `WP = Π(s^b)` — hasil pangkat
- `λ` (default 0,5) menentukan trade-off antara penjumlahan linear dan perkalian:
  skor akhir = `λ·WS + (1−λ)·WP`

Bobot dan λ bisa diatur admin, dan setiap perhitungan tersimpan lengkap dengan
nilai WS/WP tiap warga agar hasilnya bisa diaudit ulang.

## Test

`npm test` menjalankan satu test integrasi end-to-end (`apps/api/src/test/alurLengkap.test.ts`)
yang melewati alur nyata dari HTTP: login, pengajuan warga, verifikasi petugas,
perhitungan WASPAS, penetapan penerima, notifikasi, jejak audit, ekspor PDF, dan
unggah/unduh dokumen. Database dan folder unggahan uji dipisahkan dari yang
dipakai developer, jadi test tidak pernah menyentuh data development.

Continuous integration berjalan di GitHub Actions: install, typecheck, test, dan
build.

## Lisensi

MIT — lihat [LICENSE](./LICENSE).
