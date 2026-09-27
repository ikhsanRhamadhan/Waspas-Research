import pino from 'pino';

import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  // Di produksi JSON satu baris per event supaya mudah di-parse oleh platform log.
  ...(env.isProduction ? {} : { transport: { target: 'pino/file', options: { destination: 1 } } }),
  redact: {
    paths: ['req.headers.authorization', 'password', '*.password', 'passwordHash', '*.passwordHash'],
    remove: true,
  },
});

export type Logger = typeof logger;
