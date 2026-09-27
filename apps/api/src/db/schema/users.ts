import { boolean, index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { userRoleEnum } from './enums';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar('username', { length: 100 }).notNull().unique(),
    email: varchar('email', { length: 100 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull(),
    nama: varchar('nama', { length: 200 }).notNull(),
    noTelp: varchar('no_telp', { length: 15 }),
    profilePicUrl: varchar('profile_pic_url', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    lastLogin: timestamp('last_login', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    roleIdx: index('idx_users_role').on(table.role),
    deletedAtIdx: index('idx_users_deleted_at').on(table.deletedAt),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
