import { emailSchema, nikSchema, noTelpSchema, passwordSchema, usernameSchema } from '@spk-bansos/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import { ErrorState } from '../components/ui/StateBlocks';
import type { ApiError } from '../lib/api';
import { tujuanSetelahMasuk, useAuthStore } from '../lib/auth';
import { AuthShell } from './LandingPage';

const daftarSchema = z.object({
  nik: nikSchema,
  namaLengkap: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter'),
  email: emailSchema,
  noTelp: noTelpSchema.optional().or(z.literal('')),
  username: usernameSchema,
  password: passwordSchema,
  jenisKelamin: z.enum(['L', 'P']),
  tanggalLahir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal lahir tidak valid'),
  alamat: z.string().trim().min(10, 'Alamat minimal 10 karakter'),
  desa: z.string().trim().min(2, 'Nama desa wajib diisi'),
  kecamatan: z.string().trim().optional(),
  kabupaten: z.string().trim().optional(),
});

type DaftarInput = z.infer<typeof daftarSchema>;

export const RegisterPage = () => {
  const daftar = useAuthStore((state) => state.daftar);
  const navigate = useNavigate();
  const [error, setError] = useState<ApiError | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DaftarInput>({
    resolver: zodResolver(daftarSchema),
    defaultValues: {
      nik: '',
      namaLengkap: '',
      email: '',
      noTelp: '',
      username: '',
      password: '',
      jenisKelamin: 'L',
      tanggalLahir: '',
      alamat: '',
      desa: '',
      kecamatan: '',
      kabupaten: '',
    },
  });

  const onSubmit = handleSubmit(async (input) => {
    setError(null);
    try {
      const user = await daftar({
        ...input,
        noTelp: input.noTelp === '' ? undefined : input.noTelp,
        kecamatan: input.kecamatan === '' ? undefined : input.kecamatan,
        kabupaten: input.kabupaten === '' ? undefined : input.kabupaten,
      });
      navigate(tujuanSetelahMasuk(user.role), { replace: true });
    } catch (kesalahan) {
      setError(kesalahan as ApiError);
    }
  });

  return (
    <AuthShell judul="Pendaftaran warga">
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Data yang diisi akan dipakai petugas desa saat memverifikasi pengajuan Anda.
      </p>

      <Card className="mt-6">
        <CardBody>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {error ? <ErrorState pesan={error.message} detail={error.errors} /> : null}

            <Input
              label="NIK"
              inputMode="numeric"
              maxLength={16}
              placeholder="16 digit angka"
              required
              {...register('nik')}
              error={errors.nik?.message}
            />
            <Input label="Nama lengkap" required {...register('namaLengkap')} error={errors.namaLengkap?.message} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Email" type="email" autoComplete="email" required {...register('email')} error={errors.email?.message} />
              <Input
                label="Nomor telepon"
                type="tel"
                autoComplete="tel"
                placeholder="08xxxxxxxxxx"
                {...register('noTelp')}
                error={errors.noTelp?.message}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Username"
                autoComplete="username"
                required
                {...register('username')}
                error={errors.username?.message}
              />
              <Input
                label="Kata sandi"
                type="password"
                autoComplete="new-password"
                hint="Minimal 8 karakter, memuat huruf dan angka"
                required
                {...register('password')}
                error={errors.password?.message}
              />
            </div>

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
                required
                {...register('tanggalLahir')}
                error={errors.tanggalLahir?.message}
              />
            </div>

            <Input
              label="Alamat"
              hint="Tuliskan nama jalan/kampung, nomor rumah, dan RT/RW"
              required
              {...register('alamat')}
              error={errors.alamat?.message}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Desa" required {...register('desa')} error={errors.desa?.message} />
              <Input label="Kecamatan" {...register('kecamatan')} error={errors.kecamatan?.message} />
              <Input label="Kabupaten" {...register('kabupaten')} error={errors.kabupaten?.message} />
            </div>

            <Button type="submit" varian="utama" memuat={isSubmitting} className="w-full">
              Kirim pendaftaran
            </Button>
          </form>

          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Sudah punya akun?{' '}
            <Link to="/masuk" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
              Masuk
            </Link>
          </p>
        </CardBody>
      </Card>
    </AuthShell>
  );
};
