import type { ApiResponse, Paginated } from '@spk-bansos/shared';
import type { Response } from 'express';

export const ok = <T>(res: Response, data: T, message = 'Berhasil'): Response =>
  res.status(200).json({ success: true, message, data } satisfies ApiResponse<T>);

export const created = <T>(res: Response, data: T, message = 'Data berhasil dibuat'): Response =>
  res.status(201).json({ success: true, message, data } satisfies ApiResponse<T>);

export const noContent = (res: Response): Response => res.status(204).send();

export const paginated = <T>(
  res: Response,
  items: T[],
  meta: Paginated<T>['meta'],
  message = 'Berhasil',
): Response => res.status(200).json({ success: true, message, data: { items, meta } } satisfies ApiResponse<Paginated<T>>);
