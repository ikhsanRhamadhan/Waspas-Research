import { formatTanggal } from '@spk-bansos/shared';
import { useState } from 'react';

import { StatusVerifikasiBadge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { DataTable, type Kolom } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState, PageHeader, StatBlock } from '../../components/ui/StateBlocks';
import { getApi } from '../../lib/api';
import { useData } from '../../lib/useData';
import type { LaporanHarian, RincianLaporan } from '../../types';

/** Tanggal lokal agar "hari ini" sesuai zona waktu petugas, bukan tanggal UTC server. */
const hariIni = (): string => {
  const sekarang = new Date();
  return new Date(sekarang.getTime() - sekarang.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const kolom: Kolom<RincianLaporan>[] = [
  { key: 'nama', header: 'Pemohon', render: (baris) => baris.namaLengkap },
  { key: 'nik', header: 'NIK', render: (baris) => <span className="tabular-nums">{baris.nik}</span> },
  { key: 'hasil', header: 'Hasil', render: (baris) => <StatusVerifikasiBadge status={baris.statusVerifikasi} /> },
  {
    key: 'catatan',
    header: 'Catatan',
    render: (baris) => (
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-300">{baris.catatanVerifikasi ?? '-'}</p>
    ),
  },
  { key: 'petugas', header: 'Petugas', render: (baris) => baris.namaPetugas },
  { key: 'waktu', header: 'Waktu', render: (baris) => formatTanggal(baris.tanggalVerifikasi) },
];

export const LaporanPage = () => {
  const [tanggal, setTanggal] = useState(hariIni());
  const laporan = useData(() => getApi<LaporanHarian>('/petugas/laporan/verifikasi', { tanggal }), [tanggal]);
  const data = laporan.data;

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Laporan verifikasi"
        keterangan="Rekap hasil pemeriksaan lapangan per tanggal, sebagai bahan pertanggungjawaban kepala desa."
        aksi={
          <div className="w-full sm:w-56">
            <Input
              label="Tanggal"
              type="date"
              value={tanggal}
              onChange={(event) => setTanggal(event.target.value)}
            />
          </div>
        }
      />

      {laporan.error ? (
        <Card>
          <ErrorState pesan={laporan.error.message} onUlangi={laporan.reload} />
        </Card>
      ) : laporan.sedangMemuat ? (
        <Card>
          <LoadingState />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader judul={`Rekap ${formatTanggal(data?.tanggal ?? tanggal)}`} />
            <CardBody>
              <div className="grid grid-cols-3 gap-6">
                <StatBlock label="Total diverifikasi" nilai={data?.totalDiverifikasi ?? 0} />
                <StatBlock label="Valid" nilai={data?.totalValid ?? 0} />
                <StatBlock
                  label="Tidak valid"
                  nilai={data?.totalTidakValid ?? 0}
                  penekan={(data?.totalTidakValid ?? 0) > 0}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader judul="Rincian pemeriksaan" />
            <CardBody>
              {data && data.rincian.length > 0 ? (
                <DataTable kolom={kolom} data={data.rincian} rowKey={(baris) => baris.pengajuanId} />
              ) : (
                <EmptyState
                  judul="Belum ada verifikasi"
                  keterangan={`Tidak ada hasil verifikasi pada ${formatTanggal(data?.tanggal ?? tanggal)}.`}
                />
              )}
            </CardBody>
          </Card>

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Rekap memakai tanggal verifikasi, bukan tanggal pengajuan. Admin dapat mengunduh laporan resmi
            beserta keputusan penerima dalam format PDF dari halaman penerima.
          </p>
        </>
      )}
    </div>
  );
};
