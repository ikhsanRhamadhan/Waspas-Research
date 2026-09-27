import { formatScore } from '@spk-bansos/shared';

import { StatusKeputusanBadge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState, ErrorState, LoadingState, PageHeader, StatBlock } from '../../components/ui/StateBlocks';
import { getApi } from '../../lib/api';
import { useData } from '../../lib/useData';
import type { PosisiRanking } from '../../types';

export const RankingPage = () => {
  const ranking = useData(() => getApi<PosisiRanking>('/penduduk/ranking'));
  const data = ranking.data;

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Peringkat Anda"
        keterangan="Perhitungan memakai bobot kriteria yang ditetapkan kepala desa dan metode WASPAS."
      />

      {ranking.error ? (
        <Card>
          <ErrorState pesan={ranking.error.message} onUlangi={ranking.reload} />
        </Card>
      ) : ranking.sedangMemuat ? (
        <Card>
          <LoadingState />
        </Card>
      ) : !data?.tersedia ? (
        <Card>
          <EmptyState
            judul="Ranking belum tersedia"
            keterangan={data?.pesan ?? 'Perhitungan WASPAS belum dijalankan atau pengajuan Anda belum lolos verifikasi.'}
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader
              judul="Hasil perhitungan"
              keterangan={`Diperoleh dari ${data.totalTerperiksa} pengajuan yang lolos verifikasi`}
            />
            <CardBody>
              <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                <StatBlock label="Peringkat Anda" nilai={`#${data.posisi}`} penekan />
                <StatBlock label="Skor akhir" nilai={formatScore(data.skorAkhir)} />
                <StatBlock label="Weighted Sum" nilai={formatScore(data.skorWs)} />
                <StatBlock label="Weighted Product" nilai={formatScore(data.skorWp)} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader judul="Keputusan kepala desa" />
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="label-section">Status keputusan</p>
                  <div className="mt-1.5">
                    <StatusKeputusanBadge status={data.statusKeputusan} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="label-section">Lambda perhitungan</p>
                  <p className="mt-1.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                    {formatScore(data.lambda)}
                  </p>
                </div>
              </div>
              <p className="mt-4 max-w-prose text-sm text-slate-600 dark:text-slate-300">
                Bobot yang dipakai: lambda {formatScore(data.lambda)} berarti Weighted Sum dan Weighted
                Product diberi porsi sama. Nilai ini dapat diubah admin pada setiap perhitungan, dan
                perubahan tercatat di jejak audit.
              </p>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};
