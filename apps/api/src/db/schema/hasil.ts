import { relations } from 'drizzle-orm';
import { index, integer, numeric, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

import { statusKeputusanEnum } from './enums';
import { pengajuan } from './pengajuan';
import { users } from './users';

export const hasil = pgTable(
  'hasil',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pengajuanId: uuid('pengajuan_id')
      .notNull()
      .references(() => pengajuan.id, { onDelete: 'cascade' }),
    ranking: integer('ranking').notNull(),
    skorWaspas: numeric('skor_waspas', { precision: 8, scale: 6, mode: 'number' }).notNull(),
    statusKeputusan: statusKeputusanEnum('status_keputusan').notNull(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => users.id),
    catatanAdmin: text('catatan_admin'),
    tanggalKeputusan: timestamp('tanggal_keputusan', { withTimezone: true }).notNull().defaultNow(),
    tandatanganDigital: varchar('tandatangan_digital', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pengajuanUnique: unique('uniq_hasil_pengajuan_id').on(table.pengajuanId),
    statusIdx: index('idx_hasil_status').on(table.statusKeputusan),
    rankingIdx: index('idx_hasil_ranking').on(table.ranking),
  }),
);

export const hasilRelations = relations(hasil, ({ one }) => ({
  pengajuan: one(pengajuan, {
    fields: [hasil.pengajuanId],
    references: [pengajuan.id],
  }),
  admin: one(users, {
    fields: [hasil.adminId],
    references: [users.id],
  }),
}));

export type HasilRow = typeof hasil.$inferSelect;
