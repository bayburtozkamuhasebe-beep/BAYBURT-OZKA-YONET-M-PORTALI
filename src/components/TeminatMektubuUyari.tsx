import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Clock,
  Building2,
  FileText,
  ShieldAlert,
  ListFilter,
  Sparkles,
  CalendarClock,
  Copy,
  Check,
} from 'lucide-react';
import {
  FirmaTeminatRecord,
  fetchFirmaTeminatRecords,
  FIRMATEMINAT_SUPABASE_EDITOR_URL,
} from '../lib/supabase';
import { isKullanicilarSession } from '../lib/auth';
import { TeminatMektuplariModal } from './TeminatMektuplariModal';
import { TeminatSureUzatimModal } from './TeminatSureUzatimModal';

interface TeminatMektubuUyariProps {
  darkMode?: boolean;
  isKullanicilarUser?: boolean;
}

export const TeminatMektubuUyari: React.FC<TeminatMektubuUyariProps> = ({
  darkMode = true,
  isKullanicilarUser,
}) => {
  // Sadece 'kullanıcılar' tablosundan kullanıcı adı ve parola ile girenler görebilir
  const isAllowed = isKullanicilarUser !== undefined ? isKullanicilarUser : isKullanicilarSession();
  const [allRecords, setAllRecords] = useState<FirmaTeminatRecord[]>([]);
  const [expiringRecords, setExpiringRecords] = useState<FirmaTeminatRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [showFullModal, setShowFullModal] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  // Süre Uzatım Modalı & Sağ Tık Menüsü State'leri
  const [selectedForUzatim, setSelectedForUzatim] = useState<FirmaTeminatRecord | null>(null);
  const [showUzatimModal, setShowUzatimModal] = useState<boolean>(false);
  const [copiedMektupNo, setCopiedMektupNo] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    item: FirmaTeminatRecord | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    item: null,
  });

  // Dışarı tıklandığında sağ tık menüsünü kapat
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('scroll', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('scroll', handleGlobalClick);
    };
  }, [contextMenu.visible]);

  // Sağ tık menüsü açma
  const handleItemContextMenu = (e: React.MouseEvent, item: FirmaTeminatRecord) => {
    e.preventDefault();
    e.stopPropagation();
    // Ekran dışına taşmaması için koordinatları sınırla
    const posX = Math.min(e.clientX, window.innerWidth - 260);
    const posY = Math.min(e.clientY, window.innerHeight - 220);
    setContextMenu({
      visible: true,
      x: posX,
      y: posY,
      item,
    });
  };

  // Süre uzatım modalını aç
  const handleOpenSureUzatim = (item: FirmaTeminatRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedForUzatim(item);
    setShowUzatimModal(true);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // Mektup No Kopyalama
  const handleCopyNo = (mektupNo?: string | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!mektupNo) return;
    try {
      navigator.clipboard.writeText(mektupNo);
      setCopiedMektupNo(mektupNo);
      setTimeout(() => setCopiedMektupNo(null), 2000);
    } catch {}
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // Format currency
  const formatTRY = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '0,00 ₺';
    return (
      new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ' ₺'
    );
  };

  // Format date
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Fetch records from Supabase (yalnızca kullanıcılar tablosu ile girenler için)
  const loadRecords = useCallback(async () => {
    if (!isAllowed) return;
    setIsLoading(true);
    try {
      const res = await fetchFirmaTeminatRecords();
      setAllRecords(res.allRecords);
      setExpiringRecords(res.expiringRecords);
      setLastChecked(new Date());
    } catch (err) {
      console.warn('Teminat uyarıları yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAllowed]);

  // Program açılışında otomatik kontrol
  useEffect(() => {
    if (!isAllowed) return;
    loadRecords();

    // 5 dakikada bir arka planda otomatik güncelle
    const interval = setInterval(() => {
      loadRecords();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadRecords, isAllowed]);

  // SADECE kullanıcılar tablosundaki parola ve kullanıcı adı ile girenler için görünür
  if (!isAllowed) {
    return null;
  }

  // Vadesine <= 30 gün kalan mektup yoksa:
  if (expiringRecords.length === 0 && !isLoading) {
    return (
      <>
        {!isClosed && (
          <aside aria-label="Teminat Mektubu Bilgisi" className="fixed bottom-4 right-4 z-50 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="flex items-center gap-1.5"
            >
              <button
                onClick={() => setShowFullModal(true)}
                className={`group flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold shadow-xl border backdrop-blur-xl transition-all ${
                  darkMode
                    ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-emerald-500/40 hover:border-emerald-400 shadow-emerald-500/10'
                    : 'bg-white/95 hover:bg-slate-50 text-slate-800 border-emerald-500/50 hover:border-emerald-600 shadow-slate-300'
                }`}
                title="Teminat mektuplarını görüntüle (Vadeye ≤30 gün uyarısı aktif)"
              >
                <ShieldAlert className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="font-bold">Teminat Takibi:</span>
                <span className="text-emerald-400 font-semibold">Vadesine ≤30 gün kalan yok</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {allRecords.length} mektup
                </span>
              </button>
              <button
                onClick={() => setIsClosed(true)}
                className="p-1.5 rounded-full bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 transition-colors"
                title="Gizle"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          </aside>
        )}

        <TeminatMektuplariModal
          isOpen={showFullModal}
          onClose={() => setShowFullModal(false)}
          allRecords={allRecords}
          expiringRecords={expiringRecords}
          isLoading={isLoading}
          onRefresh={loadRecords}
          darkMode={darkMode}
        />
      </>
    );
  }

  // Toplam kritik tutar
  const totalExpiringAmount = expiringRecords.reduce(
    (sum, r) => sum + (r.tutar || 0),
    0
  );

  return (
    <>
      {/* Sağ Alt Köşe Uyarı Paneli / Minimized Butonu */}
      <aside aria-label="Teminat Mektubu Uyarı Paneli" className="fixed bottom-4 right-4 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] select-none">
        <AnimatePresence mode="wait">
          {/* KAPATILMIŞ / MİNİMİZE EDİLMİŞ HAL: SABİT SAĞ ALT ROZET */}
          {(isClosed || isMinimized) ? (
            <motion.div
              key="minimized-pill"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="flex items-center justify-end"
            >
              <button
                onClick={() => {
                  setIsClosed(false);
                  setIsMinimized(false);
                }}
                className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full font-bold text-xs shadow-2xl transition-all duration-300 border backdrop-blur-xl ${
                  darkMode
                    ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white border-amber-400/50 shadow-amber-500/30 hover:shadow-amber-500/50 hover:border-amber-300'
                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white border-amber-300 shadow-amber-600/30 hover:shadow-amber-600/50'
                }`}
                title="Teminat mektubu uyarılarını genişlet"
              >
                {/* Yanıp sönen ışık efekti */}
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>

                <ShieldAlert className="w-4 h-4 animate-bounce text-amber-100" />

                <div className="flex items-center gap-1.5">
                  <span className="tracking-wide">
                    ⚠️ {expiringRecords.length} Teminat Mektubu Vadesi
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px] font-black uppercase tracking-wider text-amber-200">
                    ≤30 Gün
                  </span>
                </div>

                <ChevronUp className="w-4 h-4 text-amber-200 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </motion.div>
          ) : (
            /* AÇIK UYARI KART: SAĞ ALT KÖŞE DETAYLI BİLDİRİM */
            <motion.div
              key="expanded-card"
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl transition-all ${
                darkMode
                  ? 'bg-[#0f172a]/95 border-amber-500/40 text-white shadow-amber-500/20'
                  : 'bg-white/95 border-amber-400 text-slate-900 shadow-amber-500/25'
              }`}
            >
              {/* Üst Başlık Şeridi */}
              <div className="px-4 py-3 bg-gradient-to-r from-amber-600/25 via-orange-600/20 to-transparent border-b border-amber-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
                    <ShieldAlert className="w-4 h-4 animate-pulse" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 truncate">
                        TEMİNAT MEKTUBU UYARISI
                      </h4>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {expiringRecords.length} ADET
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-200/80 truncate">
                      Vadesine ≤ 30 gün kalan mektuplar tespit edildi
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={loadRecords}
                    disabled={isLoading}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Yenile"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Küçült"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setIsClosed(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Kapat"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tutar & Özet Şeridi */}
              <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kritik Vade Toplamı:</span>
                </div>
                <div className="font-mono font-black text-amber-200 text-sm">
                  {formatTRY(totalExpiringAmount)}
                </div>
              </div>

              {/* Mektuplar Listesi (Kaydırılabilir) */}
              <div className="p-3 space-y-2.5 max-h-60 overflow-y-auto">
                <div className="text-[10px] text-amber-300/80 font-medium px-1 flex items-center justify-between">
                  <span>Mektuplar (Vadeye ≤30 gün):</span>
                  <span className="text-[9px] text-slate-400">🖱️ Sağ tık: Süre Uzat</span>
                </div>

                {expiringRecords.map((item) => {
                  const days = item.kalanGun ?? 0;
                  const isUnder30 = days <= 30;
                  const isPast = days < 0;

                  return (
                    <div
                      key={item.id}
                      onContextMenu={(e) => handleItemContextMenu(e, item)}
                      className={`p-2.5 rounded-xl border transition-all text-xs cursor-pointer select-none group relative ${
                        isPast
                          ? 'bg-rose-950/30 border-rose-500/40 hover:border-rose-400'
                          : isUnder30
                          ? 'bg-gradient-to-r from-rose-950/20 to-amber-950/20 border-rose-500/30 hover:border-rose-400'
                          : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400'
                      }`}
                      title="Sağ tıklayarak Süre Uzatım İste menüsünü açabilirsiniz"
                    >
                      {/* Üst Satır: Firma & Kalan Gün Rozeti */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-white leading-tight truncate flex-1" title={item.firmadi || ''}>
                          {item.firmadi || 'Firma Adı Belirtilmedi'}
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide border whitespace-nowrap ${
                            isPast
                              ? 'bg-rose-600/30 text-rose-200 border-rose-500 animate-pulse'
                              : isUnder30
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {isPast
                            ? `⚠️ Vadesi Geçti (${Math.abs(days)} gün)`
                            : days === 0
                            ? '🔴 Bugün Son Gün'
                            : `⚡ ${days} gün kaldı`}
                        </span>
                      </div>

                      {/* Orta Satır: Banka & Mektup No & İşin Adı */}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
                        <span className="font-medium text-amber-300/90">{item.banka || 'Banka Yok'}</span>
                        <span className="text-slate-500">•</span>
                        <span className="font-mono text-cyan-300 font-semibold">No: {item.mektupno || '-'}</span>
                        {item.isinadi && (
                          <>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 truncate max-w-[120px]" title={item.isinadi}>
                              {item.isinadi}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Alt Satır: Vade Tarihi & Tutar & Hızlı Buton */}
                      <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between gap-1 text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span>Vade:</span>
                          <strong className="text-slate-200 font-semibold">{formatDate(item.vadetarihi)}</strong>
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-emerald-400">
                            {formatTRY(item.tutar)}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleOpenSureUzatim(item, e)}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                            title="İlgili bankaya süre uzatım dilekçesi oluştur"
                          >
                            <CalendarClock className="w-3 h-3 text-slate-950" />
                            <span>Süre Uzat</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Alt Butonlar */}
              <div className="p-3 bg-slate-900/60 border-t border-amber-500/20 flex items-center gap-2">
                <button
                  onClick={() => setShowFullModal(true)}
                  className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Detaylı Liste / Tümünü Gör</span>
                </button>

                <a
                  href={FIRMATEMINAT_SUPABASE_EDITOR_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
                  title="Supabase'de firmateminat tablosunu aç"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Supabase</span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      {/* ÖZEL SAĞ TIK BAĞLAM MENÜSÜ (CONTEXT MENU) */}
      <AnimatePresence>
        {contextMenu.visible && contextMenu.item && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            transition={{ duration: 0.12 }}
            style={{
              top: contextMenu.y,
              left: contextMenu.x,
            }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[9999] w-64 rounded-2xl bg-[#090f19]/95 backdrop-blur-xl border border-amber-500/50 shadow-2xl p-2 text-xs text-slate-100 select-none animate-in fade-in"
          >
            {/* Menü Başlığı */}
            <div className="px-2.5 py-2 border-b border-white/10 mb-1">
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-cyan-300 font-bold text-[11px] truncate">
                  No: {contextMenu.item.mektupno || '-'}
                </span>
                <span className="text-[10px] text-amber-400 font-bold">
                  {contextMenu.item.banka || 'Banka'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5" title={contextMenu.item.firmadi || ''}>
                {contextMenu.item.firmadi || 'Firma'}
              </p>
            </div>

            {/* Menü Seçenekleri */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleOpenSureUzatim(contextMenu.item!)}
                className="w-full px-3 py-2 rounded-xl text-left font-black text-slate-950 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 transition-all flex items-center justify-between gap-2 shadow-md shadow-amber-500/25 active:scale-95 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-slate-950" />
                  <span>Süre Uzatım İste</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/30 text-amber-100 font-bold">
                  Dilekçe
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyNo(contextMenu.item?.mektupno)}
                className="w-full px-3 py-1.5 rounded-xl text-left font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {copiedMektupNo === contextMenu.item.mektupno ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Mektup No Kopyala</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                  setShowFullModal(true);
                }}
                className="w-full px-3 py-1.5 rounded-xl text-left font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Detaylı Listede Gör</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SÜRE UZATIM TARİHİ VE BANKA DİLEKÇESİ MODALI */}
      <TeminatSureUzatimModal
        isOpen={showUzatimModal}
        onClose={() => setShowUzatimModal(false)}
        teminat={selectedForUzatim}
        darkMode={darkMode}
      />

      {/* Tam Ekran / Geniş Detay Modalı */}
      <TeminatMektuplariModal
        isOpen={showFullModal}
        onClose={() => setShowFullModal(false)}
        allRecords={allRecords}
        expiringRecords={expiringRecords}
        isLoading={isLoading}
        onRefresh={loadRecords}
        darkMode={darkMode}
      />
    </>
  );
};
