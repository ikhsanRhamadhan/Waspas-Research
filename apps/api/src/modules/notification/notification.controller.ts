import type { Request, RequestHandler, Response } from 'express';

import { ok } from '../../shared/http/ApiResponse';
import * as service from './notification.service';
import type { ListNotificationQuery } from './notification.validation';

export const list: RequestHandler = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListNotificationQuery;
  const [items, unread] = await Promise.all([
    service.listNotifications(req.auth!.userId, query),
    service.countUnread(req.auth!.userId),
  ]);

  ok(
    res,
    {
      items: items.map((item) => ({
        id: item.id,
        judul: item.title,
        pesan: item.message,
        tipe: item.type,
        actionUrl: item.actionUrl,
        isRead: item.isRead,
        dibacaPada: item.readAt?.toISOString() ?? null,
        dibuatPada: item.createdAt.toISOString(),
      })),
      belumDibaca: unread,
    },
    'Berhasil',
  );
};

export const tandaiDibaca: RequestHandler = async (req: Request, res: Response) => {
  await service.markAsRead(req.auth!.userId, req.params.id as string);
  ok(res, { id: req.params.id as string }, 'Notifikasi ditandai sudah dibaca');
};

export const tandaiSemuaDibaca: RequestHandler = async (req: Request, res: Response) => {
  const jumlah = await service.markAllAsRead(req.auth!.userId);
  ok(res, { jumlah }, 'Semua notifikasi ditandai sudah dibaca');
};

export const belumDibaca: RequestHandler = async (req: Request, res: Response) => {
  ok(res, { jumlah: await service.countUnread(req.auth!.userId) }, 'Berhasil');
};
