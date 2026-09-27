import { ROLE_LABEL } from '@spk-bansos/shared';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { StatusPengajuanBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/StateBlocks';
import { ALUR } from '../content/alur';
import { useAuthStore } from '../lib/auth';
import { cn } from '../lib/cn';

export const AlurPage = () => {
  const role = useAuthStore((state) => state.user?.role);

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Alur bantuan sosial"
        keterangan="Tiga tahap yang dilalui setiap pengajuan, dari warga sampai kepala desa menetapkan penerima. Tahap milikmu disorot."
      />

      <ol className="space-y-4">
        {ALUR.map((tahap) => {
          const milikmu = tahap.role === role;
          return (
            <li key={tahap.role}>
              <Card
                className={cn(
                  milikmu && 'border-brand-400 ring-1 ring-brand-400 dark:border-brand-500 dark:ring-brand-500',
                )}
              >
                <CardHeader
                  judul={`Tahap ${tahap.urutan}. ${tahap.judul}`}
                  keterangan={`${ROLE_LABEL[tahap.role]}${milikmu ? ' — tahap Anda' : ''}`}
                  aksi={
                    milikmu ? (
                      <Link to={tahap.halamanMulai}>
                        <Button varian="utama" ukuran="kecil" ikon={<ArrowRight className="h-4 w-4" />}>
                          {tahap.halamanMulaiLabel}
                        </Button>
                      </Link>
                    ) : null
                  }
                />
                <CardBody>
                  <p className="max-w-prose text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {tahap.ringkasan}
                  </p>

                  <ol className="mt-4 space-y-2">
                    {tahap.langkah.map((langkah, index) => (
                      <li key={langkah} className="flex gap-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {index + 1}
                        </span>
                        <span>{langkah}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Status setelah tahap ini
                    </span>
                    {tahap.statusKeluar.map((status) => (
                      <StatusPengajuanBadge key={status} status={status} />
                    ))}
                  </div>

                  {tahap.catatan.length > 0 ? (
                    <div className="mt-4 rounded-md bg-slate-50 px-4 py-3 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Perlu diketahui
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {tahap.catatan.map((catatan) => (
                          <li key={catatan} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            {catatan}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
