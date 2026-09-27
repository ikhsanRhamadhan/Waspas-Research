import { and, eq, inArray } from 'drizzle-orm';

import { db } from '../../db/client';
import { kriteria, subkriteria } from '../../db/schema';
import { BusinessRuleError } from '../../shared/errors/AppError';
import { buildExtractorMap } from './nilaiExtractor';
import { BobotTidakValidError, SubkriteriaTidakCakupError, WaspasCalculator, type KriteriaLengkap } from './WaspasCalculator';

/** Kriteria aktif beserta seluruh subkriteria-nya, siap dipakai kalkulator. */
export const loadKriteriaAktif = async (): Promise<KriteriaLengkap[]> => {
  const rows = await db
    .select()
    .from(kriteria)
    .where(eq(kriteria.isActive, true))
    .orderBy(kriteria.prioritas);

  if (rows.length === 0) {
    throw new BusinessRuleError(
      'Belum ada kriteria WASPAS yang aktif. Tambahkan kriteria beserta subkriteria terlebih dahulu.',
      'KRITERIA_KOSONG',
    );
  }

  const subkriteriaRows = await db
    .select()
    .from(subkriteria)
    .where(inArray(subkriteria.kriteriaId, rows.map((row) => row.id)));

  return rows.map((row) => ({
    id: row.id,
    kunci: row.kunci,
    namaKriteria: row.namaKriteria,
    bobot: Number(row.bobot),
    tipe: row.tipeKriteria,
    prioritas: row.prioritas,
    subkriteria: subkriteriaRows
      .filter((item) => item.kriteriaId === row.id)
      .map((item) => ({
        id: item.id,
        kodeNilai: item.kodeNilai,
        nilaiMin: item.nilaiMin,
        nilaiMax: item.nilaiMax,
        score: Number(item.score),
      })),
  }));
};

export const buildCalculator = async (lambda: number): Promise<WaspasCalculator> => {
  const kriteriaLengkap = await loadKriteriaAktif();
  return new WaspasCalculator(kriteriaLengkap, lambda, buildExtractorMap());
};

export interface HasilHitungPengajuan {
  pengajuanId: string;
  skorWs: number;
  skorWp: number;
  skorAkhir: number;
  lambda: number;
  detail: ReturnType<WaspasCalculator['calculate']>['detail'];
}

/**
 * Menghitung skor sekumpulan pengajuan sekaligus. Hitungan di luar konfigurasi
 * (rentang subkriteria bolong, bobot tidak berjumlah 1) dilempar sebagai
 * BusinessRuleError supaya admin tahu perbaikannya apa.
 */
export const hitungSemua = async (
  pengajuan: { id: string; penghasilanBulanan: number; jumlahTanggungan: number; kondisiRumah: string }[],
  lambda: number,
): Promise<HasilHitungPengajuan[]> => {
  if (pengajuan.length === 0) return [];

  const calculator = await buildCalculator(lambda);

  return pengajuan.map((row) => {
    try {
      const hasil = calculator.calculate({
        penghasilanBulanan: row.penghasilanBulanan,
        jumlahTanggungan: row.jumlahTanggungan,
        kondisiRumah: row.kondisiRumah,
      });

      return {
        pengajuanId: row.id,
        skorWs: hasil.skorWs,
        skorWp: hasil.skorWp,
        skorAkhir: hasil.skorAkhir,
        lambda: hasil.lambda,
        detail: hasil.detail,
      };
    } catch (error) {
      if (error instanceof SubkriteriaTidakCakupError || error instanceof BobotTidakValidError) {
        throw new BusinessRuleError(error.message, 'KONFIGURASI_WASPAS_INVALID');
      }
      throw error;
    }
  });
};

export const criteriaExists = async (id: string): Promise<boolean> => {
  const row = await db.query.kriteria.findFirst({ where: and(eq(kriteria.id, id)) });
  return Boolean(row);
};
