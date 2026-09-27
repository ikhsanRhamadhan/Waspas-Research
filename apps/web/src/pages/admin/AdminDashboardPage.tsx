import { formatPercent } from '@spk-bansos/shared';
import { Link } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { ErrorState, LoadingState, PageHeader, StatBlock } from '../../components/ui/StateBlocks';
import { getApi } from '../../lib/api';
import { useData } from '../../lib/useData';
import type { Kriteria, RingkasanBobot, StatistikAdmin } from '../../types';

const Tahapan = ({ statistik }: { statistik: StatistikAdmin }) => {
  // Urutan tahap harus monoton naik. "Sudah dihitung" dulu-dulu dihitung hanya yang
  // belum diputuskan, sehingga angkanya justru turun begitu keputusan ditetapkan.
  const tahap = [
    { label: 'Menunggu verifikasi', nilai: statistik.menungguVerifikasi, ke: '/petugas/dashboard' },
    { label: 'Sudah diverifikasi', nilai: statistik.terverifikasi, ke: '/admin/waspas' },
    { label: 'Sudah dihitung WASPAS', nilai: statistik.totalSudahDihitung, ke: '/admin/penerima' },
    { label: 'Sudah ditetapkan', nilai: statistik.totalDiputuskan, ke: '/admin/penerima' },
    { label: 'Ditetapkan diterima', nilai: statistik.totalDiterima, ke: '/admin/penerima' },
  ];
  const puncak = Math.max(...tahap.map((item) => item.nilai), 1);

  return (
    <ol className="space-y-3">
      {tahap.map((item, index) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="mr-1.5 tabular-nums text-slate-400">{index + 1}.</span>
              {item.label}
            </p>
            <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">{item.nilai}</p>
          </div>
          <div
            role="presentation"
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          >
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${Math.round((item.nilai / puncak) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
};

export const AdminDashboardPage = () => {
  const statistik = useData(() => getApi<StatistikAdmin>('/admin/dashboard'));
  const bobot = useData(() => getApi<RingkasanBobot>('/kriteria/ringkasan-bobot'));
  const kriteria = useData(() => getApi<Kriteria[]>('/kriteria'));

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Ringkasan bantuan sosial"
        keterangan="Pantau antrean verifikasi, jalankan WASPAS, lalu tetapkan penerima bantuan."
        aksi={
          <Link to="/admin/waspas">
            <Button varian="utama">Buka perhitungan WASPAS</Button>
          </Link>
        }
      />

      {statistik.error ? (
        <Card>
          <ErrorState pesan={statistik.error.message} onUlangi={statistik.reload} />
        </Card>
      ) : statistik.sedangMemuat ? (
        <Card>
          <LoadingState />
        </Card>
      ) : (
        <>
          <Card>
            <CardBody>
              <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                <StatBlock label="Warga terdaftar" nilai={statistik.data?.totalPenduduk ?? 0} />
                <StatBlock label="Total pengajuan" nilai={statistik.data?.totalPengajuan ?? 0} />
                <StatBlock
                  label="Menunggu verifikasi"
                  nilai={statistik.data?.menungguVerifikasi ?? 0}
                  penekan={(statistik.data?.menungguVerifikasi ?? 0) > 0}
                />
                <StatBlock label="Penerima ditetapkan" nilai={statistik.data?.totalDiterima ?? 0} />
              </div>
            </CardBody>
          </Card>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader judul="Alur Indahiana" />
              <CardBody>
                {statistik.data ? <Tahapan statistik={statistik.data} /> : null}
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                  {statistik.data && statistik.data.totalDiputuskan > 0
                    ? `Rasio penerima dari ${statistik.data.totalDiputuskan} pengajuan yang sudah ditetapkan: ${formatPercent(statistik.data.rasioPenerima ?? 0)}`
                    : 'Rasio penerima muncul setelah ada keputusan yang ditetapkan.'}
                </p>
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader
                judul="Kriteria WASPAS"
                keterangan={
                  bobot.data?.valid === true
                    ? `Total bobot ${bobot.data.total.toFixed(2)} pada ${bobot.data.jumlahKriteria} kriteria aktif`
                    : undefined
                }
                aksi={
                  <Link to="/admin/kriteria">
                    <Button ukuran="kecil">Kelola</Button>
                  </Link>
                }
              />
              <CardBody>
                {bobot.error ? (
                  <ErrorState pesan={bobot.error.message} onUlangi={bobot.reload} />
                ) : (
                  <>
                    {bobot.data && !bobot.data.valid ? (
                      <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                        Total bobot saat ini {bobot.data.total.toFixed(4)}, bukan 1. Perbaiki sebelum
                        menjalankan WASPAS.
                      </p>
                    ) : null}
                    <ul className="space-y-2 text-sm">
                      {(kriteria.data ?? []).map((item) => (
                        <li key={item.id} className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                            {item.namaKriteria}
                            {item.isActive ? '' : ' (nonaktif)'}
                          </span>
                          <span className="shrink-0 tabular-nums text-slate-900 dark:text-slate-50">
                            {item.bobot.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {kriteria.error ? (
                      <p className="mt-3 text-sm text-rose-700 dark:text-rose-400">{kriteria.error.message}</p>
                    ) : null}
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
