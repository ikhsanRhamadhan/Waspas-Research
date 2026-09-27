import {
  STATUS_KEPUTUSAN_LABEL,
  STATUS_PENGAJUAN_LABEL,
  STATUS_VERIFIKASI_LABEL,
  type StatusKeputusan,
  type StatusPengajuan,
  type StatusVerifikasi,
} from '@spk-bansos/shared';

import { cn } from '../../lib/cn';

type Nada = 'sukses' | 'peringatan' | 'bahaya' | 'netral' | 'info';

/**
 * Badge status memakai warna sebagai kode, bukan hiasan: petugas membaca thousands baris
 * antrean dan harus mengenali "ditolak" sebelum membaca teksnya.
 */
const NADA: Record<Nada, string> = {
  sukses: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
  peringatan: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  bahaya: 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200',
  netral: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  info: 'bg-brand-100 text-brand-900 dark:bg-brand-900/40 dark:text-brand-200',
};

export const Badge = ({ nada, children }: { nada: Nada; children: React.ReactNode }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
      NADA[nada],
    )}
  >
    {children}
  </span>
);

const NADA_PENGAJUAN: Record<StatusPengajuan, Nada> = {
  menunggu_verifikasi: 'peringatan',
  data_terverifikasi: 'info',
  ditolak: 'bahaya',
  diproses: 'netral',
  diterima: 'sukses',
};

export const StatusPengajuanBadge = ({ status }: { status: StatusPengajuan }) => (
  <Badge nada={NADA_PENGAJUAN[status]}>{STATUS_PENGAJUAN_LABEL[status]}</Badge>
);

export const StatusVerifikasiBadge = ({ status }: { status: StatusVerifikasi | null }) => {
  if (!status) return <span className="text-sm text-slate-500 dark:text-slate-400">Belum diverifikasi</span>;
  return (
    <Badge nada={status === 'valid' ? 'sukses' : 'bahaya'}>{STATUS_VERIFIKASI_LABEL[status]}</Badge>
  );
};

const NADA_KEPUTUSAN: Record<StatusKeputusan, Nada> = {
  diterima: 'sukses',
  cadangan: 'peringatan',
  ditolak: 'bahaya',
};

export const StatusKeputusanBadge = ({ status }: { status: StatusKeputusan | null }) => {
  if (!status) return <span className="text-sm text-slate-500 dark:text-slate-400">Belum ditetapkan</span>;
  return <Badge nada={NADA_KEPUTUSAN[status]}>{STATUS_KEPUTUSAN_LABEL[status]}</Badge>;
};
