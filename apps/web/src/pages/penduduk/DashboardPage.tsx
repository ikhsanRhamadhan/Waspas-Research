import { formatRupiah, formatScore, formatTanggalWaktu, KONDISI_RUMAH_LABEL } from '@spk-bansos/shared';
import { Link } from 'react-router-dom';

import { StatusKeputusanBadge, StatusPengajuanBadge, StatusVerifikasiBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState, ErrorState, LoadingState, PageHeader, StatBlock } from '../../components/ui/StateBlocks';
import { getApi } from '../../lib/api';
import { useData } from '../../lib/useData';
import type { DashboardWarga, DetailPengajuan } from '../../types';

/**
 * Timeline adalah satu-satunya tempat di aplikasi ini yang memakai komposisi tidak
 * seragam: dua layar lain (dashboard, daftar pengajuan) sengaja tetap grid agar
 * mudah dibandingkan. Di sini yang penting adalah urutan, bukan perbandingan kolom.
 */
const Timeline = ({ items }: { items: DashboardWarga['ringkasan']['timeline'] }) => (
  <ol className="relative space-y-5 border-l border-slate-200 pl-6 dark:border-slate-800">
    {items.map((item) => (
      <li key={item.judul} className="relative">
        <span
          aria-hidden="true"
          className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-900 ${
            item.selesai ? 'bg-brand-600' : 'border-2 border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
          }`}
        />
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{item.judul}</p>
        {item.keterangan ? (
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{item.keterangan}</p>
        ) : null}
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatTanggalWaktu(item.waktu)}</p>
      </li>
    ))}
  </ol>
);

const RingkasanTerakhir = ({ detail }: { detail: DetailPengajuan }) => (
  <Card>
    <CardHeader
      judul="Rincian pengajuan terakhir"
      keterangan={`Diajukan ${formatTanggalWaktu(detail.tanggalPengajuan)}`}
      aksi={
        <Link to="/pengajuan">
          <Button ukuran="kecil">Kelola pengajuan</Button>
        </Link>
      }
    />
    <CardBody>
      <dl>
        <div className="data-row">
          <dt>Penghasilan bulanan</dt>
          <dd>{formatRupiah(detail.penghasilanBulanan)}</dd>
        </div>
        <div className="data-row">
          <dt>Jumlah tanggungan</dt>
          <dd>{detail.jumlahTanggungan} orang</dd>
        </div>
        <div className="data-row">
          <dt>Kondisi rumah</dt>
          <dd>{KONDISI_RUMAH_LABEL[detail.kondisiRumah] ?? detail.kondisiRumah}</dd>
        </div>
        <div className="data-row">
          <dt>Status pengajuan</dt>
          <dd>
            <StatusPengajuanBadge status={detail.statusPengajuan} />
          </dd>
        </div>
        <div className="data-row">
          <dt>Hasil verifikasi</dt>
          <dd>
            <StatusVerifikasiBadge status={detail.verifikasi?.statusVerifikasi ?? null} />
          </dd>
        </div>
        {detail.waspas ? (
          <div className="data-row">
            <dt>Skor WASPAS</dt>
            <dd>{formatScore(detail.waspas.skorAkhir)}</dd>
          </div>
        ) : null}
        <div className="data-row">
          <dt>Keputusan</dt>
          <dd>
            <StatusKeputusanBadge status={detail.hasil?.statusKeputusan ?? null} />
          </dd>
        </div>
      </dl>
    </CardBody>
  </Card>
);

export const DashboardPage = () => {
  const dashboard = useData(() => getApi<DashboardWarga>('/penduduk/dashboard'));
  const detail = useData(
    () =>
      dashboard.data?.pengajuanTerakhir
        ? getApi<DetailPengajuan>(`/penduduk/pengajuan/${dashboard.data.pengajuanTerakhir.id}`)
        : Promise.resolve(null),
    [dashboard.data?.pengajuanTerakhir?.id],
  );

  const ringkasan = dashboard.data?.ringkasan;

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Status bantuan Anda"
        keterangan="Ikuti posisi pengajuan Anda dari pengiriman sampai keputusan kepala desa."
        aksi={
          <Link to="/pengajuan">
            <Button varian="utama">Buat pengajuan</Button>
          </Link>
        }
      />

      {dashboard.error ? (
        <Card>
          <ErrorState pesan={dashboard.error.message} onUlangi={dashboard.reload} />
        </Card>
      ) : dashboard.sedangMemuat ? (
        <Card>
          <LoadingState />
        </Card>
      ) : (
        <>
          <Card>
            <CardBody>
              <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                <StatBlock
                  label="Status pengajuan"
                  nilai={ringkasan?.pengajuanAktif ? 'Aktif' : 'Belum ada'}
                  catatan={ringkasan?.pengajuanAktif ?? 'Kirim pengajuan pertama Anda'}
                />
                <StatBlock label="Diterima" nilai={dashboard.data?.totalDiterima ?? 0} />
                <StatBlock
                  label="Menunggu verifikasi"
                  nilai={dashboard.data?.totalMenunggu ?? 0}
                  penekan={(dashboard.data?.totalMenunggu ?? 0) > 0}
                />
                <StatBlock
                  label="Peringkat"
                  nilai={ringkasan?.ranking ? `#${ringkasan.ranking}` : '-'}
                  catatan={ringkasan?.totalTerperiksa ? `dari ${ringkasan.totalTerperiksa} pemohon` : undefined}
                />
              </div>
            </CardBody>
          </Card>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader judul="Tahapan pengajuan" keterangan="Urutan proses dari kirim sampai keputusan" />
              <CardBody>
                {ringkasan && ringkasan.totalPengajuan > 0 ? (
                  <Timeline items={ringkasan.timeline} />
                ) : (
                  <EmptyState
                    judul="Belum ada pengajuan"
                    keterangan="Kirim pengajuan bantuan agar petugas desa dapat memverifikasi data Anda."
                    aksi={
                      <Link to="/pengajuan">
                        <Button varian="utama">Buat pengajuan</Button>
                      </Link>
                    }
                  />
                )}
              </CardBody>
            </Card>

            <div className="lg:col-span-2">
              {detail.data ? (
                <RingkasanTerakhir detail={detail.data} />
              ) : dashboard.data?.pengajuanTerakhir ? (
                <Card>
                  <LoadingState />
                </Card>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
