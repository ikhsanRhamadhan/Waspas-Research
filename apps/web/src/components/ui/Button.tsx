import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

type Varian = 'utama' | 'sekunder' | 'garis' | 'bahaya';
type Ukuran = 'kecil' | 'sedang';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  varian?: Varian;
  ukuran?: Ukuran;
  memuat?: boolean;
  ikon?: ReactNode;
}

const VARIAN: Record<Varian, string> = {
  utama: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-600/50',
  sekunder:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800',
  garis:
    'bg-transparent text-brand-700 hover:bg-brand-50 active:bg-brand-100 dark:text-brand-300 dark:hover:bg-slate-800',
  bahaya: 'bg-rose-700 text-white hover:bg-rose-800 active:bg-rose-900 disabled:bg-rose-700/50',
};

const UKURAN: Record<Ukuran, string> = {
  // 44px tinggi di variant kecil: target sentuh minimum untuk petugas di ponsel.
  kecil: 'h-11 px-3 text-sm gap-1.5',
  sedang: 'h-11 px-4 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { varian = 'sekunder', ukuran = 'sedang', memuat = false, ikon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || memuat}
      aria-busy={memuat || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-semibold transition-colors disabled:cursor-not-allowed',
        VARIAN[varian],
        UKURAN[ukuran],
        className,
      )}
      {...rest}
    >
      {memuat ? <Spinner /> : ikon}
      {children}
    </button>
  );
});

export const Spinner = ({ className }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={cn(
      'inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent',
      className,
    )}
  />
);
