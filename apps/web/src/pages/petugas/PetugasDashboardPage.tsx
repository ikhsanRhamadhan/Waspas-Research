import {
  KONDISI_RUMAH_LABEL,
  STATUS_PENGAJUAN,
  STATUS_PENGAJUAN_LABEL,
  STATUS_VERIFIKASI_LABEL,
  formatRupiah,
  formatTanggal,
} from '@spk-bansos/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { StatusKeputusanBadge, StatusPengajuanBadge, StatusVerifikasiBadge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { DataTable, type Kolom } from '../../components/ui/DataTable';
import { Select } from '../../components/ui/Field';
import { Pagination } from '../../components/ui/Pagination';
import { DataState, PageHeader, StatBlock } from '../../components/ui/StateBlocks';
import { getApi } from '../../lib/api';
import { useData } from '../../lib/useData';
import type { BarisVerifikasi, StatistikPetugas } from '../../types';

interface Halaman<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const PetugasDashboardPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('menunggu_verifikasi');
  const [hasilVerifikasi, setHasilVerifikasi] = useState('');

  const statistik = useData(() => getApi<StatistikPetugas>('/petugas/dashboard'));
  const antrean = useData(
    () =>
      getApi<Halaman<BarisVerifikasi>>('/petugas/verifikasi', {
        page,
        limit: 10,
        ...(status ? { status } : {}),
        ...(hasilVerifikasi ? { hasilVerifikasi } : {}),
      }),
    [page, status, hasilVerifikasi],
  );

  const kolom: Kolom<BarisVerifikasi>[] = [
    {
      key: 'nama',
      header: 'Pemohon',
      render: (baris) => (
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-slate-50">{baris.namaLengkap}</p>
          <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{baris.nik}</p>
        </div>
      ),
    },
    {
      key: 'tanggal',
      header: 'Masuk',
      render: (baris) => formatTanggal(baris.tanggalPengajuan),
    },
    {
      key: 'penghasilan',
      header: 'Penghasilan',
      numerik: true,
      render: (baris) => formatRupiah(baris.penghasilanBulanan),
    },
    {
      key: 'tanggungan',
      header: 'Tanggungan',
      numerik: true,
      render: (baris) => baris.jumlahTanggungan,
    },
    {
      key: 'rumah',
      header: 'Rumah',
      render: (baris) => KONDISI_RUMAH_LABEL[baris.kondisiRumah] ?? baris.kondisiRumah,
    },
    { key: 'dokumen', header: 'Dokumen', numerik: true, render: (baris) => baris.jumlahDokumen },
    {
      key: 'status',
      header: 'Status',
      render: (baris) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPengajuanBadge status={baris.statusPengajuan} />
          <StatusVerifikasiBadge status={baris.statusVerifikasi} />
        </div>
      ),
    },
    {
      key: 'keputusan',
      header: 'Keputusan',
      render: (baris) => <StatusKeputusanBadge status={baris.keputusan} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Antrean verifikasi"
        keterangan="Periksa data dan dokumen pemohon, lalu tetapkan hasil verifikasi lapangan."
      />

      <Card>
        <CardBody>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-5">
            <StatBlock
              label="Menunggu"
              nilai={statistik.data?.totalPending ?? '-'}
              penekan={(statistik.data?.totalPending ?? 0) > 0}
              catatan="Perlu diperiksa"
            />
            <StatBlock label="Diverifikasi hari ini" nilai={statistik.data?.totalDiverifikasiHariIni ?? '-'} />
            <StatBlock label="Ditolak" nilai={statistik.data?.totalDitolak ?? '-'} />
            <StatBlock label="Bulan ini" nilai={statistik.data?.totalBulanIni ?? '-'} />
            <StatBlock
              label="Rata-rata waktu"
              nilai={
                statistik.data?.rataRataWaktuVerifikasiJam !== null && statistik.data !== null
                  ? `${statistik.data.rataRataWaktuVerifikasiJam} jam`
                  : '-'
              }
              catatan="Antara kirim dan verifikasi"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          judul="Daftar pengajuan"
          aksi={
            <div className="flex flex-wrap gap-2">
              <Select
                label="Status pengajuan"
                className="h-11 w-full sm:w-48"
                opsi={STATUS_PENGAJUAN.map((item) => ({ value: item, label: STATUS_PENGAJUAN_LABEL[item] }))}
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              />
              <Select
                label="Hasil verifikasi"
                className="h-11 w-full sm:w-44"
                placeholder="Semua hasil"
                opsi={[
                  { value: 'valid', label: STATUS_VERIFIKASI_LABEL.valid },
                  { value: 'tidak_valid', label: STATUS_VERIFIKASI_LABEL.tidak_valid },
                ]}
                value={hasilVerifikasi}
                onChange={(event) => {
                  setHasilVerifikasi(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          }
        />
        <DataState
          sedangMemuat={antrean.sedangMemuat}
          error={antrean.error}
          data={antrean.data?.items ?? null}
          judulKosong="Tidak ada pengajuan pada filter ini"
          keteranganKosong="Coba pilih status lain atau kosongkan filter hasil verifikasi."
          onUlangi={antrean.reload}
        >
          <DataTable
            kolom={kolom}
            data={antrean.data?.items ?? []}
            rowKey={(baris) => baris.id}
            onRowClick={(baris) => navigate(`/petugas/verifikasi/${baris.id}`)}
          />
          {antrean.data ? (
            <Pagination
              page={antrean.data.meta.page}
              totalPages={antrean.data.meta.totalPages}
              total={antrean.data.meta.total}
              onGanti={setPage}
            />
          ) : null}
        </DataState>
      </Card>
    </div>
  );
};
