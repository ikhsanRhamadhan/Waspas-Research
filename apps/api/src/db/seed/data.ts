import { LAMBDA_DEFAULT } from '@spk-bansos/shared';
import { eq } from 'drizzle-orm';

import { env } from '../../config/env';
import { DrizzleAdminRepository } from '../../modules/admin/admin.repository.impl';
import { DrizzleKriteriaRepository } from '../../modules/kriteria/kriteria.repository.impl';
import { hitungSemua } from '../../domain/waspas/waspas.service';
import { urutkanRanking } from '../../domain/waspas/WaspasCalculator';
import { hashPassword } from '../../shared/utils/password';
import { db } from '../client';
import { penduduk, pengajuan, users, verifikasi } from '../schema';
import type { CreateUserParams } from '../../modules/auth/auth.repository';

export interface AkunSeed {
  username: string;
  email: string;
  password: string;
  role: 'penduduk' | 'petugas' | 'admin';
  nama: string;
  noTelp?: string;
  profile?: {
    nik: string;
    namaLengkap: string;
    jenisKelamin?: 'L' | 'P';
    tanggalLahir?: string;
    alamat: string;
    desa?: string;
    kecamatan?: string;
    kabupaten?: string;
    noTelp?: string;
  };
}

/**
 * `subkriteria.nilai_max` bertipe integer (32-bit), jadi rentang teratas dibatasi di
 * angka maksimum integer tersebut. Penghasilan tidak mungkin melebihi nilai ini
 * karena kolom `penghasilan_bulanan` juga integer.
 */
const BATAS_INT32 = 2_147_483_647;

/**
 * Paket kriteria WASPAS bawaan. Bobot total sudah pas 1 dan subkriteria disusun
 * tanpa celah supaya tidak ada nilai pengajuan yang gagal tercakup.
 */
export const KRITERIA_DEFAULT = [
  {
    kunci: 'penghasilan' as const,
    namaKriteria: 'Penghasilan Bulanan',
    deskripsi: 'Penghasilan kepala keluarga per bulan dalam rupiah.',
    bobot: 0.5,
    tipeKriteria: 'cost' as const,
    prioritas: 1,
    isActive: true,
    subkriteria: [
      { kodeNilai: null, label: '< 1.000.000', nilaiMin: 0, nilaiMax: 999_999, score: 1 },
      { kodeNilai: null, label: '1.000.000 - 1.500.000', nilaiMin: 1_000_000, nilaiMax: 1_500_000, score: 0.8 },
      { kodeNilai: null, label: '1.500.001 - 2.000.000', nilaiMin: 1_500_001, nilaiMax: 2_000_000, score: 0.6 },
      { kodeNilai: null, label: '2.000.001 - 2.500.000', nilaiMin: 2_000_001, nilaiMax: 2_500_000, score: 0.4 },
      { kodeNilai: null, label: '> 2.500.000', nilaiMin: 2_500_001, nilaiMax: BATAS_INT32, score: 0.2 },
    ],
  },
  {
    kunci: 'tanggungan' as const,
    namaKriteria: 'Jumlah Tanggungan',
    deskripsi: 'Jumlah anggota keluarga yang ditanggung.',
    bobot: 0.3,
    tipeKriteria: 'benefit' as const,
    prioritas: 2,
    isActive: true,
    subkriteria: [
      { kodeNilai: null, label: '1 - 2 orang', nilaiMin: 1, nilaiMax: 2, score: 0.4 },
      { kodeNilai: null, label: '3 - 4 orang', nilaiMin: 3, nilaiMax: 4, score: 0.7 },
      { kodeNilai: null, label: '5 - 6 orang', nilaiMin: 5, nilaiMax: 6, score: 0.9 },
      { kodeNilai: null, label: '> 6 orang', nilaiMin: 7, nilaiMax: 99, score: 1 },
    ],
  },
  {
    kunci: 'kondisi_rumah' as const,
    namaKriteria: 'Kondisi Rumah',
    deskripsi: 'Kondisi kelayakan hunian menurut kriteria desa.',
    bobot: 0.2,
    tipeKriteria: 'cost' as const,
    prioritas: 3,
    isActive: true,
    subkriteria: [
      { kodeNilai: 'layak', label: 'Layak huni', nilaiMin: null, nilaiMax: null, score: 0.3 },
      { kodeNilai: 'tidak_layak', label: 'Tidak layak huni', nilaiMin: null, nilaiMax: null, score: 1 },
    ],
  },
];

