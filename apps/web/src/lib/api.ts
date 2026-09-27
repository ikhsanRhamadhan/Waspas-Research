import type { ApiFailure, ApiSuccess } from '@spk-bansos/shared';
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

const STORAGE_KEY = 'spk-bansos.sesi';

export interface TokenDisimpan {
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  message: string;
  status: number;
  /** Pesan per-field dari backend, dipakai form untuk menandai input yang salah. */
  errors?: Record<string, string[]>;
}

const bacaSesi = (): TokenDisimpan | null => {
  const mentah = localStorage.getItem(STORAGE_KEY);
  if (!mentah) return null;
  try {
    return JSON.parse(mentah) as TokenDisimpan;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const simpanSesi = (sesi: TokenDisimpan): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sesi));
};

export const bacaTokenAkses = (): string | null => bacaSesi()?.accessToken ?? null;

export const hapusSesi = (): void => localStorage.removeItem(STORAGE_KEY);

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = bacaTokenAkses();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Refresh hanya boleh dicoba sekali per request. Kalau dua request sama-sama 401,
 * keduanya akan saling menunggu satu promise refresh yang sama. Tanpa ini satu request
 * bisa refresh lalu request lain tetap memakai token lama dan ikut gagal.
 */
let refreshSedangBerjalan: Promise<string | null> | null = null;

const perbaruiAccessToken = async (): Promise<string | null> => {
  const sesi = bacaSesi();
  if (!sesi?.refreshToken) return null;

  refreshSedangBerjalan ??= axios
    .post<ApiSuccess<TokenDisimpan>>(`${BASE_URL}/auth/refresh`, { refreshToken: sesi.refreshToken })
    .then((res) => {
      simpanSesi({ accessToken: res.data.data.accessToken, refreshToken: res.data.data.refreshToken });
      return res.data.data.accessToken;
    })
    .catch(() => {
      hapusSesi();
      return null;
    })
    .finally(() => {
      refreshSedangBerjalan = null;
    });

  return refreshSedangBerjalan;
};

type KonfigurasiRetry = InternalAxiosRequestConfig & { _sudahDiRetry?: boolean };

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiFailure>) => {
    const config = error.config as KonfigurasiRetry | undefined;
    const status = error.response?.status ?? 0;
    const bisaRetry = config && status === 401 && !config._sudahDiRetry && !config.url?.includes('/auth/');

    if (bisaRetry) {
      config._sudahDiRetry = true;
      const tokenBaru = await perbaruiAccessToken();
      if (tokenBaru) {
        config.headers.Authorization = `Bearer ${tokenBaru}`;
        return http.request(config);
      }
    }

    return Promise.reject(error);
  },
);

/** Melempar ApiError supaya pemanggil tidak perlu tahu bentuk axios. */
const keApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError<ApiFailure>(error)) {
    const body = error.response?.data;
    if (body && typeof body.message === 'string') {
      return { message: body.message, status: error.response?.status ?? 0, errors: body.errors };
    }
    if (error.code === 'ECONNABORTED') {
      return { message: 'Server tidak merespons. Periksa koneksi Anda lalu coba lagi.', status: 0 };
    }
    if (!error.response) {
      return { message: 'Tidak dapat terhubung ke server. Pastikan API sedang berjalan.', status: 0 };
    }
    return { message: error.message, status: error.response.status };
  }
  return { message: 'Terjadi kesalahan tak terduga.', status: 0 };
};

export const requestApi = async <T>(jalur: string, options: Parameters<AxiosInstance['request']>[0] = {}): Promise<T> => {
  try {
    // Content-Type multipart sengaja tidak di-set: axios membuangnya sendiri saat data
    // adalah FormData di browser, lalu browser yang menempelkan boundary. Menulis
    // 'multipart/form-data' manual justru membuat multer gagal membaca part.
    const res = await http.request<ApiSuccess<T>>({ ...options, url: jalur });
    return res.data?.data as T;
  } catch (error) {
    throw keApiError(error);
  }
};

export const getApi = <T>(jalur: string, params?: Record<string, unknown>): Promise<T> =>
  requestApi<T>(jalur, { method: 'GET', params });

export const postApi = <T>(jalur: string, data?: unknown): Promise<T> =>
  requestApi<T>(jalur, { method: 'POST', data });

export const putApi = <T>(jalur: string, data?: unknown): Promise<T> =>
  requestApi<T>(jalur, { method: 'PUT', data });

export const deleteApi = <T>(jalur: string): Promise<T> => requestApi<T>(jalur, { method: 'DELETE' });

const simpanBlob = (blob: Blob, namaFile: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = namaFile;
  anchor.click();
  URL.revokeObjectURL(url);
};

/** Unduh berkas dari endpoint terproteksi: token harus ikut di header, bukan di query. */
export const unduhBerkas = async (jalur: string, namaFile: string): Promise<void> => {
  try {
    const res = await http.get<Blob>(jalur, { responseType: 'blob' });
    simpanBlob(res.data, namaFile);
  } catch (error) {
    throw keApiError(error);
  }
};

/**
 * Ekspor PDF memakai POST karena body berisi filter. Bila server membalas JSON
 * (misalnya 422 karena filter tidak valid), blob-nya diubah jadi teks supaya pesan
 * error tidak muncul sebagai " Failed to fetch ".
 */
export const unduhPdf = async (jalur: string, data: unknown, namaFile: string): Promise<void> => {
  try {
    const res = await http.post<Blob>(jalur, data, { responseType: 'blob' });
    simpanBlob(res.data, namaFile);
  } catch (error) {
    if (axios.isAxiosError<Blob>(error) && error.response?.data instanceof Blob) {
      const pesan = await error.response.data.text();
      throw new Error(pesan || 'Gagal mengunduh laporan.');
    }
    throw keApiError(error);
  }
};
