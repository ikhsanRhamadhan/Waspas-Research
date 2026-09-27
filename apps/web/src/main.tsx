import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';
import './index.css';
import { ThemeProvider } from './theme/ThemeContext';

const wadah = document.getElementById('root');
if (!wadah) throw new Error('Elemen #root tidak ditemukan di index.html');

createRoot(wadah).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
