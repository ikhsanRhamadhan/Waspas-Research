import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { Button, Spinner } from './Button';

export const LoadingState = ({ pesan = 'Memuat data' }: { pesan?: string }) => (
  <div role="status" className="flex items-center justify-center gap-2.5 px-5 py-12 text-sm text-slate-600 dark:text-slate-400">
    <Spinner className="text-brand-600 dark:text-brand-400" />
    {pesan}
  </div>
);

interface EmptyStateProps {
  judul: string;
  keterangan?: string;
  aksi?: ReactNode;
}

export const EmptyState = ({ judul, keterangan, aksi }: EmptyStateProps) => (
  <div className="px-5 py-12 text-center">
    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{judul}</p>
    {keterangan ? (
      <p className="mx-auto mt-1 max-w-prose text-sm text-slate-600 dark:text-slate-400">{keterangan}</p>
    ) : null}
    {aksi ? <div className="mt-4 flex justify-center">{aksi}</div> : null}
  </div>
);

interface ErrorStateProps {
  pesan: string;
  detail?: Record<string, string[]>;
  onUlangi?: () => void;
}

export const ErrorState = ({ pesan, detail, onUlangi }: ErrorStateProps) => (
  <div role="alert" className="px-5 py-8 text-center">
    <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">{pesan}</p>
    {detail ? (
      <ul className="mx-auto mt-2 max-w-prose space-y-1 text-left text-sm text-rose-700 dark:text-rose-400">
        {Object.entries(detail).map(([field, daftar]) => (
          <li key={field}>
            <span className="font-medium capitalize">{field}:</span> {daftar.join(' ')}
          </li>
        ))}
      </ul>
    ) : null}
    {onUlangi ? (
      <div className="mt-4 flex justify-center">
        <Button onClick={onUlangi}>Coba lagi</Button>
      </div>
    ) : null}
  </div>
);

/**
 * Wrapper untuk tiga state data agar tiap layar tidak lupa salah satu.
 * Children dirender hanya saat data siap dan tidak kosong.
 */
export const DataState = <T,>({
  sedangMemuat,
  error,
  data,
  pesanLoading,
  judulKosong,
  keteranganKosong,
  aksiKosong,
  onUlangi,
  children,
}: {
  sedangMemuat: boolean;
  error: { message: string; errors?: Record<string, string[]> } | null;
  data: readonly T[] | null;
  pesanLoading?: string;
  judulKosong: string;
  keteranganKosong?: string;
  aksiKosong?: ReactNode;
  onUlangi?: () => void;
  children: ReactNode;
}) => {
  if (sedangMemuat) return <LoadingState pesan={pesanLoading} />;
  if (error) return <ErrorState pesan={error.message} detail={error.errors} onUlangi={onUlangi} />;
  if (!data || data.length === 0) {
    return <EmptyState judul={judulKosong} keterangan={keteranganKosong} aksi={aksiKosong} />;
  }
  return <>{children}</>;
};

export const PageHeader = ({
  judul,
  keterangan,
  aksi,
  className,
}: {
  judul: string;
  keterangan?: string;
  aksi?: ReactNode;
  className?: string;
}) => (
  <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
    <div className="min-w-0">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px] dark:text-slate-50">{judul}</h1>
      {keterangan ? <p className="mt-1 max-w-prose text-sm text-slate-600 dark:text-slate-400">{keterangan}</p> : null}
    </div>
    {aksi ? <div className="flex flex-wrap items-center gap-2">{aksi}</div> : null}
  </div>
);

/** Angka besar dengan label kapital: motif baris data yang dipakai di seluruh aplikasi. */
export const StatBlock = ({
  label,
  nilai,
  catatan,
  penekan = false,
}: {
  label: string;
  nilai: ReactNode;
  catatan?: string;
  penekan?: boolean;
}) => (
  <div className="min-w-0">
    <p className="label-section">{label}</p>
    <p
      className={cn(
        'mt-1 text-[30px] font-semibold leading-none tabular-nums',
        penekan ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-50',
      )}
    >
      {nilai}
    </p>
    {catatan ? <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{catatan}</p> : null}
  </div>
);
