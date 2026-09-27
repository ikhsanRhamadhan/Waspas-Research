import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Tema = 'light' | 'dark';

interface ThemeContextValue {
  tema: Tema;
  toggleTema: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'spk-bansos.tema';

const temaAwal = (): Tema => {
  const tersimpan = localStorage.getItem(STORAGE_KEY);
  if (tersimpan === 'light' || tersimpan === 'dark') return tersimpan;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [tema, setTema] = useState<Tema>(temaAwal);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark');
    localStorage.setItem(STORAGE_KEY, tema);
  }, [tema]);

  const toggleTema = useCallback(() => setTema((sekarang) => (sekarang === 'dark' ? 'light' : 'dark')), []);

  const value = useMemo(() => ({ tema, toggleTema }), [tema, toggleTema]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme harus dipakai di dalam ThemeProvider');
  return context;
};
