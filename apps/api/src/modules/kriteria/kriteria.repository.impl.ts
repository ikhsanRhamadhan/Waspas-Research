import { asc, eq, inArray } from 'drizzle-orm';

import { db } from '../../db/client';
import { kriteria, subkriteria } from '../../db/schema';
import type { KriteriaRow, SubkriteriaRow } from '../../db/schema/kriteria';
import type { KriteriaInput, UpdateKriteriaInput } from './kriteria.validation';

export interface KriteriaDenganSubkriteria {
  id: string;
  kunci: KriteriaRow['kunci'];
  namaKriteria: string;
  deskripsi: string | null;
  bobot: number;
  tipeKriteria: KriteriaRow['tipeKriteria'];
  prioritas: number;
  isActive: boolean;
  subkriteria: {
    id: string;
    kodeNilai: string | null;
    label: string | null;
    nilaiMin: number | null;
    nilaiMax: number | null;
    score: number;
  }[];
}

export interface KriteriaRepository {
  list(): Promise<KriteriaDenganSubkriteria[]>;
  findById(id: string): Promise<KriteriaDenganSubkriteria | null>;
  create(input: KriteriaInput): Promise<KriteriaDenganSubkriteria>;
  update(id: string, input: UpdateKriteriaInput): Promise<KriteriaDenganSubkriteria>;
  remove(id: string): Promise<boolean>;
  replaceAll(inputs: KriteriaInput[]): Promise<KriteriaDenganSubkriteria[]>;
  countAktifDipakai(): Promise<number>;
}

export class DrizzleKriteriaRepository implements KriteriaRepository {
  private async hydrate(rows: KriteriaRow[]): Promise<KriteriaDenganSubkriteria[]> {
    if (rows.length === 0) return [];

    const detail = await db
      .select()
      .from(subkriteria)
      .where(inArray(subkriteria.kriteriaId, rows.map((row) => row.id)))
      .orderBy(asc(subkriteria.nilaiMin), asc(subkriteria.kodeNilai));

    const grouped = new Map<string, SubkriteriaRow[]>();
    for (const item of detail) {
      const bucket = grouped.get(item.kriteriaId) ?? [];
      bucket.push(item);
      grouped.set(item.kriteriaId, bucket);
    }

    return rows.map((row) => ({
      id: row.id,
      kunci: row.kunci,
      namaKriteria: row.namaKriteria,
      deskripsi: row.deskripsi,
      bobot: Number(row.bobot),
      tipeKriteria: row.tipeKriteria,
      prioritas: row.prioritas,
      isActive: row.isActive,
      subkriteria: (grouped.get(row.id) ?? []).map((item) => ({
        id: item.id,
        kodeNilai: item.kodeNilai,
        label: item.label,
        nilaiMin: item.nilaiMin,
        nilaiMax: item.nilaiMax,
        score: Number(item.score),
      })),
    }));
  }

  private async selectAll(): Promise<KriteriaRow[]> {
    return db.select().from(kriteria).orderBy(asc(kriteria.prioritas), asc(kriteria.namaKriteria));
  }

  async list(): Promise<KriteriaDenganSubkriteria[]> {
    return this.hydrate(await this.selectAll());
  }

  async findById(id: string): Promise<KriteriaDenganSubkriteria | null> {
    const rows = await db.select().from(kriteria).where(eq(kriteria.id, id)).limit(1);
    if (rows.length === 0) return null;
    const [hydrated] = await this.hydrate(rows);
    return hydrated ?? null;
  }

  async create(input: KriteriaInput): Promise<KriteriaDenganSubkriteria> {
    const result = await db.transaction(async (trx) => {
      const [row] = await trx
        .insert(kriteria)
        .values({
          kunci: input.kunci,
          namaKriteria: input.namaKriteria,
          deskripsi: input.deskripsi ?? null,
          bobot: input.bobot,
          tipeKriteria: input.tipeKriteria,
          prioritas: input.prioritas,
          isActive: input.isActive,
        })
        .returning();

      if (!row) throw new Error('Gagal menyimpan kriteria.');

      await trx.insert(subkriteria).values(
        input.subkriteria.map((item) => ({
          kriteriaId: row.id,
          kodeNilai: item.kodeNilai ?? null,
          label: item.label ?? null,
          nilaiMin: item.nilaiMin ?? null,
          nilaiMax: item.nilaiMax ?? null,
          score: item.score,
        })),
      );

      return row;
    });

    const created = await this.findById(result.id);
    if (!created) throw new Error('Kriteria tersimpan tetapi gagal dibaca kembali.');
    return created;
  }

  async update(id: string, input: UpdateKriteriaInput): Promise<KriteriaDenganSubkriteria> {
    await db.transaction(async (trx) => {
      await trx
        .update(kriteria)
        .set({
          ...(input.namaKriteria !== undefined ? { namaKriteria: input.namaKriteria } : {}),
          ...(input.deskripsi !== undefined ? { deskripsi: input.deskripsi ?? null } : {}),
          ...(input.bobot !== undefined ? { bobot: input.bobot } : {}),
          ...(input.tipeKriteria !== undefined ? { tipeKriteria: input.tipeKriteria } : {}),
          ...(input.prioritas !== undefined ? { prioritas: input.prioritas } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(kriteria.id, id));

      if (input.subkriteria) {
        await trx.delete(subkriteria).where(eq(subkriteria.kriteriaId, id));
        await trx.insert(subkriteria).values(
          input.subkriteria.map((item) => ({
            kriteriaId: id,
            kodeNilai: item.kodeNilai ?? null,
            label: item.label ?? null,
            nilaiMin: item.nilaiMin ?? null,
            nilaiMax: item.nilaiMax ?? null,
            score: item.score,
          })),
        );
      }
    });

    const updated = await this.findById(id);
    if (!updated) throw new Error('Kriteria tidak ditemukan setelah pembaruan.');
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const deleted = await db.delete(kriteria).where(eq(kriteria.id, id)).returning({ id: kriteria.id });
    return deleted.length > 0;
  }

  /**
   * Menyimpan ulang seluruh konfigurasi kriteria dalam satu transaksi. Dipakai admin
   * saat mengimpor paket kriteria default atau menyelaraskan bobot sekaligus, sehingga
   * tidak pernah ada kondisi setengah tersimpan yang membuat WASPAS gagal dihitung.
   */
  async replaceAll(inputs: KriteriaInput[]): Promise<KriteriaDenganSubkriteria[]> {
    await db.transaction(async (trx) => {
      await trx.delete(kriteria);
      for (const input of inputs) {
        const [row] = await trx
          .insert(kriteria)
          .values({
            kunci: input.kunci,
            namaKriteria: input.namaKriteria,
            deskripsi: input.deskripsi ?? null,
            bobot: input.bobot,
            tipeKriteria: input.tipeKriteria,
            prioritas: input.prioritas,
            isActive: input.isActive,
          })
          .returning();

        if (!row) throw new Error('Gagal menyimpan kriteria.');

        await trx.insert(subkriteria).values(
          input.subkriteria.map((item) => ({
            kriteriaId: row.id,
            kodeNilai: item.kodeNilai ?? null,
            label: item.label ?? null,
            nilaiMin: item.nilaiMin ?? null,
            nilaiMax: item.nilaiMax ?? null,
            score: item.score,
          })),
        );
      }
    });

    return this.list();
  }

  async countAktifDipakai(): Promise<number> {
    const rows = await db.select({ id: kriteria.id }).from(kriteria).where(eq(kriteria.isActive, true));
    return rows.length;
  }
}
