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
  FileText,
  CheckCircle2,
  RefreshCw,
  Database,
  Loader2,
  Trash2,
  RotateCcw,
  Handshake,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import {
  fetchFaturaButonlar,
  saveFaturaButonToSupabase,
  deleteFaturaButonFromSupabase,
  fetchSantiyeIsimleriFromSupabase,
  SupabaseSantiyeRow,
  supabase,
} from '../lib/supabase';

export interface FaturaSlot {
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

export const FATURA_SLOT_COUNT = 12;
const SUPABASE_TABLE = 'fatura_butonlari';
const SUPABASE_TABLE_URL =
  'https://supabase.com/dashboard/project/zgeeziqcenezutumhukp/editor/17488?schema=public/fatura_butonlari';

const PALETTES = [
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
    from: 'from-fuchsia-500',
    to: 'to-pink-600',
    border: 'border-fuchsia-500/30',
    hoverBorder: 'hover:border-fuchsia-400',
    glow: 'rgba(217, 70, 239, 0.25)',
    badgeBg: 'bg-fuchsia-500/15',
    badgeText: 'text-fuchsia-300 border-fuchsia-500/30',
    iconBg: 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30',
    iconColor: 'text-fuchsia-400',
  },
  {
    from: 'from-purple-500',
    to: 'to-indigo-600',
    border: 'border-purple-500/30',
    hoverBorder: 'hover:border-purple-400',
    glow: 'rgba(168, 85, 247, 0.25)',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-300 border-purple-500/30',
    iconBg: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    iconColor: 'text-purple-400',
  },
  {
    from: 'from-pink-500',
    to: 'to-rose-600',
    border: 'border-pink-500/30',
    hoverBorder: 'hover:border-pink-400',
    glow: 'rgba(236, 72, 153, 0.25)',
    badgeBg: 'bg-pink-500/15',
    badgeText: 'text-pink-300 border-pink-500/30',
    iconBg: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
    iconColor: 'text-pink-400',
  },
  {
    from: 'from-indigo-500',
    to: 'to-blue-600',
    border: 'border-indigo-500/30',
    hoverBorder: 'hover:border-indigo-400',
    glow: 'rgba(99, 102, 241, 0.25)',
    badgeBg: 'bg-indigo-500/15',
    badgeText: 'text-indigo-300 border-indigo-500/30',
    iconBg: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
    iconColor: 'text-indigo-400',
  },
  {
    from: 'from-rose-500',
    to: 'to-orange-600',
    border: 'border-rose-500/30',
    hoverBorder: 'hover:border-rose-400',
    glow: 'rgba(244, 63, 94, 0.25)',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-300 border-rose-500/30',
    iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    iconColor: 'text-rose-400',
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
    from: 'from-amber-500',
    to: 'to-orange-600',
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
    from: 'from-violet-600',
    to: 'to-fuchsia-600',
    border: 'border-violet-600/30',
    hoverBorder: 'hover:border-fuchsia-400',
    glow: 'rgba(124, 58, 237, 0.25)',
    badgeBg: 'bg-violet-600/15',
    badgeText: 'text-fuchsia-300 border-violet-600/30',
    iconBg: 'bg-violet-600/20 text-fuchsia-400 border border-violet-600/30',
    iconColor: 'text-fuchsia-400',
  },
  {
    from: 'from-blue-600',
    to: 'to-cyan-600',
    border: 'border-blue-600/30',
    hoverBorder: 'hover:border-cyan-400',
    glow: 'rgba(37, 99, 235, 0.25)',
    badgeBg: 'bg-blue-600/15',
    badgeText: 'text-cyan-300 border-blue-600/30',
    iconBg: 'bg-blue-600/20 text-cyan-400 border border-blue-600/30',
    iconColor: 'text-cyan-400',
  },
  {
    from: 'from-purple-600',
    to: 'to-rose-600',
    border: 'border-purple-600/30',
    hoverBorder: 'hover:border-rose-400',
    glow: 'rgba(147, 51, 234, 0.25)',
    badgeBg: 'bg-purple-600/15',
    badgeText: 'text-rose-300 border-purple-600/30',
    iconBg: 'bg-purple-600/20 text-rose-400 border border-purple-600/30',
    iconColor: 'text-rose-400',
  },
];