export const AKUN_DEFAULT: AkunSeed[] = [
  {
    username: 'admin',
    email: 'admin@bansosdesa.id',
    password: 'Admin123!',
    role: 'admin',
    nama: 'Kepala Desa Sukamaju',
    noTelp: '081200000001',
  },
  {
    username: 'petugas',
    email: 'petugas@bansosdesa.id',
    password: 'Petugas123!',
    role: 'petugas',
    nama: 'Petugas Desa Sukamaju',
    noTelp: '081200000002',
  },
  {
    username: 'warga',
    email: 'warga@bansosdesa.id',
    password: 'Warga123!',
    role: 'penduduk',
    nama: 'Ahmad Fauzi',
    noTelp: '081200000003',
    profile: {
      // NIK demo sengaja dibuat tidak resembles NIK asli supaya repo publik tidak
      // memuat nomor identitas yang bisa disalahartikan. Tetap 16 digit agar lolos
      // validasi, dan 4 digit terakhir sengaja 0001 agar tes masking tetap relevan.
      nik: '0000000000000001',
      namaLengkap: 'Ahmad Fauzi',
      jenisKelamin: 'L',
      tanggalLahir: '1999-01-01',
      alamat: 'Kp. Sukamaju No. 12',
      desa: 'Sukamaju',
      kecamatan: 'Cibadak',
      kabupaten: 'Sukabumi',
      noTelp: '081200000003',
    },
  },
];

export interface PengajuanSeed {
  username: string;
  penghasilanBulanan: number;
  jumlahTanggungan: number;
  kondisiRumah: 'layak' | 'tidak_layak';
  catatanPenduduk?: string;
  statusVerifikasi?: 'valid' | 'tidak_valid';
  catatanVerifikasi?: string;
}

/**
 * Data demo sengaja bervariasi supaya ranking WASPAS benar-benar punya lebih dari satu
 * posisi, bukan semua pengguna mendapat skor identik.
 */
export const PENGAJUAN_SEED: PengajuanSeed[] = [
  {
    username: 'warga',
    penghasilanBulanan: 1_500_000,
    jumlahTanggungan: 4,
    kondisiRumah: 'tidak_layak',
    catatanPenduduk: 'Rumah semi permanen, lantai masih tanah dan atap seng berkarat.',
    statusVerifikasi: 'valid',
    catatanVerifikasi: 'Data sesuai hasil survei lapangan.',
  },
];

export const buatKriteriaDefault = async (): Promise<void> => {
  await new DrizzleKriteriaRepository().replaceAll(KRITERIA_DEFAULT);
};

export const buatAkun = async (akun: AkunSeed): Promise<string> => {
  const passwordHash = await hashPassword(akun.password);
  const params: CreateUserParams = {
    username: akun.username,
    email: akun.email,
    passwordHash,
    role: akun.role,
    nama: akun.nama,
    noTelp: akun.noTelp ?? null,
    profile: akun.profile,
  };

  const rows = await db
    .insert(users)
    .values({
      username: params.username,
      email: params.email,
      passwordHash: params.passwordHash,
      role: params.role,
      nama: params.nama,
      noTelp: params.noTelp,
    })
    .returning({ id: users.id });

  const userId = rows[0]?.id;
  if (!userId) throw new Error(`Gagal membuat akun ${akun.username}`);

  if (params.profile) {
    await db.insert(penduduk).values({
      userId,
      nik: params.profile.nik,
      namaLengkap: params.profile.namaLengkap,
      jenisKelamin: params.profile.jenisKelamin ?? null,
      tanggalLahir: params.profile.tanggalLahir ?? null,
      alamat: params.profile.alamat,
      desa: params.profile.desa ?? null,
      kecamatan: params.profile.kecamatan ?? null,
      kabupaten: params.profile.kabupaten ?? null,
      noTelp: params.profile.noTelp ?? null,
    });
  }

  return userId;
};

/**
 * Menyusun alur demo lengkap: akun → pengajuan → verifikasi petugas → WASPAS → keputusan
 * kepala desa. Semua langkah ini memakai service yang sama dengan runtime, sehingga data
 * seed tidak mungkin berbeda bentuk dari data yang dihasilkan aplikasi.
 */
/**
 * Membersihkan seluruh tabel transaksi supaya seed bisa dijalankan berulang kali tanpa
 * bentrok unique constraint. Urutan TRUNCATE mengikuti dependensi foreign key.
 */
