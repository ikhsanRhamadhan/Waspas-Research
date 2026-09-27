import { z } from 'zod';

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const idSchema = z.object({ id: z.string().uuid('ID notifikasi tidak valid') });

export type ListNotificationQuery = z.infer<typeof listQuerySchema>;
