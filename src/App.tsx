import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  ShieldCheck,
  Zap,
  HelpCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { PortalButton, UserRole } from './types';
import { BUTTON_GROUPS, INITIAL_BUTTONS } from './data/buttonsData';
import { Header } from './components/Header';
import { TopDigitalClockBar } from './components/TopDigitalClockBar';
import { PortalCard } from './components/PortalCard';
import { ButtonsAmbientGlow } from './components/ButtonsAmbientGlow';
import { TalepIstekFormu } from './components/TalepIstekFormu';
import { AmbientBordoMaviTitle } from './components/AmbientBordoMaviTitle';
import { DetailModal } from './components/DetailModal';
import { OtherOperationsScreen } from './components/OtherOperationsScreen';
import { TaleplerScreen } from './components/TaleplerScreen';
import { OdemeTalepleriScreen } from './components/OdemeTalepleriScreen';
import { SantiyeTalepleriScreen } from './components/SantiyeTalepleriScreen';
import { PersonelAvansScreen } from './components/PersonelAvansScreen';
import { PersonelScreen } from './components/PersonelScreen';
import { BankalarScreen } from './components/BankalarScreen';
import { BankaHareketleriScreen } from './components/BankaHareketleriScreen';
import { FaturalarScreen } from './components/FaturalarScreen';
import { MutabakatPortaliScreen } from './components/MutabakatPortaliScreen';
import { CekSenetTeminatScreen } from './components/CekSenetTeminatScreen';
import { AracMakinaScreen } from './components/AracMakinaScreen';
import { AracTakipScreen } from './components/AracTakipScreen';
import { RaporlarScreen } from './components/RaporlarScreen';
import { PersonelDigerIslemlerScreen } from './components/PersonelDigerIslemlerScreen';
import { MisafirIslemlerScreen } from './components/MisafirIslemlerScreen';
import { LoginScreen } from './components/LoginScreen';
import { LoginAnimatedBackground } from './components/LoginAnimatedBackground';
import { ThemeSelectionModal } from './components/ThemeSelectionModal';
import { OzkaLogo } from './components/OzkaLogo';
import { playPortalClick } from './utils/audio';
import { isButtonVisibleForRole, getRoleBadgeInfo } from './lib/auth';
import {
  fetchPortalButtons,
  updatePortalButtonLink,
  normalizeTitle,
  fetchDigerButonlar,
  fetchMisafirButonlar,
  SupabaseDigerButonRow,
} from './lib/supabase';
import { TeminatMektubuUyari } from './components/TeminatMektubuUyari';

