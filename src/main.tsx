import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSecurityGuard } from './lib/securityGuard';

// F12, Sağ Tık, Ctrl+U ve Kaynak Kodu İnceleme Korumasını Başlat
initSecurityGuard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
