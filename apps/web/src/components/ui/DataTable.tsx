import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export interface Kolom<T> {
  key: string;
  header: ReactNode;
  render: (baris: T) => ReactNode;
  /** Kolom money/number selalu rata kanan supaya digit sejajar. */
  numerik?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  kolom: readonly Kolom<T>[];
  data: readonly T[];
  rowKey: (baris: T) => string;
  onRowClick?: (baris: T) => void;
  className?: string;
}

export const DataTable = <T,>({ kolom, data, rowKey, onRowClick, className }: DataTableProps<T>) => (
  <div className={cn('overflow-x-auto', className)}>
    <table className="w-full min-w-[640px] border-collapse text-sm">
      <thead>
        <tr className="border-b border-slate-200 dark:border-slate-800">
          {kolom.map((col) => (
            <th
              key={col.key}
              scope="col"
              className={cn(
                'label-section px-4 py-3 font-semibold',
                col.numerik ? 'text-right' : 'text-left',
              )}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((baris) => (
          <tr
            key={rowKey(baris)}
            onClick={onRowClick ? () => onRowClick(baris) : undefined}
            onKeyDown={
              onRowClick
                ? (event) => {
                    if (event.key === 'Enter') onRowClick(baris);
                  }
                : undefined
            }
            tabIndex={onRowClick ? 0 : undefined}
            className={cn(
              'border-b border-slate-100 last:border-b-0 dark:border-slate-800/70',
              onRowClick && 'cursor-pointer hover:bg-slate-50 focus:bg-slate-50 dark:hover:bg-slate-800/50',
            )}
          >
            {kolom.map((col) => (
              <td
                key={col.key}
                className={cn(
                  'px-4 py-3 text-slate-700 dark:text-slate-300',
                  col.numerik && 'text-right tabular-nums',
                  col.className,
                )}
              >
                {col.render(baris)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
