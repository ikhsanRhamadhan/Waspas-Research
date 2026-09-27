import type { KriteriaBobot, SubkriteriaRange } from '@spk-bansos/shared';

/** Nilai mentah satu pengajuan, sumber tunggal untuk seluruh pemetaan kriteria. */
export interface DataPengajuan {
  penghasilanBulanan: number;
  jumlahTanggungan: number;
  kondisiRumah: string;
}

export interface KriteriaLengkap extends KriteriaBobot {
  subkriteria: SubkriteriaRange[];
}

export interface HasilKriteria {
  kriteriaId: string;
  namaKriteria: string;
  bobot: number;
  nilaiMentah: number | null;
  kodeNilai: string | null;
  score: number;
  kontribusiWs: number;
  kontribusiWp: number;
}

export interface HasilPerhitungan {
  skorWs: number;
  skorWp: number;
  skorAkhir: number;
  lambda: number;
  detail: HasilKriteria[];
}

/**
 * Nilai mentah tidak tercakup subkriteria manapun. Hitungan sengaja DITOLAK,
 * bukan memakai score 0, supaya administrator tahu ada rentang yang belum lengkap.
 */
export class SubkriteriaTidakCakupError extends Error {
  readonly kriteriaId: string;
  readonly namaKriteria: string;
  readonly nilai: number | string;

  constructor(kriteriaId: string, namaKriteria: string, nilai: number | string) {
    super(
      `Nilai "${nilai}" pada kriteria "${namaKriteria}" tidak tercakup oleh rentang subkriteria manapun. ` +
        `Lengkapi subkriteria untuk kriteria tersebut sebelum menghitung ulang.`,
    );
    this.name = 'SubkriteriaTidakCakupError';
    this.kriteriaId = kriteriaId;
    this.namaKriteria = namaKriteria;
    this.nilai = nilai;
  }
}

/** Jumlah bobot kriteria aktif tidak sama dengan 1. */
export class BobotTidakValidError extends Error {
  constructor(totalBobot: number) {
    super(`Total bobot kriteria aktif harus sama dengan 1. Saat ini ${totalBobot.toFixed(4)}.`);
    this.name = 'BobotTidakValidError';
  }
}

/** Kontrak pemetaan kunci kriteria → nilai mentah pengajuan. */
export type NilaiExtractor = (data: DataPengajuan) => { nilaiNumerik: number | null; kodeNilai: string | null };

const cocokRentang = (nilai: number, sub: SubkriteriaRange): boolean => {
  if (sub.nilaiMin === null || sub.nilaiMax === null) return false;
  return nilai >= sub.nilaiMin && nilai <= sub.nilaiMax;
};

/**
 * Mencari score subkriteria untuk satu nilai mentah.
 * Kriteria bertipe kode (mis. kondisi rumah) dicocokkan lewat `kodeNilai`;
 * kriteria bertipe angka dicocokkan lewat rentang min..max yang inklusif.
 */
export const cariScore = (
  subkriteria: SubkriteriaRange[],
  nilai: { nilaiNumerik: number | null; kodeNilai: string | null },
): SubkriteriaRange | null => {
  if (nilai.kodeNilai !== null) {
    return subkriteria.find((sub) => sub.kodeNilai === nilai.kodeNilai) ?? null;
  }

  if (nilai.nilaiNumerik === null) return null;
  return subkriteria.find((sub) => cocokRentang(nilai.nilaiNumerik as number, sub)) ?? null;
};

/**
 * Validasi konfigurasi subkriteria sebelum disimpan.
 * Rentang yang tumpang tindih membuat hasil hitung tidak deterministik, jadi ditolak di awal.
 */
export interface HasilValidasiSubkriteria {
  valid: boolean;
  pesan: string[];
}