export default function App() {
  const [buttons, setButtons] = useState<PortalButton[]>(INITIAL_BUTTONS);
  const [digerButtons, setDigerButtons] = useState<SupabaseDigerButonRow[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState<
    'connected' | 'syncing' | 'error' | 'idle'
  >('syncing');

  // Sync with Supabase (portal_butonlari, digerbutonlar, misafirbaglantıbutonları) on mount
  const syncFromSupabase = async () => {
    setSupabaseStatus('syncing');
    try {
      const [portalRows, digerRows, misafirRes] = await Promise.all([
        fetchPortalButtons(),
        fetchDigerButonlar(),
        fetchMisafirButonlar(),
      ]);

      if (digerRows && digerRows.length > 0) {
        setDigerButtons(digerRows);
      }

      // Sync misafirbaglantıbutonları on startup
      if (misafirRes && misafirRes.length > 0) {
        try {
          const currentStored = localStorage.getItem('ozka_misafir_buttons_v3_24slots');
          let currentList: any[] = [];
          if (currentStored) {
            try {
              currentList = JSON.parse(currentStored);
            } catch {
              currentList = [];
            }
          }
          const updatedSlots = Array.from({ length: 24 }, (_, i) => {
            const slotNum = i + 1;
            const existing = currentList.find((b: any) => b.slotNumber === slotNum);
            const foundRow = misafirRes.find((r) => r.sira_no === slotNum);
            if (foundRow) {
              const hasTitle = Boolean(foundRow.buton_adi && foundRow.buton_adi.trim());
              let cleanUrl = (foundRow.baglanti_linki || '').trim();
              if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                cleanUrl = 'https://' + cleanUrl;
              }
              return {
                ...(existing || {}),
                id: `misafir-slot-${slotNum}`,
                dbId: foundRow.id,
                slotNumber: slotNum,
                badge: `${slotNum}. BUTON`,
                title: hasTitle ? foundRow.buton_adi.trim() : '',
                subtitle: '',
                url: hasTitle ? cleanUrl : '',
              };
            }
            return existing || {
              id: `misafir-slot-${slotNum}`,
              slotNumber: slotNum,
              badge: `${slotNum}. BUTON`,
              title: '',
              subtitle: '',
              url: '',
            };
          });
          localStorage.setItem('ozka_misafir_buttons_v3_24slots', JSON.stringify(updatedSlots));
        } catch {
          // ignore
        }
      }

      if (portalRows && portalRows.length > 0) {
        setButtons((prev) =>
          prev.map((btn) => {
            if (btn.id === 'talepler' || btn.id === 'personel' || btn.id === 'diger-islemler' || btn.actionType === 'screen') {
              return btn;
            }
            const match = portalRows.find(
              (r) =>
                (btn.siraNo !== undefined && r.sira_no === btn.siraNo) ||
                normalizeTitle(r.buton_adi) === normalizeTitle(btn.title)
            );
            if (match && match.baglanti_linki) {
              return { ...btn, customUrl: match.baglanti_linki };
            }
            return btn;
          })
        );
        setSupabaseStatus('connected');
      } else {
        setSupabaseStatus('idle');
      }
    } catch (err) {
      console.warn('Supabase sync error', err);
      setSupabaseStatus('error');
    }
  };

  useEffect(() => {
    syncFromSupabase();
  }, []);

  // Program girişte varsayılan olarak her zaman GECE MODU açılır, gündüz modu isteğe göre geçilir
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('ozka_portal_theme');
      if (savedTheme === 'light') return false; // Sadece açıkça gündüz modu seçildiyse
      return true; // Varsayılan olarak her zaman GECE MODU
    } catch {
      return true;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ozka_portal_sound') !== 'false';
    } catch {
      return true;
    }
  });

  // Oturum Yönetimi (Giriş Ekranı)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const savedSession = localStorage.getItem('ozka_auth_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        return Boolean(parsed && parsed.username);
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState<string>(() => {
    try {
      const savedSession = localStorage.getItem('ozka_auth_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.username) return parsed.username;
      }
    } catch {
      // ignore
    }
    return 'Yönetici';
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      const savedSession = localStorage.getItem('ozka_auth_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.role) return parsed.role;
      }
    } catch {
      // ignore
    }
    return 'admin';
  });

  const [authTable, setAuthTable] = useState<string>(() => {
    try {
      const savedSession = localStorage.getItem('ozka_auth_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.matchedTable) return parsed.matchedTable;
      }
    } catch {
      // ignore
    }
    return '';
  });

  const [fromKullanicilar, setFromKullanicilar] = useState<boolean>(() => {
    try {
      const savedSession = localStorage.getItem('ozka_auth_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.fromKullanicilarTable !== undefined) return Boolean(parsed.fromKullanicilarTable);
        if (parsed?.matchedTable === 'kullanicilar') return true;
        if (parsed?.matchedTable === 'misafirsifre' || parsed?.matchedTable === 'personelsifre') return false;
        const u = String(parsed?.username || '').toLowerCase().trim();
        return ['admin', 'bayburt', 'muhasebe'].includes(u);
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);

  const handleLoginSuccess = (
    user: string,
    role: UserRole,
    table?: string,
    isFromKullanicilar?: boolean
  ) => {
    setCurrentUser(user || 'Yönetici');
    setUserRole(role || 'admin');
    setAuthTable(table || '');
    const isKullanicilar = Boolean(
      isFromKullanicilar ||
      table === 'kullanicilar' ||
      ['admin', 'bayburt', 'muhasebe'].includes(String(user || '').toLowerCase().trim())
    );
    setFromKullanicilar(isKullanicilar);
    setIsAuthenticated(true);
    // Program girişinde varsayılan olarak gece modu açılsın
    setDarkMode(true);
    // Şifreli girişten sonra hangi modda çalışmak istersiniz diye sor
    setShowThemeModal(true);
  };

  const handleSelectTheme = (theme: 'dark' | 'light') => {
    setDarkMode(theme === 'dark');
    setShowThemeModal(false);
  };

  const handleCloseThemeModal = () => {
    // "direk kapatılırsa gece modunda devam etsin"
    setDarkMode(true);
    setShowThemeModal(false);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('ozka_auth_session');
    } catch {
      // ignore
    }
    setAuthTable('');
    setFromKullanicilar(false);
    setDarkMode(true);
    setShowThemeModal(false);
    setIsAuthenticated(false);
  };

  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentScreen, setCurrentScreen] = useState<
    | 'portal'
    | 'diger-islemler'
    | 'personel-diger-islemler'
    | 'misafir-islemler'
    | 'talepler'
    | 'odeme-talepleri'
    | 'santiye-talepleri'
    | 'personel-avans'
    | 'personel'
    | 'bankalar'
    | 'banka-hareketleri'
    | 'faturalar'
    | 'mutabakat-portali'
    | 'cek-senet-teminat'
    | 'arac-makina-parki'
    | 'arac-takip'
    | 'raporlar'
  >('portal');

  // Modals
  const [selectedButton, setSelectedButton] = useState<PortalButton | null>(null);
  const [settingsButton, setSettingsButton] = useState<PortalButton | null>(null);
  const [selectedMutabakatFirma, setSelectedMutabakatFirma] = useState<{
    anafirma?: string;
    vergino?: string;
    santiyeadi?: string;
  } | null>(null);
  const [reopenFirmaSecOnFaturalar, setReopenFirmaSecOnFaturalar] = useState(false);

  // Sync dark mode class with root html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('ozka_portal_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  // Handle browser back button and hash changes
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      if (hash === '#personel') {
        setCurrentScreen('personel');
      } else if (hash === '#personel-avans') {
        setCurrentScreen('personel-avans');
      } else if (hash === '#talepler') {
        setCurrentScreen('talepler');
      } else if (hash === '#odeme-talepleri') {
        setCurrentScreen('odeme-talepleri');
      } else if (hash === '#santiye-talepleri') {
        setCurrentScreen('santiye-talepleri');
      } else if (hash === '#bankalar') {
        setCurrentScreen('bankalar');
      } else if (hash === '#banka-hareketleri') {
        setCurrentScreen('banka-hareketleri');
      } else if (hash === '#faturalar') {
        setCurrentScreen('faturalar');
      } else if (hash === '#mutabakat-portali') {
        setCurrentScreen('mutabakat-portali');
      } else if (hash === '#cek-senet-teminat') {
        setCurrentScreen('cek-senet-teminat');
      } else if (hash === '#arac-takip') {
        setCurrentScreen('arac-takip');
      } else if (hash === '#arac-makina-parki') {
        setCurrentScreen('arac-makina-parki');
      } else if (hash === '#raporlar') {
        setCurrentScreen('raporlar');
      } else if (hash === '#personel-diger-islemler') {
        setCurrentScreen('personel-diger-islemler');
      } else if (hash === '#misafir-islemler') {
        setCurrentScreen('misafir-islemler');
      } else if (hash === '#diger-islemler') {
        setCurrentScreen('diger-islemler');
      } else {
        setCurrentScreen('portal');
      }
    };
    window.addEventListener('popstate', handlePopState);
    handlePopState();
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleButtonClick = (btn: PortalButton) => {
    playSound();
    const id = btn.id.toLowerCase();
    const title = btn.title.toLowerCase();

    if (id === 'odeme-talepleri' || title.includes('ödeme talep') || title.includes('odeme talep')) {
      setCurrentScreen('odeme-talepleri');
      try {
        window.history.pushState({ screen: 'odeme-talepleri' }, '', '#odeme-talepleri');
      } catch {
        // ignore
      }
    } else if (id === 'talepler' || (title.includes('talep') && !title.includes('ödeme') && !title.includes('odeme'))) {
      setCurrentScreen('talepler');
      try {
        window.history.pushState({ screen: 'talepler' }, '', '#talepler');
      } catch {
        // ignore
      }
    } else if (id === 'personel-diger-islemler' || title.includes('personel diğer')) {
      setCurrentScreen('personel-diger-islemler');
      try {
        window.history.pushState({ screen: 'personel-diger-islemler' }, '', '#personel-diger-islemler');
      } catch {
        // ignore
      }
    } else if (id === 'personel' || title.includes('personel')) {
      setCurrentScreen('personel');
      try {
        window.history.pushState({ screen: 'personel' }, '', '#personel');
      } catch {
        // ignore
      }
    } else if (id === 'bankalar' || title.includes('banka')) {
      setCurrentScreen('bankalar');
      try {
        window.history.pushState({ screen: 'bankalar' }, '', '#bankalar');
      } catch {
        // ignore
      }
    } else if (id === 'faturalar' || title.includes('fatura')) {
      setCurrentScreen('faturalar');
      try {
        window.history.pushState({ screen: 'faturalar' }, '', '#faturalar');
      } catch {
        // ignore
      }
    } else if (
      id === 'mutabakat-portali' ||
      id === 'mutabakat' ||
      title.includes('mutabakat')
    ) {
      setCurrentScreen('mutabakat-portali');
      try {
        window.history.pushState({ screen: 'mutabakat-portali' }, '', '#mutabakat-portali');
      } catch {
        // ignore
      }
    } else if (
      id === 'cek-senet-teminat' ||
      title.includes('çek') ||
      title.includes('senet') ||
      title.includes('teminat')
    ) {
      setCurrentScreen('cek-senet-teminat');
      try {
        window.history.pushState({ screen: 'cek-senet-teminat' }, '', '#cek-senet-teminat');
      } catch {
        // ignore
      }
    } else if (
      id === 'arac-takip' ||
      title.includes('araç takip') ||
      title.includes('arac takip') ||
      title.includes('araç talip') ||
      title.includes('aractakip')
    ) {
      setCurrentScreen('arac-takip');
      try {
        window.history.pushState({ screen: 'arac-takip' }, '', '#arac-takip');
      } catch {
        // ignore
      }
    } else if (
      id === 'arac-makina-parki' ||
      title.includes('araç') ||
      title.includes('makina')
    ) {
      setCurrentScreen('arac-makina-parki');
      try {
        window.history.pushState({ screen: 'arac-makina-parki' }, '', '#arac-makina-parki');
      } catch {
        // ignore
      }
    } else if (id === 'raporlar' || title.includes('rapor')) {
      setCurrentScreen('raporlar');
      try {
        window.history.pushState({ screen: 'raporlar' }, '', '#raporlar');
      } catch {
        // ignore
      }
    } else if (id === 'misafir-islemler' || title.includes('misafir')) {
      setCurrentScreen('misafir-islemler');
      try {
        window.history.pushState({ screen: 'misafir-islemler' }, '', '#misafir-islemler');
      } catch {
        // ignore
      }
    } else if (
      id === 'diger-islemler' ||
      title.includes('yönetici diğer') ||
      title.includes('diğer')
    ) {
      setCurrentScreen('diger-islemler');
      try {
        window.history.pushState({ screen: 'diger-islemler' }, '', '#diger-islemler');
      } catch {
        // ignore
      }
    } else if (btn.customUrl && btn.customUrl.trim() !== '') {
      let finalUrl = btn.customUrl.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    } else {
      setSelectedButton(btn);
    }
  };

  const handleBackToPortal = () => {
    playSound();
    setCurrentScreen('portal');
    try {
      if (window.location.hash) {
        window.history.pushState({ screen: 'portal' }, '', window.location.pathname);
      }
    } catch {
      // ignore
    }
  };

  // Save buttons to state, localStorage and sync back to Supabase
  const handleSaveUrl = async (buttonId: string, url: string) => {
    const targetBtn = buttons.find((b) => b.id === buttonId);

    setButtons((prev) => {
      const updated = prev.map((b) => (b.id === buttonId ? { ...b, customUrl: url } : b));
      try {
        localStorage.setItem('ozka_portal_buttons_v1', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (targetBtn) {
      await updatePortalButtonLink(
        { sira_no: targetBtn.siraNo, buton_adi: targetBtn.title },
        url
      );
    }

    // Also update selected button if currently opened in modal
    if (selectedButton && selectedButton.id === buttonId) {
      setSelectedButton((prev) => (prev ? { ...prev, customUrl: url } : null));
    }
  };

  const handleResetCustomUrls = () => {
    if (window.confirm('Tüm özelleştirilmiş bağlantıları sıfırlamak istiyor musunuz?')) {
      const reset = INITIAL_BUTTONS.map((b) => ({ ...b, customUrl: undefined }));
      setButtons(reset);
      try {
        localStorage.removeItem('ozka_portal_buttons_v1');
      } catch {
        // ignore
      }
    }
  };

  const playSound = () => {
    if (soundEnabled) {
      playPortalClick();
    }
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ozka_portal_sound', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Rol bazlı görünür butonlar (Admin: Hepsi, Personel/Misafir: Belirtilen butonlar gizli)
  const roleVisibleButtons = useMemo(() => {
    return buttons.filter((btn) => isButtonVisibleForRole(btn.id, userRole));
  }, [buttons, userRole]);

  // Yetkisiz ekranlara geçiş kontrolü (Örn: Personel/Misafir bir alt ekrana girmeye çalışırsa)
  useEffect(() => {
    if (currentScreen !== 'portal') {
      if (!isButtonVisibleForRole(currentScreen, userRole)) {
        setCurrentScreen('portal');
      }
    }
  }, [currentScreen, userRole]);

  const filteredButtons = roleVisibleButtons;

  // Eğer oturum açılmamışsa Şifreli Giriş Ekranını Göster
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const renderActiveScreen = () => {

  if (currentScreen === 'personel') {
    return (
      <PersonelScreen
        onBack={handleBackToPortal}
        playClickSound={playSound}
      />
    );
  }

  if (currentScreen === 'talepler') {
    return (
      <TaleplerScreen
        onBack={handleBackToPortal}
        playClickSound={playSound}
      />
    );
  }

  if (currentScreen === 'odeme-talepleri') {
    return (
      <OdemeTalepleriScreen
        onBack={handleBackToPortal}
        playClickSound={playSound}
        onOpenSantiyeTalepleri={() => {
          playSound();
          setCurrentScreen('santiye-talepleri');
          try {
            window.history.pushState({ screen: 'santiye-talepleri' }, '', '#santiye-talepleri');
          } catch {
            // ignore
          }
        }}
        onOpenPersonelAvans={() => {
          playSound();
          setCurrentScreen('personel-avans');
          try {
            window.history.pushState({ screen: 'personel-avans' }, '', '#personel-avans');
          } catch {
            // ignore
          }
        }}
      />
    );
  }

  if (currentScreen === 'santiye-talepleri') {
    return (
      <SantiyeTalepleriScreen
        onBack={() => {
          playSound();
          setCurrentScreen('odeme-talepleri');
          try {
            window.history.pushState({ screen: 'odeme-talepleri' }, '', '#odeme-talepleri');
          } catch {
            // ignore
          }
        }}
        playClickSound={playSound}
      />
    );
  }

  if (currentScreen === 'personel-avans') {
    return (
      <PersonelAvansScreen
        onBack={() => {
          playSound();
          setCurrentScreen('odeme-talepleri');
          try {
            window.history.pushState({ screen: 'odeme-talepleri' }, '', '#odeme-talepleri');
          } catch {
            // ignore
          }
        }}
        playClickSound={playSound}
      />
    );
  }

  if (currentScreen === 'bankalar') {
    return (
      <BankalarScreen
        onBack={handleBackToPortal}
        playClickSound={playSound}
        onOpenBankaHareketleri={() => {
          playSound();
          setCurrentScreen('banka-hareketleri');
          try {
            window.history.pushState({ screen: 'banka-hareketleri' }, '', '#banka-hareketleri');
          } catch {
            // ignore
          }
        }}
      />
    );
  }

  if (currentScreen === 'banka-hareketleri') {
    return (
      <BankaHareketleriScreen
        onBack={() => {
          playSound();
          setCurrentScreen('bankalar');
          try {
            window.history.pushState({ screen: 'bankalar' }, '', '#bankalar');
          } catch {
            // ignore
          }
        }}
        playClickSound={playSound}
      />
    );
  }

  if (currentScreen === 'faturalar') {
    return (
      <FaturalarScreen
        onBack={handleBackToPortal}
        playClickSound={playSound}
        initialOpenMutabakatModal={reopenFirmaSecOnFaturalar}
        onCloseMutabakatModal={() => setReopenFirmaSecOnFaturalar(false)}
        onOpenMutabakat={(firma) => {
          playSound();
          setSelectedMutabakatFirma(firma || null);
          setCurrentScreen('mutabakat-portali');
          try {
            window.history.pushState({ screen: 'mutabakat-portali' }, '', '#mutabakat-portali');
          } catch {
            // ignore
          }
        }}
      />
    );
  }

  if (currentScreen === 'mutabakat-portali') {
    return (
      <MutabakatPortaliScreen
        initialFirma={selectedMutabakatFirma}
        onBack={() => {
          playSound();
          setCurrentScreen('faturalar');
          try {
            window.history.pushState({ screen: 'faturalar' }, '', '#faturalar');
          } catch {
            // ignore
          }
        }}
        onReopenFirmaSec={() => {
          playSound();
          setReopenFirmaSecOnFaturalar(true);
          setCurrentScreen('faturalar');
          try {
            window.history.pushState({ screen: 'faturalar' }, '', '#faturalar');
          } catch {
            // ignore
          }
        }}
        onBackToHome={handleBackToPortal}
        playClickSound={playSound}
      />
    );
  }

  if (currentScreen === 'cek-senet-teminat') {
    return (
      <CekSenetTeminatScreen
        onBack={handleBackToPortal}
        playClickSound={playSound}
      />
    );
  }

  if (currentScreen === 'arac-makina-parki') {
    return (
      <AracMakinaScreen
        onBack={handleBackToPortal}
        playClickSound={playSound}
        onOpenAracTakip={() => {
          playSound();
          setCurrentScreen('arac-takip');
          try {
            window.history.pushState({ screen: 'arac-takip' }, '', '#arac-takip');
          } catch {
            // ignore
          }
        }}
      />
    );
  }

  if (currentScreen === 'arac-takip') {
    return (
      <AracTakipScreen
        onBack={() => {
          playSound();
          setCurrentScreen('arac-makina-parki');
          try {
            window.history.pushState({ screen: 'arac-makina-parki' }, '', '#arac-makina-parki');
          } catch {
            // ignore
          }
        }}
        playClickSound={playSound}
      />
    );
  }

  if (currentScreen === 'raporlar') {
    return (
      <RaporlarScreen
        onBack={handleBackToPortal}
        playClickSound={playSound}
      />
    );
  }

  if (currentScreen === 'personel-diger-islemler') {
    return (
      <PersonelDigerIslemlerScreen
        onBack={handleBackToPortal}
        playClickSound={playSound}
      />
    );
  }

  if (currentScreen === 'misafir-islemler') {
    return (
      <MisafirIslemlerScreen
        onBack={handleBackToPortal}
        playClickSound={playSound}
      />
    );
  }

  if (currentScreen === 'diger-islemler') {
    return (
      <OtherOperationsScreen
        onBack={handleBackToPortal}
        playClickSound={playSound}
        preloadedRows={digerButtons}
      />
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#030712] text-[#f8fafc]' : 'bg-[#f8fafc] text-slate-900'} transition-colors selection:bg-blue-500 selection:text-white flex flex-col justify-between overflow-x-hidden relative`}>
      {/* Sakin, Göz Yormayan ve Büyüleyici Arka Plan Ambiyansı */}
      {darkMode ? (
        <LoginAnimatedBackground interactive={false} showControls={false} opacityClass="opacity-45" />
      ) : (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-24 right-[-10%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-[120px]" />
        </div>
      )}

      <div className="relative z-10 flex-1">
        {/* Header Navigation */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onResetCustomUrls={handleResetCustomUrls}
          totalButtons={roleVisibleButtons.length}
          supabaseStatus={supabaseStatus}
          onRefreshSupabase={syncFromSupabase}
          currentUser={currentUser}
          userRole={userRole}
          onLogout={handleLogout}
        />

        {/* Main Content Area: Kurumsal Modüller, Ambiyans & Talep-İstek Formu */}
        <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex-1 flex flex-col space-y-3.5">
          {/* Hero Branding Section matching Elegant Dark / Light */}
          <header className="text-center pt-0.5 pb-0.5 relative z-10 flex flex-col items-center">
            <div className={`mb-1 p-0.5 rounded-lg border backdrop-blur-sm transition-colors ${
              darkMode
                ? 'bg-white/[0.03] border-white/10 shadow-sm shadow-blue-500/10'
                : 'bg-white border-slate-200 shadow-xs shadow-slate-200/50'
            }`}>
              <OzkaLogo size="sm" />
            </div>
            <AmbientBordoMaviTitle
              variant="hero"
              darkMode={darkMode}
              showSubtitle={true}
            />
          </header>

          {/* Quick Summary Ribbon */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-xs transition-colors ${
            darkMode
              ? 'bg-white/[0.03] border-white/10 text-slate-200'
              : 'bg-white border-slate-200 text-slate-800 shadow-xs'
          }`}>
            <div className="flex items-center flex-wrap gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-xs shadow-blue-500 animate-pulse" />
              <span className={`font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                Kurumsal İşlem Modülleri
              </span>
              <span className={darkMode ? 'text-white/20' : 'text-slate-300'}>•</span>
              <span className="font-semibold text-blue-500">
                {filteredButtons.length} Modül Aktif
              </span>
              {(() => {
                const rInfo = getRoleBadgeInfo(userRole);
                return (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${rInfo.bgClass} ${rInfo.colorClass}`}
                  >
                    Yetki: {rInfo.title}
                  </span>
                );
              })()}
              <span className={darkMode ? 'text-white/20' : 'text-slate-300'}>•</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                darkMode
                  ? 'bg-blue-500/15 border-blue-500/35 text-blue-300'
                  : 'bg-blue-50 border-blue-300 text-blue-900'
              }`}>
                <span>Yazılım ve Tasarım: <strong className="text-amber-300 dark:text-amber-300 font-black">EMİRHAN KALHAN</strong></span>
              </span>
            </div>

            {/* Quick Status Badges */}
            <div className={`flex items-center gap-2.5 text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className={darkMode ? 'text-gray-300' : 'text-slate-700'}>Sistem Aktif</span>
              </div>
              <span className={darkMode ? 'text-white/20' : 'text-slate-300'}>•</span>
              <div className={`flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>SSL Korumalı</span>
              </div>
            </div>
          </div>

          {/* KURUMSAL İŞLEM BUTONLARI & BÜYÜLEYİCİ CANLI AMBİYANS */}
          <section className="space-y-1 sm:space-y-1.5 flex-1 flex flex-col justify-center">
            {/* Group Section Header */}
            <div className="flex items-center gap-3 mb-0.5">
              <span className={`h-px flex-1 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
              <h2 className="text-[10px] sm:text-[11px] font-bold text-blue-500 tracking-[0.2em] uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                İŞLEM MODÜLLERİ • SÜREÇ YÖNETİMİ
              </h2>
              <span className={`h-px flex-1 ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
            </div>

            {/* BUTONLAR VE ALTINDAKİ HAREKETLİ AMBİYANS ALANI */}
            <div className="relative">
              {/* Buttons Grid/List: 8 Kart Ekrana Tam Sığar, Aşağı Kaymaz */}
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 relative z-10'
                    : 'grid grid-cols-1 md:grid-cols-2 gap-2 relative z-10'
                }
              >
                {filteredButtons.map((btn) => (
                  <PortalCard
                    key={btn.id}
                    button={btn}
                    onClick={handleButtonClick}
                    playClickSound={playSound}
                    viewMode={viewMode}
                  />
                ))}
              </div>

              {/* KULLANICI TALEBİ: BUTONLARIN ALTINDA YER ALAN GÖZ ALICI HAREKETLİ AMBİYANS (AŞAĞI ALINDI) */}
              <div className="mt-3 sm:mt-4">
                <ButtonsAmbientGlow darkMode={darkMode} />
              </div>

              {/* KULLANICI TALEBİ: CANLI BUTON AMBİYANSI ALANININ ALTINA TALEP-İSTEK FORMU */}
              <div className="mt-3.5 sm:mt-4.5">
                <TalepIstekFormu
                  currentUser={currentUser}
                  userRole={userRole}
                  darkMode={darkMode}
                  playClickSound={playSound}
                />
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Footer matching Elegant Dark - Ekrana Tam Oturan Kompakt Yapı */}
      <footer className="relative z-10 border-t border-white/10 py-2 sm:py-2.5 text-center text-xs text-gray-500 bg-white/[0.02] backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-bold text-slate-200 text-[11px]">
              Bayburt Öz-Ka İnş.İth.İhr.Tic.Ltd.Şti
            </span>
            <span className="text-white/20">•</span>
            <span className="text-blue-400 font-medium text-[11px]">Yazılım ve Tasarım: EMİRHAN KALHAN</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-gray-400">SİSTEM ÇEVRİMİÇİ</span>
            </div>
            <span className="text-white/20">•</span>
            <span>GÜVENLİ OTURUM</span>
          </div>
        </div>
      </footer>

      {/* Detail Modal */}
      <DetailModal
        button={selectedButton}
        onClose={() => setSelectedButton(null)}
        playClickSound={playSound}
        onOpenScreen={handleButtonClick}
      />
    </div>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-[#0a0a0c] text-[#f8fafc]' : 'bg-[#f8fafc] text-slate-900'} transition-colors`}>
      {/* EN ÜSTE DİJİTAL SAAT, GÜNDÜZ MODU & 1 SAAT OTURUM GÜVENLİK BANT */}
      <TopDigitalClockBar
        onLogout={handleLogout}
        currentUser={currentUser}
        userRoleTitle={getRoleBadgeInfo(userRole).title}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />
      <div className="flex-1 flex flex-col">
        {renderActiveScreen()}
      </div>

      {/* Şifreli Giriş Sonrası Hangi Modda Çalışmak İstersiniz Modalı */}
      <ThemeSelectionModal
        isOpen={showThemeModal}
        onSelectTheme={handleSelectTheme}
        onClose={handleCloseThemeModal}
      />

      {/* Program Açılışında Sağ Alt Köşede Vadesine 30 Gün Kalan Teminat Mektupları Uyarısı */}
      {/* KULLANICI ŞARTI: SADECE kullanıcılar tablosundaki parola ve kullanıcı adı ile girenler için görünür */}
      {(fromKullanicilar || authTable === 'kullanicilar') && (
        <TeminatMektubuUyari
          darkMode={darkMode}
          isKullanicilarUser={fromKullanicilar || authTable === 'kullanicilar'}
        />
      )}
    </div>
  );
}
