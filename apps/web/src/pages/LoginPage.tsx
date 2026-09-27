import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { Input } from '../components/ui/Field';
import { ErrorState } from '../components/ui/StateBlocks';
import type { ApiError } from '../lib/api';
import { tujuanSetelahMasuk, useAuthStore } from '../lib/auth';
import { AuthShell } from './LandingPage';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

type LoginInput = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const masuk = useAuthStore((state) => state.masuk);
  const navigate = useNavigate();
  const lokasi = useLocation();
  const [error, setError] = useState<ApiError | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { username: '', password: '' } });

  const onSubmit = handleSubmit(async (input) => {
    setError(null);
    try {
      const user = await masuk(input);
      const asal = (lokasi.state as { dari?: string } | null)?.dari;
      navigate(asal ?? tujuanSetelahMasuk(user.role), { replace: true });
    } catch (kesalahan) {
      setError(kesalahan as ApiError);
    }
  });

  return (
    <AuthShell judul="Masuk ke portal">
      <Card className="mt-6">
        <CardBody>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {error ? <ErrorState pesan={error.message} /> : null}

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
              autoComplete="current-password"
              required
              {...register('password')}
              error={errors.password?.message}
            />

            <Button type="submit" varian="utama" memuat={isSubmitting} className="w-full">
              Masuk
            </Button>
          </form>

          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Belum punya akun?{' '}
            <Link to="/daftar" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
              Daftar sebagai warga
            </Link>
          </p>
        </CardBody>
      </Card>
    </AuthShell>
  );
};
