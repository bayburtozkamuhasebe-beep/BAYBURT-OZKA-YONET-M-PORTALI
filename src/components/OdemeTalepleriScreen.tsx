import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  Edit3,
  Globe,
  Check,
  X,
  Layers,
  Sparkles,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Database,
  Loader2,
  Trash2,
  RotateCcw,
  CheckSquare,
  Clock,
  HardHat,
  Wallet,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import { PersonelAvansModal } from './PersonelAvansModal';
import {
  fetchOdemeTalepButonlar,
  saveOdemeTalepButonToSupabase,
  deleteOdemeTalepButonFromSupabase,
  supabase,
} from '../lib/supabase';

export interface OdemeTalepSlot {
  id: string;
  dbId?: number | string;
  slotNumber: number;
  title: string;
  subtitle: string;
  url: string;
  badge: string;
  gradient: {
    from: string;
    to: string;
    border: string;
    hoverBorder: string;
    glow: string;
    badgeBg: string;
    badgeText: string;
    iconBg: string;
    iconColor: string;
  };
}

export const ODEME_TALEPLERI_SLOT_COUNT = 12;
const STORAGE_KEY = 'ozka_odeme_talepleri_slots_v1';
const SUPABASE_TABLE_URL =
  'https://supabase.com/dashboard/project/zgeeziqcenezutumhukp/editor/17488?schema=public/odeme_talepleri';

