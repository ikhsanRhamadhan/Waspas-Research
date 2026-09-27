import { formatTanggalWaktu } from '@spk-bansos/shared';
import { useState } from 'react';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { DataTable, type Kolom } from '../../components/ui/DataTable';
import { Input, Select } from '../../components/ui/Field';
import { Pagination } from '../../components/ui/Pagination';
import { DataState, ErrorState, PageHeader } from '../../components/ui/StateBlocks';
import { getApi } from '../../lib/api';
import { useData } from '../../lib/useData';
import type { ItemAuditLog } from '../../types';

interface Halaman<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Label aksi memakai huruf kapital di awal kalimat, bukan nama kolom database.
 * `pengajuan.created` adalah implementasi; yang dibaca admin adalah "Pengajuan dibuat".
 */
const LABEL_AKSI: Record<string, string> = {
  'auth.login': 'Login berhasil',
  'auth.login_failed': 'Login gagal',
  'auth.logout': 'Logout',
  'auth.register': 'Pendaftaran warga',
  'pengajuan.created': 'Pengajuan dibuat',
  'pengajuan.updated': 'Pengajuan diubah',
  'pengajuan.deleted': 'Pengajuan dihapus',
  'verifikasi.created': 'Verifikasi dibuat',
  'verifikasi.updated': 'Verifikasi diperbarui',
  'dokumen.uploaded': 'Dokumen diunggah',
  'kriteria.saved': 'Kriteria disimpan',
  'kriteria.deleted': 'Kriteria dihapus',
  'waspas.hitung': 'WASPAS dihitung',
  'keputusan.tetapkan': 'Keputusan ditetapkan',
  'laporan.download': 'Laporan diunduh',
};

const labelAksi = (action: string): string => LABEL_AKSI[action] ?? action;

const nilaiRingkas = (nilai: Record<string, unknown> | null): string => {
  if (!nilai) return '-';
  return Object.entries(nilai)
    .map(([kunci, isi]) => `${kunci}: ${Array.isArray(isi) ? `${isi.length} item` : String(isi)}`)
    .join(' · ');
};

export const AuditLogPage = () => {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');

  const jejak = useData(
    () =>
      getApi<Halaman<ItemAuditLog>>('/admin/audit-log', {
        page,
        limit: 15,
        ...(action ? { action } : {}),
        ...(entityType ? { entityType } : {}),
      }),
    [page, action, entityType],
  );

  const kolom: Kolom<ItemAuditLog>[] = [
    {
      key: 'waktu',
      header: 'Waktu',
      render: (baris) => <span className="whitespace-nowrap">{formatTanggalWaktu(baris.createdAt)}</span>,
    },
    {
      key: 'aksi',
      header: 'Aksi',
      render: (baris) => (
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-slate-50">{labelAksi(baris.action)}</p>
          <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {baris.entityType ? `${baris.entityType}${baris.entityId ? ` · ${baris.entityId.slice(0, 8)}` : ''}` : '-'}
          </p>
        </div>
      ),
    },
    {
      key: 'pelaku',
      header: 'Pelaku',
      render: (baris) => (
        <div className="min-w-0">
          <p className="truncate">{baris.namaUser ?? 'Sistem'}</p>
          {baris.ipAddress ? <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{baris.ipAddress}</p> : null}
        </div>
      ),
    },
    {
      key: 'perubahan',
      header: 'Perubahan',
      render: (baris) => (
        <div className="max-w-md space-y-0.5 text-xs">
          {baris.oldValues ? <p className="text-slate-500 line-through dark:text-slate-500">{nilaiRingkas(baris.oldValues)}</p> : null}
          <p className="text-slate-700 dark:text-slate-300">{nilaiRingkas(baris.newValues)}</p>
        </div>
      ),
    },
  ];

  const aksiTersedia = Object.entries(LABEL_AKSI);

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Jejak audit"
        keterangan="Setiap aksi penting tercatat lengkap dengan pelaku, waktu, dan nilai sebelum serta sesudahnya."
        aksi={
          <Badge nada="info">
            {jejak.data ? `${jejak.data.meta.total} catatan` : 'Memuat'}
          </Badge>
        }
      />

      <Card>
        <CardHeader
          judul="Catatan aktivitas"
          aksi={
            <div className="flex flex-wrap items-start gap-2">
              <div className="w-full sm:w-56">
                <Select
                  label="Jenis aktivitas"
                  placeholder="Semua aktivitas"
                  opsi={aksiTersedia.map(([nilai, label]) => ({ value: nilai, label }))}
                  value={action}
                  onChange={(event) => {
                    setAction(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="w-full sm:w-44">
                <Input
                  label="Jenis entitas"
                  placeholder="mis. hasil"
                  value={entityType}
                  onChange={(event) => {
                    setEntityType(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          }
        />
        {jejak.error ? (
          <ErrorState pesan={jejak.error.message} onUlangi={jejak.reload} />
        ) : (
          <DataState
            sedangMemuat={jejak.sedangMemuat}
            error={null}
            data={jejak.data?.items ?? null}
            judulKosong="Belum ada catatan"
            keteranganKosong="Tidak ada aktivitas yang cocok dengan filter ini."
            onUlangi={jejak.reload}
          >
            <DataTable kolom={kolom} data={jejak.data?.items ?? []} rowKey={(baris) => baris.id} />
            {jejak.data ? (
              <Pagination
                page={jejak.data.meta.page}
                totalPages={jejak.data.meta.totalPages}
                total={jejak.data.meta.total}
                onGanti={setPage}
              />
            ) : null}
          </DataState>
        )}
      </Card>

      <Card>
        <CardHeader judul="Catatan pembacaan" />
        <CardBody>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>Jejak audit tidak bisa diubah dan dihapus dari aplikasi, hanya dibaca.</li>
            <li>Kolom yang memuat kata sandi dan token selalu ditulis sebagai REDACTED.</li>
            <li>Pengunduhan laporan PDF juga tercatat di sini dengan nama pengunduhnya.</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
};