const getPaletteForIndex = (index: number) => {
  const i = Math.max(0, index) % PALETTES.length;
  return PALETTES[i];
};

const DEFAULT_FATURA_DATA: Record<number, { title: string; url: string }> = {
  1: {
    title: 'FATURA YÜKLEME EKRANI',
    url: 'https://faturaonaytakip.bayburtozka.com.tr/',
  },
  2: {
    title: 'FATURA ONAY',
    url: 'https://faturaonaylama.bayburtozka.com.tr/',
  },
  3: {
    title: 'MUTABAKAT PORTALI',
    url: 'https://mutabakat.bayburtozka.com.tr/',
  },
};

export const INITIAL_12_FATURA_SLOTS: FaturaSlot[] = Array.from(
  { length: FATURA_SLOT_COUNT },
  (_, index) => {
    const slotNumber = index + 1;
    const pal = getPaletteForIndex(index);
    const def = DEFAULT_FATURA_DATA[slotNumber];
    return {
      id: `fatura-slot-${slotNumber}`,
      slotNumber,
      badge: `${slotNumber}. BUTON`,
      title: def ? def.title : '',
      subtitle: '',
      url: def ? def.url : '',
      gradient: pal,
    };
  }
);

const STORAGE_KEY = 'ozka_fatura_buttons_v3_12slots';

export interface SelectedFirmaInfo {
  santiyeadi?: string;
  anafirma: string;
  vergino: string;
}

interface FaturalarScreenProps {
  onBack: () => void;
  playClickSound: () => void;
  onOpenMutabakat?: (firma?: SelectedFirmaInfo) => void;
  initialOpenMutabakatModal?: boolean;
  onCloseMutabakatModal?: () => void;
}

