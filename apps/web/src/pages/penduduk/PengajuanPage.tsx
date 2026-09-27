import {
  KONDISI_RUMAH_LABEL,
  PARAM_FOKUS_PENGAJUAN,
  STATUS_PENGAJUAN,
  STATUS_PENGAJUAN_BISA_EDIT,
  STATUS_PENGAJUAN_LABEL,
  formatRupiah,
  formatTanggal,
} from '@spk-bansos/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { StatusPengajuanBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { DataTable, type Kolom } from '../../components/ui/DataTable';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { DataState, PageHeader } from '../../components/ui/StateBlocks';
import { getApi, postApi, putApi, type ApiError } from '../../lib/api';
import { useData } from '../../lib/useData';
import type { DetailPengajuan, RingkasanPengajuan } from '../../types';

interface Halaman<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const pengajuanSchema = z.object({
  penghasilanBulanan: z.coerce
    .number({ invalid_type_error: 'Penghasilan harus berupa angka' })
    .int('Penghasilan harus bilangan bulat')
    .min(0, 'Penghasilan tidak boleh negatif'),
  jumlahTanggungan: z.coerce
    .number({ invalid_type_error: 'Jumlah tanggungan harus berupa angka' })
    .int('Jumlah tanggungan harus bilangan bulat')
    .min(0, 'Jumlah tanggungan tidak boleh negatif')
    .max(50, 'Jumlah tanggungan maksimal 50'),
  kondisiRumah: z.enum(['layak', 'tidak_layak']),
  catatanPenduduk: z.string().trim().max(1000),
});

type PengajuanInput = z.infer<typeof pengajuanSchema>;

const OPSI_RUMAH = [
  { value: 'layak', label: 'Layak huni' },
  { value: 'tidak_layak', label: 'Tidak layak huni' },
];

