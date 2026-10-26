import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ExternalLink,
  Search,
  RefreshCw,
  AlertTriangle,
  Building2,
  Calendar,
  DollarSign,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  CalendarClock,
  Copy,
  Check,
} from 'lucide-react';
import {
  FirmaTeminatRecord,
  FIRMATEMINAT_SUPABASE_EDITOR_URL,
} from '../lib/supabase';
import { TeminatSureUzatimModal } from './TeminatSureUzatimModal';

interface TeminatMektuplariModalProps {
  isOpen: boolean;
  onClose: () => void;
  allRecords: FirmaTeminatRecord[];
  expiringRecords: FirmaTeminatRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  darkMode?: boolean;
}

export const TeminatMektuplariModal: React.FC<TeminatMektuplariModalProps> = ({
  isOpen,
  onClose,
  allRecords,
  expiringRecords,
  isLoading,
  onRefresh,
  darkMode = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expiring30' | 'gecerli'>('expiring30');

  // Süre Uzatım & Sağ Tık Menüsü State'leri
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
  React.useEffect(() => {
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

  // Filtered list
  const filteredList = useMemo(() => {
    return allRecords.filter((item) => {
      // Type filter
      if (filterType === 'expiring30') {
        if (item.kalanGun === undefined || item.kalanGun > 30) return false;
      } else if (filterType === 'gecerli') {
        const d = (item.durumu || '').toLowerCase();
        if (d === 'iade' || d === 'iptal') return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const mektup = (item.mektupno || '').toLowerCase();
        const firma = (item.firmadi || '').toLowerCase();
        const banka = (item.banka || '').toLowerCase();
        const isinadi = (item.isinadi || '').toLowerCase();
        const aciklama = (item.aciklama || '').toLowerCase();
        const durum = (item.durumu || '').toLowerCase();
        return (
          mektup.includes(query) ||
          firma.includes(query) ||
          banka.includes(query) ||
          isinadi.includes(query) ||
          aciklama.includes(query) ||
          durum.includes(query)
        );
      }
      return true;
    });
  }, [allRecords, filterType, searchQuery]);

  // Statistics
  const totalAmount = useMemo(() => {
    return allRecords.reduce((sum, r) => sum + (r.tutar || 0), 0);
  }, [allRecords]);

  const expiringAmount = useMemo(() => {
    return expiringRecords.reduce((sum, r) => sum + (r.tutar || 0), 0);
  }, [expiringRecords]);

  const under30Count = useMemo(() => {
    return allRecords.filter((r) => r.kalanGun !== undefined && r.kalanGun <= 30).length;
  }, [allRecords]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Mektup No', 'Firma Adı', 'Banka', 'İşin Adı', 'Tarih', 'Vade Tarihi', 'Kalan Gün', 'Tutar (TL)', 'Durumu', 'Açıklama'];
    const rows = filteredList.map((r) => [
      r.id,
      `"${r.mektupno || ''}"`,
      `"${r.firmadi || ''}"`,
      `"${r.banka || ''}"`,
      `"${r.isinadi || ''}"`,
      `"${r.tarih || ''}"`,
      `"${r.vadetarihi || ''}"`,
      r.kalanGun !== undefined ? r.kalanGun : '',
      r.tutar || 0,
      `"${r.durumu || ''}"`,
      `"${r.aciklama || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `teminat_mektuplari_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
            darkMode
              ? 'bg-[#0f172a] border-amber-500/30 text-white'
              : 'bg-white border-amber-300 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight uppercase">
                    Teminat Mektupları Takip ve Vade Kontrolü
                  </h2>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    public.firmateminat
                  </span>
                </div>
                <p className="text-xs text-amber-200/70 truncate">
                  Vade bitimine 30 gün ve daha az kalan teminat mektupları anlık bildirim sistemi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={FIRMATEMINAT_SUPABASE_EDITOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors"
                title="Supabase tablosunu tarayıcıda aç"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Supabase'de Aç</span>
              </a>

              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
                title="Yenile"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-800/60 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 transition-colors"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 border-b border-slate-800 bg-slate-900/40">
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300/80 uppercase">≤ 30 Gün Kalanlar</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-1 text-2xl font-black text-amber-300">
                {expiringRecords.length} <span className="text-xs font-normal text-amber-400/70">Adet</span>
              </div>
              <div className="text-[11px] text-amber-300/70 truncate mt-0.5">
                Tutar: {formatTRY(expiringAmount)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-300/80 uppercase">≤ 15 Gün (Acil)</span>
                <Clock className="w-4 h-4 text-rose-400" />
              </div>
              <div className="mt-1 text-2xl font-black text-rose-300">
                {allRecords.filter((r) => r.kalanGun !== undefined && r.kalanGun <= 15).length} <span className="text-xs font-normal text-rose-400/70">Adet</span>
              </div>
              <div className="text-[11px] text-rose-300/70 truncate mt-0.5">
                Acil aksiyon gerektiren
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-300/80 uppercase">Toplam Teminat</span>
                <Building2 className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-1 text-2xl font-black text-blue-300">
                {allRecords.length} <span className="text-xs font-normal text-blue-400/70">Adet</span>
              </div>
              <div className="text-[11px] text-blue-300/70 truncate mt-0.5">
                Tüm kayıtlar
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-300/80 uppercase">Toplam Tutar</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-1 text-xl sm:text-2xl font-black text-emerald-300 truncate">
                {formatTRY(totalAmount)}
              </div>
              <div className="text-[11px] text-emerald-300/70 truncate mt-0.5">
                Kayıtlı toplam portföy
              </div>
            </div>
          </div>

          {/* Controls: Search, Filters, Export */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterType('expiring30')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  filterType === 'expiring30'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                ⚠️ ≤ 30 Gün Kalanlar ({expiringRecords.length})
              </button>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  filterType === 'all'
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                Tümü ({allRecords.length})
              </button>
              <button
                onClick={() => setFilterType('gecerli')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  filterType === 'gecerli'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                Geçerli Olanlar
              </button>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  filterType === 'all'
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                Tümü ({allRecords.length})
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Firma, mektup no, banka veya iş ara..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                title="CSV İndir"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-auto max-h-[50vh]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Mektup No</th>
                  <th className="py-2.5 px-3">Firma Adı</th>
                  <th className="py-2.5 px-3">Banka</th>
                  <th className="py-2.5 px-3">İşin Adı</th>
                  <th className="py-2.5 px-3">Veriliş Tarihi</th>
                  <th className="py-2.5 px-3">Vade Tarihi</th>
                  <th className="py-2.5 px-3 text-center">Kalan Süre</th>
                  <th className="py-2.5 px-3 text-right">Tutar</th>
                  <th className="py-2.5 px-3 text-center">Durum</th>
                  <th className="py-2.5 px-3 text-right">İşlem / Süre Uzat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <AlertTriangle className="w-8 h-8 text-amber-400/60 mx-auto mb-2" />
                      <p className="font-medium">Kayıt bulunamadı</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Filtreleri veya arama kriterlerini değiştirerek tekrar deneyin.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => {
                    const days = item.kalanGun;
                    const isExpiring15 = days !== undefined && days <= 15;
                    const isExpiring30 = days !== undefined && days <= 30;
                    const isPast = days !== undefined && days < 0;

                    return (
                      <tr
                        key={item.id}
                        onContextMenu={(e) => handleItemContextMenu(e, item)}
                        className={`transition-colors cursor-pointer select-none group ${
                          isPast
                            ? 'bg-rose-950/30 hover:bg-rose-900/40'
                            : isExpiring15
                            ? 'bg-rose-950/25 hover:bg-rose-900/35 border-l-2 border-l-rose-500'
                            : isExpiring30
                            ? 'bg-amber-950/25 hover:bg-amber-900/35 border-l-2 border-l-amber-500'
                            : 'hover:bg-slate-800/40'
                        }`}
                        title="Sağ tık: Süre Uzatım İste menüsü"
                      >
                        <td className="py-3 px-3 font-mono font-bold text-amber-300">
                          {item.mektupno || '-'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white max-w-[200px] truncate" title={item.firmadi || ''}>
                          {item.firmadi || '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {item.banka || '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 max-w-[180px] truncate" title={item.isinadi || ''}>
                          {item.isinadi || '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {formatDate(item.tarih)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-200 whitespace-nowrap">
                          {formatDate(item.vadetarihi)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {days === undefined ? (
                            <span className="text-slate-500">-</span>
                          ) : isPast ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              Vadesi Geçti ({Math.abs(days)} gün)
                            </span>
                          ) : days === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-600/30 text-rose-200 border border-rose-500 animate-pulse">
                              BUGÜN SON GÜN
                            </span>
                          ) : isExpiring15 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/25 text-rose-200 border border-rose-500/50 animate-pulse">
                              ⚡ {days} gün kaldı (Acil ≤15 Gün)
                            </span>
                          ) : isExpiring30 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/25 text-amber-200 border border-amber-500/50 animate-pulse">
                              ⏳ {days} gün kaldı (Vadeye ≤30 Gün)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300">
                              {days} gün
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {formatTRY(item.tutar)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              (item.durumu || '').toLowerCase() === 'geçerli'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.durumu || 'Belirtilmedi'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => handleOpenSureUzatim(item, e)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 inline-flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                            title="İlgili bankaya süre uzatım dilekçesi oluştur"
                          >
                            <CalendarClock className="w-3 h-3 text-slate-950" />
                            <span>Süre Uzat</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                Toplam <strong>{filteredList.length}</strong> kayıt listeleniyor • <span className="text-amber-300">💡 İpucu: Mektup satırına sağ tıklayarak Süre Uzatım Dilekçesi oluşturabilirsiniz.</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={FIRMATEMINAT_SUPABASE_EDITOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold underline underline-offset-2"
              >
                <span>Supabase Editörde Düzenle</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </motion.div>
      </div>

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
    </AnimatePresence>
  );
};
