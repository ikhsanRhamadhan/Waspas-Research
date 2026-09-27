import { relations } from 'drizzle-orm';
import { index, integer, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

import { statusVerifikasiEnum } from './enums';
import { pengajuan } from './pengajuan';
import { users } from './users';

export const verifikasi = pgTable(
  'verifikasi',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pengajuanId: uuid('pengajuan_id')
      .notNull()
      .references(() => pengajuan.id, { onDelete: 'cascade' }),
    petugasId: uuid('petugas_id')
      .notNull()
      .references(() => users.id),
    statusVerifikasi: statusVerifikasiEnum('status_verifikasi').notNull(),
    catatanVerifikasi: text('catatan_verifikasi'),
    tanggalVerifikasi: timestamp('tanggal_verifikasi', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Satu pengajuan hanya boleh punya satu hasil verifikasi; perubahan dilakukan lewat UPDATE.
    pengajuanUnique: unique('uniq_verifikasi_pengajuan_id').on(table.pengajuanId),
    petugasIdx: index('idx_verifikasi_petugas_id').on(table.petugasId),
    statusIdx: index('idx_verifikasi_status').on(table.statusVerifikasi),
  }),
);

export const dokumenVerifikasi = pgTable(
  'dokumen_verifikasi',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    verifikasiId: uuid('verifikasi_id')
      .notNull()
      .references(() => verifikasi.id, { onDelete: 'cascade' }),
    jenis: varchar('jenis', { length: 30 }).notNull(),
    namaFile: varchar('nama_file', { length: 255 }).notNull(),
    pathRelatif: varchar('path_relatif', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    ukuranBytes: integer('ukuran_bytes').notNull(),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    verifikasiIdx: index('idx_dokumen_verifikasi_id').on(table.verifikasiId),
  }),
);

export const verifikasiRelations = relations(verifikasi, ({ one, many }) => ({
  pengajuan: one(pengajuan, {
    fields: [verifikasi.pengajuanId],
    references: [pengajuan.id],
  }),
  petugas: one(users, {
    fields: [verifikasi.petugasId],
    references: [users.id],
  }),
  dokumen: many(dokumenVerifikasi),
}));

export const dokumenVerifikasiRelations = relations(dokumenVerifikasi, ({ one }) => ({
  verifikasi: one(verifikasi, {
    fields: [dokumenVerifikasi.verifikasiId],
    references: [verifikasi.id],
  }),
}));

export type VerifikasiRow = typeof verifikasi.$inferSelect;
export type DokumenVerifikasiRow = typeof dokumenVerifikasi.$inferSelect;