const FormulirPengajuan = ({ awal, onSelesai }: { awal?: DetailPengajuan; onSelesai: () => void }) => {
  const [error, setError] = useState<ApiError | null>(null);
  const modeUbah = Boolean(awal);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PengajuanInput>({
    resolver: zodResolver(pengajuanSchema),
    values: awal
      ? {
          penghasilanBulanan: awal.penghasilanBulanan,
          jumlahTanggungan: awal.jumlahTanggungan,
          kondisiRumah: awal.kondisiRumah === 'tidak_layak' ? 'tidak_layak' : 'layak',
          catatanPenduduk: awal.catatanPenduduk ?? '',
        }
      : { penghasilanBulanan: 0, jumlahTanggungan: 0, kondisiRumah: 'layak', catatanPenduduk: '' },
  });

  const onSubmit = handleSubmit(async (input) => {
    setError(null);
    try {
      if (modeUbah && awal) {
        await putApi(`/penduduk/pengajuan/${awal.id}`, input);
        toast.success('Pengajuan diperbarui');
      } else {
        await postApi('/penduduk/pengajuan', input);
        toast.success('Pengajuan terkirim dan menunggu verifikasi petugas');
      }
      onSelesai();
    } catch (kesalahan) {
      const apiError = kesalahan as ApiError;
      setError(apiError);
      toast.error(apiError.message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error?.errors ? (
        <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
          {error.message}
        </p>
      ) : null}

      <Input
        label="Penghasilan bulanan"
        type="number"
        inputMode="numeric"
        min={0}
        step={1000}
        hint="Dalam rupiah per bulan, dari seluruh sumber penghasilan"
        required
        {...register('penghasilanBulanan')}
        error={errors.penghasilanBulanan?.message}
      />
      <Input
        label="Jumlah tanggungan"
        type="number"
        inputMode="numeric"
        min={0}
        max={50}
        hint="Anak, pasangan, orang tua, atau anggota keluarga lain yang ditanggung"
        required
        {...register('jumlahTanggungan')}
        error={errors.jumlahTanggungan?.message}
      />
      <Select
        label="Kondisi rumah"
        opsi={OPSI_RUMAH}
        required
        {...register('kondisiRumah')}
        error={errors.kondisiRumah?.message}
      />
      <Textarea
        label="Catatan untuk petugas"
        hint="Opsional. Sebutkan kondisi khusus yang perlu diperiksa petugas."
        {...register('catatanPenduduk')}
        error={errors.catatanPenduduk?.message}
      />

      <div className="flex justify-end pt-2">
        <Button type="submit" varian="utama" memuat={isSubmitting}>
          {modeUbah ? 'Simpan perubahan' : 'Kirim pengajuan'}
        </Button>
      </div>
    </form>
  );
};

export const PengajuanPage = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [idDiubah, setIdDiubah] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const fokus = searchParams.get(PARAM_FOKUS_PENGAJUAN);

  // Notifikasi keputusan dan verifikasi menunjuk pengajuan tertentu lewat ?fokus=.
  // Rinciannya diambil langsung per id, jadi pengajuan itu tetap terbuka walaupun
  // berada di halaman lain atau tersaring filter status.
  useEffect(() => {
    if (!fokus) return;
    setIdDiubah(fokus);
    setFormTerbuka(true);
  }, [fokus]);

  const daftar = useData(
    () =>
      getApi<Halaman<RingkasanPengajuan>>('/penduduk/pengajuan', {
        page,
        limit: 10,
        ...(status ? { status } : {}),
      }),
    [page, status],
  );

  const detail = useData(
    () => (idDiubah ? getApi<DetailPengajuan>(`/penduduk/pengajuan/${idDiubah}`) : Promise.resolve(null)),
    [idDiubah],
  );

  const tutupForm = () => {
    setFormTerbuka(false);
    setIdDiubah(null);
    // Param dibersihkan dengan replace supaya tidak masuk riwayat browser. Kalau
    // dibiarkan, memuat ulang halaman akan membuka lagi form yang baru saja ditutup.
    setSearchParams(
      (params) => {
        params.delete(PARAM_FOKUS_PENGAJUAN);
        return params;
      },
      { replace: true },
    );
  };

  const kolom: Kolom<RingkasanPengajuan>[] = [
    { key: 'tanggal', header: 'Diajukan', render: (baris) => formatTanggal(baris.tanggalPengajuan) },
    {
      key: 'penghasilan',
      header: 'Penghasilan',
      numerik: true,
      render: (baris) => formatRupiah(baris.penghasilanBulanan),
    },
    { key: 'tanggungan', header: 'Tanggungan', numerik: true, render: (baris) => `${baris.jumlahTanggungan} orang` },
    {
      key: 'rumah',
      header: 'Kondisi rumah',
      render: (baris) => KONDISI_RUMAH_LABEL[baris.kondisiRumah] ?? baris.kondisiRumah,
    },
    {
      key: 'status',
      header: 'Status',
      render: (baris) => <StatusPengajuanBadge status={baris.statusPengajuan} />,
    },
  ];

  const barisAda = (daftar.data?.items.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Pengajuan bantuan"
        keterangan="Klik baris untuk melihat rincian dan mengubah pengajuan yang masih bisa diedit."
        aksi={
          <Button
            varian="utama"
            onClick={() => {
              setIdDiubah(null);
              setFormTerbuka(true);
            }}
          >
            Buat pengajuan
          </Button>
        }
      />

      <Card>
        <CardHeader
          judul="Riwayat pengajuan"
          aksi={
            <Select
              label="Filter status"
              className="h-11 w-full sm:w-56"
              placeholder="Semua status"
              opsi={STATUS_PENGAJUAN.map((item) => ({ value: item, label: STATUS_PENGAJUAN_LABEL[item] }))}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            />
          }
        />
        <DataState
          sedangMemuat={daftar.sedangMemuat}
          error={daftar.error}
          data={daftar.data?.items ?? null}
          judulKosong="Belum ada pengajuan"
          keteranganKosong="Kirim pengajuan pertama Anda untuk memulai proses verifikasi."
          aksiKosong={
            <Button
              varian="utama"
              onClick={() => {
                setIdDiubah(null);
                setFormTerbuka(true);
              }}
            >
              Buat pengajuan
            </Button>
          }
          onUlangi={daftar.reload}
        >
          <DataTable kolom={kolom} data={daftar.data?.items ?? []} rowKey={(baris) => baris.id} onRowClick={(baris) => {
            setIdDiubah(baris.id);
            setFormTerbuka(true);
          }} />
          {daftar.data ? (
            <Pagination
              page={daftar.data.meta.page}
              totalPages={daftar.data.meta.totalPages}
              total={daftar.data.meta.total}
              onGanti={setPage}
            />
          ) : null}
        </DataState>
      </Card>

      {barisAda ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Pengajuan berstatus {STATUS_PENGAJUAN_BISA_EDIT.map((item) => STATUS_PENGAJUAN_LABEL[item]).join(', ')}{' '}
          masih dapat diubah. Status lain sudah dikunci petugas atau admin.
        </p>
      ) : null}

      <Modal
        terbuka={formTerbuka}
        judul={idDiubah ? 'Rincian pengajuan' : 'Buat pengajuan baru'}
        keterangan={
          idDiubah
            ? 'Perubahan hanya bisa dilakukan selama pengajuan belum disentuh petugas.'
            : 'Isi data sesuai kondisi nyata. Petugas akan memverifikasi berdasarkan dokumen.'
        }
        onTutup={tutupForm}
        footer={
          <Button onClick={tutupForm}>
            Tutup tanpa menyimpan
          </Button>
        }
      >
        {idDiubah ? (
          detail.error ? (
            <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
              {detail.error.message}
            </p>
          ) : !detail.data ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Memuat data pengajuan</p>
          ) : detail.data.statusPengajuan === 'diterima' ||
            detail.data.statusPengajuan === 'data_terverifikasi' ||
            detail.data.statusPengajuan === 'diproses' ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Pengajuan ini sudah {STATUS_PENGAJUAN_LABEL[detail.data.statusPengajuan].toLowerCase()} sehingga
                data tidak dapat diubah. Data yang tercatat:
              </p>
              <dl>
                <div className="data-row">
                  <dt>Penghasilan bulanan</dt>
                  <dd>{formatRupiah(detail.data.penghasilanBulanan)}</dd>
                </div>
                <div className="data-row">
                  <dt>Jumlah tanggungan</dt>
                  <dd>{detail.data.jumlahTanggungan} orang</dd>
                </div>
                <div className="data-row">
                  <dt>Kondisi rumah</dt>
                  <dd>{KONDISI_RUMAH_LABEL[detail.data.kondisiRumah] ?? detail.data.kondisiRumah}</dd>
                </div>
                {detail.data.catatanPenduduk ? (
                  <div className="data-row">
                    <dt>Catatan Anda</dt>
                    <dd className="font-normal">{detail.data.catatanPenduduk}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : (
            <FormulirPengajuan
              awal={detail.data}
              onSelesai={() => {
                tutupForm();
                daftar.reload();
              }}
            />
          )
        ) : (
          <FormulirPengajuan
            onSelesai={() => {
              tutupForm();
              daftar.reload();
            }}
          />
        )}
      </Modal>
    </div>
  );
};
