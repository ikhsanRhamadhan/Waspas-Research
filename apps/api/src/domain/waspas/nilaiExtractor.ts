import type { KunciKriteria } from '@spk-bansos/shared';

import type { DataPengajuan, NilaiExtractor } from './WaspasCalculator';

/**
 * Registry pemetaan kunci kriteria → nilai mentah pada pengajuan.
 * Menambah kriteria baru cukup dengan menambah entri di sini, bukan menyentuh
 * logika perhitungan WASPAS.
 */
export const NILAI_EXTRACTORS: Record<KunciKriteria, NilaiExtractor> = {
  penghasilan: (data: DataPengajuan) => ({ nilaiNumerik: data.penghasilanBulanan, kodeNilai: null }),
  tanggungan: (data: DataPengajuan) => ({ nilaiNumerik: data.jumlahTanggungan, kodeNilai: null }),
  kondisi_rumah: (data: DataPengajuan) => ({ nilaiNumerik: null, kodeNilai: data.kondisiRumah }),
};

export const buildExtractorMap = (): Map<string, NilaiExtractor> =>
  new Map(Object.entries(NILAI_EXTRACTORS));