const PALETTES = [
  {
    from: 'from-amber-500',
    to: 'to-emerald-600',
    border: 'border-amber-500/30',
    hoverBorder: 'hover:border-amber-400',
    glow: 'rgba(245, 158, 11, 0.25)',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300 border-amber-500/30',
    iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  {
    from: 'from-emerald-500',
    to: 'to-teal-600',
    border: 'border-emerald-500/30',
    hoverBorder: 'hover:border-emerald-400',
    glow: 'rgba(16, 185, 129, 0.25)',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300 border-emerald-500/30',
    iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    from: 'from-teal-500',
    to: 'to-cyan-600',
    border: 'border-teal-500/30',
    hoverBorder: 'hover:border-teal-400',
    glow: 'rgba(20, 184, 166, 0.25)',
    badgeBg: 'bg-teal-500/15',
    badgeText: 'text-teal-300 border-teal-500/30',
    iconBg: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
    iconColor: 'text-teal-400',
  },
  {
    from: 'from-cyan-500',
    to: 'to-blue-600',
    border: 'border-cyan-500/30',
    hoverBorder: 'hover:border-cyan-400',
    glow: 'rgba(6, 182, 212, 0.25)',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-300 border-cyan-500/30',
    iconBg: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    iconColor: 'text-cyan-400',
  },
  {
    from: 'from-amber-600',
    to: 'to-orange-600',
    border: 'border-amber-600/30',
    hoverBorder: 'hover:border-amber-500',
    glow: 'rgba(217, 119, 6, 0.25)',
    badgeBg: 'bg-amber-600/15',
    badgeText: 'text-amber-300 border-amber-600/30',
    iconBg: 'bg-amber-600/20 text-amber-400 border border-amber-600/30',
    iconColor: 'text-amber-400',
  },
  {
    from: 'from-yellow-500',
    to: 'to-amber-600',
    border: 'border-yellow-500/30',
    hoverBorder: 'hover:border-yellow-400',
    glow: 'rgba(234, 179, 8, 0.25)',
    badgeBg: 'bg-yellow-500/15',
    badgeText: 'text-yellow-300 border-yellow-500/30',
    iconBg: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    iconColor: 'text-yellow-400',
  },
];

export const INITIAL_12_ODEME_TALEP_SLOTS: OdemeTalepSlot[] = Array.from(
  { length: ODEME_TALEPLERI_SLOT_COUNT },
  (_, i) => {
    const slotNum = i + 1;
    const palette = PALETTES[i % PALETTES.length];
    return {
      id: `odeme-talep-slot-${slotNum}`,
      slotNumber: slotNum,
      title: '',
      subtitle: '',
      url: '',
      badge: `${slotNum}. BUTON`,
      gradient: palette,
    };
  }
);

interface OdemeTalepleriScreenProps {
  onBack: () => void;
  playClickSound?: () => void;
  onOpenSantiyeTalepleri?: () => void;
  onOpenPersonelAvans?: () => void;
}

export const OdemeTalepleriScreen: React.FC<OdemeTalepleriScreenProps> = ({
  onBack,
  playClickSound = () => {},
  onOpenSantiyeTalepleri,
  onOpenPersonelAvans,
}) => {
  const [buttons, setButtons] = useState<OdemeTalepSlot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === ODEME_TALEPLERI_SLOT_COUNT) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_12_ODEME_TALEP_SLOTS;
  });

  const [activeFilter, setActiveFilter] = useState<'configured' | 'empty'>('configured');
  const [editingButton, setEditingButton] = useState<OdemeTalepSlot | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [connectedTable, setConnectedTable] = useState<string>('odeme_talepleri');
  const [isPersonelAvansOpen, setIsPersonelAvansOpen] = useState(false);

  const handleOpenPersonelAvans = () => {
    playClickSound();
    if (onOpenPersonelAvans) {
      onOpenPersonelAvans();
    } else {
      setIsPersonelAvansOpen(true);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadFromSupabase = async (isManual = false) => {
    setSupabaseLoading(true);
    try {
      const { rows, tableName } = await fetchOdemeTalepButonlar();
      if (tableName) setConnectedTable(tableName);

      if (rows && rows.length > 0) {
        setButtons((prev) => {
          const updated = prev.map((slot) => {
            const match = rows.find((r) => r.sira_no === slot.slotNumber);
            if (match) {
              return {
                ...slot,
                dbId: match.id,
                title: match.buton_adi || '',
                subtitle: slot.subtitle || (match.buton_adi ? `${slot.slotNumber}. Talep Modülü` : ''),
                url: match.baglanti_linki || '',
              };
            }
            return slot;
          });
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });

        if (isManual) {
          showToast(`Supabase (${tableName}) tablosundan ${rows.length} kayıt senkronize edildi.`);
        }
      } else if (isManual) {
        showToast('Supabase tablosunda kayıt bulunamadı.');
      }
    } catch (err) {
      console.warn('Odeme talepleri fetch error:', err);
      if (isManual) {
        showToast('Supabase bağlantısı sırasında bir hata oluştu.');
      }
    } finally {
      setSupabaseLoading(false);
    }
  };

  useEffect(() => {
    loadFromSupabase(false);

    let channel: any = null;
    try {
      channel = supabase
        .channel('odeme_talepleri_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: connectedTable || 'odeme_talepleri' },
          () => {
            loadFromSupabase(false);
          }
        )
        .subscribe();
    } catch {
      // ignore
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }, [connectedTable]);

  const handleOpenEdit = (btn: OdemeTalepSlot, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playClickSound();
    setEditingButton(btn);
    setEditTitle(btn.title);
    setEditSubtitle(btn.subtitle);
    setEditUrl(btn.url);
  };

  const handleSaveEdit = async () => {
    if (!editingButton) return;
    playClickSound();
    setSavingSlot(true);

    let cleanUrl = editUrl.trim();
    if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const updatedBtn: OdemeTalepSlot = {
      ...editingButton,
      title: editTitle.trim(),
      subtitle: editSubtitle.trim(),
      url: cleanUrl,
    };

    setButtons((prev) => {
      const updated = prev.map((b) => (b.id === updatedBtn.id ? updatedBtn : b));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    try {
      const res = await saveOdemeTalepButonToSupabase({
        dbId: editingButton.dbId,
        sira_no: editingButton.slotNumber,
        buton_adi: editTitle.trim(),
        baglanti_linki: cleanUrl,
      });

      if (res.success && res.row?.id) {
        setButtons((prev) =>
          prev.map((b) => (b.id === updatedBtn.id ? { ...b, dbId: res.row?.id } : b))
        );
      }
      showToast(`${editingButton.slotNumber}. Buton güncellendi ve Supabase'e kaydedildi.`);
    } catch (err) {
      console.warn('Save error:', err);
      showToast(`${editingButton.slotNumber}. Buton yerel olarak güncellendi.`);
    } finally {
      setSavingSlot(false);
      setEditingButton(null);
    }
  };

  const handleClearSlot = async (btn: OdemeTalepSlot) => {
    playClickSound();
    const resetSlot: OdemeTalepSlot = {
      ...btn,
      title: '',
      subtitle: '',
      url: '',
      dbId: undefined,
    };

    setButtons((prev) => {
      const updated = prev.map((b) => (b.id === btn.id ? resetSlot : b));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    try {
      await deleteOdemeTalepButonFromSupabase({ dbId: btn.dbId, sira_no: btn.slotNumber });
    } catch {
      // ignore
    }
    showToast(`${btn.slotNumber}. Buton boşaltıldı.`);
  };

  const handleResetAllSlots = () => {
    playClickSound();
    if (!window.confirm('Tüm 12 ödeme talebi butonu sıfırlanacak. Onaylıyor musunuz?')) {
      return;
    }

    setButtons(INITIAL_12_ODEME_TALEP_SLOTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    buttons.forEach((b) => {
      if (b.dbId || b.title) {
        deleteOdemeTalepButonFromSupabase({ dbId: b.dbId, sira_no: b.slotNumber }).catch(() => {});
      }
    });
    showToast('Tüm buton yuvaları sıfırlandı.');
  };

  const handleCardClick = (btn: OdemeTalepSlot) => {
    playClickSound();
    if (btn.url && btn.url.trim()) {
      let finalUrl = btn.url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    } else {
      handleOpenEdit(btn);
    }
  };

  const configuredButtons = buttons.filter((b) => b.title && b.title.trim());
  const emptyButtons = buttons.filter((b) => !b.title || !b.title.trim());

  const renderCard = (btn: OdemeTalepSlot) => {
    const isConfigured = Boolean(btn.title && btn.title.trim());
    const hasUrl = Boolean(btn.url && btn.url.trim());

    return (
      <motion.div
        key={btn.id}
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => handleCardClick(btn)}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-xl p-3.5 sm:p-4 transition-all duration-300 cursor-pointer backdrop-blur-md border ${
          isConfigured
            ? `bg-white/[0.05] hover:bg-white/[0.09] ${btn.gradient.border} ${btn.gradient.hoverBorder}`
            : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/15 hover:border-amber-500/40 border-dashed'
        } shadow-lg shadow-black/40 hover:shadow-xl`}
        style={{ minHeight: '160px' }}
      >
        <div
          className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${btn.gradient.from} ${btn.gradient.to} transition-all duration-300 group-hover:h-1.5 ${
            !isConfigured ? 'opacity-40' : ''
          }`}
        />

        <div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-xl"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${btn.gradient.glow}, transparent 75%)`,
          }}
        />

        <div className="relative flex items-center justify-between mb-2 z-10">
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              isConfigured
                ? `${btn.gradient.badgeBg} ${btn.gradient.badgeText}`
                : 'bg-white/10 text-gray-300 border-white/20'
            }`}
          >
            <span>{btn.badge}</span>
            {!isConfigured && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </span>

          <div className="flex items-center gap-1">
            {isConfigured && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm(
                      `${btn.slotNumber}. buton "${btn.title}" boşaltılacak. Onaylıyor musunuz?`
                    )
                  ) {
                    handleClearSlot(btn);
                  }
                }}
                title="Butonu Boşalt"
                className="p-1 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => handleOpenEdit(btn, e)}
              title="Butonu Düzenle"
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative space-y-1.5 z-10 my-auto">
          {isConfigured ? (
            <>
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${btn.gradient.iconBg}`}
                >
                  <CreditCard className={`w-4.5 h-4.5 ${btn.gradient.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                    {btn.title}
                  </h4>
                  {btn.subtitle && (
                    <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{btn.subtitle}</p>
                  )}
                </div>
              </div>

              {hasUrl ? (
                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                  <Globe className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{btn.url.replace(/^https?:\/\//i, '')}</span>
                </div>
              ) : (
                <div className="pt-1 text-[11px] text-amber-400/80 italic">Link tanımlanmamış</div>
              )}
            </>
          ) : (
            <div className="text-center py-2 space-y-1.5">
              <div className="w-9 h-9 mx-auto rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-gray-400 group-hover:text-amber-300 group-hover:border-amber-500/40 group-hover:bg-amber-500/10 transition-all">
                <Plus className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">
                  Boş Buton Yuvası
                </p>
                <p className="text-[10px] text-gray-400">Tıklayarak ad ve bağlantı tanımlayın</p>
              </div>
            </div>
          )}
        </div>

        <div className="relative pt-2 border-t border-white/10 flex items-center justify-between z-10 text-xs">
          {isConfigured ? (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Kullanıma Hazır</span>
            </span>
          ) : (
            <span className="text-gray-400 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Tanımlanmamış</span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1 font-semibold transition-colors ${
              isConfigured
                ? 'text-amber-300 group-hover:text-amber-200'
                : 'text-gray-400 group-hover:text-gray-200'
            }`}
          >
            <span>{isConfigured ? (hasUrl ? 'Bağlantıyı Aç' : 'Detay') : 'Tanımla'}</span>
            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-gray-100 flex flex-col relative overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a0c]/85 border-b border-white/10 px-4 sm:px-8 py-3.5 shadow-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <button
              id="odeme-talep-back-btn"
              type="button"
              onClick={() => {
                playClickSound();
                onBack();
              }}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 hover:border-amber-400/50 text-gray-200 hover:text-white transition-all shadow-md active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-amber-400 group-hover:-translate-x-1 transition-transform" />
              <div className="flex flex-col text-left">
                <span className="text-xs sm:text-sm font-bold">Geri Dön</span>
                <span className="text-[10px] text-gray-400 -mt-0.5 hidden sm:inline">Ana Portala Geç</span>
              </div>
            </button>

            <div className="flex items-center gap-3">
              <OzkaLogo size="sm" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>ÖDEME TALEPLERİ</span>
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold hidden sm:inline-flex">
                    {configuredButtons.length} / {ODEME_TALEPLERI_SLOT_COUNT} Tanımlı
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 hidden sm:block">
                  ÖZKA Ödeme Talepleri ve Finansal Onay Portalı
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenSantiyeTalepleri && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onOpenSantiyeTalepleri();
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:via-orange-400 hover:to-rose-500 text-white shadow-lg shadow-orange-500/25 border border-amber-400/40 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                  title="Şantiye Talepleri Tablosunu Yeni Sayfada Aç"
                >
                  <HardHat className="w-4 h-4 text-amber-200" />
                  <span className="font-extrabold tracking-wide">Şantiye Talepleri</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                </button>
              )}

              {/* PERSONEL AVANS BUTONU */}
              <button
                type="button"
                onClick={handleOpenPersonelAvans}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/40 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                title="Personel Avans Talepleri ve Ödeme Yönetimi Modülü"
              >
                <Wallet className="w-4 h-4 text-indigo-200" />
                <span className="font-extrabold tracking-wide">Personel Avans</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => loadFromSupabase(true)}
                disabled={supabaseLoading}
                title="Supabase tablosundan verileri tekrar yükle"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${supabaseLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Yenile</span>
              </button>

              <button
                type="button"
                onClick={handleResetAllSlots}
                title="Tüm buton yuvalarını sıfırla"
                className="p-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
          {toastMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-xs sm:text-sm text-amber-200 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ŞANTİYE TALEPLERİ & PERSONEL AVANS HIZLI ERİŞİM KARTLARI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. ŞANTİYE TALEPLERİ AMBİYANS KARTI */}
            {onOpenSantiyeTalepleri && (
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-orange-950/40 backdrop-blur-md p-4 sm:p-5 shadow-2xl transition-all hover:border-amber-400/50 flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-60 h-28 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 space-y-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-lg shadow-orange-500/30 flex-shrink-0">
                      <HardHat className="w-6 h-6 text-slate-950" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-white tracking-wide">
                          Şantiye Talepleri Tablosu
                        </h2>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Supabase
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mt-1">
                        Şantiyelerden gelen talep, malzeme ve operasyonel istekleri yeni sayfada listeleyin ve yönetin.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 pt-4 mt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-amber-300/80 font-mono">public.talepler</span>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onOpenSantiyeTalepleri();
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md shadow-orange-500/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <HardHat className="w-3.5 h-3.5 text-amber-200" />
                    <span>Şantiye Talepleri Sayfası</span>
                    <ExternalLink className="w-3 h-3 text-amber-200" />
                  </button>
                </div>
              </div>
            )}

            {/* 2. PERSONEL AVANS AMBİYANS KARTI */}
            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-blue-950/40 backdrop-blur-md p-4 sm:p-5 shadow-2xl transition-all hover:border-indigo-400/50 flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-60 h-28 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 flex-shrink-0 border border-indigo-400/30">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-white tracking-wide">
                        Personel Avans & Bakiye Tablosu
                      </h2>
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Canlı Supabase
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1">
                      Supabase <code className="text-indigo-300 font-mono">public.v_personel_avans_bakiye</code> tablosundaki tüm personel avans ödemeleri, kesintileri ve net kalan bakiyelerini görüntüleyin.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-4 mt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-indigo-300/80 font-mono">public.v_personel_avans_bakiye</span>
                <button
                  type="button"
                  onClick={handleOpenPersonelAvans}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-500/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Personel Avans Modülünü Aç</span>
                  <ExternalLink className="w-3 h-3 text-indigo-200" />
                </button>
              </div>
            </div>
          </div>

          {/* FİLTRE & GÖRÜNÜM KONTROLLERİ */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveFilter('configured')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeFilter === 'configured'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-gray-400 hover:text-emerald-300'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Tanımlı Butonlar ({configuredButtons.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('empty')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeFilter === 'empty'
                    ? 'bg-white/20 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Boş Yuvalar ({emptyButtons.length})</span>
              </button>
            </div>

            <div className="text-xs text-gray-400">
              {configuredButtons.length} adet aktif, {emptyButtons.length} adet bekleyen yuva
            </div>
          </div>

          {/* 1. BÖLÜM: İSİMLENDİRİLMİŞ TANIMLI BUTONLAR */}
          {activeFilter === 'configured' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50 animate-pulse" />
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                    <span>İSİMLENDİRİLMİŞ & TANIMLI BUTONLAR</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {configuredButtons.length} Adet
                    </span>
                  </h3>
                </div>
                <span className="text-xs text-gray-400">
                  Aktif ve tanımlanmış butonlar (Tıklayınca sisteme gider)
                </span>
              </div>

              {configuredButtons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {configuredButtons.map(renderCard)}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 text-center space-y-2">
                  <p className="text-sm font-semibold text-gray-300">
                    Henüz isimlendirilmiş bir ödeme talebi butonu bulunmuyor.
                  </p>
                  <p className="text-xs text-gray-500">
                    Boş Yuvalar sekmesine geçerek yeni buton tanımlayabilirsiniz.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. BÖLÜM: İSİMLENDİRİLMEMİŞ / BOŞ BUTONLAR */}
          {activeFilter === 'empty' && (
            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <h3 className="text-sm sm:text-base font-bold text-gray-300 tracking-wide flex items-center gap-2">
                    <span>İSİMLENDİRİLMEMİŞ / BOŞ BUTON YUVALARI</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/15">
                      {emptyButtons.length} Adet Bekliyor
                    </span>
                  </h3>
                </div>
                <span className="text-xs text-gray-500">
                  Tıklayarak yeni buton adı ve URL adresi tanımlayabilirsiniz
                </span>
              </div>

              {emptyButtons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {emptyButtons.map(renderCard)}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-center space-y-1">
                  <p className="text-sm font-semibold text-emerald-300">
                    Tüm buton yuvaları başarıyla tanımlanmıştır!
                  </p>
                  <p className="text-xs text-emerald-400/70">
                    Gerektiğinde tanımlı butonların üzerindeki kalem ikonuna basarak düzenleyebilirsiniz.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* DÜZENLEME MODALI */}
      <AnimatePresence>
        {editingButton && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#0e121b] border border-white/15 shadow-2xl p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${editingButton.gradient.iconBg}`}
                  >
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {editingButton.slotNumber}. Buton Yuvasını Düzenle
                    </h3>
                    <p className="text-xs text-gray-400">
                      Ödeme talepleri buton adı ve bağlantı adresi
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingButton(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Buton Adı / Başlık <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Örn: Avans Talepleri, Tedarikçi Ödemesi..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Alt Açıklama (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    placeholder="Örn: Haftalık onay paneli"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Bağlantı Linki (URL)
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="https://odeme.ozka.com.tr"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/15 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-gray-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingButton(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="button"
                  disabled={savingSlot}
                  onClick={handleSaveEdit}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
                >
                  {savingSlot ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Kaydet ve Eşitle</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PERSONEL AVANS TALEPLERİ MODALI */}
      <PersonelAvansModal
        isOpen={isPersonelAvansOpen}
        onClose={() => setIsPersonelAvansOpen(false)}
        playClickSound={playClickSound}
      />
    </div>
  );
};
export default OdemeTalepleriScreen;
