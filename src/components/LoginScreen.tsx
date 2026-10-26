import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Check,
  Database,
  X,
  ExternalLink,
  Copy,
  CheckCheck,
  Code2,
  Terminal,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import { OzkaAmbientLogo } from './OzkaAmbientLogo';
import { LoginAnimatedBackground } from './LoginAnimatedBackground';
import { UserRole } from '../types';
import {
  checkParolaWithKullaniciInTable,
  getAuthConfig,
  saveAuthConfig,
  testSupabaseConnection,
  SUPABASE_TARGET_PROJECT_ID,
  DEFAULT_SUPABASE_URL,
  SUPABASE_SQL_EDITOR_URL,
  KULLANICILAR_SQL_SCRIPT,
} from '../lib/auth';

interface LoginScreenProps {
  onLoginSuccess: (
    username: string,
    role: UserRole,
    matchedTable?: string,
    fromKullanicilarTable?: boolean
  ) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    role: UserRole;
    matchedTable?: string;
  } | null>(null);

  // KULLANICI TALEBİ: TAM ORTA ÜSTTE GECE / GÜNDÜZ MODU
  const [loginDarkMode, setLoginDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ozka_login_dark_mode');
      if (saved !== null) return saved === 'true';
    } catch {
      // ignore
    }
    return true; // Varsayılan Gece Modu
  });

  // KULLANICI TALEBİ: SAĞ ÜSTTE 3 TANE KUZEY IŞIKLARI BUTONU (MAVİ, BORDO, SARI) İLE PAROLA YANSIMA IŞIĞI
  const [passwordGlowColor, setPasswordGlowColor] = useState<'mavi' | 'bordo' | 'sari'>(() => {
    try {
      const saved = localStorage.getItem('ozka_pass_glow_color');
      if (saved === 'mavi' || saved === 'bordo' || saved === 'sari') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'bordo'; // Varsayılan Bordo
  });

  const handleSelectPassGlow = (color: 'mavi' | 'bordo' | 'sari') => {
    setPasswordGlowColor(color);
    try {
      localStorage.setItem('ozka_pass_glow_color', color);
    } catch {
      // ignore
    }
  };

  // Supabase Yapılandırma Modalı
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [modalTab, setModalTab] = useState<'key' | 'sql'>('key');
  const [copiedSql, setCopiedSql] = useState(false);
  const [cfgUrl, setCfgUrl] = useState(DEFAULT_SUPABASE_URL);
  const [cfgKey, setCfgKey] = useState('');
  const [cfgSavedNotice, setCfgSavedNotice] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(KULLANICILAR_SQL_SCRIPT);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const { url, anonKey } = getAuthConfig();
    setCfgUrl(url || DEFAULT_SUPABASE_URL);
    setCfgKey(anonKey || '');

    // SMS konfigürasyon çerezlerini temizle
    try {
      localStorage.removeItem('ozka_sms_auth_config_v1');
    } catch {
      // ignore
    }
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveAuthConfig(cfgUrl, cfgKey);
    setCfgSavedNotice(true);
    setTimeout(() => setCfgSavedNotice(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(cfgUrl, cfgKey);
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Bağlantı hatası oluştu.',
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  /**
   * GİRİŞ YAP BUTONU KOMUTLARI:
   * 1. KULLANICI ADI TABLOLARDA VARSA TİK YAP
   * 2. PAROLA TABLODA KULLANICI ADIYLA EŞLEŞİYORSA TİK YAP
   * 3. KULLANICI VE PAROLA UYUŞUYORSA DOĞRUDAN GİRİŞ YAP
   * 4. ŞİFRELER EŞLEŞMİYORSA KULLANICI ADI VEYA PAROLA HATALI DE
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMessage('LÜTFEN KULLANICI ADI VE PAROLANIZI GİRİNİZ');
      return;
    }

    setIsLoading(true);

    try {
      const passCheck = await checkParolaWithKullaniciInTable(trimmedUser, trimmedPass, true);
      if (!passCheck.matches) {
        setIsLoading(false);
        setErrorMessage('KULLANICI ADI VEYA PAROLA HATALI');
        return;
      }

      const role: UserRole = passCheck.role || 'misafir';
      const resolvedName = passCheck.username || trimmedUser;
      const matchedTable = passCheck.matchedTable || 'misafirsifre';
      const fromKullanicilarTable = Boolean(
        passCheck.fromKullanicilarTable || matchedTable === 'kullanicilar'
      );

      setSuccessInfo({
        role,
        matchedTable,
      });

      try {
        localStorage.setItem(
          'ozka_auth_session',
          JSON.stringify({
            username: resolvedName,
            role,
            matchedTable,
            fromKullanicilarTable,
            loginTime: new Date().toISOString(),
          })
        );
      } catch {
        // ignore
      }

      setIsLoading(false);
      onLoginSuccess(resolvedName, role, matchedTable, fromKullanicilarTable);
    } catch (err) {
      setIsLoading(false);
      console.error('Giriş doğrulama hatası:', err);
      setErrorMessage('KULLANICI ADI VEYA PAROLA HATALI');
    }
  };

  return (
    <div className={`h-screen max-h-screen w-full relative flex flex-col items-center justify-center p-2 sm:p-3 overflow-hidden font-sans selection:bg-blue-500/30 selection:text-blue-200 transition-colors duration-700 ${
      loginDarkMode ? 'bg-[#030712] text-white' : 'bg-[#f1f5f9] text-slate-800'
    }`}>
      {/* HAREKETLİ VE GÖZ ALICI ARKA PLAN EFEKTLERİ (KUZEY IŞIKLARI LİNKLERİ SOL ÜSTTE YER ALIR) */}
      <LoginAnimatedBackground isLightMode={!loginDarkMode} showControls={true} />

      {/* 1. KULLANICI TALEBİ: PROGRAMIN TAM ORTA ÜSTÜNE GECE GÜNDÜZ MODU (BEYAZ ARKA FON) */}
      <div className="absolute top-2.5 sm:top-3.5 left-1/2 -translate-x-1/2 pointer-events-auto z-40">
        <div className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-lg shadow-black/20 text-slate-800 backdrop-blur-md transition-all duration-300">
          <button
            type="button"
            onClick={() => setLoginDarkMode(true)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-300 ${
              loginDarkMode
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/30 ring-1 ring-slate-800 scale-102'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Gece Modu"
          >
            <Moon className={`w-3.5 h-3.5 ${loginDarkMode ? 'text-indigo-400' : 'text-slate-500'}`} />
            <span>Gece</span>
          </button>
          <button
            type="button"
            onClick={() => setLoginDarkMode(false)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-300 ${
              !loginDarkMode
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/40 ring-1 ring-amber-400 scale-102'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Gündüz Modu"
          >
            <Sun className={`w-3.5 h-3.5 ${!loginDarkMode ? 'text-white' : 'text-amber-500'}`} />
            <span>Gündüz</span>
          </button>
        </div>
      </div>

      {/* 2. KULLANICI TALEBİ: SAĞ ÜSTE 3 TANE BUTON (MAVİ, BORDO, SARI - BEYAZ ARKA FON) */}
      <div className="absolute top-2.5 sm:top-3.5 right-2.5 sm:right-4 pointer-events-auto z-40">
        <div className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-lg shadow-black/20 text-slate-800 backdrop-blur-md transition-all duration-300">
          <button
            type="button"
            onClick={() => handleSelectPassGlow('mavi')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-300 relative overflow-hidden ${
              passwordGlowColor === 'mavi'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/40 scale-105'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
            title="Mavi Kuzey Işığı (Parola Alanı Yansıması)"
          >
            <span className={`w-2 h-2 rounded-full ${passwordGlowColor === 'mavi' ? 'bg-cyan-200 shadow-[0_0_8px_#fff]' : 'bg-blue-500'} animate-pulse`} />
            <span>Mavi</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPassGlow('bordo')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-300 relative overflow-hidden ${
              passwordGlowColor === 'bordo'
                ? 'bg-gradient-to-r from-[#be123c] to-[#e11d48] text-white shadow-md shadow-rose-900/40 scale-105'
                : 'text-slate-700 hover:text-rose-700 hover:bg-rose-50'
            }`}
            title="Bordo Kuzey Işığı (Parola Alanı Yansıması)"
          >
            <span className={`w-2 h-2 rounded-full ${passwordGlowColor === 'bordo' ? 'bg-rose-200 shadow-[0_0_8px_#fff]' : 'bg-[#be123c]'} animate-pulse`} />
            <span>Bordo</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPassGlow('sari')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-300 relative overflow-hidden ${
              passwordGlowColor === 'sari'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md shadow-amber-500/40 scale-105'
                : 'text-slate-700 hover:text-amber-700 hover:bg-amber-50'
            }`}
            title="Sarı Kuzey Işığı (Parola Alanı Yansıması)"
          >
            <span className={`w-2 h-2 rounded-full ${passwordGlowColor === 'sari' ? 'bg-yellow-100 shadow-[0_0_8px_#fff]' : 'bg-amber-500'} animate-pulse`} />
            <span>Sarı</span>
          </button>
        </div>
      </div>

      {/* MERKEZ GİRİŞ ALANI: EKRANA TAM SIĞDIRILMIŞ ŞIK VE DERLİ TOPLU GİRİŞ PANELİ */}
      <div className="flex flex-col items-center justify-center w-full max-w-[390px] sm:max-w-[420px] relative z-10 my-auto py-0">
        {/* HAREKETLİ AMBİYANS LOGO (KULLANICI TALEBİ: PAROLA ALANINDAN YUKARI DOĞRU AYRILMIŞ) */}
        <div className="transform scale-[0.72] sm:scale-[0.80] mb-5 sm:mb-6 origin-bottom">
          <OzkaAmbientLogo
            glowColor={passwordGlowColor}
            isDarkMode={loginDarkMode}
            className="mb-0"
          />
        </div>

        {/* GİRİŞ MERKEZ KARTI */}
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full relative"
        >
          {/* GİRİŞ PANELİ YANLARINDA DİNAMİK IŞIK YANSIMASI (MAVİ, BORDO, SARI SEÇİMİNE GÖRE) */}
          {/* Sol Yan Işık Yansıması */}
          <div
            className={`absolute -left-6 sm:-left-10 top-1/2 -translate-y-1/2 w-24 sm:w-36 h-3/4 blur-3xl pointer-events-none -z-10 rounded-full animate-pulse transition-all duration-700 ${
              passwordGlowColor === 'mavi'
                ? 'bg-gradient-to-r from-blue-600/30 via-cyan-400/20 to-transparent'
                : passwordGlowColor === 'sari'
                ? 'bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-transparent'
                : 'bg-gradient-to-r from-[#be123c]/20 via-[#9f1239]/12 to-transparent'
            }`}
            style={{ animationDuration: '5s' }}
          />

          {/* Sağ Yan Işık Yansıması */}
          <div
            className={`absolute -right-6 sm:-right-10 top-1/2 -translate-y-1/2 w-24 sm:w-36 h-3/4 blur-3xl pointer-events-none -z-10 rounded-full animate-pulse transition-all duration-700 ${
              passwordGlowColor === 'mavi'
                ? 'bg-gradient-to-l from-blue-600/30 via-cyan-400/20 to-transparent'
                : passwordGlowColor === 'sari'
                ? 'bg-gradient-to-l from-amber-500/30 via-yellow-400/20 to-transparent'
                : 'bg-gradient-to-l from-[#be123c]/20 via-[#9f1239]/12 to-transparent'
            }`}
            style={{ animationDuration: '5s' }}
          />

          {/* Kart Altı ve Çevresi Dinamik Aura */}
          <div
            className={`absolute -inset-2.5 sm:-inset-3.5 rounded-[36px] blur-2xl pointer-events-none -z-10 transition-all duration-700 ${
              passwordGlowColor === 'mavi'
                ? 'bg-gradient-to-r from-blue-600/20 via-cyan-500/15 to-blue-600/20'
                : passwordGlowColor === 'sari'
                ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20'
                : 'bg-gradient-to-r from-[#9f1239]/18 via-blue-900/10 to-[#9f1239]/18'
            }`}
          />

          {/* Kart Dış Çerçevesi - Dinamik Işıklı */}
          <div
            className={`relative rounded-3xl p-[1.5px] transition-all duration-700 ${
              loginDarkMode
                ? passwordGlowColor === 'mavi'
                  ? 'bg-gradient-to-r from-cyan-500/60 via-blue-500/25 to-cyan-500/60 shadow-[0_0_35px_rgba(6,182,212,0.22),-12px_0_24px_-6px_rgba(59,130,246,0.25),12px_0_24px_-6px_rgba(59,130,246,0.25)]'
                  : passwordGlowColor === 'sari'
                  ? 'bg-gradient-to-r from-amber-500/60 via-yellow-400/25 to-amber-500/60 shadow-[0_0_35px_rgba(245,158,11,0.22),-12px_0_24px_-6px_rgba(234,179,8,0.25),12px_0_24px_-6px_rgba(234,179,8,0.25)]'
                  : 'bg-gradient-to-r from-[#be123c]/45 via-blue-500/20 to-[#be123c]/45 shadow-[0_0_30px_rgba(159,18,57,0.16),-10px_0_20px_-6px_rgba(190,18,60,0.20),10px_0_20px_-6px_rgba(190,18,60,0.20)]'
                : passwordGlowColor === 'mavi'
                ? 'bg-gradient-to-r from-blue-400/50 via-cyan-400/30 to-blue-400/50 shadow-xl shadow-cyan-200/50'
                : passwordGlowColor === 'sari'
                ? 'bg-gradient-to-r from-amber-400/50 via-yellow-400/30 to-amber-400/50 shadow-xl shadow-amber-200/50'
                : 'bg-gradient-to-r from-[#be123c]/35 via-blue-400/20 to-[#be123c]/35 shadow-xl shadow-slate-300/60'
            }`}
          >
            <div
              className={`rounded-3xl backdrop-blur-2xl px-5 sm:px-7 py-4 sm:py-4.5 relative overflow-hidden transition-colors duration-500 ${
                loginDarkMode
                  ? 'bg-[#070e20]/95 border border-white/10 shadow-inner'
                  : 'bg-white/95 border border-slate-200/80 shadow-inner text-slate-800'
              }`}
            >
              {/* Sol Kenar Dinamik Işık Şeridi */}
              <div
                className={`absolute left-0 inset-y-10 w-[1.5px] bg-gradient-to-b from-transparent to-transparent transition-all duration-700 ${
                  passwordGlowColor === 'mavi'
                    ? 'via-cyan-400/70 shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                    : passwordGlowColor === 'sari'
                    ? 'via-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'via-[#be123c]/50 shadow-[0_0_8px_rgba(225,29,72,0.3)]'
                }`}
              />

              {/* Sağ Kenar Dinamik Işık Şeridi */}
              <div
                className={`absolute right-0 inset-y-10 w-[1.5px] bg-gradient-to-b from-transparent to-transparent transition-all duration-700 ${
                  passwordGlowColor === 'mavi'
                    ? 'via-cyan-400/70 shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                    : passwordGlowColor === 'sari'
                    ? 'via-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'via-[#be123c]/50 shadow-[0_0_8px_rgba(225,29,72,0.3)]'
                }`}
              />

              {/* Üst İnce Işıklı Vurgu Çizgisi */}
              <div
                className={`absolute top-0 inset-x-0 h-[1.5px] transition-all duration-700 opacity-70 ${
                  passwordGlowColor === 'mavi'
                    ? 'bg-gradient-to-r from-cyan-400/70 via-blue-300/60 to-cyan-400/70'
                    : passwordGlowColor === 'sari'
                    ? 'bg-gradient-to-r from-amber-400/70 via-yellow-300/60 to-amber-400/70'
                    : 'bg-gradient-to-r from-[#be123c]/60 via-cyan-400/50 to-[#be123c]/60'
                }`}
              />

              {/* BAŞLIK BÖLÜMÜ */}
              <div className="flex flex-col items-center text-center mb-3 sm:mb-3.5">
                {/* Başlık: BAYBURT ÖZKA İNŞAAT GİRİŞ */}
                <div className="space-y-0.5">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight uppercase drop-shadow-sm flex flex-col items-center">
                    <span className={`bg-clip-text text-transparent transition-all ${
                      loginDarkMode
                        ? 'bg-gradient-to-r from-white via-blue-100 to-slate-200'
                        : 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-800'
                    }`}>
                      BAYBURT ÖZKA İNŞAAT
                    </span>
                    <span className={`text-sm sm:text-base font-extrabold tracking-widest mt-0.5 ${
                      loginDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      GİRİŞ
                    </span>
                  </h1>
                  <p className={`text-[11px] sm:text-xs font-medium transition-colors ${
                    loginDarkMode ? 'text-blue-200/70' : 'text-slate-600'
                  }`}>
                    Kurumsal Yönetim & Muhasebe Portalı
                  </p>
                </div>
              </div>

            {/* HATA MESAJI BİLDİRİMİ */}
            <AnimatePresence mode="wait">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, height: 'auto', y: 0, scale: 1 }}
                  exit={{ opacity: 0, height: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="mb-3 overflow-hidden"
                >
                  <div className="p-2.5 sm:p-3 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center gap-2.5 text-rose-100 text-xs font-bold shadow-lg shadow-rose-950/60 ring-1 ring-rose-500/40">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span className="flex-1 tracking-wide uppercase">{errorMessage}</span>
                  </div>
                </motion.div>
              )}

              {successInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  className="mb-3 overflow-hidden"
                >
                  <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-emerald-200 text-xs font-semibold shadow-lg shadow-emerald-950/40">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold">
                        Giriş Başarılı! Rol: {successInfo.role.toUpperCase()}
                      </div>
                      {successInfo.matchedTable && (
                        <div className="text-[10px] text-emerald-300/80">
                          Doğrulandı: {successInfo.matchedTable}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FORM ALANI */}
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5" noValidate>
              {/* KULLANICI ADI ALANI */}
              <div className="space-y-1">
                <label
                  htmlFor="login-username"
                  className={`block text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    loginDarkMode ? 'text-blue-200/90' : 'text-slate-700'
                  }`}
                >
                  KULLANICI ADI
                </label>
                <div className="relative group">
                  <div
                    className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${
                      errorMessage
                        ? 'text-rose-400'
                        : 'text-blue-400/80 group-focus-within:text-blue-300'
                    }`}
                  >
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoComplete="username"
                    placeholder="Kullanıcı adınızı giriniz"
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium
                      outline-none transition-all shadow-inner ${
                        loginDarkMode
                          ? 'bg-[#071128]/85 text-white placeholder:text-blue-300/40 border border-blue-500/25 focus:border-blue-400 focus:bg-[#0b1a3d] focus:ring-2 focus:ring-blue-500/30'
                          : 'bg-slate-50/90 text-slate-900 placeholder:text-slate-400 border border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-400/30'
                      }`}
                    disabled={isLoading || Boolean(successInfo)}
                  />
                </div>
              </div>

              {/* PAROLA GİRİŞ ALANI (KULLANICI TALEBİ: BİRAZ DAHA BÜYÜTÜLDÜ VE ŞIKLAŞTIRILDI) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className={`block text-xs sm:text-[13px] font-black uppercase tracking-wider transition-colors ${
                    loginDarkMode ? 'text-blue-200' : 'text-slate-800'
                  }`}
                >
                  PAROLA
                </label>
                <div className="relative group">
                  {/* PAROLA ALANI KUZEY IŞIKLARI DİNAMİK YANSIMA IŞIĞI (MAVİ, BORDO, SARI) */}
                  <div
                    className={`absolute -inset-1.5 sm:-inset-2 rounded-2xl blur-xl pointer-events-none transition-all duration-500 -z-10 ${
                      passwordGlowColor === 'mavi'
                        ? 'bg-gradient-to-r from-blue-600/50 via-cyan-400/45 to-blue-600/50 opacity-100'
                        : passwordGlowColor === 'sari'
                        ? 'bg-gradient-to-r from-amber-500/50 via-yellow-400/45 to-amber-500/50 opacity-100'
                        : 'bg-gradient-to-r from-[#be123c]/50 via-[#f43f5e]/40 to-[#be123c]/50 opacity-100'
                    }`}
                  />

                  <div
                    className={`absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none transition-colors duration-300 ${
                      errorMessage
                        ? 'text-rose-400'
                        : passwordGlowColor === 'mavi'
                        ? 'text-cyan-400 group-focus-within:text-cyan-300'
                        : passwordGlowColor === 'sari'
                        ? 'text-amber-400 group-focus-within:text-amber-300'
                        : 'text-rose-400 group-focus-within:text-rose-300'
                    }`}
                  >
                    <Lock className="w-5.5 h-5.5" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`w-full pl-12 pr-12 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold
                      outline-none transition-all duration-300 shadow-inner tracking-widest ${
                        loginDarkMode
                          ? 'bg-[#071128]/95 text-white placeholder:text-blue-300/40'
                          : 'bg-slate-50 text-slate-900 placeholder:text-slate-400'
                      } ${
                        passwordGlowColor === 'mavi'
                          ? 'border-2 border-cyan-400/85 shadow-[0_0_28px_rgba(6,182,212,0.45)] focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/50'
                          : passwordGlowColor === 'sari'
                          ? 'border-2 border-amber-400/85 shadow-[0_0_28px_rgba(245,158,11,0.45)] focus:border-amber-300 focus:ring-2 focus:ring-amber-500/50'
                          : 'border-2 border-rose-500/85 shadow-[0_0_28px_rgba(225,29,72,0.45)] focus:border-rose-400 focus:ring-2 focus:ring-rose-500/50'
                      }`}
                    disabled={isLoading || Boolean(successInfo)}
                  />

                  <div className="absolute inset-y-0 right-0 pr-3.5 sm:pr-4 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 rounded-lg text-blue-400 hover:text-white hover:bg-blue-500/20 transition-colors cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* BENİ HATIRLA */}
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-blue-500/30 bg-[#071128] text-blue-600 focus:ring-blue-500/40 focus:ring-offset-0 focus:ring-1"
                  />
                  <span className="text-blue-200/80 group-hover:text-blue-100 font-medium">
                    Beni hatırla
                  </span>
                </label>
              </div>

              {/* GİRİŞ YAP BUTONU */}
              <motion.button
                type="submit"
                disabled={isLoading || Boolean(successInfo)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full py-2.5 sm:py-3 px-5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  isLoading || Boolean(successInfo)
                    ? 'bg-blue-600/50 text-blue-200 cursor-wait'
                    : passwordGlowColor === 'mavi'
                    ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-cyan-600/30 hover:shadow-cyan-500/50 border border-cyan-400/40'
                    : passwordGlowColor === 'sari'
                    ? 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-amber-600/30 hover:shadow-amber-500/50 border border-yellow-400/40'
                    : 'bg-gradient-to-r from-[#be123c] via-blue-600 to-[#be123c] hover:from-[#e11d48] hover:to-blue-500 text-white shadow-rose-950/60 hover:shadow-rose-900/80 border border-rose-500/30'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Giriş Yapılıyor...</span>
                  </>
                ) : successInfo ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Giriş Yapıldı</span>
                  </>
                ) : (
                  <>
                    <span>GİRİŞ YAP</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>

        {/* ALT TELİF & BİLGİ */}
        <div className="mt-2.5 text-center text-[10px] sm:text-[11px] text-blue-300/70 space-y-0.5">
          <p className="font-semibold text-slate-200 tracking-wide">Bayburt Öz-Ka İnş.İth.İhr.Tic.Ltd.Şti</p>
          <p className="text-[10px] text-blue-400 font-medium">
            Yazılım ve Tasarım: EMİRHAN KALHAN
          </p>
        </div>
      </motion.div>
      </div>

      {/* SUPABASE PROJE & API KEY YAPILANDIRMA MODALI */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-lg rounded-2xl bg-[#09142c] border border-blue-500/30 p-6 shadow-2xl space-y-5 text-left text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
                <div className="flex items-center gap-2.5 text-blue-300 font-bold text-sm">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Supabase Proje & Doğrulama Ayarları</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* TAB SEÇİMİ: ANON KEY / SQL KODU */}
              <div className="flex border-b border-blue-500/20 text-xs">
                <button
                  type="button"
                  onClick={() => setModalTab('key')}
                  className={`flex-1 py-2.5 px-4 font-semibold text-center transition-colors border-b-2 flex items-center justify-center gap-2 ${
                    modalTab === 'key'
                      ? 'border-blue-400 text-blue-300 bg-blue-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Anon Key Tanımlama</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('sql')}
                  className={`flex-1 py-2.5 px-4 font-semibold text-center transition-colors border-b-2 flex items-center justify-center gap-2 ${
                    modalTab === 'sql'
                      ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>SQL Kurulum Kodu</span>
                </button>
              </div>

              {modalTab === 'sql' ? (
                /* TAB 2: SQL KODU GÖRÜNTÜLE VE KOPYALA */
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        Supabase SQL Editor Kurulum Kodu
                      </span>
                      <a
                        href={SUPABASE_SQL_EDITOR_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <span>SQL Editor'ı Aç</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-emerald-200/80 text-[11px] leading-relaxed">
                      Aşağıdaki kodu kopyalayıp Supabase SQL Editor'a yapıştırıp <strong>RUN</strong> tuşuna bastığınızda <code className="bg-black/40 px-1 py-0.5 rounded text-white">kullanicilar</code> tablonuz ve örnek hesaplar otomatik kurulacaktır.
                    </p>
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between pb-1.5 text-[11px] text-gray-300 font-mono">
                      <span>PostgreSQL Script</span>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                          copiedSql
                            ? 'bg-emerald-500 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        {copiedSql ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Kopyalandı!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>SQL Kodunu Kopyala</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-[#050b18] border border-blue-500/25 text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-56 leading-relaxed select-all">
                      {KULLANICILAR_SQL_SCRIPT}
                    </pre>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/20 text-xs text-blue-200/80 space-y-1">
                    <span className="font-semibold text-white block">Adımlar:</span>
                    <ol className="list-decimal pl-5 space-y-0.5 text-[11px]">
                      <li>Yukarıdaki <strong>SQL Kodunu Kopyala</strong> butonuna basın.</li>
                      <li><strong>SQL Editor'ı Aç</strong> butonuna tıklayarak Supabase sayfasını açın.</li>
                      <li>Kodu yapıştırıp sağ alttaki yeşil <strong>RUN</strong> butonuna basın.</li>
                    </ol>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-blue-500/20">
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(false)}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-gray-300 transition-colors"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              ) : (
                /* TAB 1: ANON KEY VE URL AYARI */
                <>
                  <div className="text-xs text-blue-100/80 space-y-2.5">
                    <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-500/25 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-[12px]">Supabase Tablo Bağlantıları:</span>
                        <a
                          href={`https://supabase.com/dashboard/project/${SUPABASE_TARGET_PROJECT_ID}/editor/18387?schema=public/kullanicilar`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono font-bold"
                        >
                          <span>kullanicilar Tablosu ↗</span>
                        </a>
                      </div>
                      <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-blue-300">
                        <li><strong>kullanicilar</strong> → Eşleşirse Admin (Tüm Butonlar Açık)</li>
                        <li><strong>personelsifre</strong> → Eşleşirse Personel</li>
                        <li><strong>misafirsifre</strong> → Eşleşirse Misafir (Kısıtlı yetki)</li>
                      </ul>
                    </div>
                  </div>

                  <form onSubmit={handleSaveConfig} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-blue-200">
                        Supabase Proje URL:
                      </label>
                      <input
                        type="text"
                        value={cfgUrl}
                        onChange={(e) => setCfgUrl(e.target.value)}
                        placeholder={DEFAULT_SUPABASE_URL}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-blue-500/30 text-xs font-mono text-white placeholder:text-gray-500 focus:border-blue-400 outline-none"
                      />
                      <span className="text-[10px] text-blue-400/60 block">
                        Hedef Proje ID: <code className="text-emerald-400">{SUPABASE_TARGET_PROJECT_ID}</code>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-blue-200">
                          Supabase Anon (Public) Key:
                        </label>
                        <a
                          href={`https://supabase.com/dashboard/project/${SUPABASE_TARGET_PROJECT_ID}/settings/api`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>API Ayarlarından Key Al ↗</span>
                        </a>
                      </div>
                      <input
                        type="password"
                        value={cfgKey}
                        onChange={(e) => setCfgKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-blue-500/30 text-xs font-mono text-white placeholder:text-gray-500 focus:border-blue-400 outline-none"
                      />
                      <span className="text-[10px] text-gray-400 block">
                        Supabase Dashboard &gt; Project Settings &gt; API &gt; <code>anon public key</code> değerini yapıştırabilirsiniz.
                      </span>
                    </div>

                    {/* CANLI TEST BUTONU VE SONUÇ */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTestingConn}
                        className="w-full py-2.5 px-3 rounded-xl bg-blue-900/40 hover:bg-blue-900/60 border border-blue-500/40 text-blue-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        <Database className={`w-3.5 h-3.5 text-blue-400 ${isTestingConn ? 'animate-spin' : ''}`} />
                        <span>{isTestingConn ? 'kullanicilar Tablosu Test Ediliyor...' : "'kullanicilar' Tablo Bağlantısını Test Et"}</span>
                      </button>

                      {testResult && (
                        <div
                          className={`mt-2 p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                            testResult.success
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                          }`}
                        >
                          {testResult.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <span className="break-all">{testResult.message}</span>
                        </div>
                      )}
                    </div>

                    {cfgSavedNotice && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Bağlantı ayarları başarıyla kaydedildi!</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-500/20">
                      <button
                        type="button"
                        onClick={() => setShowConfigModal(false)}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-gray-300 transition-colors"
                      >
                        Kapat
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/30"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Kaydet ve Uygula</span>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
