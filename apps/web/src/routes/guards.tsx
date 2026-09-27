import type { UserRole } from '@spk-bansos/shared';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { tujuanSetelahMasuk, useAuthStore } from '../lib/auth';
import { LoadingState } from '../components/ui/StateBlocks';

/**
 * Guard menunggu `pulihkanSesi` selesai sebelum memutuskan. Tanpa itu, setiap
 * refresh halaman akan memantulkan pengguna yang sebenarnya masih login.
 */
export const RequireAuth = () => {
  const user = useAuthStore((state) => state.user);
  const sedangMemuat = useAuthStore((state) => state.sedangMemuat);
  const lokasi = useLocation();

  if (sedangMemuat) return <LoadingState pesan="Memeriksa sesi" />;
  if (!user) return <Navigate to="/masuk" replace state={{ dari: lokasi.pathname }} />;
  return <Outlet />;
};

export const RequireRole = ({ role }: { role: UserRole }) => {
  const user = useAuthStore((state) => state.user);

  if (!user) return <Navigate to="/masuk" replace />;
  if (user.role !== role) return <Navigate to={tujuanSetelahMasuk(user.role)} replace />;
  return <Outlet />;
};

/** Halaman login dan pendaftaran disembunyikan kalau sudah punya sesi. */
export const GuestOnly = () => {
  const user = useAuthStore((state) => state.user);
  const sedangMemuat = useAuthStore((state) => state.sedangMemuat);

  if (sedangMemuat) return <LoadingState pesan="Memeriksa sesi" />;
  if (user) return <Navigate to={tujuanSetelahMasuk(user.role)} replace />;
  return <Outlet />;
};
