import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../lib/cn';
import { Button } from './Button';

interface ModalProps {
  terbuka: boolean;
  judul: string;
  keterangan?: string;
  onTutup: () => void;
  children: ReactNode;
  footer?: ReactNode;
  lebar?: 'sempit' | 'lebar';
}

const LEBAR = { sempit: 'max-w-lg', lebar: 'max-w-3xl' } as const;

export const Modal = ({ terbuka, judul, keterangan, onTutup, children, footer, lebar = 'sempit' }: ModalProps) => {
  const kotakDialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terbuka) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onTutup();
    };
    document.addEventListener('keydown', onKeyDown);

    // Fokus masuk ke dialog supaya keyboard user tidak terjebak di halaman belakang.
    kotakDialog.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [terbuka, onTutup]);

  if (!terbuka) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <button type="button" aria-label="Tutup dialog" className="absolute inset-0 h-full w-full cursor-default" onClick={onTutup} />
      <div
        ref={kotakDialog}
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        className={cn(
          'relative w-full rounded-t-[10px] border border-slate-200 bg-white shadow-lg sm:rounded-[10px] dark:border-slate-800 dark:bg-slate-900',
          LEBAR[lebar],
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{judul}</h2>
            {keterangan ? <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{keterangan}</p> : null}
          </div>
          <Button varian="garis" ukuran="kecil" onClick={onTutup} aria-label="Tutup">
            Tutup
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};