export const bersihkan = async (): Promise<void> => {
  await db.execute(`
    TRUNCATE TABLE
      refresh_tokens,
      notifications,
      audit_log,
      hasil,
      perhitungan_waspas_detail,
      perhitungan_waspas,
      dokumen_verifikasi,
      verifikasi,
      pengajuan,
      subkriteria,
      kriteria,
      penduduk,
      users
    RESTART IDENTITY CASCADE
  `);
};

export const jalankanSeed = async (): Promise<void> => {
  await bersihkan();

  const idPengguna = new Map<string, string>();

  for (const akun of AKUN_DEFAULT) {
    idPengguna.set(akun.username, await buatAkun(akun));
  }
  await buatKriteriaDefault();

  const petugasId = idPengguna.get('petugas');
  const adminId = idPengguna.get('admin');
  if (!petugasId || !adminId) throw new Error('Akun petugas atau admin tidak terbentuk.');

  for (const item of PENGAJUAN_SEED) {
    const userId = idPengguna.get(item.username);
    if (!userId) throw new Error(`Akun ${item.username} tidak ditemukan untuk pengajuan seed.`);

    const pendudukRows = await db
      .select({ id: penduduk.id })
      .from(penduduk)
      .where(eq(penduduk.userId, userId))
      .limit(1);
    const pendudukId = pendudukRows[0]?.id;
    if (!pendudukId) throw new Error(`Data penduduk untuk ${item.username} tidak ditemukan.`);

    const rows = await db
      .insert(pengajuan)
      .values({
        pendudukId,
        penghasilanBulanan: item.penghasilanBulanan,
        jumlahTanggungan: item.jumlahTanggungan,
        kondisiRumah: item.kondisiRumah,
        catatanPenduduk: item.catatanPenduduk ?? null,
        statusPengajuan: item.statusVerifikasi === 'valid' ? 'data_terverifikasi' : 'ditolak',
      })
      .returning({ id: pengajuan.id });

    const pengajuanId = rows[0]?.id;
    if (!pengajuanId) throw new Error(`Gagal membuat pengajuan untuk ${item.username}.`);

    if (item.statusVerifikasi) {
      await db.insert(verifikasi).values({
        pengajuanId,
        petugasId,
        statusVerifikasi: item.statusVerifikasi,
        catatanVerifikasi: item.catatanVerifikasi ?? null,
      });
    }
  }

  await jalankanWaspas(adminId);
};

const jalankanWaspas = async (adminId: string): Promise<void> => {
  const repository = new DrizzleAdminRepository();
  const kandidat = await repository.kandidatWaspas();
  if (kandidat.length === 0) return;

  const lambda = env.WASPAS_LAMBDA_DEFAULT || LAMBDA_DEFAULT;
  const hasil = await hitungSemua(
    kandidat.map((row) => ({
      id: row.id,
      penghasilanBulanan: row.penghasilanBulanan,
      jumlahTanggungan: row.jumlahTanggungan,
      kondisiRumah: row.kondisiRumah,
    })),
    lambda,
  );

  const skorPerId = new Map(hasil.map((item) => [item.pengajuanId, item]));
  const terurut = urutkanRanking(
    kandidat.map((row) => {
      const item = skorPerId.get(row.id);
      if (!item) throw new Error(`Hasil WASPAS untuk ${row.id} tidak terbentuk.`);
      return {
        pengajuanId: row.id,
        skorAkhir: item.skorAkhir,
        jumlahTanggungan: row.jumlahTanggungan,
        penghasilanBulanan: row.penghasilanBulanan,
        nama: row.namaLengkap,
        hasil: item,
      };
    }),
  );

  await repository.simpanPerhitungan(
    terurut.map((row, index) => ({
      pengajuanId: row.pengajuanId,
      lambda: row.hasil.lambda,
      skorWs: row.hasil.skorWs,
      skorWp: row.hasil.skorWp,
      skorAkhir: row.hasil.skorAkhir,
      ranking: index + 1,
      detail: row.hasil.detail,
    })),
    adminId,
  );

  await repository.tandaiDiproses(terurut.map((row) => row.pengajuanId));

  // Pemohon peringkat pertama ditetapkan sebagai penerima; sisanya menunggu keputusan.
  if (terurut[0]) {
    await repository.tetapkanKeputusan(
      {
        daftarPenerima: [
          { pengajuanId: terurut[0].pengajuanId, statusKeputusan: 'diterima', catatanAdmin: null },
        ],
      },
      adminId,
    );
  }
};
