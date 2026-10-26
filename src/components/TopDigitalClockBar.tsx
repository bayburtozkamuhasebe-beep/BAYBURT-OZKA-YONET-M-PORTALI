import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Calendar,
  Sun,
  Moon,
} from 'lucide-react';

interface TopDigitalClockBarProps {
  onLogout: () => void;
  currentUser?: string;
  userRoleTitle?: string;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

// 1 Saatlik Oturum Süresi (60 dakika = 3600 saniye)
const ONE_HOUR_SECONDS = 60 * 60;
// 1 saat dolduktan sonra yanıt için tanınan süre (60 saniye)
const PROMPT_TIMEOUT_SECONDS = 60;

export const TopDigitalClockBar: React.FC<TopDigitalClockBarProps> = ({
  onLogout,
  currentUser = 'Yönetici',
  userRoleTitle = 'Yönetici',
  darkMode = true,
  onToggleDarkMode,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  // 1 saatlik oturum sayacı (saniye cinsinden)
  const [sessionSeconds, setSessionSeconds] = useState<number>(ONE_HOUR_SECONDS);
  // 1 saat dolduğunda açılacak "Devam edilsin mi?" uyarı modalı
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  // Uyarı modalı açıkken kullanıcı işlem yapmazsa geri sayım sayacı
  const [promptCountdown, setPromptCountdown] = useState<number>(PROMPT_TIMEOUT_SECONDS);
  // Bildirim toast
  const [sessionExtendedToast, setSessionExtendedToast] = useState<boolean>(false);

  // Dijital Saat Güncelleme (Her saniye)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setDateStr(
        now.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          weekday: 'long',
        })
      );
    };

    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // 1 Saatlik Oturum Sayacı
  useEffect(() => {
    if (showWarningModal) return; // Uyarı modalı açıkken ana sayaç durur, modal geri sayımı devreye girer

    const timer = setInterval(() => {
      setSessionSeconds((prev) => {
        if (prev <= 1) {
          // 1 saat doldu -> "Devam edilsin mi?" uyarısını aç
          setShowWarningModal(true);
          setPromptCountdown(PROMPT_TIMEOUT_SECONDS);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarningModal]);

  // "Devam edilsin mi?" uyarı modalı geri sayımı (İşlem yapılmazsa otomatik çıkış)
  useEffect(() => {
    if (!showWarningModal) return;

    const modalTimer = setInterval(() => {
      setPromptCountdown((prev) => {
        if (prev <= 1) {
          // Tanınan süre doldu, kullanıcı hiçbir işlem yapmadı -> Çıkış yap ve şifre ekranına geç
          clearInterval(modalTimer);
          setShowWarningModal(false);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(modalTimer);
  }, [showWarningModal, onLogout]);

  // Devam Et -> Oturumu 1 saat daha uzat
  const handleExtendSession = () => {
    setSessionSeconds(ONE_HOUR_SECONDS);
    setShowWarningModal(false);
    setPromptCountdown(PROMPT_TIMEOUT_SECONDS);
    setSessionExtendedToast(true);
    setTimeout(() => setSessionExtendedToast(false), 3500);
  };

  // Çıkış Yap -> Hemen çık ve şifre ekranına dön
  const handleConfirmLogout = () => {
    setShowWarningModal(false);
    onLogout();
  };

  // Kalan süreyi formatlama (Saat : Dakika : Saniye)
  const formatRemainingTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    if (hours > 0) {
      return `${hours} sa ${minutes.toString().padStart(2, '0')} dk`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* EN ÜSTE DİJİTAL SAAT, GÜNDÜZ MODU & 1 SAAT OTURUM BİLGİ BANDI */}
      <div
        className={`w-full border-b transition-colors relative z-40 shadow-md backdrop-blur-md ${
          darkMode
            ? 'bg-[#050508] border-white/10 text-gray-300'
            : 'bg-white/95 border-slate-200 text-slate-700'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-3">
          
          {/* Sol: Tarih ve Sistem Güvenliği */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg border ${
                darkMode
                  ? 'bg-white/5 border-white/10 text-slate-300'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-500" />
              <span className={`font-semibold text-[11px] sm:text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {dateStr || '...'}
              </span>
            </span>
            <span
              className={`hidden md:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${
                darkMode
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>1 Saatlik Güvenli Oturum</span>
            </span>
          </div>

          {/* Orta: EN ÜSTTE CANLI DİJİTAL SAAT (VURGULU VE ŞIK) */}
          <div className="flex items-center gap-2 mx-auto sm:mx-0 order-first sm:order-none w-full sm:w-auto justify-center">
            <div
              className={`flex items-center gap-2 px-3.5 py-1 rounded-xl border shadow-md transition-all ${
                darkMode
                  ? 'bg-gradient-to-r from-cyan-950/60 via-slate-900 to-cyan-950/60 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border-cyan-400/50 shadow-md'
              }`}
            >
              <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
              <div className="flex items-center">
                <span className="font-mono text-base sm:text-lg font-black tracking-widest text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                  {timeStr || '00:00:00'}
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400/90 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 hidden min-[400px]:inline">
                Canlı Saat
              </span>
            </div>
          </div>

          {/* Sağ: Gündüz/Gece Modu Butonu & 1 Saatlik Oturum Kalan Süresi */}
          <div className="flex items-center gap-2 text-xs">
            {/* GÜNDÜZ / GECE MODU GEÇİŞ BUTONU (EN ÜSTTE NET VE ERİŞİLEBİLİR) */}
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                  darkMode
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 hover:shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 shadow-sm'
                }`}
                title={darkMode ? 'Gündüz Moduna Geç (Aydınlık Tema)' : 'Gece Moduna Geç (Karanlık Tema)'}
              >
                {darkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>☀️ Gündüz Modu</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-yellow-200" />
                    <span>🌙 Gece Modu</span>
                  </>
                )}
              </button>
            )}

            {/* Oturum Sayacı */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border ${
                sessionSeconds <= 300
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                  : darkMode
                  ? 'bg-white/5 text-gray-300 border-white/10'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Portala girişten itibaren 1 saatlik oturum süresi"
            >
              <span className="text-slate-400 hidden sm:inline">⏱️ Kalan:</span>
              <span className={`font-black tracking-wider ${darkMode ? 'text-amber-300' : 'text-amber-600'}`}>
                {formatRemainingTime(sessionSeconds)}
              </span>
            </div>

            {/* Süreyi Yenile Butonu */}
            <button
              type="button"
              onClick={handleExtendSession}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                darkMode
                  ? 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border-blue-500/30'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
              }`}
              title="Oturum süresini 1 saat uzat"
            >
              <RefreshCw className="w-3 h-3 text-blue-500" />
              <span className="hidden sm:inline">Yenile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Süre Uzatıldı Bildirim Toastı */}
      {sessionExtendedToast && (
        <div className="fixed top-12 right-4 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-950/95 border border-emerald-500/40 text-emerald-200 text-xs font-semibold shadow-2xl backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Oturum süreniz 1 saat (60 dakika) uzatıldı!</span>
        </div>
      )}

      {/* 1 SAAT SONRA "DEVAM EDİLSİN Mİ?" UYARI MODALI */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#121217] border border-amber-500/50 rounded-2xl p-6 shadow-2xl space-y-5 text-center relative overflow-hidden">
            {/* Animasyonlu Üst Çizgi */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 animate-pulse" />

            <div className="inline-flex p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <AlertTriangle className="w-9 h-9 animate-bounce text-amber-400" />
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xl font-black text-white tracking-wide">
                Devam Edilsin mi?
              </h3>
              <p className="text-sm text-gray-200 leading-relaxed">
                Portala giriş yaptıktan sonra <strong className="text-amber-300 font-bold">1 saatlik</strong> oturum süreniz tamamlandı.
              </p>
              
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 font-semibold space-y-1">
                <p>Herhangi bir işlem yapılmazsa oturumunuz kapatılacak ve şifre ekranına yönlendirileceksiniz.</p>
                <div className="text-base font-black text-white font-mono flex items-center justify-center gap-1.5 pt-1">
                  <span>Otomatik Çıkışa Kalan:</span>
                  <span className="text-rose-400 text-lg">{promptCountdown} sn</span>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Çalışmanıza kesintisiz devam etmek için lütfen aşağıdaki butondan onay verin.
              </p>
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleExtendSession}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Devam Et (+1 Saat)</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 font-bold text-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
