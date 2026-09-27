import {
  JENIS_DOKUMEN,
  JENIS_DOKUMEN_LABEL,
  KONDISI_RUMAH_LABEL,
  STATUS_PENGAJUAN_LABEL,
  formatBytes,
  formatRupiah,
  formatTanggal,
  formatTanggalWaktu,
} from '@spk-bansos/shared';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';

import { StatusKeputusanBadge, StatusPengajuanBadge, StatusVerifikasiBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Select, Textarea } from '../../components/ui/Field';
import { ErrorState, LoadingState, PageHeader } from '../../components/ui/StateBlocks';
import { getApi, postApi, putApi, unduhBerkas, type ApiError } from '../../lib/api';
import { useData } from '../../lib/useData';
import type { DetailVerifikasi, DokumenVerifikasi } from '../../types';

const PanelDokumen = ({
  pengajuanId,
  dokumen,
  onPerubahan,
}: {
  pengajuanId: string;
  dokumen: DokumenVerifikasi[];
  onPerubahan: () => void;
}) => {
  const [error, setError] = useState<ApiError | null>(null);
  const [sedangUnduh, setSedangUnduh] = useState<string | null>(null);

  const unduh = async (item: DokumenVerifikasi) => {
    setError(null);
    setSedangUnduh(item.id);
    try {
      await unduhBerkas(`/petugas/dokumen/${item.id}/download`, item.namaFile);
    } catch (kesalahan) {
      const apiError = kesalahan as ApiError;
      setError(apiError);
      toast.error(apiError.message);
    } finally {
      setSedangUnduh(null);
    }
  };

  return (
    <div className="space-y-4">
      {error ? <ErrorState pesan={error.message} onUlangi={() => setError(null)} /> : null}

      {dokumen.length === 0 ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          Belum ada dokumen terlampir. Bila pemohon tidak dapat mengunggah, verifikasi tetap dapat
          dilanjutkan asalkan alasannya dicatat pada catatan verifikasi.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {dokumen.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900 dark:text-slate-50">{item.namaFile}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {JENIS_DOKUMEN_LABEL[item.jenis]} · {formatBytes(item.ukuranBytes)} · diunggah{' '}
                  {formatTanggal(item.diunggahPada)}
                </p>
              </div>
              <Button
                ukuran="kecil"
                memuat={sedangUnduh === item.id}
                disabled={sedangUnduh !== null}
                onClick={() => void unduh(item)}
              >
                Unduh
              </Button>
            </li>
          ))}
        </ul>
      )}

      <FormUnggah pengajuanId={pengajuanId} onSelesai={onPerubahan} />
    </div>
  );
};

