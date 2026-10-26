import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  List,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Sparkles,
  LogOut,
  UserCheck,
  Shield,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import { AmbientBordoMaviTitle } from './AmbientBordoMaviTitle';
import { UserRole } from '../types';
import { getRoleBadgeInfo } from '../lib/auth';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  viewMode: 'grid' | 'compact';
  onViewModeChange: (mode: 'grid' | 'compact') => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetCustomUrls?: () => void;
  totalButtons: number;
  supabaseStatus?: 'connected' | 'syncing' | 'error' | 'idle';
  onRefreshSupabase?: () => void;
  currentUser?: string;
  userRole?: UserRole;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  onViewModeChange,
  darkMode,
  onToggleDarkMode,
  soundEnabled,
  onToggleSound,
  onResetCustomUrls,
  totalButtons,
  currentUser = 'Yönetici',
  userRole = 'admin',
  onLogout,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setCurrentDate(
        now.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          weekday: 'long',
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className={`sticky top-0 z-30 w-full backdrop-blur-xl border-b transition-colors shrink-0 ${
      darkMode
        ? 'bg-[#0a0a0c]/90 border-white/10 text-white'
        : 'bg-white/95 border-slate-200 text-slate-800 shadow-xs'
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 sm:py-2">
        {/* Top bar: Brand & Controls */}
        <div className="flex items-center justify-between gap-3">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center p-0.5 rounded-lg border shadow-sm transition-colors ${
              darkMode
                ? 'bg-white/[0.04] border-white/10 shadow-blue-500/10 hover:border-blue-500/40'
                : 'bg-slate-100 border-slate-200 shadow-slate-200/50 hover:border-blue-400'
            }`}>
              <OzkaLogo size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <AmbientBordoMaviTitle variant="header" darkMode={darkMode} />
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/25">
                  <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                  Giriş Paneli
                </span>
              </div>
              <p className={`text-[10px] sm:text-[11px] font-medium flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                <span>{currentDate}</span>
                <span className={darkMode ? 'text-white/20' : 'text-slate-300'}>•</span>
                <span className={`font-mono font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  {currentTime}
                </span>
              </p>
            </div>
          </div>

          {/* Right Tools: View, Sound, Theme */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* View Mode Switcher */}
            <div className={`flex items-center p-0.5 rounded-lg border ${
              darkMode
                ? 'bg-white/5 border-white/10 text-slate-300'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                className={`p-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? darkMode
                      ? 'bg-white/15 text-white shadow-xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : darkMode
                    ? 'hover:text-white hover:bg-white/5'
                    : 'hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Kart Görünümü"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[11px]">Kart</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('compact')}
                className={`p-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'compact'
                    ? darkMode
                      ? 'bg-white/15 text-white shadow-xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : darkMode
                    ? 'hover:text-white hover:bg-white/5'
                    : 'hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Liste Görünümü"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[11px]">Liste</span>
              </button>
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={onToggleSound}
              className={`p-2 rounded-xl border transition-all ${
                soundEnabled
                  ? darkMode
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    : 'bg-blue-50 text-blue-600 border-blue-200'
                  : darkMode
                  ? 'bg-white/5 text-gray-500 border-white/10 hover:text-slate-300'
                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-700'
              }`}
              title={soundEnabled ? 'Tıklama Sesi Açık' : 'Tıklama Sesi Kapalı'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* Gündüz / Gece Modu Butonu */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                darkMode
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-sm'
              }`}
              title={darkMode ? 'Gündüz Moduna Geç (Aydınlık Tema)' : 'Gece Moduna Geç (Karanlık Tema)'}
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">☀️ Gündüz Modu</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-yellow-200" />
                  <span className="hidden sm:inline">🌙 Gece Modu</span>
                </>
              )}
            </button>

            {/* Oturum Açmış Kullanıcı & Çıkış Yap */}
            {onLogout && (
              <div className={`flex items-center gap-1.5 pl-2 border-l ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                {(() => {
                  const roleBadge = getRoleBadgeInfo((userRole as UserRole) || 'admin');
                  return (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold ${
                      darkMode
                        ? 'bg-white/5 border-white/10 text-slate-200'
                        : 'bg-slate-100 border-slate-200 text-slate-800'
                    }`}>
                      <span className={`hidden md:inline max-w-[100px] truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {currentUser}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${roleBadge.bgClass} ${roleBadge.colorClass}`}
                      >
                        {roleBadge.badge}
                      </span>
                    </div>
                  );
                })()}
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  title="Oturumu Kapat / Giriş Ekranına Dön"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Çıkış</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
