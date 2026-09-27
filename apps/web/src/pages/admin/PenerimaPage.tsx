import {
  KONDISI_RUMAH_LABEL,
  STATUS_KEPUTUSAN,
  STATUS_KEPUTUSAN_LABEL,
  formatRupiah,
  formatScore,
  type StatusKeputusan,
} from '@spk-bansos/shared';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { StatusKeputusanBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { DataTable, type Kolom } from '../../components/ui/DataTable';
import { Select, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { DataState, ErrorState, LoadingState, PageHeader, StatBlock } from '../../components/ui/StateBlocks';
import { getApi, postApi, unduhPdf as unduhPdfBerkas, type ApiError } from '../../lib/api';
import { useData } from '../../lib/useData';
import type { BarisPenerima } from '../../types';

interface Halaman<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface DraftKeputusan {
  pengajuanId: string;
  statusKeputusan: StatusKeputusan;
  catatanAdmin: string;
}

export const PenerimaPage = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [terpilih, setTerpilih] = useState<DraftKeputusan[]>([]);
  const [konfirmasiTerbuka, setKonfirmasiTerbuka] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [memuatPdf, setMemuatPdf] = useState(false);

  const daftar = useData(
    () =>
      getApi<Halaman<BarisPenerima>>('/admin/penerima', {
        page,
        limit: 10,
        ...(status ? { status } : {}),
      }),
    [page, status],
  );

  const unduhPdf = async () => {
    setMemuatPdf(true);
    try {
      const hariIni = new Date().toISOString().slice(0, 10);
      await unduhPdfBerkas('/admin/export-pdf', status ? { status } : {}, `laporan-keputusan-${hariIni}.pdf`);
      toast.success('Laporan PDF sedang diunduh');
    } catch (kesalahan) {
      toast.error((kesalahan as Error).message);
    } finally {
      setMemuatPdf(false);
    }
  };

  const putarStatus = (pengajuanId: string, statusBaru: StatusKeputusan) => {
    setTerpilih((sebelumnya) => {
      const ada = sebelumnya.find((item) => item.pengajuanId === pengajuanId);
      if (ada && ada.statusKeputusan === statusBaru) {
        return sebelumnya.filter((item) => item.pengajuanId !== pengajuanId);
      }
      return [
        ...sebelumnya.filter((item) => item.pengajuanId !== pengajuanId),
        { pengajuanId, statusKeputusan: statusBaru, catatanAdmin: ada?.catatanAdmin ?? '' },
      ];
    });
  };

  const ubahCatatan = (pengajuanId: string, catatanAdmin: string) => {
    setTerpilih((sebelumnya) =>
      sebelumnya.map((item) => (item.pengajuanId === pengajuanId ? { ...item, catatanAdmin } : item)),
    );
  };

  const kirim = async () => {
    setError(null);
    setMemuat(true);
    try {
      await postApi('/admin/penerima/tetapkan', {
        daftarPenerima: terpilih.map((item) => ({
          pengajuanId: item.pengajuanId,
          statusKeputusan: item.statusKeputusan,
          ...(item.catatanAdmin.trim() === '' ? {} : { catatanAdmin: item.catatanAdmin.trim() }),
        })),
      });
      toast.success(`Keputusan tersimpan untuk ${terpilih.length} pengajuan`);
      setTerpilih([]);
      setKonfirmasiTerbuka(false);
      daftar.reload();
    } catch (kesalahan) {
      const apiError = kesalahan as ApiError;
      setError(apiError);
      toast.error(apiError.message);
    } finally {
      setMemuat(false);
    }
  };

  const kolom: Kolom<BarisPenerima>[] = [
    {
      key: 'ranking',
      header: 'Peringkat',
      numerik: true,
      render: (baris) => <span className="font-semibold text-slate-900 dark:text-slate-50">#{baris.ranking}</span>,
    },
    {
      key: 'nama',
      header: 'Pemohon',
      render: (baris) => (
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-slate-50">{baris.namaLengkap}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatRupiah(baris.penghasilanBulanan)} · {baris.jumlahTanggungan} tanggungan ·{' '}
            {KONDISI_RUMAH_LABEL[baris.kondisiRumah] ?? baris.kondisiRumah}
          </p>
        </div>
      ),
    },
    {
      key: 'skor',
      header: 'Skor akhir',
      numerik: true,
      render: (baris) => formatScore(baris.skorAkhir),
    },
    {
      key: 'keputusan',
      header: 'Keputusan',
      render: (baris) => <StatusKeputusanBadge status={baris.statusKeputusan} />,
    },
    {
      key: 'aksi',
      header: 'Tetapkan',
      render: (baris) => {
        const draft = terpilih.find((item) => item.pengajuanId === baris.pengajuanId);
        return (
          <Select
            label={`Keputusan untuk ${baris.namaLengkap}`}
            sembunyikanLabel
            className="h-10 min-w-[9rem] text-sm"
            placeholder="Belum ditetapkan"
            opsi={STATUS_KEPUTUSAN.map((item) => ({ value: item, label: STATUS_KEPUTUSAN_LABEL[item] }))}
            value={draft?.statusKeputusan ?? ''}
            onChange={(event) => putarStatus(baris.pengajuanId, event.target.value as StatusKeputusan)}
          />
        );
      },
    },
  ];

  const totalDiterima = terpilih.filter((item) => item.statusKeputusan === 'diterima').length;
  const totalCadangan = terpilih.filter((item) => item.statusKeputusan === 'cadangan').length;
  const totalDitolak = terpilih.filter((item) => item.statusKeputusan === 'ditolak').length;

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Penerima bantuan"
        keterangan="Keputusan hanya bisa ditetapkan untuk pengajuan yang sudah dihitung WASPAS. Setiap pemohon menerima notifikasi setelah keputusan disimpan."
        aksi={
          <div className="flex flex-wrap gap-2">
            <Button memuat={memuatPdf} onClick={() => void unduhPdf()}>
              Unduh PDF
            </Button>
            <Button varian="utama" disabled={terpilih.length === 0} onClick={() => setKonfirmasiTerbuka(true)}>
              Tetapkan {terpilih.length > 0 ? `${terpilih.length} keputusan` : 'keputusan'}
            </Button>
          </div>
        }
      />

      {terpilih.length > 0 ? (
        <Card>
          <CardHeader judul="Keputusan yang belum disimpan" keterangan="Periksa ulang sebelum dikirim" />
          <CardBody>
            <ul className="space-y-3">
              {terpilih.map((item) => {
                const baris = daftar.data?.items.find((kandidat) => kandidat.pengajuanId === item.pengajuanId);
                return (
                  <li key={item.pengajuanId} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 truncate font-medium text-slate-900 dark:text-slate-50">
                        {baris ? `#${baris.ranking} ${baris.namaLengkap}` : item.pengajuanId}
                      </p>
                      <div className="flex items-center gap-2">
                        <StatusKeputusanBadge status={item.statusKeputusan} />
                        <Button ukuran="kecil" onClick={() => putarStatus(item.pengajuanId, item.statusKeputusan)}>
                          Batalkan
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      label="Catatan admin"
                      hint="Opsional. Muncul di daftar penerima dan dapat dibaca petugas."
                      value={item.catatanAdmin}
                      onChange={(event) => ubahCatatan(item.pengajuanId, event.target.value)}
                    />
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          judul="Daftar penerima"
          aksi={
            <Select
              label="Filter keputusan"
              className="h-11 w-full sm:w-48"
              placeholder="Semua"
              opsi={STATUS_KEPUTUSAN.map((item) => ({ value: item, label: STATUS_KEPUTUSAN_LABEL[item] }))}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            />
          }
        />
        {daftar.error ? (
          <ErrorState pesan={daftar.error.message} onUlangi={daftar.reload} />
        ) : daftar.sedangMemuat ? (
          <LoadingState />
        ) : (
          <DataState
            sedangMemuat={daftar.sedangMemuat}
            error={null}
            data={daftar.data?.items ?? null}
            judulKosong="Belum ada penerima"
            keteranganKosong="Jalankan perhitungan WASPAS lebih dulu agar daftar ini terisi."
            onUlangi={daftar.reload}
          >
            <DataTable kolom={kolom} data={daftar.data?.items ?? []} rowKey={(baris) => baris.pengajuanId} />
            {daftar.data ? (
              <Pagination
                page={daftar.data.meta.page}
                totalPages={daftar.data.meta.totalPages}
                total={daftar.data.meta.total}
                onGanti={setPage}
              />
            ) : null}
          </DataState>
        )}
      </Card>

      {daftar.data && daftar.data.items.length > 0 ? (
        <Card>
          <CardBody>
            <div className="grid grid-cols-3 gap-6">
              <StatBlock label="Diterima" nilai={totalDiterima} />
              <StatBlock label="Cadangan" nilai={totalCadangan} />
              <StatBlock label="Ditolak" nilai={totalDitolak} />
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Modal
        terbuka={konfirmasiTerbuka}
        judul="Konfirmasi penetapan"
        keterangan="Keputusan yang disimpan tidak dapat dibatalkan dari halaman ini."
        onTutup={() => setKonfirmasiTerbuka(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setKonfirmasiTerbuka(false)}>Kembali</Button>
            <Button varian="utama" memuat={memuat} onClick={() => void kirim()}>
              Simpan keputusan
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {error ? <ErrorState pesan={error.message} detail={error.errors} onUlangi={() => setError(null)} /> : null}
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {totalDiterima} diterima, {totalCadangan} cadangan, {totalDitolak} ditolak. Notifikasi akan
            dikirim ke masing-masing pemohon.
          </p>
          <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {terpilih.map((item) => {
              const baris = daftar.data?.items.find((kandidat) => kandidat.pengajuanId === item.pengajuanId);
              return (
                <li key={item.pengajuanId} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                    {baris ? `${baris.namaLengkap}` : item.pengajuanId}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {STATUS_KEPUTUSAN_LABEL[item.statusKeputusan]}
                    {item.catatanAdmin.trim() === '' ? '' : ' · ada catatan'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Modal>
    </div>
  );
};