export const FaturalarScreen: React.FC<FaturalarScreenProps> = ({
  onBack,
  playClickSound,
  onOpenMutabakat,
  initialOpenMutabakatModal = false,
  onCloseMutabakatModal,
}) => {
  // Mutabakat Portalı Firma Seçim Listbox Modalı State'leri
  const [showFirmaSecModal, setShowFirmaSecModal] = useState(false);
  const [santiyeListesi, setSantiyeListesi] = useState<SupabaseSantiyeRow[]>([]);
  const [santiyeLoading, setSantiyeLoading] = useState(false);
  const [selectedSantiyeId, setSelectedSantiyeId] = useState<string>(''); // Başlangıçta boş: "veri olmasın"

  // initialOpenMutabakatModal bayrağı geldiğinde modalı otomatik aç
  useEffect(() => {
    if (initialOpenMutabakatModal) {
      setShowFirmaSecModal(true);
      if (santiyeListesi.length === 0) {
        setSantiyeLoading(true);
        fetchSantiyeIsimleriFromSupabase()
          .then(setSantiyeListesi)
          .catch((err) => console.warn('Şantiye isimleri yüklenemedi:', err))
          .finally(() => setSantiyeLoading(false));
      }
      onCloseMutabakatModal?.();
    }
  }, [initialOpenMutabakatModal]);

  const [buttons, setButtons] = useState<FaturaSlot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FaturaSlot[];
        if (Array.isArray(parsed) && parsed.length === FATURA_SLOT_COUNT) {
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
    return INITIAL_12_FATURA_SLOTS;
  });

  const [editingButton, setEditingButton] = useState<FaturaSlot | null>(null);
  const [editSiraNo, setEditSiraNo] = useState<number>(1);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);

  const editingButtonRef = React.useRef<FaturaSlot | null>(null);
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
      const rows = await fetchFaturaButonlar();

      const mapped: FaturaSlot[] = Array.from(
        { length: FATURA_SLOT_COUNT },
        (_, idx) => {
          const slotNum = idx + 1;
          const pal = getPaletteForIndex(idx);

          const matched =
            rows?.find((r) => r.sira_no === slotNum) || (rows && rows[idx] ? rows[idx] : null);

          const def = DEFAULT_FATURA_DATA[slotNum];

          const hasValidTitle = Boolean(
            matched && matched.buton_adi && matched.buton_adi.trim() !== ''
          );

          let cleanUrl = (
            matched?.baglanti_linki || (hasValidTitle ? '' : def?.url || '')
          ).trim();
          if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl;
          }

          const title = hasValidTitle
            ? matched!.buton_adi.trim()
            : def && (!rows || rows.length === 0)
            ? def.title
            : '';

          return {
            id: `fatura-slot-${slotNum}`,
            dbId: matched?.id,
            slotNumber: slotNum,
            badge: `${slotNum}. BUTON`,
            title,
            subtitle: '',
            url: title ? cleanUrl : '',
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
          showToast(`✓ Supabase ${SUPABASE_TABLE} tablosundan ${filledCount} buton eşleştirildi.`);
        } else {
          showToast(`Supabase ${SUPABASE_TABLE} tablosunda henüz veri bulunmuyor. 12 boş buton hazır.`);
        }
      }
    } catch (err) {
      console.error('Supabase fetch error:', err);
      if (showNotification) {
        showToast('⚠️ Supabase bağlantı hatası oluştu.');
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
        (payload) => {
          console.log(`[Realtime] ${SUPABASE_TABLE} değişikliği:`, payload);
          if (!editingButtonRef.current) {
            loadFromSupabase(false);
          }
        }
      )
      .subscribe();

    const onFocus = () => {
      if (!editingButtonRef.current) {
        loadFromSupabase(false);
      }
    };
    window.addEventListener('focus', onFocus);

    const interval = setInterval(() => {
      if (!editingButtonRef.current) {
        loadFromSupabase(false);
      }
    }, 3000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenEdit = (btn: FaturaSlot, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playClickSound();
    setEditingButton(btn);
    setEditSiraNo(btn.slotNumber);
    setEditTitle(btn.title || '');
    setEditSubtitle(btn.subtitle || '');
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
    const cleanSubtitle = editSubtitle.trim();
    const targetSlot = editingButton.slotNumber;

    if (!cleanTitle) {
      await handleClearSlot(editingButton);
      return;
    }

    const pal = getPaletteForIndex(targetSlot - 1);
    const updatedButton: FaturaSlot = {
      ...pal,
      id: `fatura-slot-${targetSlot}`,
      dbId: editingButton.dbId,
      slotNumber: targetSlot,
      badge: `${targetSlot}. BUTON`,
      title: cleanTitle,
      subtitle: cleanSubtitle,
      url: cleanUrl,
      gradient: pal,
    };

    const nextList = buttons.map((b) => {
      if (b.slotNumber === targetSlot) return updatedButton;
      if (editingButton.slotNumber !== targetSlot && b.slotNumber === editingButton.slotNumber) {
        const oldPal = getPaletteForIndex(editingButton.slotNumber - 1);
        return {
          ...oldPal,
          id: `fatura-slot-${editingButton.slotNumber}`,
          slotNumber: editingButton.slotNumber,
          badge: `${editingButton.slotNumber}. BUTON`,
          title: '',
          subtitle: '',
          url: '',
          gradient: oldPal,
        };
      }
      return b;
    });
    setButtons(nextList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // ignore
    }

    if (editingButton.slotNumber !== targetSlot) {
      deleteFaturaButonFromSupabase({ sira_no: editingButton.slotNumber }).catch(() => {});
    }

    setEditingButton(null);
    setIsSavingToDb(true);
    try {
      const res = await saveFaturaButonToSupabase({
        dbId: editingButton.slotNumber === targetSlot ? editingButton.dbId : undefined,
        sira_no: targetSlot,
        buton_adi: cleanTitle,
        baglanti_linki: cleanUrl,
      });

      if (res.success) {
        showToast(`✓ ${targetSlot}. Buton "${cleanTitle}" başarıyla güncellendi.`);
        if (res.row?.id) {
          setButtons((prev) =>
            prev.map((s) => (s.slotNumber === targetSlot ? { ...s, dbId: res.row?.id } : s))
          );
        }
      } else if (res.error) {
        showToast(`⚠️ Supabase kayıt uyarısı: ${res.error}`);
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('⚠️ Supabase sunucusuna kayıt yapılamadı.');
    } finally {
      setIsSavingToDb(false);
    }
  };

  const handleClearSlot = async (btn: FaturaSlot) => {
    playClickSound();
    const updated = buttons.map((b) =>
      b.slotNumber === btn.slotNumber
        ? {
            ...b,
            title: '',
            subtitle: '',
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
      await deleteFaturaButonFromSupabase({
        dbId: btn.dbId,
        sira_no: btn.slotNumber,
      });
    } catch {
      await saveFaturaButonToSupabase({
        dbId: btn.dbId,
        sira_no: btn.slotNumber,
        buton_adi: '',
        baglanti_linki: '',
      });
    }

    showToast(`${btn.slotNumber}. Buton boşaltıldı.`);
  };

  const handleResetAllSlots = () => {
    playClickSound();
    if (
      !window.confirm(
        'Tüm 12 buton yuvası sıfırlanacak. Supabase tablosundaki veriler de temizlensin mi?'
      )
    ) {
      return;
    }

    setButtons(INITIAL_12_FATURA_SLOTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    buttons.forEach((b) => {
      if (b.dbId || b.title) {
        deleteFaturaButonFromSupabase({ dbId: b.dbId, sira_no: b.slotNumber }).catch(() => {});
      }
    });
    showToast('Tüm buton yuvaları sıfırlandı.');
  };

  const handleCardClick = (btn: FaturaSlot) => {
    playClickSound();
    if (btn.title && btn.title.toLowerCase().includes('mutabakat')) {
      handleOpenMutabakat();
      return;
    }
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

  const handleOpenMutabakat = async () => {
    playClickSound();
    setShowFirmaSecModal(true);
    if (santiyeListesi.length === 0) {
      setSantiyeLoading(true);
      try {
        const rows = await fetchSantiyeIsimleriFromSupabase();
        setSantiyeListesi(rows);
      } catch (err) {
        console.warn('Santiye isimleri yüklenemedi:', err);
      } finally {
        setSantiyeLoading(false);
      }
    }
  };

  const handleConfirmFirmaAndOpen = () => {
    playClickSound();
    if (!selectedSantiyeId) {
      showToast('Lütfen listeden bir firma / şantiye seçiniz! Firma seçilmeden Mutabakat Portalına giriş yapılamaz.');
      return;
    }
    const chosen = santiyeListesi.find((s) => s.id === selectedSantiyeId);
    if (!chosen) {
      showToast('Seçilen firma bulunamadı. Lütfen listeden tekrar seçiniz.');
      return;
    }
    setShowFirmaSecModal(false);
    if (onOpenMutabakat) {
      onOpenMutabakat({
        santiyeadi: chosen.Santiyeadı || '',
        anafirma: chosen.unvani || chosen.Santiyeadı || '',
        vergino: chosen.vergino || '',
      });
    }
  };

  const [activeFilter, setActiveFilter] = useState<'configured' | 'empty'>('configured');
  const configuredButtons = buttons.filter((b) => b.title && b.title.trim());
  const emptyButtons = buttons.filter((b) => !b.title || !b.title.trim());
  const configuredCount = configuredButtons.length;

  const renderCard = (btn: FaturaSlot) => {
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
            : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/15 hover:border-violet-500/40 border-dashed'
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
                  : 'bg-white/5 text-gray-400 border border-white/10 group-hover:text-violet-400 group-hover:border-violet-500/40'
              }`}
            >
              {isConfigured ? (
                btn.title.toLowerCase().includes('mutabakat') ? (
                  <Handshake className="w-5 h-5 text-emerald-300" />
                ) : (
                  <FileText className="w-5 h-5" />
                )
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4
                className={`font-bold text-sm sm:text-base tracking-tight leading-snug break-words transition-colors ${
                  isConfigured
                    ? 'text-white group-hover:text-violet-300'
                    : 'text-gray-300 group-hover:text-white'
                }`}
              >
                {isConfigured ? btn.title : '+ Buton Tanımla'}
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 leading-relaxed">
                {isConfigured && hasUrl ? (
                  <span className="text-violet-400/90 font-mono text-[10px] truncate block">
                    {btn.url.replace(/^https?:\/\//, '')}
                  </span>
                ) : isConfigured ? (
                  <span className="text-gray-500 italic text-[11px]">Bağlantı linki yok</span>
                ) : (
                  <span className="text-gray-500 text-[10px]">
                    {SUPABASE_TABLE} tablosunda Sıra No: {btn.slotNumber} bekleniyor
                  </span>
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
                <Edit3 className="w-3.5 h-3.5 text-violet-400" />
                <span>Güncelle</span>
              </button>
              <div className="flex items-center gap-1.5 text-violet-400 font-bold group-hover:text-violet-300">
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
                <Edit3 className="w-3.5 h-3.5 text-violet-400" />
                <span>Güncelle</span>
              </button>
              <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-white font-medium">
                <Plus className="w-3.5 h-3.5" />
                <span>Link Ekle</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-violet-400 group-hover:text-violet-300 font-medium">
              <Plus className="w-3.5 h-3.5" />
              <span>Tanımlamak İçin Tıklayın</span>
            </div>
          )}

          <div
            className={`text-[11px] font-medium ${
              isConfigured && hasUrl
                ? 'text-violet-400/80'
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
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a0c]/85 border-b border-white/10 px-4 sm:px-8 py-3.5 shadow-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <button
              id="fatura-back-btn"
              type="button"
              onClick={() => {
                playClickSound();
                onBack();
              }}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 hover:border-violet-400/50 text-gray-200 hover:text-white transition-all shadow-md active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-violet-400 group-hover:-translate-x-1 transition-transform" />
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
                    <FileText className="w-4 h-4 text-violet-400" />
                    <span>FATURA PORTALI</span>
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 font-bold hidden sm:inline-flex">
                    {configuredCount} / {FATURA_SLOT_COUNT} Tanımlı
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 hidden sm:block">
                  ÖZKA e-Fatura, e-Arşiv & Fatura İşlemleri Portalı
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* MUTABAKAT PORTALI BUTONU */}
              <button
                type="button"
                onClick={handleOpenMutabakat}
                className="px-3 sm:px-4 py-2 rounded-xl text-xs font-black tracking-wide bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-102 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 border border-emerald-300"
                title="Mutabakat Portalı Sistemine Git"
              >
                <Handshake className="w-4 h-4 text-slate-950" />
                <span>MUTABAKAT PORTALI</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-900" />
              </button>

              <button
                type="button"
                onClick={() => loadFromSupabase(true)}
                disabled={supabaseLoading}
                title="Supabase tablosundan verileri tekrar yükle"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
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
            <div className="p-3.5 rounded-2xl bg-violet-950/80 border border-violet-500/40 text-xs sm:text-sm text-violet-200 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
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

          {/* MUTABAKAT PORTALI ÖZEL BANNERI */}
          {(() => {
            const mutabakatSlot = buttons.find(
              (b) => b.title && b.title.toLowerCase().includes('mutabakat')
            );
            return (
              <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-teal-950/70 border border-emerald-500/30 shadow-xl shadow-black/50 backdrop-blur-md">
                <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30 border border-emerald-300 flex-shrink-0">
                      <Handshake className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          HIZLI ERİŞİM PORTALI
                        </span>
                        <span className="text-[11px] text-gray-400">
                          Cari Hesap & BA / BS Mutabakat İşlemleri
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5 flex items-center gap-2">
                        <span>MUTABAKAT PORTALI</span>
                      </h2>
                      <p className="text-xs text-gray-300 line-clamp-1 mt-0.5">
                        {mutabakatSlot?.url ? (
                          <span className="text-emerald-300 font-mono text-[11px] flex items-center gap-1">
                            <span>Bağlantı:</span>
                            <span className="underline underline-offset-2">{mutabakatSlot.url}</span>
                          </span>
                        ) : (
                          'Tıklayarak doğrudan e-Mutabakat sistemine geçiş yapabilir veya bağlantı adresini güncelleyebilirsiniz.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                    {mutabakatSlot && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(mutabakatSlot, e)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-gray-200 hover:text-white border border-white/15 transition-all flex items-center gap-1.5"
                        title="Mutabakat Portalı Butonunu ve Linkini Düzenle"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Bağlantıyı Düzenle</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleOpenMutabakat}
                      className="px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black tracking-wide bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/30 hover:scale-102 active:scale-95 transition-all flex items-center gap-2 border border-emerald-300"
                    >
                      <Handshake className="w-4 h-4 text-slate-950" />
                      <span>MUTABAKAT PORTALINA GİT</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

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
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-lg shadow-violet-500/50 animate-pulse" />
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                    <span>İSİMLENDİRİLMİŞ & TANIMLI BUTONLAR</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {configuredButtons.length} Adet
                    </span>
                  </h3>
                </div>
                <span className="text-xs text-gray-400">
                  Tanımlı butonlara tıklayarak doğrudan fatura portalına erişebilirsiniz
                </span>
              </div>

              {configuredButtons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {configuredButtons.map(renderCard)}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 text-center space-y-2">
                  <p className="text-sm font-semibold text-gray-300">
                    Henüz tanımlanmış bir fatura butonu bulunmuyor.
                  </p>
                  <p className="text-xs text-gray-500">
                    Boş Yuvalar sekmesine geçerek buton adı ve bağlantı adresi tanımlayabilirsiniz.
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
                  Tıklayarak fatura portali adı ve URL bağlantısı ekleyebilirsiniz
                </span>
              </div>

              {emptyButtons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {emptyButtons.map(renderCard)}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-center space-y-1">
                  <p className="text-sm font-semibold text-emerald-300">
                    Tüm 12 fatura yuvası başarıyla tanımlanmıştır!
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
              className="relative z-10 w-full max-w-lg bg-[#110e1a] border border-violet-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {editingButton.title ? `${editSiraNo}. Butonu Güncelle / Düzenle` : `${editSiraNo}. Butonu Tanımla`}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Supabase <span className="text-violet-300 font-mono">{SUPABASE_TABLE}</span> tablosu ile doğrudan senkronize olur
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-300">
                      Sıra Numarası
                    </label>
                    <span className="text-[11px] font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 text-violet-400" />
                      Otomatik (Buton Numarasından Alındı)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-violet-500/30 text-white shadow-inner">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/40 font-bold text-base flex items-center justify-center shadow-sm">
                      {editingButton.slotNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm">
                        {editingButton.slotNumber}. Buton Yuvası
                      </div>
                      <div className="text-xs text-gray-400">
                        Supabase Sıra No: <span className="font-mono font-bold text-violet-300">{editingButton.slotNumber}</span> (Doğrudan bu butonla eşleşir)
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 font-mono">
                      sira_no = {editingButton.slotNumber}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Fatura / Buton Adı <span className="text-violet-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Örn: GİB e-Arşiv Fatura Portalı..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-violet-500 focus:outline-none text-white placeholder-gray-500 transition-colors"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Bağlantı Linki (URL)
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="https://earsivportal.efatura.gov.tr"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-violet-500 focus:outline-none text-white placeholder-gray-500 transition-colors text-xs"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">
                      Tıklanınca yeni sekmede açılacak tam web adresi
                    </span>
                    {editUrl && (
                      <a
                        href={editUrl.startsWith('http') ? editUrl : `https://${editUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-400 hover:underline flex items-center gap-1"
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
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
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
                        <span>Kaydet ve Eşleştir</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MUTABAKAT PORTALINA GİT - FİRMA SEÇİM LİSTBOX MODALI */}
      <AnimatePresence>
        {showFirmaSecModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-emerald-500/30 text-gray-100 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative my-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/20">
                    <Handshake className="w-5 h-5 text-slate-950" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-wide">
                      MUTABAKAT PORTALINA GİT
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      İşlem yapmak istediğiniz firmayı / şantiyeyi seçiniz
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFirmaSecModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Listbox Bölümü */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black tracking-wider text-emerald-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      FİRMA SEÇ (santiyeadı sütunu)
                    </span>
                    <a
                      href="https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/19170?schema=public/santiyeisimleri"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                      title="Supabase tablosunu aç"
                    >
                      <span>santiyeisimleri</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </label>

                  {/* LİSTBOX: BAŞLANGIÇTA SEÇİMSİZ / "VERİ OLMASIN" */}
                  <div className="relative">
                    <select
                      value={selectedSantiyeId}
                      onChange={(e) => setSelectedSantiyeId(e.target.value)}
                      disabled={santiyeLoading}
                      className="w-full px-4 py-3.5 pr-10 rounded-2xl bg-white border-2 border-emerald-500/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold transition-all outline-none appearance-none cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      <option value="" className="text-slate-600 bg-white">-- Firma Seç (Veri Seçilmedi) --</option>
                      {santiyeListesi.map((s) => (
                        <option key={s.id} value={s.id} className="text-slate-900 bg-white font-medium">
                          {s.Santiyeadı} {s.vergino ? `(VKN: ${s.vergino})` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
                      {santiyeLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Seçtiğiniz şantiye ve vergi numarası Mutabakat Portalı'ndaki ana firma alanlarına otomatik aktarılır.
                  </p>
                </div>

                {/* Seçilen Şantiye Detay Kartı */}
                {(() => {
                  const chosen = santiyeListesi.find((s) => s.id === selectedSantiyeId);
                  if (!chosen) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Seçilen Şantiye:</span>
                        <span className="font-bold text-white text-sm">{chosen.Santiyeadı}</span>
                      </div>
                      {chosen.unvani && (
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-gray-400 flex-shrink-0">Firma Ünvanı:</span>
                          <span className="font-bold text-emerald-300 text-right">
                            {chosen.unvani}
                          </span>
                        </div>
                      )}
                      {chosen.vergino && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Vergi No (VKN):</span>
                          <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {chosen.vergino}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })()}

                {/* Firma Seçilmediğinde Uyarı */}
                {!selectedSantiyeId && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                    <span className="font-bold">⚠️ Uyarı:</span>
                    <span>Mutabakat portalına giriş yapabilmek için yukarıdaki listeden bir firma / şantiye seçmelisiniz.</span>
                  </div>
                )}

                {/* Butonlar */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleConfirmFirmaAndOpen}
                    disabled={!selectedSantiyeId}
                    className={`flex-1 px-4 py-3 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${
                      selectedSantiyeId
                        ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/25 cursor-pointer'
                        : 'bg-slate-700/60 text-slate-400 border border-white/10 cursor-not-allowed opacity-75'
                    }`}
                  >
                    <Handshake className="w-4 h-4" />
                    <span>
                      {selectedSantiyeId
                        ? 'Seçilen Firma İle Mutabakat Portalına Git'
                        : 'Lütfen Firma Seçiniz (Zorunlu)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowFirmaSecModal(false);
                    }}
                    className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-semibold border border-white/10 transition-all active:scale-95 text-center"
                  >
                    Vazgeç
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
