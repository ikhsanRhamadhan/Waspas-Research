import { Link } from 'react-router-dom';

import { Button } from '../components/ui/Button';

export const NotFoundPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center dark:bg-slate-950">
    <p className="label-section">Halaman tidak ditemukan</p>
    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
      Alamat yang Anda buka tidak tersedia
    </h1>
    <p className="max-w-prose text-sm text-slate-600 dark:text-slate-400">
      Tautan mungkin sudah berubah, atau halaman tersebut memang tidak ada di sistem ini.
    </p>
    <Link to="/">
      <Button varian="utama">Kembali ke halaman publik</Button>
    </Link>
  </div>
);
