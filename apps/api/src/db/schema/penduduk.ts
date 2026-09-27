import { date, index, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users';

export const penduduk = pgTable(
  'penduduk',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    nik: varchar('nik', { length: 16 }).notNull(),
    namaLengkap: varchar('nama_lengkap', { length: 200 }).notNull(),
    jenisKelamin: varchar('jenis_kelamin', { length: 20 }),
    tanggalLahir: date('tanggal_lahir'),
    alamat: text('alamat').notNull(),
    desa: varchar('desa', { length: 100 }),
    kecamatan: varchar('kecamatan', { length: 100 }),
    kabupaten: varchar('kabupaten', { length: 100 }),
    noTelp: varchar('no_telp', { length: 15 }),
    noRekening: varchar('no_rekening', { length: 20 }),
    namaBank: varchar('nama_bank', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    nikUnique: unique('uniq_penduduk_nik').on(table.nik),
    userIdUnique: unique('uniq_penduduk_user_id').on(table.userId),
    nikIdx: index('idx_penduduk_nik').on(table.nik),
    deletedAtIdx: index('idx_penduduk_deleted_at').on(table.deletedAt),
  }),
);

export type PendudukRow = typeof penduduk.$inferSelect;
export type NewPendudukRow = typeof penduduk.$inferInsert;
