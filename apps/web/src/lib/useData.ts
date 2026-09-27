import { useCallback, useEffect, useRef, useState } from 'react';

import type { ApiError } from './api';

interface StateData<T> {
  data: T | null;
  sedangMemuat: boolean;
  error: ApiError | null;
  reload: () => void;
  setData: (data: T) => void;
}

/**
 * Satu hook untuk tiga state yang wajib ada di setiap layar data: memuat, kosong, dan
 * error. Layar yang hanya menggambar kondisi ideal akan terlihat benar di screenshot
 * lalu gagal di tangan pengguna pertama.
 */
export const useData = <T,>(ambil: () => Promise<T>, deps: readonly unknown[] = []): StateData<T> => {
  const [data, setData] = useState<T | null>(null);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [penanda, setPenanda] = useState(0);
  const tetapHidup = useRef(true);

  useEffect(() => {
    tetapHidup.current = true;
    return () => {
      tetapHidup.current = false;
    };
  }, []);

  useEffect(() => {
    let dibatalkan = false;
    setSedangMemuat(true);
    setError(null);

    ambil()
      .then((hasil) => {
        if (!dibatalkan) setData(hasil);
      })
      .catch((kesalahan: ApiError) => {
        if (!dibatalkan) setError(kesalahan);
      })
      .finally(() => {
        if (!dibatalkan) setSedangMemuat(false);
      });

    return () => {
      dibatalkan = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [penanda, ...deps]);

  const reload = useCallback(() => setPenanda((nilai) => nilai + 1), []);

  return { data, sedangMemuat, error, reload, setData };
};
