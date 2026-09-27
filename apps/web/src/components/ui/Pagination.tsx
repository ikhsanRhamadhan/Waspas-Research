import { cn } from '../../lib/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onGanti: (page: number) => void;
}

/**
 * Tombol halaman memakai nomor, bukan "previous/next" saja, karena antrean verifikasi
 * bisa jauh lebih panjang dari satu layar dan petugas perlu melompat ke halaman tertentu.
 */
export const Pagination = ({ page, totalPages, total, onGanti }: PaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Navigasi halaman"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
    >
      <p className="tabular-nums text-slate-600 dark:text-slate-400">
        Halaman {page} dari {totalPages}, total {total} data
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onGanti(page - 1)}
          disabled={page <= 1}
          className="h-11 rounded-md border border-slate-300 px-3 font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Sebelumnya
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((nomor) => (
          <button
            key={nomor}
            type="button"
            onClick={() => onGanti(nomor)}
            aria-current={nomor === page ? 'page' : undefined}
            className={cn(
              'h-11 min-w-11 rounded-md px-2 font-medium tabular-nums',
              nomor === page
                ? 'bg-brand-600 text-white'
                : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
            )}
          >
            {nomor}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onGanti(page + 1)}
          disabled={page >= totalPages}
          className="h-11 rounded-md border border-slate-300 px-3 font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Berikutnya
        </button>
      </div>
    </nav>
  );
};
