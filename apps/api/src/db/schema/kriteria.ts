import { relations } from 'drizzle-orm';
import { boolean, index, integer, numeric, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

import { kunciKriteriaEnum, tipeKriteriaEnum } from './enums';

export const kriteria = pgTable(
  'kriteria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Kunci mesin yang memetakan nilai mentah pengajuan ke kriteria ini. */
    kunci: kunciKriteriaEnum('kunci').notNull(),
    namaKriteria: varchar('nama_kriteria', { length: 100 }).notNull(),
    deskripsi: text('deskripsi'),
    bobot: numeric('bobot', { precision: 5, scale: 4, mode: 'number' }).notNull(),
    tipeKriteria: tipeKriteriaEnum('tipe_kriteria').notNull(),
    prioritas: integer('prioritas').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    kunciUnique: unique('uniq_kriteria_kunci').on(table.kunci),
    aktifIdx: index('idx_kriteria_is_active').on(table.isActive),
    prioritasIdx: index('idx_kriteria_prioritas').on(table.prioritas),
  }),
);

export const subkriteria = pgTable(
  'subkriteria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kriteriaId: uuid('kriteria_id')
      .notNull()
      .references(() => kriteria.id, { onDelete: 'cascade' }),
    /**
     * Diisi bila kriteria bertipe kode/enum (mis. kondisi rumah: 'layak' / 'tidak_layak').
     * Bila null, pencocokan memakai rentang nilai_min..nilai_max.
     */
    kodeNilai: varchar('kode_nilai', { length: 30 }),
    label: varchar('label', { length: 100 }),
    nilaiMin: integer('nilai_min'),
    nilaiMax: integer('nilai_max'),
    score: numeric('score', { precision: 6, scale: 4, mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    kriteriaIdx: index('idx_subkriteria_kriteria_id').on(table.kriteriaId),
    kodeIdx: index('idx_subkriteria_kode_nilai').on(table.kriteriaId, table.kodeNilai),
  }),
);

export const kriteriaRelations = relations(kriteria, ({ many }) => ({
  subkriteria: many(subkriteria),
}));

export const subkriteriaRelations = relations(subkriteria, ({ one }) => ({
  kriteria: one(kriteria, {
    fields: [subkriteria.kriteriaId],
    references: [kriteria.id],
  }),
}));

export type KriteriaRow = typeof kriteria.$inferSelect;
export type SubkriteriaRow = typeof subkriteria.$inferSelect;
