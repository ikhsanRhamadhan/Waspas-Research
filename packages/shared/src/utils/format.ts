const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('id-ID');

export const formatRupiah = (value: number | string | null | undefined): string =>
  value === null || value === undefined || value === '' ? '-' : rupiahFormatter.format(Number(value));

export const formatNumber = (value: number | string | null | undefined): string =>
  value === null || value === undefined || value === '' ? '-' : numberFormatter.format(Number(value));

export const formatPercent = (value: number, fractionDigits = 2): string =>
  `${(value * 100).toFixed(fractionDigits)}%`;

export const formatScore = (value: number | string | null | undefined): string =>
  value === null || value === undefined ? '-' : Number(value).toFixed(4);

const toDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pad = (value: number): string => String(value).padStart(2, '0');

export const formatTanggal = (value: string | Date | null | undefined): string => {
  const date = toDate(value);
  if (!date) return '-';
  return `${date.getDate()} ${[
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ][date.getMonth()]} ${date.getFullYear()}`;
};

export const formatTanggalWaktu = (value: string | Date | null | undefined): string => {
  const date = toDate(value);
  if (!date) return '-';
  return `${formatTanggal(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatWaktuRelatif = (value: string | Date | null | undefined): string => {
  const date = toDate(value);
  if (!date) return '-';

  const selisihDetik = Math.floor((Date.now() - date.getTime()) / 1000);
  if (selisihDetik < 60) return 'Baru saja';
  if (selisihDetik < 3600) return `${Math.floor(selisihDetik / 60)} menit lalu`;
  if (selisihDetik < 86400) return `${Math.floor(selisihDetik / 3600)} jam lalu`;
  if (selisihDetik < 2592000) return `${Math.floor(selisihDetik / 86400)} hari lalu`;
  return formatTanggal(date);
};

export const formatBytes = (bytes: number | null | undefined): string => {
  if (!bytes) return '0 B';
  const satuan = ['B', 'KB', 'MB', 'GB'];
  const indeks = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), satuan.length - 1);
  return `${(bytes / 1024 ** indeks).toFixed(indeks === 0 ? 0 : 1)} ${satuan[indeks]}`;
};

export const initials = (nama: string): string =>
  nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((bagian) => bagian[0]?.toUpperCase() ?? '')
    .join('');

export const maskNik = (nik: string): string =>
  nik.length <= 6 ? nik : `${nik.slice(0, 6)}${'*'.repeat(nik.length - 10)}${nik.slice(-4)}`;

export const kosongkanJikaNull = (value: string | null | undefined): string => value ?? '-';