const FormUnggah = ({ pengajuanId, onSelesai }: { pengajuanId: string; onSelesai: () => void }) => {
  const [jenis, setJenis] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [memuat, setMemuat] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const berkas = new FormData(form).get('dokumen');

    if (!(berkas instanceof File) || berkas.size === 0) {
      toast.error('Pilih berkas terlebih dahulu');
      return;
    }

    const data = new FormData();
    data.append('jenis', jenis);
    data.append('dokumen', berkas);

    setError(null);
    setMemuat(true);
    try {
      await postApi(`/petugas/dokumen/${pengajuanId}`, data);
      toast.success('Dokumen tersimpan');
      form.reset();
      setJenis('');
      onSelesai();
    } catch (kesalahan) {
      const apiError = kesalahan as ApiError;
      setError(apiError);
      toast.error(apiError.message);
    } finally {
      setMemuat(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
      <p className="label-section">Unggah dokumen tambahan</p>
      {error ? <ErrorState pesan={error.message} detail={error.errors} onUlangi={() => setError(null)} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Jenis dokumen"
          required
          placeholder="Pilih jenis"
          opsi={JENIS_DOKUMEN.map((item) => ({ value: item, label: JENIS_DOKUMEN_LABEL[item] }))}
          value={jenis}
          onChange={(event) => setJenis(event.target.value)}
        />
        <div>
          <label className="label-section" htmlFor="berkas-dokumen">
            Berkas <span aria-hidden="true">*</span>
          </label>
          <input
            id="berkas-dokumen"
            name="dokumen"
            type="file"
            required
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">jpg, png, webp, atau pdf. Maksimal 5 MB.</p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" memuat={memuat} disabled={jenis === ''}>
          Unggah dokumen
        </Button>
      </div>
    </form>
  );
};

const FormVerifikasi = ({ pengajuanId, onSelesai }: { pengajuanId: string; onSelesai: () => void }) => {
  const [statusVerifikasi, setStatusVerifikasi] = useState('');
  const [catatan, setCatatan] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [memuat, setMemuat] = useState(false);

  const catatanMinimalTercapai = catatan.trim().length === 0 || catatan.trim().length >= 10;
  const bolehSimpan =
    statusVerifikasi !== '' && catatanMinimalTercapai && (statusVerifikasi === 'valid' || catatan.trim() !== '');

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMemuat(true);
    try {
      await putApi(`/petugas/verifikasi/${pengajuanId}`, {
        statusVerifikasi,
        ...(catatan.trim() === '' ? {} : { catatanVerifikasi: catatan.trim() }),
      });
      toast.success('Hasil verifikasi tersimpan');
      onSelesai();
    } catch (kesalahan) {
      const apiError = kesalahan as ApiError;
      setError(apiError);
      toast.error(apiError.message);
    } finally {
      setMemuat(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <ErrorState pesan={error.message} detail={error.errors} onUlangi={() => setError(null)} /> : null}

      <Select
        label="Hasil verifikasi lapangan"
        required
        placeholder="Pilih hasil"
        hint="Status pengajuan dikunci otomatis setelah hasil disimpan."
        opsi={[
          { value: 'valid', label: 'Valid, data sesuai dokumen' },
          { value: 'tidak_valid', label: 'Tidak valid, tidak memenuhi syarat' },
        ]}
        value={statusVerifikasi}
        onChange={(event) => setStatusVerifikasi(event.target.value)}
      />
      <Textarea
        label="Catatan verifikasi"
        required={statusVerifikasi === 'tidak_valid'}
        hint="Minimal 10 karakter. Wajib diisi saat hasil tidak valid."
        value={catatan}
        onChange={(event) => setCatatan(event.target.value)}
        error={
          catatan.trim() !== '' && !catatanMinimalTercapai
            ? 'Catatan minimal 10 karakter'
            : statusVerifikasi === 'tidak_valid' && catatan.trim() === ''
              ? 'Catatan wajib diisi saat hasil tidak valid'
              : undefined
        }
      />
      <div className="flex justify-end">
        <Button type="submit" varian="utama" memuat={memuat} disabled={!bolehSimpan}>
          Simpan hasil verifikasi
        </Button>
      </div>
    </form>
  );
};

export const VerifikasiDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const detail = useData(() => getApi<DetailVerifikasi>(`/petugas/verifikasi/${id}`), [id]);
  const muatUlang = detail.reload;

  if (detail.sedangMemuat) {
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <Card>
        <ErrorState pesan={detail.error?.message ?? 'Pengajuan tidak ditemukan'} onUlangi={detail.reload} />
      </Card>
    );
  }

  const data = detail.data;

  return (
    <div className="space-y-6">
      <PageHeader
        judul={data.namaLengkap}
        keterangan={`NIK ${data.nik} · diajukan ${formatTanggal(data.tanggalPengajuan)}`}
        aksi={
          <Link to="/petugas/dashboard">
            <Button>Kembali ke antrean</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusPengajuanBadge status={data.statusPengajuan} />
        <StatusVerifikasiBadge status={data.statusVerifikasi} />
        <StatusKeputusanBadge status={data.keputusan} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader judul="Data pengajuan" />
            <CardBody>
              <dl>
                <div className="data-row">
                  <dt>Penghasilan bulanan</dt>
                  <dd>{formatRupiah(data.penghasilanBulanan)}</dd>
                </div>
                <div className="data-row">
                  <dt>Jumlah tanggungan</dt>
                  <dd>{data.jumlahTanggungan} orang</dd>
                </div>
                <div className="data-row">
                  <dt>Kondisi rumah</dt>
                  <dd>{KONDISI_RUMAH_LABEL[data.kondisiRumah] ?? data.kondisiRumah}</dd>
                </div>
                <div className="data-row">
                  <dt>Alamat</dt>
                  <dd className="font-normal">{[data.alamat, data.desa].filter(Boolean).join(', ')}</dd>
                </div>
                <div className="data-row">
                  <dt>Nomor telepon</dt>
                  <dd>{data.noTelp ?? '-'}</dd>
                </div>
                <div className="data-row">
                  <dt>Catatan pemohon</dt>
                  <dd className="font-normal">{data.catatanPenduduk ?? '-'}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader judul="Dokumen pendukung" keterangan={`${data.dokumen.length} berkas terlampir`} />
            <CardBody>
              <PanelDokumen pengajuanId={data.id} dokumen={data.dokumen} onPerubahan={muatUlang} />
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {data.terkunci ? (
            <Card>
              <CardHeader judul="Verifikasi selesai" />
              <CardBody>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {data.namaPetugas ?? 'Petugas'} menetapkan hasil{' '}
                  {formatTanggalWaktu(data.tanggalVerifikasi)}. Data pengajuan sudah dikunci dan tidak
                  dapat diubah.
                </p>
                {data.catatanVerifikasi ? (
                  <blockquote className="mt-3 border-l-2 border-brand-300 pl-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
                    {data.catatanVerifikasi}
                  </blockquote>
                ) : null}
                <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <Link to="/petugas/dashboard">
                    <Button ukuran="kecil">Kembali ke antrean</Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader
                judul="Tetapkan hasil verifikasi"
                keterangan={`Status saat ini ${STATUS_PENGAJUAN_LABEL[data.statusPengajuan].toLowerCase()}`}
              />
              <CardBody>
                <FormVerifikasi pengajuanId={data.id} onSelesai={muatUlang} />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
