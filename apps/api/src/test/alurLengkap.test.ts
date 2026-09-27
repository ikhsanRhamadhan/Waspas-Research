import { PARAM_FOKUS_PENGAJUAN, ROUTE_PENGAJUAN } from '@spk-bansos/shared';
import { desc, eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app';
import { closeDatabase, db } from '../db/client';
import { auditLog, pengajuan, users, verifikasi } from '../db/schema';
import { bersihkan, jalankanSeed } from '../db/seed/data';
import { runMigrations } from '../db/migrate';
import { AUDIT_ACTION } from '../shared/utils/audit';

/**
 * Uji asap seluruh alur bisnis: login ketiga peran → petugas verifikasi →
 * admin menghitung WASPAS → penetration penerima → warga melihat hasilnya.
 * Ini yang paling cepat membuktikan bahwa modul-modul benar-benar menyambung,
 * bukan hanya lolos typecheck.
 */
describe('Alur lengkap SPK Bansos', () => {
  const app = createApp();
  const login = async (username: string, password: string) => {
    const res = await request(app).post('/api/auth/login').send({ username, password });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return res.body.data.accessToken as string;
  };

  beforeAll(async () => {
    await runMigrations();
    await bersihkan();
    await jalankanSeed();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('health check dan data publik tersedia tanpa login', async () => {
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body.data.status).toBe('ok');

    const publik = await request(app).get('/api/public/statistik');
    expect(publik.status).toBe(200);
    expect(publik.body.data.totalDiterima).toBeGreaterThanOrEqual(1);

    const penerima = await request(app).get('/api/public/penerima');
    expect(penerima.status).toBe(200);
    expect(penerima.body.data[0].nik).toMatch(/\*{4}\d{4}$/);
  });

  it('login gagal dengan kata sandi salah', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'warga', password: 'salahsekali' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('warga tidak boleh mengakses endpoint admin', async () => {
    const token = await login('warga', 'Warga123!');
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('petugas memverifikasi pengajuan baru dari warga', async () => {
    const tokenWarga = await login('warga', 'Warga123!');
    const dibuat = await request(app)
      .post('/api/penduduk/pengajuan')
      .set('Authorization', `Bearer ${tokenWarga}`)
      .send({
        penghasilanBulanan: 2_200_000,
        jumlahTanggungan: 2,
        kondisiRumah: 'layak',
        catatanPenduduk: 'Penghasilan meningkat, rumah sudah direnovasi.',
      });
    expect(dibuat.status, JSON.stringify(dibuat.body)).toBe(201);

    // Pengajuan kedua supaya perbandingan WASPAS punya lebih dari satu kandidat,
    // karena pengajuan hasil seed sudah dikunci sebagai penerima.
    const kedua = await request(app)
      .post('/api/penduduk/pengajuan')
      .set('Authorization', `Bearer ${tokenWarga}`)
      .send({
        penghasilanBulanan: 1_100_000,
        jumlahTanggungan: 6,
        kondisiRumah: 'tidak_layak',
        catatanPenduduk: 'Penghasilan paling kecil, rumah perlu perbaikan.',
      });
    expect(kedua.status, JSON.stringify(kedua.body)).toBe(201);

    const pengajuanId = dibuat.body.data.id as string;
    const pengajuanIdKedua = kedua.body.data.id as string;
    const tokenPetugas = await login('petugas', 'Petugas123!');

    for (const id of [pengajuanId, pengajuanIdKedua]) {
      const diverifikasi = await request(app)
        .put(`/api/petugas/verifikasi/${id}`)
        .set('Authorization', `Bearer ${tokenPetugas}`)
        .send({ statusVerifikasi: 'valid', catatanVerifikasi: 'Sudah dicek di lapangan' });
      expect(diverifikasi.status, JSON.stringify(diverifikasi.body)).toBe(200);
      expect(diverifikasi.body.data.statusPengajuan).toBe('data_terverifikasi');
    }

    const tidakValid = await request(app)
      .put(`/api/petugas/verifikasi/${pengajuanId}`)
      .set('Authorization', `Bearer ${tokenPetugas}`)
      .send({ statusVerifikasi: 'tidak_valid' });
    expect(tidakValid.status).toBe(422);
  });

  it('admin menghitung WASPAS lalu menetapkan penerima', async () => {
    const tokenAdmin = await login('admin', 'Admin123!');

    const hitung = await request(app)
      .post('/api/admin/waspas/hitung')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ lambda: 0.5 });
    expect(hitung.status, JSON.stringify(hitung.body)).toBe(200);

    const { ranking } = hitung.body.data as { ranking: { ranking: number; pengajuanId: string; skorAkhir: number }[] };
    expect(ranking.length).toBe(2);
    expect(ranking[0]!.ranking).toBe(1);
    // Kandidat paling needy (1.100.000, 6 tanggungan, tidak layak) harus mendominasi.
    expect(ranking[0]!.skorAkhir).toBeGreaterThan(ranking[1]!.skorAkhir);

    // Di titik ini masih ada pengajuan yang SUDAH dihitung WASPAS tapi belum diputuskan.
    // Kode lama menghitung "sudah dihitung" hanya dari yang BELUM diputuskan, sehingga
    // rasionya memakai pembagi yang salah. Assertion di sini sengaja menguji rumus terhadap
    // yang sudah diputuskan, karena di titik ini kedua pembagi itu memang berbeda nilainya.
    const statistikSebelum = await request(app)
      .get('/api/admin/statistik')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(statistikSebelum.status, JSON.stringify(statistikSebelum.body)).toBe(200);

    const sebelum = statistikSebelum.body.data as {
      totalDiputuskan: number;
      totalDiterima: number;
      totalSudahDihitung: number;
      rasioPenerima: number | null;
    };
    // Prasyarat: tanpa selisih ini test tidak bisa membedakan pembagi lama dan baru.
    expect(sebelum.totalSudahDihitung, JSON.stringify(statistikSebelum.body)).toBeGreaterThan(
      sebelum.totalDiputuskan,
    );
    expect(sebelum.rasioPenerima, `rasio tidak boleh null: ${JSON.stringify(statistikSebelum.body)}`).not.toBeNull();
    expect(sebelum.rasioPenerima).toBe(Math.round((sebelum.totalDiterima / sebelum.totalDiputuskan) * 10_000) / 100);

    const tetapkan = await request(app)
      .post('/api/admin/penerima/tetapkan')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        daftarPenerima: [
          { pengajuanId: ranking[0]!.pengajuanId, statusKeputusan: 'diterima' },
          { pengajuanId: ranking[1]!.pengajuanId, statusKeputusan: 'cadangan' },
        ],
      });
    expect(tetapkan.status, JSON.stringify(tetapkan.body)).toBe(200);
    expect(tetapkan.body.data.jumlahDitetapkan, JSON.stringify(tetapkan.body)).toBe(2);

    // Setelah semua diputuskan, funnel harus tetap konsisten dan rasionya tidak meledak.
    const statistik = await request(app)
      .get('/api/admin/statistik')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(statistik.status, JSON.stringify(statistik.body)).toBe(200);

    const sesudah = statistik.body.data as {
      totalDiputuskan: number;
      totalSudahDihitung: number;
      rasioPenerima: number | null;
    };
    expect(sesudah.totalDiputuskan).toBeGreaterThan(0);
    // Funnel harus monoton: tidak boleh ada tahap lebih besar dari tahap setelahnya.
    expect(sesudah.totalSudahDihitung).toBeGreaterThanOrEqual(sesudah.totalDiputuskan);
    expect(sesudah.rasioPenerima).not.toBeNull();
    expect(sesudah.rasioPenerima).toBeLessThanOrEqual(100);
  });

  it('warga melihat hasil dan notifikasi keputusannya', async () => {
    const token = await login('warga', 'Warga123!');

    const dashboard = await request(app)
      .get('/api/penduduk/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(dashboard.status, JSON.stringify(dashboard.body)).toBe(200);
    expect(dashboard.body.data.ringkasan.skorAkhir).not.toBeNull();

    const notifikasi = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(notifikasi.status).toBe(200);
    expect(notifikasi.body.data.items.length).toBeGreaterThan(0);

    // Tautan notifikasi akan dipakai React Router, bukan dikirim ke Express. Kalau
    // isinya path API, user diarahkan ke URL yang tidak punya route di frontend.
    const bertautan = notifikasi.body.data.items.filter((item: { actionUrl: string | null }) => item.actionUrl);
    expect(bertautan.length, 'notifikasi keputusan harus punya tautan').toBeGreaterThan(0);
    for (const item of bertautan) {
      expect(item.actionUrl.startsWith(`${ROUTE_PENGAJUAN}?${PARAM_FOKUS_PENGAJUAN}=`)).toBe(true);
    }

    const detail = await request(app)
      .get('/api/penduduk/status')
      .set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.timeline.length).toBe(4);
  });

  it('petugas melihat statistik dan laporan harian', async () => {
    const token = await login('petugas', 'Petugas123!');

    const statistik = await request(app)
      .get('/api/petugas/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(statistik.status, JSON.stringify(statistik.body)).toBe(200);
    expect(statistik.body.data.totalPending).toBeGreaterThanOrEqual(0);

    const laporan = await request(app)
      .get('/api/petugas/laporan/verifikasi')
      .set('Authorization', `Bearer ${token}`);
    expect(laporan.status).toBe(200);
    expect(laporan.body.data.rincian.length).toBeGreaterThanOrEqual(1);
  });

  it('kriteria aktif berjumlah satu', async () => {
    const token = await login('admin', 'Admin123!');

    const ringkasan = await request(app)
      .get('/api/kriteria/ringkasan-bobot')
      .set('Authorization', `Bearer ${token}`);
    expect(ringkasan.status).toBe(200);
    expect(ringkasan.body.data.total).toBeCloseTo(1, 4);
    expect(ringkasan.body.data.valid).toBe(true);

    const daftar = await request(app)
      .get('/api/kriteria')
      .set('Authorization', `Bearer ${token}`);
    expect(daftar.body.data).toHaveLength(3);
  });

  it('jejak audit tercatat untuk aksi penting', async () => {
    const jejak = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt));

    const actions = new Set(jejak.map((row) => row.action));
    expect(actions.has(AUDIT_ACTION.PENGADUAN_CREATED)).toBe(true);
    expect(actions.has(AUDIT_ACTION.VERIFIKASI_CREATED)).toBe(true);
    expect(actions.has(AUDIT_ACTION.WASPAS_HITUNG)).toBe(true);
    expect(actions.has(AUDIT_ACTION.KEPUTUSAN_TETAPKAN)).toBe(true);
  });

  it('admin membaca jejak audit dan mengunduh laporan PDF', async () => {
    const tokenWarga = await login('warga', 'Warga123!');
    const forbidden = await request(app)
      .get('/api/admin/audit-log')
      .set('Authorization', `Bearer ${tokenWarga}`);
    expect(forbidden.status).toBe(403);

    const tokenAdmin = await login('admin', 'Admin123!');

    const semua = await request(app)
      .get('/api/admin/audit-log?page=1&limit=50')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(semua.status, JSON.stringify(semua.body)).toBe(200);
    expect(semua.body.data.meta.total).toBeGreaterThan(0);
    expect(semua.body.data.items.some((row: { action: string }) => row.action === AUDIT_ACTION.WASPAS_HITUNG)).toBe(true);

    const difilter = await request(app)
      .get(`/api/admin/audit-log?action=${encodeURIComponent(AUDIT_ACTION.KEPUTUSAN_TETAPKAN)}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(difilter.status).toBe(200);
    expect(difilter.body.data.items.length).toBeGreaterThan(0);
    expect(
      difilter.body.data.items.every((row: { action: string }) => row.action === AUDIT_ACTION.KEPUTUSAN_TETAPKAN),
    ).toBe(true);
    // Nama pelaku ikut terbaca supaya admin tahu siapa yang melakukan aksi.
    expect(difilter.body.data.items[0].namaUser).toBeTruthy();

    const pdf = await request(app)
      .post('/api/admin/export-pdf')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({});
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.headers['content-disposition']).toContain('laporan-keputusan-');
    // tanda tangan PDF: berkas yang benar-benar diunduh, bukan envelope JSON.
    const isi = pdf.body as Buffer;
    expect(isi.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
    // Footer yang ditulis di luar area cetak membuat PDFKit menambah halaman kosong.
    const jumlahHalaman = Number(/\/Count\s+(\d+)/.exec(isi.toString('ascii'))?.[1] ?? 0);
    expect(jumlahHalaman, 'PDF satu keputusan tidak boleh menambah halaman kosong').toBeLessThanOrEqual(2);
  });

  it('petugas mengunggah dokumen lalu bisa mengunduhnya kembali', async () => {
    const tokenWarga = await login('warga', 'Warga123!');
    const dibuat = await request(app)
      .post('/api/penduduk/pengajuan')
      .set('Authorization', `Bearer ${tokenWarga}`)
      .send({ penghasilanBulanan: 1_800_000, jumlahTanggungan: 3, kondisiRumah: 'layak' });
    expect(dibuat.status, JSON.stringify(dibuat.body)).toBe(201);
    const pengajuanId = dibuat.body.data.id as string;

    const tokenPetugas = await login('petugas', 'Petugas123!');

    // Dokumen hanya boleh masuk setelah verifikasi ada, jadi petugas punya konteks data.
    const belumVerifikasi = await request(app)
      .post(`/api/petugas/dokumen/${pengajuanId}`)
      .set('Authorization', `Bearer ${tokenPetugas}`)
      .field('jenis', 'kartu_keluarga')
      .attach('dokumen', Buffer.from('isi kartu keluarga'), {
        filename: 'kartu-keluarga.pdf',
        contentType: 'application/pdf',
      });
    expect(belumVerifikasi.status).toBe(422);
    expect(belumVerifikasi.body.message).toMatch(/verifikasi terlebih dahulu/i);

    const verifikasi = await request(app)
      .put(`/api/petugas/verifikasi/${pengajuanId}`)
      .set('Authorization', `Bearer ${tokenPetugas}`)
      .send({ statusVerifikasi: 'valid' });
    expect(verifikasi.status, JSON.stringify(verifikasi.body)).toBe(200);

    const unggah = await request(app)
      .post(`/api/petugas/dokumen/${pengajuanId}`)
      .set('Authorization', `Bearer ${tokenPetugas}`)
      .field('jenis', 'kartu_keluarga')
      .attach('dokumen', Buffer.from('isi kartu keluarga'), {
        filename: 'kartu-keluarga.pdf',
        contentType: 'application/pdf',
      });
    expect(unggah.status, JSON.stringify(unggah.body)).toBe(201);
    const dokumenId = unggah.body.data.id as string;

    const ditolak = await request(app)
      .post(`/api/petugas/dokumen/${pengajuanId}`)
      .set('Authorization', `Bearer ${tokenPetugas}`)
      .field('jenis', 'lainnya')
      .attach('dokumen', Buffer.from('MZ'), { filename: 'virus.exe', contentType: 'application/octet-stream' });
    expect(ditolak.status).toBe(422);

    const detail = await request(app)
      .get(`/api/petugas/verifikasi/${pengajuanId}`)
      .set('Authorization', `Bearer ${tokenPetugas}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.dokumen).toHaveLength(1);
    expect(detail.body.data.dokumen[0]).toMatchObject({
      id: dokumenId,
      jenis: 'kartu_keluarga',
      namaFile: 'kartu-keluarga.pdf',
    });
    expect(detail.body.data.dokumen[0].ukuranBytes).toBeGreaterThan(0);

    const unduh = await request(app)
      .get(`/api/petugas/dokumen/${dokumenId}/download`)
      .set('Authorization', `Bearer ${tokenPetugas}`);
    expect(unduh.status).toBe(200);
    expect(unduh.headers['content-type']).toBe('application/pdf');
    expect(unduh.headers['content-disposition']).toContain('kartu-keluarga.pdf');
    // application/pdf diparse superagent sebagai Buffer, bukan teks.
    expect((unduh.body as Buffer).toString('utf-8')).toBe('isi kartu keluarga');
  });
});
