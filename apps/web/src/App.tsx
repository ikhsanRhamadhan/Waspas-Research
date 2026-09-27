import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AppShell } from './components/layout/AppShell';
import { useAuthStore } from './lib/auth';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { KriteriaPage } from './pages/admin/KriteriaPage';
import { PenerimaPage } from './pages/admin/PenerimaPage';
import { WaspasPage } from './pages/admin/WaspasPage';
import { AlurPage } from './pages/AlurPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotifikasiPage } from './pages/NotifikasiPage';
import { PanduanPage } from './pages/PanduanPage';
import { DashboardPage } from './pages/penduduk/DashboardPage';
import { PengajuanPage } from './pages/penduduk/PengajuanPage';
import { ProfilPage } from './pages/penduduk/ProfilPage';
import { RankingPage } from './pages/penduduk/RankingPage';
import { LaporanPage } from './pages/petugas/LaporanPage';
import { PetugasDashboardPage } from './pages/petugas/PetugasDashboardPage';
import { VerifikasiDetailPage } from './pages/petugas/VerifikasiDetailPage';
import { RegisterPage } from './pages/RegisterPage';
import { GuestOnly, RequireAuth, RequireRole } from './routes/guards';

export const App = () => {
  const pulihkanSesi = useAuthStore((state) => state.pulihkanSesi);

  useEffect(() => {
    void pulihkanSesi();
  }, [pulihkanSesi]);

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<GuestOnly />}>
          <Route path="/masuk" element={<LoginPage />} />
          <Route path="/daftar" element={<RegisterPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/notifikasi" element={<NotifikasiPage />} />
            <Route path="/panduan" element={<PanduanPage />} />
            <Route path="/alur" element={<AlurPage />} />

            <Route element={<RequireRole role="penduduk" />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/pengajuan" element={<PengajuanPage />} />
              <Route path="/ranking" element={<RankingPage />} />
              <Route path="/profil" element={<ProfilPage />} />
            </Route>

            <Route element={<RequireRole role="petugas" />}>
              <Route path="/petugas" element={<PetugasDashboardPage />} />
              <Route path="/petugas/verifikasi/:id" element={<VerifikasiDetailPage />} />
              <Route path="/petugas/laporan" element={<LaporanPage />} />
            </Route>

            <Route element={<RequireRole role="admin" />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/waspas" element={<WaspasPage />} />
              <Route path="/admin/penerima" element={<PenerimaPage />} />
              <Route path="/admin/kriteria" element={<KriteriaPage />} />
              <Route path="/admin/audit" element={<AuditLogPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className:
            'rounded-md border border-slate-200 bg-white text-sm text-slate-800 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
        }}
      />
    </>
  );
};
