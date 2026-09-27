import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

const KONTROL =
  'w-full rounded-md border bg-white px-3 text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800';

const borderError = 'border-rose-500 focus:border-rose-600';
const borderNormal = 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  wajib?: boolean;
  /**
   * Untuk kontrol di dalam tabel, label harus tetap dibaca pembaca layar tetapi tidak boleh
   * memakan lebar kolom. Menyembunyikan kontrolnya sendiri adalah kesalahan aksesibilitas.
   */
  sembunyikanLabel?: boolean;
  children: (props: { id: string; 'aria-describedby': string | undefined; 'aria-invalid': boolean }) => ReactNode;
}

const FieldShell = ({ label, hint, error, wajib, sembunyikanLabel, children }: FieldShellProps) => {
  const id = useId();
  const pesanId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className={cn(
          'block text-sm font-medium text-slate-700 dark:text-slate-300',
          sembunyikanLabel && 'sr-only',
        )}
      >
        {label}
        {wajib ? <span className="ml-0.5 text-rose-700">*</span> : null}
      </label>
      {children({ id, 'aria-describedby': pesanId, 'aria-invalid': Boolean(error) })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-rose-700 dark:text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
  sembunyikanLabel?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, required, sembunyikanLabel, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} wajib={required} sembunyikanLabel={sembunyikanLabel}>
      {(a11y) => (
        <input
          ref={ref}
          id={a11y.id}
          aria-describedby={a11y['aria-describedby']}
          aria-invalid={a11y['aria-invalid']}
          className={cn('h-11', KONTROL, error ? borderError : borderNormal, className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
});

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
  sembunyikanLabel?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, required, sembunyikanLabel, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} wajib={required} sembunyikanLabel={sembunyikanLabel}>
      {(a11y) => (
        <textarea
          ref={ref}
          id={a11y.id}
          aria-describedby={a11y['aria-describedby']}
          aria-invalid={a11y['aria-invalid']}
          className={cn('min-h-[96px] py-2.5 leading-relaxed', KONTROL, error ? borderError : borderNormal, className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
});

export interface OpsiSelect {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  opsi: readonly OpsiSelect[];
  hint?: string;
  error?: string;
  placeholder?: string;
  sembunyikanLabel?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, opsi, hint, error, placeholder, className, required, sembunyikanLabel, ...rest },
  ref,
) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      wajib={required}
      sembunyikanLabel={sembunyikanLabel}
    >
      {(a11y) => (
        <select
          ref={ref}
          id={a11y.id}
          aria-describedby={a11y['aria-describedby']}
          aria-invalid={a11y['aria-invalid']}
          className={cn('h-11', KONTROL, error ? borderError : borderNormal, className)}
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {opsi.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
});
