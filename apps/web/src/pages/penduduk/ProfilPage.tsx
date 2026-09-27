import { formatTanggal } from '@spk-bansos/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Field';
import { ErrorState, LoadingState, PageHeader } from '../../components/ui/StateBlocks';
import { getApi, putApi, type ApiError } from '../../lib/api';
import { useData } from '../../lib/useData';
import type { ProfilWarga } from '../../types';

const profilSchema = z.object({
  namaLengkap: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter'),
  email: z.string().trim().email('Format email tidak valid'),
  noTelp: z
    .string()
    .trim()
    .regex(/^$|^[0-9+][0-9+\-]{6,14}$/, 'Nomor telepon tidak valid'),
  jenisKelamin: z.enum(['L', 'P']),
  tanggalLahir: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/, 'Tanggal lahir tidak valid'),
  alamat: z.string().trim().min(10, 'Alamat minimal 10 karakter'),
  desa: z.string().trim(),
  kecamatan: z.string().trim(),
  kabupaten: z.string().trim(),
  noRekening: z.string().trim().max(20),
  namaBank: z.string().trim().max(100),
});

type ProfilInput = z.infer<typeof profilSchema>;

const kosongkan = (nilai: string | null): string => nilai ?? '';

export const ProfilPage = () => {
  const profil = useData(() => getApi<ProfilWarga>('/penduduk/profile'));
  const [error, setError] = useState<ApiError | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfilInput>({
    resolver: zodResolver(profilSchema),
    values: profil.data
      ? {
          namaLengkap: profil.data.namaLengkap,
          email: kosongkan(profil.data.email),
          noTelp: kosongkan(profil.data.noTelp),
          jenisKelamin: profil.data.jenisKelamin === 'P' ? 'P' : 'L',
          tanggalLahir: kosongkan(profil.data.tanggalLahir),
          alamat: profil.data.alamat,
          desa: kosongkan(profil.data.desa),
          kecamatan: kosongkan(profil.data.kecamatan),
          kabupaten: kosongkan(profil.data.kabupaten),
          noRekening: kosongkan(profil.data.noRekening),
          namaBank: kosongkan(profil.data.namaBank),
        }
      : undefined,
  });

  const onSubmit = handleSubmit(async (input) => {
    setError(null);
    try {
      await putApi('/penduduk/profile', {
        ...input,
        email: input.email === '' ? undefined : input.email,
        tanggalLahir: input.tanggalLahir === '' ? undefined : input.tanggalLahir,
      });
      toast.success('Data diri berhasil diperbarui');
      profil.reload();
    } catch (kesalahan) {
      const apiError = kesalahan as ApiError;
      setError(apiError);
      toast.error(apiError.message);
    }
  });

  if (profil.sedangMemuat) {
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  }

  if (profil.error || !profil.data) {
    return (
      <Card>
        <ErrorState pesan={profil.error?.message ?? 'Data diri tidak ditemukan'} onUlangi={profil.reload} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Data diri"
        keterangan="Data ini dipakai petugas saat verifikasi dan tidak boleh berbeda dari dokumen resmi."
      />

      <Card>
        <CardHeader
          judul="Identitas utama"
          keterangan="NIK tidak dapat diubah karena sudah dipakai pada dokumen pendukung"
        />
        <CardBody>
          <dl>
            <div className="data-row">
              <dt>NIK</dt>
              <dd className="tabular-nums">{profil.data.nik}</dd>
            </div>
            {profil.data.tanggalLahir ? (
              <div className="data-row">
                <dt>Tanggal lahir</dt>
                <dd>{formatTanggal(profil.data.tanggalLahir)}</dd>
              </div>
            ) : null}
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader judul="Data yang dapat diperbarui" />
        <CardBody>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {error ? <ErrorState pesan={error.message} detail={error.errors} /> : null}

            <Input label="Nama lengkap" required {...register('namaLengkap')} error={errors.namaLengkap?.message} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Jenis kelamin"
                opsi={[
                  { value: 'L', label: 'Laki-laki' },
                  { value: 'P', label: 'Perempuan' },
                ]}
                required
                {...register('jenisKelamin')}
                error={errors.jenisKelamin?.message}
              />
              <Input
                label="Tanggal lahir"
                type="date"
                {...register('tanggalLahir')}
                error={errors.tanggalLahir?.message}
              />
            </div>

            <Input label="Alamat" required {...register('alamat')} error={errors.alamat?.message} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Desa" {...register('desa')} error={errors.desa?.message} />
              <Input label="Kecamatan" {...register('kecamatan')} error={errors.kecamatan?.message} />
              <Input label="Kabupaten" {...register('kabupaten')} error={errors.kabupaten?.message} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nomor telepon" type="tel" {...register('noTelp')} error={errors.noTelp?.message} />
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                {...register('email')}
                error={errors.email?.message}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nama bank" {...register('namaBank')} error={errors.namaBank?.message} />
              <Input label="Nomor rekening" {...register('noRekening')} error={errors.noRekening?.message} />
            </div>

            <div className="flex justify-end">
              <Button type="submit" varian="utama" memuat={isSubmitting} disabled={!isDirty}>
                Simpan perubahan
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
