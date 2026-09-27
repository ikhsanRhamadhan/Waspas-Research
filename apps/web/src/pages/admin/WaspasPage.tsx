import { LAMBDA_DEFAULT, formatRupiah, formatScore } from '@spk-bansos/shared';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Field';
import { ErrorState, PageHeader, StatBlock } from '../../components/ui/StateBlocks';
import { getApi, postApi, type ApiError } from '../../lib/api';
import { useData } from '../../lib/useData';
import type { BarisRankingHitung, HasilHitungWaspas, RingkasanBobot, StatistikAdmin } from '../../types';

const RincianPerhitungan = ({ baris }: { baris: BarisRankingHitung }) => (
  <div className="mt-2 overflow-x-auto">
    <table className="w-full min-w-[32rem] text-sm">
      <caption className="sr-only">Rincian skor per kriteria untuk {baris.namaLengkap}</caption>
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <th scope="col" className="py-1.5 pr-3 font-medium">
            Kriteria
          </th>
          <th scope="col" className="py-1.5 pr-3 text-right font-medium">
            Bobot
          </th>
          <th scope="col" className="py-1.5 pr-3 text-right font-medium">
            Nilai
          </th>
          <th scope="col" className="py-1.5 pr-3 text-right font-medium">
            Skor
          </th>
          <th scope="col" className="py-1.5 text-right font-medium">
            Kontribusi WS
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
        {baris.detail.map((item) => (
          <tr key={item.kriteriaId}>
            <th scope="row" className="py-1.5 pr-3 text-left font-normal text-slate-700 dark:text-slate-200">
              {item.namaKriteria}
            </th>
            <td className="py-1.5 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
              {formatScore(item.bobot)}
            </td>
            <td className="py-1.5 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
              {item.nilaiMentah ?? item.kodeNilai ?? '-'}
            </td>
            <td className="py-1.5 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
              {formatScore(item.score)}
            </td>
            <td className="py-1.5 text-right tabular-nums text-slate-900 dark:text-slate-50">
              {formatScore(item.kontribusiWs)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const WaspasPage = () => {
  const bobot = useData(() => getApi<RingkasanBobot>('/kriteria/ringkasan-bobot'));
  const statistik = useData(() => getApi<StatistikAdmin>('/admin/statistik'));
  const [lambda, setLambda] = useState(String(LAMBDA_DEFAULT));
  const [hasil, setHasil] = useState<HasilHitungWaspas | null>(null);
  const [galatLambda, setGalatLambda] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [memuat, setMemuat] = useState(false);

  const bobotSiap = bobot.data?.valid === true && bobot.data.jumlahKriteria > 0;
  const adaKandidat = (statistik.data?.terverifikasi ?? 0) > 0;

  const jalankan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nilaiLambda = Number(lambda);

    if (Number.isNaN(nilaiLambda) || nilaiLambda < 0 || nilaiLambda > 1) {
      setGalatLambda('Lambda harus antara 0 dan 1');
      return;
    }

    setGalatLambda(null);
    setError(null);
    setMemuat(true);
    try {
      const data = await postApi<HasilHitungWaspas>('/admin/waspas/hitung', { lambda: nilaiLambda });
      setHasil(data);
      statistik.reload();
      toast.success(`WASPAS dihitung untuk ${data.jumlahPengajuan} pengajuan`);
    } catch (kesalahan) {
      const apiError = kesalahan as ApiError;
      setError(apiError);
      toast.error(apiError.message);
    } finally {
      setMemuat(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Perhitungan WASPAS"
        keterangan="Bobot diambil dari kriteria aktif. Menghitung ulang akan menimpa ranking sebelumnya untuk pengajuan yang sama."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader judul="Jalankan perhitungan" />
          <CardBody>
            <form onSubmit={jalankan} noValidate className="space-y-4">
              {error ? <ErrorState pesan={error.message} detail={error.errors} /> : null}

              <Input
                label="Lambda"
                type="number"
                min={0}
                max={1}
                step={0.05}
                required
                hint="0 berarti hanya Weighted Product, 1 berarti hanya Weighted Sum, 0.5 memberi porsi sama."
                value={lambda}
                onChange={(event) => {
                  setLambda(event.target.value);
                  setGalatLambda(null);
                }}
                error={galatLambda ?? undefined}
              />

              {bobot.sedangMemuat ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">Memuat bobot kriteria</p>
              ) : bobot.error ? (
                <ErrorState pesan={bobot.error.message} onUlangi={bobot.reload} />
              ) : !bobotSiap ? (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  {bobot.data?.jumlahKriteria === 0
                    ? 'Belum ada kriteria aktif.'
                    : `Total bobot ${bobot.data?.total.toFixed(4)}, bukan 1. Perbaiki pada menu Kriteria.`}{' '}
                  <Link to="/admin/kriteria" className="underline">
                    Buka kriteria
                  </Link>
                </p>
              ) : !adaKandidat ? (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  Tidak ada pengajuan berstatus data terverifikasi. Petugas perlu menyelesaikan verifikasi
                  lebih dulu.
                </p>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {statistik.data?.terverifikasi} pengajuan lolos verifikasi dan siap dihitung.
                </p>
              )}

              <div className="flex justify-end">
                <Button type="submit" varian="utama" memuat={memuat} disabled={!bobotSiap || !adaKandidat}>
                  Hitung WASPAS
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            judul="Hasil perhitungan"
            keterangan={hasil ? `Lambda ${formatScore(hasil.lambda)} · total bobot ${hasil.totalBobotKriteria.toFixed(2)}` : undefined}
          />
          <CardBody>
            {!hasil ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Belum ada hasil pada sesi ini. Jalankan perhitungan untuk melihat ranking.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-6">
                  <StatBlock label="Pengajuan dihitung" nilai={hasil.jumlahPengajuan} />
                  <StatBlock label="Lambda" nilai={formatScore(hasil.lambda)} />
                  <StatBlock label="Total bobot" nilai={hasil.totalBobotKriteria.toFixed(4)} />
                </div>
                <div className="flex justify-end">
                  <Link to="/admin/penerima">
                    <Button varian="utama">Tetapkan penerima</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {hasil ? (
        <Card>
          <CardHeader judul="Ranking" keterangan="Urutan terbaik di atas, dengan rincian skor per kriteria" />
          <CardBody>
            <ol className="space-y-5">
              {hasil.ranking.map((baris) => (
                <li key={baris.pengajuanId} className="border-b border-slate-200 pb-4 last:border-0 last:pb-0 dark:border-slate-800">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-baseline gap-3">
                        <span className="text-lg font-semibold tabular-nums text-brand-700 dark:text-brand-300">
                          #{baris.ranking}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-900 dark:text-slate-50">
                            {baris.namaLengkap}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {formatRupiah(baris.penghasilanBulanan)} · {baris.jumlahTanggungan} tanggungan
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-baseline gap-4 text-sm tabular-nums">
                        <span className="text-slate-600 dark:text-slate-400">
                          WS {formatScore(baris.skorWs)} · WP {formatScore(baris.skorWp)}
                        </span>
                        <span className="text-base font-semibold text-slate-900 dark:text-slate-50">
                          {formatScore(baris.skorAkhir)}
                        </span>
                      </span>
                    </summary>
                    <RincianPerhitungan baris={baris} />
                  </details>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
};
