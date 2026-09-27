import { ROLE_LABEL } from '@spk-bansos/shared';
import { Bell, ClipboardCheck, FileText, Gauge, History, Home, LogOut, Menu, Moon, Scale, Settings2, Sun, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { cn } from '../../lib/cn';
import { getApi } from '../../lib/api';
import { useAuthStore } from '../../lib/auth';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../ui/Button';

interface ItemMenu {
  ke: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
}

/**
 * Menu per role. Admin tidak melihat menu petugas dan sebaliknya: endpoint sudah
 * menolak, jadi menampilkan pintasan yang pasti gagal hanya menambah frustrasi.
 */
const MENU: Record<'penduduk' | 'petugas' | 'admin', readonly ItemMenu[]> = {
  penduduk: [
    { ke: '/dashboard', label: 'Status bantuan', icon: Home, end: true },
    { ke: '/pengajuan', label: 'Pengajuan', icon: FileText },
    { ke: '/ranking', label: 'Peringkat', icon: Scale },
    { ke: '/profil', label: 'Data diri', icon: Users },
  ],
  petugas: [
    { ke: '/petugas', label: 'Antrean verifikasi', icon: ClipboardCheck, end: true },
    { ke: '/petugas/laporan', label: 'Laporan harian', icon: FileText },
  ],
  admin: [
    { ke: '/admin', label: 'Statistik desa', icon: Home, end: true },
    { ke: '/admin/waspas', label: 'Perhitungan WASPAS', icon: Gauge },
    { ke: '/admin/penerima', label: 'Penerima dan keputusan', icon: Scale },
    { ke: '/admin/kriteria', label: 'Kriteria dan bobot', icon: Settings2 },
    { ke: '/admin/audit', label: 'Jejak audit', icon: History },
  ],
};

const Wordmark = () => (
  <span className="text-[15px] font-bold tracking-tight text-brand-800 dark:text-brand-200">
    SPK Bansos
  </span>
);

const Inisial = ({ nama }: { nama: string }) => {
  const huruf = nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((bagian) => bagian[0]?.toUpperCase())
    .join('');
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-900 dark:bg-brand-900/50 dark:text-brand-200"
    >
      {huruf}
    </span>
  );
};

const NavItem = ({ item, onPilih }: { item: ItemMenu; onPilih?: () => void }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.ke}
      end={item.end}
      onClick={onPilih}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-900 dark:bg-brand-900/40 dark:text-brand-100'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50',
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
};

export const AppShell = () => {
  const user = useAuthStore((state) => state.user);
  const keluar = useAuthStore((state) => state.keluar);
  const navigate = useNavigate();
  const { tema, toggleTema } = useTheme();
  const [menuTerbuka, setMenuTerbuka] = useState(false);

  useEffect(() => {
    if (!menuTerbuka) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuTerbuka(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuTerbuka]);

  if (!user) return null;

  const itemMenu = MENU[user.role];

  const daftarMenu = (
    <nav aria-label="Menu utama" className="flex flex-col gap-1 px-3">
      {itemMenu.map((item) => (
        <NavItem key={item.ke} item={item} onPilih={() => setMenuTerbuka(false)} />
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {menuTerbuka ? (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setMenuTerbuka(false)}
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900',
          'shadow-lg lg:shadow-none',
          menuTerbuka ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <Wordmark />
          <Button
            varian="garis"
            ukuran="kecil"
            className="lg:hidden"
            aria-label="Tutup menu"
            onClick={() => setMenuTerbuka(false)}
            ikon={<X className="h-4 w-4" />}
          />
        </div>
        <div className="flex-1 overflow-y-auto py-4">{daftarMenu}</div>
        <div className="border-t border-slate-200 px-3 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3 px-1">
            <Inisial nama={user.nama} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{user.nama}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <Button
            varian="garis"
            ukuran="kecil"
            className="mt-2 w-full justify-start"
            ikon={<LogOut className="h-4 w-4" />}
            onClick={async () => {
              await keluar();
              navigate('/masuk');
            }}
          >
            Keluar
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8 dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              varian="garis"
              ukuran="kecil"
              className="lg:hidden"
              aria-label="Buka menu"
              aria-expanded={menuTerbuka}
              onClick={() => setMenuTerbuka(true)}
              ikon={<Menu className="h-4 w-4" />}
            />
            <span className="truncate text-sm text-slate-600 dark:text-slate-400">
              Portal bantuan sosial desa
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              varian="garis"
              ukuran="kecil"
              aria-label={tema === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
              aria-pressed={tema === 'dark'}
              onClick={toggleTema}
              ikon={
                tema === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />
              }
            />
            <NotificationBell />
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const NotificationBell = () => {
  const [terbuka, setTerbuka] = useState(false);
  const [jumlah, setJumlah] = useState<number | null>(null);
  const wadahMenu = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let dibatalkan = false;

    const muat = async () => {
      try {
        const data = await getApi<{ jumlah: number }>('/notifications/belum-dibaca');
        if (!dibatalkan) setJumlah(data.jumlah);
      } catch {
        // Lonceng tidak boleh mengganggu halaman kalau notifikasi gagal dimuat.
      }
    };

    void muat();
    const interval = window.setInterval(muat, 60_000);

    return () => {
      dibatalkan = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!terbuka) return undefined;
    const onKlik = (event: MouseEvent) => {
      if (!wadahMenu.current?.contains(event.target as Node)) setTerbuka(false);
    };
    document.addEventListener('mousedown', onKlik);
    return () => document.removeEventListener('mousedown', onKlik);
  }, [terbuka]);

  return (
    <div className="relative" ref={wadahMenu}>
      <Button
        varian="garis"
        ukuran="kecil"
        aria-label={jumlah ? `Notifikasi, ${jumlah} belum dibaca` : 'Notifikasi'}
        aria-expanded={terbuka}
        onClick={() => setTerbuka((v) => !v)}
        ikon={<Bell className="h-4 w-4" aria-hidden="true" />}
      />
      {terbuka ? (
        <div className="absolute right-0 z-30 mt-1 w-64 overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <p className="border-b border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-800">Notifikasi</p>
          <div className="px-4 py-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {jumlah === null ? 'Memuat jumlah notifikasi' : `${jumlah} notifikasi belum dibaca`}
            </p>
            <button
              type="button"
              className="mt-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
              onClick={() => {
                setTerbuka(false);
                navigate('/notifikasi');
              }}
            >
              Buka daftar notifikasi
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