export const validasiSubkriteria = (subkriteria: SubkriteriaRange[]): HasilValidasiSubkriteria => {
  const pesan: string[] = [];

  if (subkriteria.length === 0) {
    return { valid: false, pesan: ['Minimal harus ada satu subkriteria'] };
  }

  const berbasisKode = subkriteria.filter((sub) => sub.kodeNilai !== null);
  const berbasisAngka = subkriteria.filter((sub) => sub.kodeNilai === null);

  const kodeGanda = berbasisKode
    .map((sub) => sub.kodeNilai as string)
    .filter((kode, index, arr) => arr.indexOf(kode) !== index);
  if (kodeGanda.length > 0) {
    pesan.push(`Nilai berikut punya lebih dari satu subkriteria: ${[...new Set(kodeGanda)].join(', ')}`);
  }

  for (const sub of berbasisAngka) {
    if (sub.nilaiMin === null || sub.nilaiMax === null) {
      pesan.push('Subkriteria berbasis angka wajib mengisi nilaiMin dan nilaiMax');
      continue;
    }
    if (sub.nilaiMin > sub.nilaiMax) {
      pesan.push(`Rentang ${sub.nilaiMin}-${sub.nilaiMax} terbalik`);
    }
    if (sub.score < 0 || sub.score > 1) {
      pesan.push(`Score harus di antara 0 dan 1, ditemukan ${sub.score}`);
    }
  }

  // Deteksi tumpang tindih dengan menyortir berdasarkan batas bawah.
  const terurut = [...berbasisAngka]
    .filter((sub) => sub.nilaiMin !== null && sub.nilaiMax !== null)
    .sort((a, b) => (a.nilaiMin as number) - (b.nilaiMin as number));

  for (let i = 1; i < terurut.length; i += 1) {
    const sebelumnya = terurut[i - 1]!;
    const sekarang = terurut[i]!;
    if ((sekarang.nilaiMin as number) <= (sebelumnya.nilaiMax as number)) {
      pesan.push(
        `Rentang ${sekarang.nilaiMin}-${sekarang.nilaiMax} tumpang tindih dengan ${sebelumnya.nilaiMin}-${sebelumnya.nilaiMax}`,
      );
    }
  }

  return { valid: pesan.length === 0, pesan };
};

/**
 * Mesin WASPAS: Weighted Sum + Weighted Product digabung dengan lambda.
 * Fungsi murni tanpa akses database, jadi bisa diuji unit secara terpisah.
 */
export class WaspasCalculator {
  private readonly lambda: number;
  private readonly kriteria: KriteriaLengkap[];
  private readonly extractor: Map<string, NilaiExtractor>;

  constructor(kriteria: KriteriaLengkap[], lambda: number, extractor: Map<string, NilaiExtractor>) {
    if (kriteria.length === 0) {
      throw new Error('Perhitungan WASPAS butuh minimal satu kriteria aktif');
    }

    this.kriteria = [...kriteria].sort((a, b) => a.prioritas - b.prioritas);
    this.lambda = Math.min(1, Math.max(0, lambda));
    this.extractor = extractor;
  }

  private hitungSkor(): number {
    return this.kriteria.reduce((total, item) => total + item.bobot, 0);
  }

  calculate(data: DataPengajuan): HasilPerhitungan {
    const totalBobot = this.hitungSkor();
    if (Math.abs(totalBobot - 1) > 0.0001) {
      throw new BobotTidakValidError(totalBobot);
    }

    const detail: HasilKriteria[] = this.kriteria.map((item) => {
      const extract = this.extractor.get(item.kunci);
      if (!extract) {
        throw new Error(`Tidak ada pemetaan nilai untuk kriteria "${item.kunci}"`);
      }

      const nilai = extract(data);
      const sub = cariScore(item.subkriteria, nilai);
      if (!sub) {
        throw new SubkriteriaTidakCakupError(
          item.id,
          item.namaKriteria,
          nilai.kodeNilai ?? (nilai.nilaiNumerik ?? '-'),
        );
      }

      return {
        kriteriaId: item.id,
        namaKriteria: item.namaKriteria,
        bobot: item.bobot,
        nilaiMentah: nilai.nilaiNumerik,
        kodeNilai: nilai.kodeNilai,
        score: sub.score,
        kontribusiWs: item.bobot * sub.score,
        kontribusiWp: Math.pow(sub.score, item.bobot),
      };
    });

    const skorWs = detail.reduce((total, item) => total + item.kontribusiWs, 0);
    const skorWp = detail.reduce((total, item) => total * item.kontribusiWp, 1);
    const skorAkhir = this.lambda * skorWs + (1 - this.lambda) * skorWp;

    return {
      skorWs: bulatkan(skorWs),
      skorWp: bulatkan(skorWp),
      skorAkhir: bulatkan(skorAkhir),
      lambda: this.lambda,
      detail,
    };
  }
}

const bulatkan = (value: number): number => Math.round(value * 1e6) / 1e6;

export interface BarisRankingInput {
  pengajuanId: string;
  skorAkhir: number;
  jumlahTanggungan: number;
  penghasilanBulanan: number;
  nama: string;
}

/**
 * Tie-break dibuat eksplisit agar ranking tidak bergeser antar-jalankan:
 * skor turun, lalu tanggungan turun, penghasilan naik, nama naik.
 */
export const urutkanRanking = <T extends BarisRankingInput>(baris: T[]): T[] =>
  [...baris].sort(
    (a, b) =>
      b.skorAkhir - a.skorAkhir ||
      b.jumlahTanggungan - a.jumlahTanggungan ||
      a.penghasilanBulanan - b.penghasilanBulanan ||
      a.nama.localeCompare(b.nama, 'id'),
  );
