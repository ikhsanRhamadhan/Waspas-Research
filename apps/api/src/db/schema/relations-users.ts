import { relations } from 'drizzle-orm';

import { notifications } from './notification';
import { penduduk } from './penduduk';
import { refreshTokens } from './auth-token';
import { users } from './users';

export const usersRelations = relations(users, ({ one, many }) => ({
  penduduk: one(penduduk, {
    fields: [users.id],
    references: [penduduk.userId],
  }),
  refreshTokens: many(refreshTokens),
  notifications: many(notifications),
}));
