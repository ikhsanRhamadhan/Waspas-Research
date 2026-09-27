import { JENIS_NOTIFIKASI_LABEL, formatWaktuRelatif, type JenisNotifikasi } from '@spk-bansos/shared';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { DataState, PageHeader } from '../components/ui/StateBlocks';
import { getApi, putApi } from '../lib/api';
import { useData } from '../lib/useData';
import { cn } from '../lib/cn';

interface Notifikasi {
  id: string;
  judul: string;
  pesan: string;
  tipe: JenisNotifikasi;
  actionUrl: string | null;
  isRead: boolean;
  dibacaPada: string | null;
  dibuatPada: string;
}

interface DaftarNotifikasi {
  items: Notifikasi[];
  belumDibaca: number;
}

const WARNA_TIPE: Record<JenisNotifikasi, string> = {
  info: 'border-l-brand-500',
  success: 'border-l-emerald-500',
  warning: 'border-l-amber-500',
  error: 'border-l-rose-500',
};

export const NotifikasiPage = () => {
  const navigate = useNavigate();
  const [hanyaBelumDibaca, setHanyaBelumDibaca] = useState(false);
  const daftar = useData(
    () => getApi<DaftarNotifikasi>('/notifications', { limit: 50, unreadOnly: String(hanyaBelumDibaca) }),
    [hanyaBelumDibaca],
  );

  const tandaiDibaca = async (id: string) => {
    try {
      await putApi(`/notifications/${id}/read`);
      daftar.reload();
    } catch {
      toast.error('Notifikasi gagal ditandai sudah dibaca');
    }
  };

  const tandaiSemua = async () => {
    try {
      const hasil = await putApi<{ jumlah: number }>('/notifications/read-all');
      toast.success(`${hasil.jumlah} notifikasi ditandai sudah dibaca`);
      daftar.reload();
    } catch {
      toast.error('Gagal menandai notifikasi');
    }
  };

  const belumDibaca = daftar.data?.belumDibaca ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Notifikasi"
        keterangan="Pemberitahuan hasil verifikasi dan keputusan penerima bantuan."
        aksi={
          <>
            <Button
              varian={hanyaBelumDibaca ? 'utama' : 'sekunder'}
              ukuran="kecil"
              onClick={() => setHanyaBelumDibaca((v) => !v)}
              aria-pressed={hanyaBelumDibaca}
            >
              {hanyaBelumDibaca ? 'Tampilkan semua' : 'Hanya belum dibaca'}
            </Button>
            <Button ukuran="kecil" onClick={tandaiSemua} disabled={belumDibaca === 0}>
              Tandai semua dibaca
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader
          judul={hanyaBelumDibaca ? 'Belum dibaca' : 'Semua notifikasi'}
          keterangan={belumDibaca > 0 ? `${belumDibaca} belum dibaca` : 'Semua notifikasi sudah dibaca'}
        />
        <DataState
          sedangMemuat={daftar.sedangMemuat}
          error={daftar.error}
          data={daftar.data?.items ?? null}
          judulKosong={hanyaBelumDibaca ? 'Tidak ada notifikasi belum dibaca' : 'Belum ada notifikasi'}
          keteranganKosong="Notifikasi akan muncul setelah petugas memverifikasi pengajuan atau admin menetapkan keputusan."
          onUlangi={daftar.reload}
        >
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {(daftar.data?.items ?? []).map((item) => {
              // Ditangkap di luar callback: narrowing `item.actionUrl` tidak ikut
              // bertahan di dalam closure async.
              const target = item.actionUrl;
              return (
                <li
                  key={item.id}
                  className={cn(
                    'border-l-4 px-5 py-4',
                    WARNA_TIPE[item.tipe],
                    item.isRead ? 'opacity-70' : 'bg-slate-50 dark:bg-slate-900/60',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-50">
                        {item.judul}
                        {!item.isRead ? (
                          <span className="ml-2 align-middle text-xs font-semibold text-amber-700 dark:text-amber-400">
                            Baru
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.pesan}</p>
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        {JENIS_NOTIFIKASI_LABEL[item.tipe]} <span className="mx-1">|</span>{' '}
                        {formatWaktuRelatif(item.dibuatPada)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {target ? (
                        <Button
                          ukuran="kecil"
                          onClick={async () => {
                            if (!item.isRead) await tandaiDibaca(item.id);
                            navigate(target);
                          }}
                        >
                          Buka pengajuan
                        </Button>
                      ) : null}
                      {!item.isRead ? (
                        <Button ukuran="kecil" varian="garis" onClick={() => tandaiDibaca(item.id)}>
                          Tandai dibaca
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </DataState>
      </Card>
    </div>
  );
};
