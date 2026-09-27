import { formatScore, formatTanggal } from '@spk-bansos/shared';
import { Link } from 'react-router-dom';

import { Card } from '../components/ui/Card';
import { DataState, StatBlock } from '../components/ui/StateBlocks';
import { getApi } from '../lib/api';
import { tujuanSetelahMasuk, useAuthStore } from '../lib/auth';
import { useData } from '../lib/useData';

interface StatistikPublik {
  totalPengajuan: number;
  totalLolosVerifikasi: number;
  totalDiterima: number;
  tanggalTerakhirPerhitungan: string | null;
}

interface PenerimaPublik {
  namaLengkap: string;
  nik: string;
  desa: string;
  alamat: string;
  skorWaspas: number;
  ranking: number;
}

interface MetodeWaspas {
  namaMetode: string;
  namaLengkap: string;
  ringkasan: string;
  formula: { ws: string; wp: string; akhir: string };
  lambdaDefault: number;
}

const useStatistik = () => useData(() => getApi<StatistikPublik>('/public/statistik'));
const usePenerima = () => useData(() => getApi<PenerimaPublik[]>('/public/penerima'));
const useMetode = () => useData(() => getApi<MetodeWaspas>('/public/metode'));

export const LandingPage = () => {
  const user = useAuthStore((state) => state.user);
  const statistik = useStatistik();
  const penerima = usePenerima();
  const metode = useMetode();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <span className="text-[15px] font-bold tracking-tight text-brand-800 dark:text-brand-200">SPK Bansos</span>
          <nav className="flex items-center gap-1">
            <a
              href="#metode"
              className="hidden min-h-11 items-center px-3 text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline-flex dark:text-slate-300 dark:hover:text-slate-50"
            >
              Metode
            </a>
            <a
              href="#penerima"
              className="hidden min-h-11 items-center px-3 text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline-flex dark:text-slate-300 dark:hover:text-slate-50"
            >
              Daftar penerima
            </a>
            {user ? (
              <Link
                to={tujuanSetelahMasuk(user.role)}
                className="inline-flex min-h-11 items-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Buka portal
              </Link>
            ) : (
              <>
                <Link
                  to="/masuk"
                  className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Masuk
                </Link>
                <Link
                  to="/daftar"
                  className="inline-flex min-h-11 items-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Daftar sebagai warga
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="border-b border-slate-200 py-10 dark:border-slate-800 sm:py-14">
          <p className="label-section">Pengajuan bantuan sosial desa</p>
          <h1 className="mt-3 max-w-2xl text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
            Penetapan penerima bantuan dengan skor yang bisa dijelaskan ke warga
          </h1>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
            Setiap pengajuan diverifikasi petugas desa berdasarkan dokumen, lalu dinilai dengan
            metode WASPAS. Bobot tiap kriteria ditetapkan kepala desa dan dapat dilihat siapa pun,
            sehingga urutan penerima bukan hasil tebakan.
          </p>
        </section>

        <section aria-label="Statistik pengajuan" className="border-b border-slate-200 py-8 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <StatBlock label="Pengajuan masuk" nilai={statistik.data?.totalPengajuan ?? '-'} />
            <StatBlock label="Lolos verifikasi" nilai={statistik.data?.totalLolosVerifikasi ?? '-'} />
            <StatBlock
              label="Penerima ditetapkan"
              nilai={statistik.data?.totalDiterima ?? '-'}
              penekan
            />
            <div>
              <p className="label-section">Perhitungan terakhir</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                {formatTanggal(statistik.data?.tanggalTerakhirPerhitungan ?? null)}
              </p>
            </div>
          </div>
        </section>

        <section id="metode" className="scroll-mt-20 border-b border-slate-200 py-10 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Metode penilaian</h2>
          <DataState
            sedangMemuat={metode.sedangMemuat}
            error={metode.error}
            data={metode.data ? [metode.data] : null}
            judulKosong="Penjelasan metode belum tersedia"
            onUlangi={metode.reload}
          >
          {metode.data ? (
            <div className="mt-4 max-w-prose">
              <p className="font-semibold text-slate-900 dark:text-slate-50">
                {metode.data.namaMetode}: {metode.data.namaLengkap}
              </p>
              <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">{metode.data.ringkasan}</p>
              <dl className="mt-4 space-y-2">
                {[metode.data.formula.ws, metode.data.formula.wp, metode.data.formula.akhir].map((baris) => (
                  <div key={baris} className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900">
                    <dd className="font-mono text-sm text-slate-800 dark:text-slate-200">{baris}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Nilai lambda bawaan: {formatScore(metode.data.lambdaDefault)}. Kepala desa dapat
                mengubahnya setiap kali menjalankan perhitungan.
              </p>
            </div>
          ) : null}
          </DataState>
        </section>

        <section id="penerima" className="scroll-mt-20 py-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Daftar penerima</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            NIK dan alamat disensor. Data ini diperbarui setiap kali kepala desa menjalankan perhitungan.
          </p>
          <Card className="mt-4 overflow-hidden">
            <DataState
              sedangMemuat={penerima.sedangMemuat}
              error={penerima.error}
              data={penerima.data ?? null}
              judulKosong="Belum ada penerima yang ditetapkan"
              keteranganKosong="Daftar akan muncul setelah kepala desa menetapkan keputusan penerima."
              onUlangi={penerima.reload}
            >
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {(penerima.data ?? []).map((orang) => (
                  <li key={orang.nik} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-50">
                        <span className="mr-2 tabular-nums text-slate-500 dark:text-slate-400">#{orang.ranking}</span>
                        {orang.namaLengkap}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                        {orang.nik} <span className="mx-1 text-slate-300 dark:text-slate-600">|</span> {orang.alamat}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-brand-800 dark:text-brand-200">
                      Skor {formatScore(orang.skorWaspas)}
                    </p>
                  </li>
                ))}
              </ul>
            </DataState>
          </Card>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 dark:border-slate-800">
        <div className="mx-auto max-w-5xl px-4 text-sm text-slate-600 dark:text-slate-400">
          <p>Sistem Pendukung Keputusan Penerimaan Bantuan Sosial Desa</p>
        </div>
      </footer>
    </div>
  );
};

/** Dipakai ulang oleh halaman auth supaya header tidak ditulis dua kali. */
export const AuthShell = ({ judul, children }: { judul: string; children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
        <Link to="/" className="text-[15px] font-bold tracking-tight text-brand-800 dark:text-brand-200">
          SPK Bansos
        </Link>
        <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300">
          Halaman publik
        </Link>
      </div>
    </header>
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{judul}</h1>
      {children}
    </main>
  </div>
);
