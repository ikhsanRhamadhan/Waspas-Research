import { ROLE_LABEL } from '@spk-bansos/shared';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/StateBlocks';
import { PANDUAN } from '../content/panduan';
import { useAuthStore } from '../lib/auth';

export const PanduanPage = () => {
  const role = useAuthStore((state) => state.user?.role);

  // AppShell hanya dirender setelah RequireAuth memastikan user ada, jadi role
  // selalu terisi. Fallback/null di sini bukan jalur yang bisa terjadi.
  if (!role) return null;

  const panduan = PANDUAN[role];

  return (
    <div className="space-y-6">
      <PageHeader
        judul={`Panduan ${ROLE_LABEL[role]}`}
        keterangan={panduan.perkenalan}
      />

      <Card>
        <CardHeader judul="Yang bisa Anda lakukan" keterangan="Shortcut langsung ke halaman yang dipakai." />
        <CardBody>
          <ul className="grid gap-3 sm:grid-cols-2">
            {panduan.tugas.map((tugas) => (
              <li
                key={tugas.judul}
                className="flex flex-col justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{tugas.judul}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{tugas.detail}</p>
                </div>
                {tugas.ke ? (
                  <Link to={tugas.ke} className="self-start">
                    <Button
                      varian="garis"
                      ukuran="kecil"
                      ikon={<ArrowRight className="h-4 w-4" />}
                    >
                      Buka
                    </Button>
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          judul="Aturan yang perlu diketahui"
          keterangan="Aturan ini sama dengan yang dijalankan server, sehingga isinya tidak berubah setelah disimpan."
        />
        <CardBody>
          <ul className="space-y-2">
            {panduan.penting.map((aturan) => (
              <li key={aturan} className="flex gap-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600 dark:bg-brand-400" />
                <span>{aturan}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
};
