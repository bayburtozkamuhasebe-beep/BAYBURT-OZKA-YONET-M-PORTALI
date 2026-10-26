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
  Landmark,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Trash2,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import {
  fetchBankaButonlar,
  saveBankaButonToSupabase,
  deleteBankaButonFromSupabase,
  supabase,
} from '../lib/supabase';

export interface BankaSlot {
  id: string;
  dbId?: number | string;
  slotNumber: number;
  title: string;
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

export const BANKALAR_SLOT_COUNT = 12;
const SUPABASE_TABLE = 'banka_butonlari';
const SUPABASE_TABLE_URL =
  'https://supabase.com/dashboard/project/zgeeziqcenezutumhukp/editor/17488?schema=public/banka_butonlari';

const PALETTES = [
  {
    from: 'from-sky-500',
    to: 'to-blue-600',
    border: 'border-sky-500/30',
    hoverBorder: 'hover:border-sky-400',
    glow: 'rgba(14, 165, 233, 0.25)',
    badgeBg: 'bg-sky-500/15',
    badgeText: 'text-sky-300 border-sky-500/30',
    iconBg: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    iconColor: 'text-sky-400',
  },
  {
    from: 'from-blue-500',
    to: 'to-indigo-600',
    border: 'border-blue-500/30',
    hoverBorder: 'hover:border-blue-400',
    glow: 'rgba(59, 130, 246, 0.25)',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-300 border-blue-500/30',
    iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    from: 'from-cyan-500',
    to: 'to-teal-600',
    border: 'border-cyan-500/30',
    hoverBorder: 'hover:border-cyan-400',
    glow: 'rgba(6, 182, 212, 0.25)',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-300 border-cyan-500/30',
    iconBg: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    iconColor: 'text-cyan-400',
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
    from: 'from-indigo-500',
    to: 'to-violet-600',
    border: 'border-indigo-500/30',
    hoverBorder: 'hover:border-indigo-400',
    glow: 'rgba(99, 102, 241, 0.25)',
    badgeBg: 'bg-indigo-500/15',
    badgeText: 'text-indigo-300 border-indigo-500/30',
    iconBg: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
    iconColor: 'text-indigo-400',
  },
  {
    from: 'from-teal-500',
    to: 'to-emerald-600',
    border: 'border-teal-500/30',
    hoverBorder: 'hover:border-teal-400',
    glow: 'rgba(20, 184, 166, 0.25)',
    badgeBg: 'bg-teal-500/15',
    badgeText: 'text-teal-300 border-teal-500/30',
    iconBg: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
    iconColor: 'text-teal-400',
  },
  {
    from: 'from-sky-600',
    to: 'to-cyan-500',
    border: 'border-sky-600/30',
    hoverBorder: 'hover:border-cyan-400',
    glow: 'rgba(14, 165, 233, 0.25)',
    badgeBg: 'bg-sky-600/15',
    badgeText: 'text-sky-300 border-sky-600/30',
    iconBg: 'bg-sky-600/20 text-sky-400 border border-sky-600/30',
    iconColor: 'text-sky-400',
  },
  {
    from: 'from-blue-600',
    to: 'to-indigo-700',
    border: 'border-blue-600/30',
    hoverBorder: 'hover:border-blue-500',
    glow: 'rgba(37, 99, 235, 0.25)',
    badgeBg: 'bg-blue-600/15',
    badgeText: 'text-blue-300 border-blue-600/30',
    iconBg: 'bg-blue-600/20 text-blue-400 border border-blue-600/30',
    iconColor: 'text-blue-400',
  },
  {
    from: 'from-amber-500',
    to: 'to-orange-600',
    border: 'border-amber-500/30',
    hoverBorder: 'hover:border-amber-400',
    glow: 'rgba(245, 158, 11, 0.25)',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300 border-amber-500/30',
    iconBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  {
    from: 'from-violet-500',
    to: 'to-purple-600',
    border: 'border-violet-500/30',
    hoverBorder: 'hover:border-violet-400',
    glow: 'rgba(139, 92, 246, 0.25)',
    badgeBg: 'bg-violet-500/15',
    badgeText: 'text-violet-300 border-violet-500/30',
    iconBg: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    from: 'from-cyan-600',
    to: 'to-blue-500',
    border: 'border-cyan-600/30',
    hoverBorder: 'hover:border-blue-400',
    glow: 'rgba(6, 182, 212, 0.25)',
    badgeBg: 'bg-cyan-600/15',
    badgeText: 'text-cyan-300 border-cyan-600/30',
    iconBg: 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30',
    iconColor: 'text-cyan-400',
  },
  {
    from: 'from-emerald-600',
    to: 'to-teal-500',
    border: 'border-emerald-600/30',
    hoverBorder: 'hover:border-teal-400',
    glow: 'rgba(16, 185, 129, 0.25)',
    badgeBg: 'bg-emerald-600/15',
    badgeText: 'text-emerald-300 border-emerald-600/30',
    iconBg: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
    iconColor: 'text-emerald-400',
  },
];

const getPaletteForIndex = (index: number) => {
  const i = Math.max(0, index) % PALETTES.length;
  return PALETTES[i];
};

export const INITIAL_12_BANKA_SLOTS: BankaSlot[] = Array.from(
  { length: BANKALAR_SLOT_COUNT },
  (_, index) => {
    const slotNumber = index + 1;
    const pal = getPaletteForIndex(index);
    return {
      id: `banka-slot-${slotNumber}`,
      slotNumber,
      badge: `${slotNumber}. BUTON`,
      title: '',
      url: '',
      gradient: pal,
    };
  }
);

const STORAGE_KEY = 'ozka_bankalar_buttons_v4_clean';

interface BankalarScreenProps {
  onBack: () => void;
  playClickSound: () => void;
  onOpenBankaHareketleri?: () => void;
}

export const BankalarScreen: React.FC<BankalarScreenProps> = ({
  onBack,
  playClickSound,
  onOpenBankaHareketleri,
}) => {
  const [buttons, setButtons] = useState<BankaSlot[]>(() => {
    try {
      // Önceki banka hareketlerinden kalan eski bağlantı ve buton kayıtlarını temizle
      localStorage.removeItem('ozka_bankalar_buttons_v3_12slots');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as BankaSlot[];
        if (Array.isArray(parsed) && parsed.length === BANKALAR_SLOT_COUNT) {
          return parsed.map((b, idx) => {
            const sira = b.slotNumber ?? idx + 1;
            const pal = getPaletteForIndex(sira - 1);
            return {
              ...b,
              slotNumber: sira,
              badge: `${sira}. BUTON`,
              gradient: pal,
            };
          });
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_12_BANKA_SLOTS;
  });

  const [editingButton, setEditingButton] = useState<BankaSlot | null>(null);
  const [editSiraNo, setEditSiraNo] = useState<number>(1);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);

  const editingButtonRef = React.useRef<BankaSlot | null>(null);
  editingButtonRef.current = editingButton;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const loadFromSupabase = async (showNotification = false) => {
    if (showNotification) setSupabaseLoading(true);
    try {
      const { rows } = await fetchBankaButonlar();

      const mapped: BankaSlot[] = Array.from(
        { length: BANKALAR_SLOT_COUNT },
        (_, idx) => {
          const slotNum = idx + 1;
          const pal = getPaletteForIndex(idx);

          // SADECE banka_butonlari tablosundan sira_no eşleşmesi (Banka Hareketleri 'bank' tablosundan veri alınmaz)
          const matched = rows?.find((r) => r.sira_no === slotNum);

          const rawTitle = matched?.buton_adi || matched?.adi || '';
          const hasValidTitle = Boolean(rawTitle && rawTitle.trim() !== '');

          let cleanUrl = (matched?.baglanti_linki || matched?.linki || '').trim();
          if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl;
          }

          return {
            id: `banka-slot-${slotNum}`,
            dbId: matched?.id,
            slotNumber: slotNum,
            badge: `${slotNum}. BUTON`,
            title: hasValidTitle ? rawTitle.trim() : '',
            url: hasValidTitle ? cleanUrl : '',
            gradient: pal,
          };
        }
      );

      if (!editingButtonRef.current) {
        setButtons(mapped);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      } catch {
        // ignore
      }

      const filledCount = mapped.filter((b) => b.title && b.title.trim()).length;
      if (showNotification) {
        if (filledCount > 0) {
          showToast(`✓ Bankalar sayfasında ${filledCount} adet tanımlı buton yüklendi.`);
        } else {
          showToast(`12 boş buton yuvası hazır.`);
        }
      }
    } catch (err) {
      console.error('Supabase fetch error:', err);
      if (showNotification) {
        showToast('⚠️ Bağlantı hatası oluştu.');
      }
    } finally {
      setSupabaseLoading(false);
    }
  };

  useEffect(() => {
    loadFromSupabase(false);

    const channel = supabase
      .channel(`${SUPABASE_TABLE}_realtime`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SUPABASE_TABLE },
        () => {
          if (!editingButtonRef.current) {
            loadFromSupabase(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenEdit = (btn: BankaSlot, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playClickSound();
    setEditingButton(btn);
    setEditSiraNo(btn.slotNumber);
    setEditTitle(btn.title || '');
    setEditUrl(btn.url || '');
  };

  const handleSaveEdit = async () => {
    if (!editingButton) return;
    playClickSound();

    let cleanUrl = editUrl.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const cleanTitle = editTitle.trim();
    const targetSlot = editingButton.slotNumber;

    if (!cleanTitle) {
      await handleClearSlot(editingButton);
      return;
    }

    const pal = getPaletteForIndex(targetSlot - 1);
    const updatedButton: BankaSlot = {
      ...pal,
      id: `banka-slot-${targetSlot}`,
      dbId: editingButton.dbId,
      slotNumber: targetSlot,
      badge: `${targetSlot}. BUTON`,
      title: cleanTitle,
      url: cleanUrl,
      gradient: pal,
    };

    const nextList = buttons.map((b) => (b.slotNumber === targetSlot ? updatedButton : b));
    setButtons(nextList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // ignore
    }

    setEditingButton(null);
    setIsSavingToDb(true);
    try {
      const res = await saveBankaButonToSupabase({
        dbId: editingButton.slotNumber === targetSlot ? editingButton.dbId : undefined,
        sira_no: targetSlot,
        buton_adi: cleanTitle,
        baglanti_linki: cleanUrl,
      });

      if (res.success) {
        showToast(`✓ ${targetSlot}. Buton "${cleanTitle}" başarıyla kaydedildi.`);
        if (res.row?.id) {
          setButtons((prev) =>
            prev.map((s) => (s.slotNumber === targetSlot ? { ...s, dbId: res.row?.id } : s))
          );
        }
      } else if (res.error) {
        showToast(`⚠️ Kayıt uyarısı: ${res.error}`);
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('⚠️ Sunucuya kayıt yapılamadı.');
    } finally {
      setIsSavingToDb(false);
    }
  };

  const handleClearSlot = async (btn: BankaSlot) => {
    playClickSound();
    const updated = buttons.map((b) =>
      b.slotNumber === btn.slotNumber
        ? {
            ...b,
            title: '',
            url: '',
            dbId: undefined,
          }
        : b
    );
    setButtons(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setEditingButton(null);

    try {
      await deleteBankaButonFromSupabase({
        dbId: btn.dbId,
        sira_no: btn.slotNumber,
      });
    } catch {
      // ignore
    }

    showToast(`${btn.slotNumber}. Buton boşaltıldı.`);
  };

  const handleResetAllSlots = () => {
    playClickSound();
    if (
      !window.confirm(
        'Tüm 12 buton yuvası temizlenecek ve boşaltılacak. Onaylıyor musunuz?'
      )
    ) {
      return;
    }

    setButtons(INITIAL_12_BANKA_SLOTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('ozka_bankalar_buttons_v3_12slots');
    } catch {
      // ignore
    }
    buttons.forEach((b) => {
      if (b.dbId || b.title) {
        deleteBankaButonFromSupabase({ dbId: b.dbId, sira_no: b.slotNumber }).catch(() => {});
      }
    });
    showToast('Tüm buton yuvaları temizlendi ve boşaltıldı.');
  };

  const handleCardClick = (btn: BankaSlot) => {
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

  const [activeFilter, setActiveFilter] = useState<'configured' | 'empty'>('configured');
  const configuredButtons = buttons.filter((b) => b.title && b.title.trim());
  const emptyButtons = buttons.filter((b) => !b.title || !b.title.trim());
  const configuredCount = configuredButtons.length;

  const renderCard = (btn: BankaSlot) => {
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
            : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/15 hover:border-sky-500/40 border-dashed'
        } shadow-lg shadow-black/40 hover:shadow-xl`}
        style={{ minHeight: '150px' }}
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
              title={isConfigured ? 'Butonu Düzenle' : 'Buton Tanımla'}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/15 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center my-1.5">
          <div className="flex items-start gap-2.5">
            <div
              className={`flex-shrink-0 flex items-center justify-center w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105 ${
                isConfigured
                  ? btn.gradient.iconBg
                  : 'bg-white/5 text-gray-400 border border-white/10 group-hover:text-sky-400 group-hover:border-sky-500/40'
              }`}
            >
              {isConfigured ? <Landmark className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <h4
                className={`font-bold text-sm sm:text-base tracking-tight leading-snug break-words transition-colors ${
                  isConfigured
                    ? 'text-white group-hover:text-sky-300'
                    : 'text-gray-300 group-hover:text-white'
                }`}
              >
                {isConfigured ? btn.title : '+ Buton Tanımla'}
              </h4>

              <p className="text-[11px] text-gray-400 mt-1 line-clamp-1 leading-relaxed">
                {isConfigured && hasUrl ? (
                  <span className="text-sky-400/90 font-mono text-[10px] truncate block">
                    {btn.url.replace(/^https?:\/\//, '')}
                  </span>
                ) : isConfigured ? (
                  <span className="text-gray-500 italic text-[11px]">Bağlantı linki yok</span>
                ) : (
                  <span className="text-gray-500 text-[11px]">Boş Yuva</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
          {isConfigured && hasUrl ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEdit(btn, e);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all shadow-sm active:scale-95"
                title="Buton Adı ve Linkini Güncelle"
              >
                <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                <span>Güncelle</span>
              </button>
              <div className="flex items-center gap-1.5 text-sky-400 font-bold group-hover:text-sky-300">
                <span>Sisteme Git</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          ) : isConfigured ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEdit(btn, e);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all shadow-sm active:scale-95"
                title="Buton Adı ve Linkini Güncelle"
              >
                <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                <span>Güncelle</span>
              </button>
              <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-white font-medium">
                <Plus className="w-3.5 h-3.5" />
                <span>Link Ekle</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sky-400 group-hover:text-sky-300 font-medium">
              <Plus className="w-3.5 h-3.5" />
              <span>Tanımlamak İçin Tıklayın</span>
            </div>
          )}

          <div
            className={`text-[11px] font-medium ${
              isConfigured && hasUrl
                ? 'text-sky-400/80'
                : isConfigured
                ? 'text-amber-400/80'
                : 'text-gray-500'
            }`}
          >
            {isConfigured && hasUrl
              ? 'Bağlantı Aktif'
              : isConfigured
              ? 'Link Tanımsız'
              : 'Boş Buton'}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-gray-100 flex flex-col relative overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a0c]/85 border-b border-white/10 px-4 sm:px-8 py-3.5 shadow-xl">
          <div className="w-full max-w-[1720px] mx-auto flex items-center justify-between gap-3">
            <button
              id="banka-back-btn"
              type="button"
              onClick={() => {
                playClickSound();
                onBack();
              }}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 hover:border-sky-400/50 text-gray-200 hover:text-white transition-all shadow-md active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-sky-400 group-hover:-translate-x-1 transition-transform" />
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
                    <Landmark className="w-4 h-4 text-sky-400" />
                    <span>BANKALAR</span>
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold hidden sm:inline-flex">
                    {configuredCount} / {BANKALAR_SLOT_COUNT} Tanımlı
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 hidden sm:block">
                  ÖZKA Finans & Bankacılık İşlemleri Portalı
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* BANKA HAREKETLERİ CANLI TABLO BUTONU */}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  if (onOpenBankaHareketleri) {
                    onOpenBankaHareketleri();
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-black tracking-wide bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/30 hover:scale-102 active:scale-95 transition-all flex items-center gap-1.5 border border-orange-300/30"
                title="Banka Hareketleri Canlı Tablosunu Aç"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>BANKA HAREKETLERİ</span>
              </button>

              <button
                type="button"
                onClick={() => loadFromSupabase(true)}
                disabled={supabaseLoading}
                title="Yenile"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${supabaseLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Yenile</span>
              </button>

              <button
                type="button"
                onClick={handleResetAllSlots}
                title="Tüm buton yuvalarını temizle"
                className="p-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
          {toastMessage && (
            <div className="p-3.5 rounded-2xl bg-sky-950/80 border border-sky-500/40 text-xs sm:text-sm text-sky-200 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
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

          {/* FİLTRELEME VE DURUM BİLGİSİ */}
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
                <CheckCircle2 className="w-3.5 h-3.5" />
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
                <Layers className="w-3.5 h-3.5" />
                <span>Boş Yuvalar ({emptyButtons.length})</span>
              </button>
            </div>

            <div className="text-xs text-gray-400">
              {configuredButtons.length} adet aktif tanımlı, {emptyButtons.length} adet boş yuva
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
                  Tanımlı butonlara tıklayarak doğrudan banka internet şubesine erişebilirsiniz
                </span>
              </div>

              {configuredButtons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {configuredButtons.map(renderCard)}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 text-center space-y-2">
                  <p className="text-sm font-semibold text-gray-300">
                    Henüz tanımlanmış bir banka butonu bulunmuyor.
                  </p>
                  <p className="text-xs text-gray-500">
                    Boş Yuvalar sekmesine geçerek veya aşağıdaki boş yuvalara tıklayarak banka adı ve internet şubesi adresi tanımlayabilirsiniz.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. BÖLÜM: BOŞ BUTON YUVALARI */}
          {activeFilter === 'empty' && (
            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <h3 className="text-sm sm:text-base font-bold text-gray-300 tracking-wide flex items-center gap-2">
                    <span>BOŞ BUTON YUVALARI</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/15">
                      {emptyButtons.length} Adet Bekliyor
                    </span>
                  </h3>
                </div>
                <span className="text-xs text-gray-500">
                  Tıklayarak banka adı ve internet şubesi URL bağlantısı ekleyebilirsiniz
                </span>
              </div>

              {emptyButtons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {emptyButtons.map(renderCard)}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-center space-y-1">
                  <p className="text-sm font-semibold text-emerald-300">
                    Tüm 12 banka yuvası tanımlanmıştır.
                  </p>
                  <p className="text-xs text-emerald-400/70">
                    Gerektiğinde butonların üzerindeki kalem ikonuna basarak güncelleyebilirsiniz.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <footer className="relative z-10 py-6 text-center border-t border-white/10 text-xs text-gray-400">
        <p>© Bayburt Öz-Ka İnş.İth.İhr.Tic.Ltd.Şti • <span className="text-blue-400 font-medium">Yazılım ve Tasarım: EMİRHAN KALHAN</span></p>
      </footer>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingButton && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingButton(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="relative z-10 w-full max-w-lg bg-[#0e1117] border border-sky-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {editingButton.title ? `${editSiraNo}. Butonu Güncelle / Düzenle` : `${editSiraNo}. Butonu Tanımla`}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Banka adı ve internet şubesi bağlantı linkini belirleyin
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

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Banka Adı <span className="text-sky-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Örn: Ziraat Bankası, Garanti BBVA, VakıfBank..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-sky-500 focus:border-sky-600 focus:ring-2 focus:ring-sky-500/20 focus:outline-none text-slate-900 font-bold placeholder-slate-400 transition-colors"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    İnternet Şubesi Linki
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="https://ebanka.ziraatbank.com.tr"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-sky-500 focus:border-sky-600 focus:outline-none text-slate-900 placeholder-slate-400 transition-colors text-xs"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">
                      Tıklanınca yeni sekmede açılacak banka web adresi
                    </span>
                    {editUrl && (
                      <a
                        href={editUrl.startsWith('http') ? editUrl : `https://${editUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <span>Yeni Sekmede Test Et</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                {editingButton.title ? (
                  <button
                    type="button"
                    onClick={() => handleClearSlot(editingButton)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Butonu Boşalt</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingButton(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isSavingToDb}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {isSavingToDb ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Kaydediliyor...</span>
                      </>
                    ) : editingButton.title ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Değişiklikleri Güncelle</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Kaydet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

