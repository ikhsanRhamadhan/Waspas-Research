import type { JenisNotifikasi } from '@spk-bansos/shared';
import { and, count, desc, eq, isNull } from 'drizzle-orm';

import { db } from '../../db/client';
import { notifications } from '../../db/schema';
import { NotFoundError } from '../../shared/errors/AppError';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: JenisNotifikasi;
  actionUrl?: string | null;
}

export interface NotificationSummary {
  unread: number;
}

export const createNotification = async (input: CreateNotificationInput): Promise<void> => {
  await db.insert(notifications).values({
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: input.type ?? 'info',
    actionUrl: input.actionUrl ?? null,
  });
};

/**
 * Notifikasi bisa ditembakkan ke banyak pengguna sekaligus (mis. hasil penetapan
 * penerima), jadi input berupa daftar agar cukup satu kali round-trip ke database.
 */
export const createNotificationsBulk = async (inputs: CreateNotificationInput[]): Promise<void> => {
  if (inputs.length === 0) return;

  await db.insert(notifications).values(
    inputs.map((input) => ({
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? 'info',
      actionUrl: input.actionUrl ?? null,
    })),
  );
};

export const listNotifications = async (
  userId: string,
  options: { limit: number; unreadOnly: boolean },
): Promise<typeof notifications.$inferSelect[]> =>
  db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        options.unreadOnly ? eq(notifications.isRead, false) : undefined,
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(options.limit);

export const countUnread = async (userId: string): Promise<number> => {
  const [result] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result?.value ?? 0;
};

export const markAsRead = async (userId: string, notificationId: string): Promise<void> => {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });

  if (!updated) {
    throw new NotFoundError('Notifikasi tidak ditemukan');
  }
};

export const markAllAsRead = async (userId: string): Promise<number> => {
  const updated = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .returning({ id: notifications.id });
  return updated.length;
};
