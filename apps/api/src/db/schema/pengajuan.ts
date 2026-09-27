import { index, integer, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

import { statusPengajuanEnum } from './enums';
import { penduduk } from './penduduk';

export const KONDISI_RUMAH = ['layak', 'tidak_layak'] as const;
export type KondisiRumah = (typeof KONDISI_RUMAH)[number];

export const pengajuan = pgTable(
  'pengajuan',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pendudukId: uuid('penduduk_id')
      .notNull()
      .references(() => penduduk.id, { onDelete: 'cascade' }),
    penghasilanBulanan: integer('penghasilan_bulanan').notNull(),
    jumlahTanggungan: integer('jumlah_tanggungan').notNull(),
    kondisiRumah: varchar('kondisi_rumah', { length: 50 }).notNull(),
    statusPengajuan: statusPengajuanEnum('status_pengajuan').notNull().default('menunggu_verifikasi'),
    catatanPenduduk: text('catatan_penduduk'),
    tanggalPengajuan: timestamp('tanggal_pengajuan', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    pendudukIdx: index('idx_pengajuan_penduduk_id').on(table.pendudukId),
    statusIdx: index('idx_pengajuan_status').on(table.statusPengajuan),
    deletedAtIdx: index('idx_pengajuan_deleted_at').on(table.deletedAt),
  }),
);

export type PengajuanRow = typeof pengajuan.$inferSelect;
export type NewPengajuanRow = typeof pengajuan.$inferInsert;
