import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}

export const Card = ({ children, className, as: Tag = 'div' }: CardProps) => (
  <Tag
    className={cn(
      'rounded-[10px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
      className,
    )}
  >
    {children}
  </Tag>
);

interface HeaderProps {
  judul: string;
  keterangan?: string;
  aksi?: ReactNode;
  className?: string;
}

export const CardHeader = ({ judul, keterangan, aksi, className }: HeaderProps) => (
  <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800', className)}>
    <div className="min-w-0">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{judul}</h2>
      {keterangan ? <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{keterangan}</p> : null}
    </div>
    {aksi ? <div className="flex shrink-0 items-center gap-2">{aksi}</div> : null}
  </div>
);

export const CardBody = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('px-5 py-4', className)}>{children}</div>
);
