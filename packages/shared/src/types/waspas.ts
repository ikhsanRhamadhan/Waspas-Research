import type { KunciKriteria } from '../constants/status';

export interface KriteriaBobot {
  id: string;
  kunci: KunciKriteria;
  namaKriteria: string;
  bobot: number;
  tipe: 'benefit' | 'cost';
  prioritas: number;
}

export interface SubkriteriaRange {
  id: string;
  kodeNilai: string | null;
  nilaiMin: number | null;
  nilaiMax: number | null;
  score: number;
}

/** Nilai mentah satu pengajuan untuk satu kriteria, sebelum dipetakan ke score. */
export interface NilaiKriteria {
  kriteriaId: string;
  namaKriteria: string;
  bobot: number;
  tipe: 'benefit' | 'cost';
  /** Diisi untuk kriteria bertipe kode/enum (mis. kondisi rumah). */
  kodeNilai: string | null;
  /** Diisi untuk kriteria bertipe angka (mis. penghasilan, tanggungan). */
  nilaiNumerik: number | null;
}

export interface DetailPerhitungan {
  kriteriaId: string;
  namaKriteria: string;
  bobot: number;
  nilaiMentah: number | null;
  kodeNilai: string | null;
  score: number;
  kontribusiWs: number;
  kontribusiWp: number;
}

export interface HasilWaspas {
  pengajuanId: string;
  skorWs: number;
  skorWp: number;
  skorAkhir: number;
  lambda: number;
  detail: DetailPerhitungan[];
}

export interface BarisRanking {
  pengajuanId: string;
  nama: string;
  nik: string;
  penghasilanBulanan: number;
  jumlahTanggungan: number;
  kondisiRumah: string;
  skorWs: number;
  skorWp: number;
  skorAkhir: number;
  ranking: number;
  statusKeputusan: string | null;
}
