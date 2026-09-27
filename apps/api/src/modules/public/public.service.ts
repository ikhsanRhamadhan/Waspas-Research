import { asc, count, desc, eq, isNull } from 'drizzle-orm';

import { db } from '../../db/client';
import { hasil, penduduk, pengajuan, perhitunganWaspas, verifikasi } from '../../db/schema';

export interface StatistikPublik {
  totalPengajuan: number;
  totalLolosVerifikasi: number;
  totalDiterima: number;
  tanggalTerakhirPerhitungan: string | null;
}

export interface PenerimaPublik {
  namaLengkap: string;
  nik: string;
  desa: string | null;
  alamat: string;
  skorWaspas: number;
  ranking: number;
}

/**
 * Data bantuan sosial bersifat sensitif, jadi yang tampil di halaman publik hanya
 * identitas disensor: NIK Hide empat digit terakhir dan alamat hanya bagian awal.
 */
const sensorNik = (nik: string): string =>
  nik.length <= 4 ? '*'.repeat(nik.length) : `${'*'.repeat(nik.length - 4)}${nik.slice(-4)}`;

const sensorAlamat = (alamat: string): string => {
  const bagian = alamat.trim().split(/\s+/).filter(Boolean);
  if (bagian.length <= 2) return '*'.repeat(6);
  return `${bagian.slice(0, 2).join(' ')} ${'*'.repeat(Math.max(4, (bagian.length - 2) * 2))}`;
};

export const statistik = async (): Promise<StatistikPublik> => {
  const [jumlahPengajuan, jumlahValid, jumlahDiterima, perhitunganTerakhir] = await Promise.all([
    db.select({ value: count() }).from(pengajuan).where(isNull(pengajuan.deletedAt)),
    db.select({ value: count() }).from(verifikasi).where(eq(verifikasi.statusVerifikasi, 'valid')),
    db.select({ value: count() }).from(hasil).where(eq(hasil.statusKeputusan, 'diterima')),
    db
      .select({ createdAt: perhitunganWaspas.createdAt })
      .from(perhitunganWaspas)
      .orderBy(desc(perhitunganWaspas.createdAt))
      .limit(1),
  ]);

  return {
    totalPengajuan: jumlahPengajuan[0]?.value ?? 0,
    totalLolosVerifikasi: jumlahValid[0]?.value ?? 0,
    totalDiterima: jumlahDiterima[0]?.value ?? 0,
    tanggalTerakhirPerhitungan: perhitunganTerakhir[0]?.createdAt.toISOString() ?? null,
  };
};

export const daftarPenerima = async (): Promise<PenerimaPublik[]> => {
  const rows = await db
    .select({
      namaLengkap: penduduk.namaLengkap,
      nik: penduduk.nik,
      desa: penduduk.desa,
      alamat: penduduk.alamat,
      skorWaspas: hasil.skorWaspas,
      ranking: hasil.ranking,
    })
    .from(hasil)
    .innerJoin(pengajuan, eq(pengajuan.id, hasil.pengajuanId))
    .innerJoin(penduduk, eq(penduduk.id, pengajuan.pendudukId))
    .where(eq(hasil.statusKeputusan, 'diterima'))
    .orderBy(asc(hasil.ranking));

  return rows.map((row) => ({
    namaLengkap: row.namaLengkap,
    nik: sensorNik(row.nik),
    desa: row.desa,
    alamat: sensorAlamat(row.alamat),
    skorWaspas: Number(row.skorWaspas),
    ranking: row.ranking,
  }));
};

export const ringkasanMetode = () => ({
  namaMetode: 'WASPAS',
  namaLengkap: 'Weighted Absolute Sum of Pertainal Alternatives',
  ringkasan:
    'Setiap pemohon dinilai pada beberapa kriteria (penghasilan, jumlah tanggungan, kondisi rumah). ' +
    'Skor dihitung dengan menggabungkan Weighted Sum (WS) dan Weighted Product (WP) melalui parameter lambda.',
  formula: {
    ws: 'WS = Σ (bobot_i × score_i)',
    wp: 'WP = Π (score_i ^ bobot_i)',
    akhir: 'Skor = λ × WS + (1 − λ) × WP',
  },
  lambdaDefault: 0.5,
});
