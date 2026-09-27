import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';

import { ValidationError } from '../errors/AppError';

type Source = 'body' | 'query' | 'params';

const formatIssues = (error: ZodError): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    (result[key] ??= []).push(issue.message);
  }
  return result;
};

/**
 * Validasi "Trust Backend, Not Frontend": setiap request yang mengubah state
 * divalidasi ulang di server, apa pun yang dikirim frontend.
 * Hasil parse ditulis balik ke req.{body,query,params} sehingga controller
 * selalu menerima data yang sudah bertipe.
 */
export const validate = (schemas: {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const sources: Source[] = ['body', 'query', 'params'];

      for (const source of sources) {
        const schema = schemas[source];
        if (!schema) continue;

        const result = schema.safeParse(req[source]);
        if (!result.success) {
          throw new ValidationError('Data yang dikirim tidak valid', formatIssues(result.error));
        }

        if (source === 'query') {
          // req.query di Express 5 adalah getter-only, jadi tidak bisa di-assign langsung.
          Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
        } else {
          req[source] = result.data as never;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export type Infer<T extends ZodTypeAny> = z.infer<T>;
