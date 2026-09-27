import { relations } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { jenisNotifikasiEnum } from './enums';
import { users } from './users';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    message: text('message').notNull(),
    type: jenisNotifikasiEnum('type').notNull().default('info'),
    isRead: boolean('is_read').notNull().default(false),
    actionUrl: varchar('action_url', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('idx_notifications_user_id').on(table.userId),
    readIdx: index('idx_notifications_is_read').on(table.isRead),
    compositeIdx: index('idx_notifications_user_read').on(table.userId, table.isRead),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export type NotificationRow = typeof notifications.$inferSelect;
