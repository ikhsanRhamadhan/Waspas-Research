import { relations } from 'drizzle-orm';
import { index, integer, jsonb, numeric, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

import { kriteria } from './kriteria';
import { pengajuan } from './pengajuan';
import { users } from './users';

export const perhitunganWaspas = pgTable(
  'perhitungan_waspas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pengajuanId: uuid('pengajuan_id')
      .notNull()
      .references(() => pengajuan.id, { onDelete: 'cascade' }),
    lambda: numeric('lambda', { precision: 4, scale: 2, mode: 'number' }).notNull(),
    skorWs: numeric('skor_ws', { precision: 8, scale: 6, mode: 'number' }).notNull(),
    skorWp: numeric('skor_wp', { precision: 8, scale: 6, mode: 'number' }).notNull(),
    skorAkhir: numeric('skor_akhir', { precision: 8, scale: 6, mode: 'number' }).notNull(),
    ranking: integer('ranking').notNull(),
    dihitungOleh: uuid('dihitung_oleh')
      .notNull()
      .references(() => users.id),
    detail: jsonb('detail').$type<unknown>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Satu pengajuan punya satu hasil hitung; penghitungan ulang berarti UPDATE.
    pengajuanUnique: unique('uniq_waspas_pengajuan_id').on(table.pengajuanId),
    rankingIdx: index('idx_waspas_ranking').on(table.ranking),
    skorIdx: index('idx_waspas_skor').on(table.skorAkhir),
  }),
);

/**
 * Rincian per kriteria. Schema ini disimpan terpisah (bukan kolom tetap seperti
 * ws_penghasilan/ws_rumah) supaya jumlah kriteria bisa berubah tanpa mengubah tabel.
 */
export const perhitunganWaspasDetail = pgTable(
  'perhitungan_waspas_detail',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    perhitunganId: uuid('perhitungan_id')
      .notNull()
      .references(() => perhitunganWaspas.id, { onDelete: 'cascade' }),
    kriteriaId: uuid('kriteria_id')
      .notNull()
      .references(() => kriteria.id),
    /** Disalin agar histori tetap terbaca walaupun kriteria nanti diganti nama/bobot. */
    namaKriteria: varchar('nama_kriteria', { length: 100 }).notNull(),
    bobot: numeric('bobot', { precision: 5, scale: 4, mode: 'number' }).notNull(),
    nilaiMentah: numeric('nilai_mentah', { precision: 16, scale: 2, mode: 'number' }),
    kodeNilai: varchar('kode_nilai', { length: 30 }),
    score: numeric('score', { precision: 8, scale: 6, mode: 'number' }).notNull(),
    kontribusiWs: numeric('kontribusi_ws', { precision: 8, scale: 6, mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    perhitunganIdx: index('idx_waspas_detail_perhitungan_id').on(table.perhitunganId),
  }),
);

export const perhitunganWaspasRelations = relations(perhitunganWaspas, ({ one, many }) => ({
  pengajuan: one(pengajuan, {
    fields: [perhitunganWaspas.pengajuanId],
    references: [pengajuan.id],
  }),
  detail: many(perhitunganWaspasDetail),
}));

export const perhitunganWaspasDetailRelations = relations(perhitunganWaspasDetail, ({ one }) => ({
  perhitungan: one(perhitunganWaspas, {
    fields: [perhitunganWaspasDetail.perhitunganId],
    references: [perhitunganWaspas.id],
  }),
  kriteria: one(kriteria, {
    fields: [perhitunganWaspasDetail.kriteriaId],
    references: [kriteria.id],
  }),
}));

export type PerhitunganWaspasRow = typeof perhitunganWaspas.$inferSelect;
export type PerhitunganWaspasDetailRow = typeof perhitunganWaspasDetail.$inferSelect;
