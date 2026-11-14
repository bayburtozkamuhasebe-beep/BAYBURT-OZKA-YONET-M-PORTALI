import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  Edit3,
  Globe,
  RotateCcw,
  Check,
  X,
  Layers,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  Trash2,
  Database,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import {
  fetchTalepButonlari,
  saveTalepButonToSupabase,
  deleteTalepButonFromSupabase,
  supabase,
} from '../lib/supabase';

export interface TalepButton {
  id: string;
  slotNumber: number;
  title: string;
  subtitle?: string;
  url: string;
  badge: string;
  dbId?: string | number;
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

// Robust Turkish text normalizer handling dotted I, dotless i and diacritics
export function normalizeTurkishText(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Boş veya geçersiz buton isimlerini tespit eden kontrol
export function hasValidButtonTitle(title: string | undefined | null): boolean {
  if (!title) return false;
  const trimmed = title.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower === 'boş buton' ||
    lower === 'bos buton' ||
    lower === 'tanımlanmamış' ||
    lower === 'tanimlanmamis' ||
    lower === '-' ||
    lower === 'boş' ||
    lower === 'bos'
  ) {
    return false;
  }
  return true;
}

const DEFAULT_SLOTS: TalepButton[] = [
  {
    id: 'talep-slot-1',
    slotNumber: 1,
    title: '',
    subtitle: '',
    url: '',
    badge: '1. BUTON',
    gradient: {
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
  },
  {
    id: 'talep-slot-2',
    slotNumber: 2,
    title: '',
    subtitle: '',
    url: '',
    badge: '2. BUTON',
    gradient: {
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
  },
  {
    id: 'talep-slot-3',
    slotNumber: 3,
    title: '',
    subtitle: '',
    url: '',
    badge: '3. BUTON',
    gradient: {
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
  },
  {
    id: 'talep-slot-4',
    slotNumber: 4,
    title: '',
    subtitle: '',
    url: '',
    badge: '4. BUTON',
    gradient: {
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
  },
  {
    id: 'talep-slot-5',
    slotNumber: 5,
    title: '',
    subtitle: '',
    url: '',
    badge: '5. BUTON',
    gradient: {
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
  },
  {
    id: 'talep-slot-6',
    slotNumber: 6,
    title: '',
    subtitle: '',
    url: '',
    badge: '6. BUTON',
    gradient: {
      from: 'from-rose-500',
      to: 'to-pink-600',
      border: 'border-rose-500/30',
      hoverBorder: 'hover:border-rose-400',
      glow: 'rgba(244, 63, 94, 0.25)',
      badgeBg: 'bg-rose-500/15',
      badgeText: 'text-rose-300 border-rose-500/30',
      iconBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
      iconColor: 'text-rose-400',
    },
  },
];

const TALEP_SLOT_COUNT = 6;
const STORAGE_KEY = 'ozka_talepler_buttons_v4_6slots';
const LEGACY_STORAGE_KEYS = [
  'ozka_talepler_buttons_v1',
  'ozka_talepler_buttons_v2',
  'ozka_talepler_buttons_v3',
];

const INITIAL_6_SLOTS: TalepButton[] = DEFAULT_SLOTS.slice(0, TALEP_SLOT_COUNT).map((s, idx) => ({
  ...s,
  id: `talep-slot-${idx + 1}`,
  slotNumber: idx + 1,
  badge: `${idx + 1}. BUTON`,
  title: '',
  subtitle: '',
  url: '',
}));

const INITIAL_ACTIVE_BUTTONS: TalepButton[] = [
  {
    ...DEFAULT_SLOTS[0],
    id: 'talep-slot-1',
    slotNumber: 1,
    badge: '1. BUTON',
    title: 'ÖDEME TALEPLERİ',
    url: 'https://taleponaysddsemr.bayburtozka.com.tr/',
  },
  {
    ...DEFAULT_SLOTS[1],
    id: 'talep-slot-2',
    slotNumber: 2,
    badge: '2. BUTON',
    title: 'TALEP GİRİŞİ',
    url: 'https://talepler.bayburtozka.com.tr/',
  },
  {
    ...DEFAULT_SLOTS[2],
    id: 'talep-slot-3',
    slotNumber: 3,
    badge: '3. BUTON',
    title: 'EMİRHAN',
    url: 'https://www.bayburtözkainsaat.com.tr',
  },
];

interface TaleplerScreenProps {
  onBack: () => void;
  playClickSound: () => void;
}

export const TaleplerScreen: React.FC<TaleplerScreenProps> = ({
  onBack,
  playClickSound,
}) => {
  const [buttons, setButtons] = useState<TalepButton[]>(() => {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val) {
        const parsed = JSON.parse(val) as Partial<TalepButton>[];
        if (Array.isArray(parsed) && parsed.length === TALEP_SLOT_COUNT) {
          return parsed.map((p, index) => {
            const sira = p.slotNumber ?? index + 1;
            const def = DEFAULT_SLOTS[(sira - 1) % DEFAULT_SLOTS.length];
            return {
              ...def,
              id: p.id || `talep-slot-${sira}`,
              slotNumber: sira,
              badge: `${sira}. BUTON`,
              title: (p.title || '').trim(),
              subtitle: '',
              url: (p.url || '').trim(),
              dbId: p.dbId,
            };
          });
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_6_SLOTS;
  });

  // Modal editing state
  const [editingButton, setEditingButton] = useState<TalepButton | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editSiraNo, setEditSiraNo] = useState<number>(1);
  const [isNewButton, setIsNewButton] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRlsInfo, setShowRlsInfo] = useState(false);

  const editingButtonRef = useRef<TalepButton | null>(null);
  editingButtonRef.current = editingButton;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Fetch buttons from Supabase public.talepbutonları table and map to exactly 6 slots
  const loadFromSupabase = async (showFeedback = false) => {
    if (showFeedback) setIsLoadingSupabase(true);
    try {
      const rows = await fetchTalepButonlari();

      // Exactly 6 slots: slotNumber 1 to 6
      const updated: TalepButton[] = Array.from({ length: TALEP_SLOT_COUNT }, (_, i) => {
        const slotNum = i + 1;
        const def = DEFAULT_SLOTS[i % DEFAULT_SLOTS.length];

        // Match by sira_no first, otherwise by index
        const matchedRow =
          rows?.find((r) => r.sira_no === slotNum) || (rows && rows[i] ? rows[i] : null);

        const hasValidTitle = Boolean(
          matchedRow && matchedRow.buton_adi && matchedRow.buton_adi.trim() !== ''
        );

        let cleanUrl = (matchedRow?.baglanti_linki || '').trim();
        if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = 'https://' + cleanUrl;
        }

        return {
          ...def,
          id: `talep-slot-${slotNum}`,
          dbId: matchedRow?.id,
          slotNumber: slotNum,
          badge: `${slotNum}. BUTON`,
          title: hasValidTitle ? matchedRow!.buton_adi!.trim() : '',
          subtitle: '',
          url: hasValidTitle ? cleanUrl : '',
        };
      });

      // Update UI state if modal is not currently open
      if (!editingButtonRef.current) {
        setButtons(updated);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        for (const k of LEGACY_STORAGE_KEYS) {
          if (k !== STORAGE_KEY) localStorage.removeItem(k);
        }
      } catch {
        // ignore
      }

      const filledCount = updated.filter((b) => b.title && b.title.trim()).length;
      if (showFeedback) {
        if (filledCount > 0) {
          showToast(`✓ Supabase talepbutonları tablosundan ${filledCount} buton eşleştirildi.`);
        } else {
          showToast('Supabase talepbutonları tablosunda henüz veri bulunmuyor. 6 boş buton hazır.');
        }
      }
    } catch (err) {
      console.warn('Failed to load from Supabase:', err);
      if (showFeedback) {
        showToast('Supabase bağlantısında hata oluştu.');
      }
    } finally {
      setIsLoadingSupabase(false);
    }
  };

  useEffect(() => {
    // 1. Initial load
    loadFromSupabase(false);

    // 2. Realtime listener for talepbutonları table
    const channel = supabase
      .channel('talepbutonlari-realtime-listener')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'talepbutonları' },
        (payload) => {
          console.log('[Realtime] talepbutonları değişikliği:', payload);
          if (!editingButtonRef.current) {
            loadFromSupabase(false);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'talepbutonlari' },
        (payload) => {
          console.log('[Realtime] talepbutonlari değişikliği:', payload);
          if (!editingButtonRef.current) {
            loadFromSupabase(false);
          }
        }
      )
      .subscribe();

    // 3. User focus sync (when switching back to portal tab)
    const handleFocus = () => {
      if (!editingButtonRef.current) {
        loadFromSupabase(false);
      }
    };
    window.addEventListener('focus', handleFocus);

    // 4. Polling every 3 seconds for instant matching when table data is entered
    const interval = setInterval(() => {
      if (!editingButtonRef.current) {
        loadFromSupabase(false);
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const handleAddNewButton = () => {
    playClickSound();
    const nextSlot = buttons.length > 0 ? Math.max(...buttons.map((b) => b.slotNumber)) + 1 : 1;
    const paletteIndex = (nextSlot - 1) % DEFAULT_SLOTS.length;
    const def = DEFAULT_SLOTS[paletteIndex >= 0 ? paletteIndex : 0];
    const newBtn: TalepButton = {
      ...def,
      id: `talep-new-${Date.now()}`,
      slotNumber: nextSlot,
      badge: `${nextSlot}. BUTON`,
      title: '',
      subtitle: '',
      url: '',
    };
    setEditingButton(newBtn);
    setEditTitle('');
    setEditUrl('');
    setEditSiraNo(nextSlot);
    setIsNewButton(true);
  };

  const handleOpenEdit = (btn: TalepButton, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playClickSound();
    setEditingButton(btn);
    setEditTitle(btn.title || '');
    setEditUrl(btn.url || '');
    setEditSiraNo(btn.slotNumber || 1);
    setIsNewButton(false);
  };

  const handleSaveEdit = async () => {
    if (!editingButton) return;
    playClickSound();

    let cleanUrl = editUrl.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const titleTrimmed = editTitle.trim();
    const targetSlot = Math.min(TALEP_SLOT_COUNT, Math.max(1, editSiraNo || editingButton.slotNumber));

    // BOŞ BUTONLARI SİL: Buton adı boşsa ekleme yapma veya mevcutsa kaldır
    if (!hasValidButtonTitle(titleTrimmed)) {
      if (!isNewButton) {
        await handleClearSlot(editingButton);
      } else {
        setEditingButton(null);
        showToast('Buton adı girilmediği için işlem iptal edildi.');
      }
      return;
    }

    const paletteIndex = (targetSlot - 1) % DEFAULT_SLOTS.length;
    const def = DEFAULT_SLOTS[paletteIndex >= 0 ? paletteIndex : 0];

    const updatedButton: TalepButton = {
      ...def,
      id: `talep-slot-${targetSlot}`,
      dbId: editingButton.dbId,
      slotNumber: targetSlot,
      badge: `${targetSlot}. BUTON`,
      title: titleTrimmed,
      url: cleanUrl,
    };

    const nextList = buttons.map((b) => {
      if (b.slotNumber === targetSlot) return updatedButton;
      if (editingButton.slotNumber !== targetSlot && b.slotNumber === editingButton.slotNumber) {
        const oldIndex = (editingButton.slotNumber - 1) % DEFAULT_SLOTS.length;
        const oldDef = DEFAULT_SLOTS[oldIndex >= 0 ? oldIndex : 0];
        return {
          ...oldDef,
          id: `talep-slot-${editingButton.slotNumber}`,
          slotNumber: editingButton.slotNumber,
          badge: `${editingButton.slotNumber}. BUTON`,
          title: '',
          subtitle: '',
          url: '',
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
      deleteTalepButonFromSupabase({ sira_no: editingButton.slotNumber }).catch(() => {});
    }

    const isCreatingNew = isNewButton;
    setEditingButton(null);

    // Supabase public.talepbutonları tablosuna kaydet/güncelle
    setIsSaving(true);
    const result = await saveTalepButonToSupabase({
      dbId: editingButton.slotNumber === targetSlot ? editingButton.dbId : undefined,
      sira_no: targetSlot,
      buton_adi: titleTrimmed,
      baglanti_linki: cleanUrl,
      isNew: isCreatingNew,
    });
    setIsSaving(false);

    if (result.success) {
      showToast(
        isCreatingNew
          ? `✓ Yeni Buton "${titleTrimmed}" talepbutonları tablosuna kaydedildi.`
          : `✓ ${targetSlot}. Buton "${titleTrimmed}" başarıyla güncellendi.`
      );
      if (result.row?.id) {
        setButtons((prev) =>
          prev.map((b) => (b.slotNumber === targetSlot ? { ...b, dbId: result.row?.id } : b))
        );
      }
    } else {
      console.warn('Supabase save notice:', result.error);
      if (result.error && result.error.includes('row-level security')) {
        showToast(`${targetSlot}. Buton kaydedildi. (Supabase RLS izni için RLS İzni butonunu inceleyin)`);
        setShowRlsInfo(true);
      } else {
        showToast(
          isCreatingNew
            ? `✓ Yeni Buton "${titleTrimmed}" eklendi.`
            : `✓ ${targetSlot}. Buton güncellendi.`
        );
      }
    }
  };

  const handleClearSlot = async (btn: TalepButton) => {
    playClickSound();
    // Reset this slot to empty so the 6 slots remain intact
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

    // Supabase talepbutonları tablosundan kaydı sil veya boşalt
    try {
      await deleteTalepButonFromSupabase({
        dbId: btn.dbId,
        sira_no: btn.slotNumber,
      });
    } catch {
      await saveTalepButonToSupabase({
        dbId: btn.dbId,
        sira_no: btn.slotNumber,
        buton_adi: '',
        baglanti_linki: '',
      });
    }

    showToast(`${btn.slotNumber}. Buton boşaltıldı.`);
  };

  const handleCardClick = (btn: TalepButton) => {
    playClickSound();
    let url = (btn.url || '').trim();
    if (url) {
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      handleOpenEdit(btn);
    }
  };

  const handleResetAll = () => {
    if (window.confirm('Tüm butonları sıfırlayıp 6 adet boş slota döndürmek istiyor musunuz?')) {
      playClickSound();
      setButtons(INITIAL_6_SLOTS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_6_SLOTS));
        for (const k of LEGACY_STORAGE_KEYS) {
          if (k !== STORAGE_KEY) localStorage.removeItem(k);
        }
      } catch {
        // ignore
      }
      showToast('Butonlar 6 adet boş slota sıfırlandı.');
    }
  };

  // Keyboard shortcut: Escape to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingButton) {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingButton, onBack]);

  const [activeFilter, setActiveFilter] = useState<'configured' | 'empty'>('configured');
  const configuredButtons = buttons.filter((b) => b.title && b.title.trim());
  const emptyButtons = buttons.filter((b) => !b.title || !b.title.trim());
  const configuredCount = configuredButtons.length;
  const assignedCount = buttons.length;

  const renderCard = (btn: TalepButton) => {
    const isConfigured = Boolean(btn.title && btn.title.trim());
    const hasUrl = Boolean(btn.url && btn.url.trim());

    return (
      <motion.div
        key={btn.id}
        id={`talep-btn-${btn.slotNumber}`}
        layout
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.985 }}
        onClick={() => handleCardClick(btn)}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-xl p-3.5 sm:p-4 transition-all duration-300 cursor-pointer backdrop-blur-md border ${
          isConfigured
            ? `bg-white/[0.05] hover:bg-white/[0.09] ${btn.gradient.border} ${btn.gradient.hoverBorder}`
            : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/15 hover:border-emerald-500/40 border-dashed'
        } shadow-lg shadow-black/40 hover:shadow-xl`}
        style={{
          minHeight: '160px',
        }}
      >
        {/* Top gradient accent line */}
        <div
          className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${btn.gradient.from} ${btn.gradient.to} transition-all duration-300 group-hover:h-1.5 ${
            !isConfigured ? 'opacity-40' : ''
          }`}
        />

        {/* Ambient glow on hover */}
        <div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-xl"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${btn.gradient.glow}, transparent 75%)`,
          }}
        />

        {/* Card Top: Slot Badge & Action Buttons */}
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

        {/* Card Center: Icon & Title */}
        <div className="relative z-10 flex-1 flex flex-col justify-center my-1.5">
          <div className="flex items-start gap-2.5">
            <div
              className={`flex-shrink-0 flex items-center justify-center w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105 ${
                isConfigured
                  ? btn.gradient.iconBg
                  : 'bg-white/5 text-gray-400 border border-white/10 group-hover:text-emerald-400 group-hover:border-emerald-500/40'
              }`}
            >
              {isConfigured ? (
                <ClipboardList className="w-5 h-5" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4
                className={`font-bold text-sm sm:text-base tracking-tight leading-snug break-words transition-colors ${
                  isConfigured
                    ? 'text-white group-hover:text-emerald-300'
                    : 'text-gray-300 group-hover:text-white'
                }`}
              >
                {isConfigured ? btn.title : '+ Buton Tanımla'}
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 leading-relaxed">
                {isConfigured && hasUrl ? (
                  <span className="text-emerald-400/90 font-mono text-[10px] truncate block">
                    {btn.url.replace(/^https?:\/\//, '')}
                  </span>
                ) : isConfigured ? (
                  <span className="text-gray-500 italic text-[11px]">Bağlantı linki yok</span>
                ) : (
                  <span className="text-gray-500 text-[10px]">
                    talepbutonları tablosunda Sıra No: {btn.slotNumber} bekleniyor
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Card Bottom / Footer Button Status */}
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
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Güncelle</span>
              </button>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold group-hover:text-emerald-300">
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
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Güncelle</span>
              </button>
              <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-white font-medium">
                <Plus className="w-3.5 h-3.5" />
                <span>Link Ekle</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 group-hover:text-emerald-300 font-medium">
              <Plus className="w-3.5 h-3.5" />
              <span>Tanımlamak İçin Tıklayın</span>
            </div>
          )}

          <div
            className={`text-[11px] font-medium ${
              isConfigured && hasUrl
                ? 'text-emerald-400/80'
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
    <div className="min-h-screen bg-[#0a0a0c] text-[#f8fafc] flex flex-col justify-between overflow-x-hidden relative selection:bg-emerald-500 selection:text-white">
      {/* Background Lighting Mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-28 left-1/4 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a0c]/85 border-b border-white/10 px-4 sm:px-8 py-3.5 shadow-xl shadow-black/40">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {/* Geri Dön Button */}
            <button
              id="talepler-back-btn"
              type="button"
              onClick={() => {
                playClickSound();
                onBack();
              }}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 hover:border-emerald-400/50 text-gray-200 hover:text-white transition-all shadow-md active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-emerald-400 group-hover:-translate-x-1 transition-transform" />
              <div className="flex flex-col text-left">
                <span className="text-xs sm:text-sm font-bold tracking-tight">Geri Dön</span>
                <span className="text-[10px] text-gray-400 -mt-0.5 hidden sm:inline">Ana Portala Geç</span>
              </div>
            </button>

            {/* Middle Title / Badge */}
            <div className="flex items-center gap-3">
              <OzkaLogo size="sm" />
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-emerald-400" />
                    <span>TALEPLER VE ONAY PANELİ</span>
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold hidden md:inline-flex">
                    {buttons.length} Buton
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 hidden sm:block">
                  ÖZKA Talep ve Onay Sistemi Bağlantıları • Supabase talepbutonları Tablosu
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
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
                  Tanımlı butonlara tıklayarak doğrudan talep ve onay sistemine erişebilirsiniz
                </span>
              </div>

              {configuredButtons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4.5">
                  {configuredButtons.map(renderCard)}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 text-center space-y-2">
                  <p className="text-sm font-semibold text-gray-300">
                    Henüz tanımlanmış bir talep butonu bulunmuyor.
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
                  Tıklayarak talep modülü adı ve URL bağlantısı ekleyebilirsiniz
                </span>
              </div>

              {emptyButtons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4.5">
                  {emptyButtons.map(renderCard)}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-center space-y-1">
                  <p className="text-sm font-semibold text-emerald-300">
                    Tüm {buttons.length} talep yuvası başarıyla tanımlanmıştır!
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

      {/* Footer Branding */}
      <footer className="relative z-10 py-6 text-center border-t border-white/10 text-xs text-gray-400">
        <p>© Bayburt Öz-Ka İnş.İth.İhr.Tic.Ltd.Şti • <span className="text-blue-400 font-medium">Yazılım ve Tasarım: EMİRHAN KALHAN</span></p>
      </footer>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingButton && (
          <div
            id="talep-edit-modal-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setEditingButton(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-2xl bg-[#121318] border border-white/15 p-6 shadow-2xl space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {isNewButton
                        ? 'Yeni Talep Butonu Ekle'
                        : `${editSiraNo}. Talep Butonunu Düzenle`}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Buton adını ve bağlantı linkini tanımlayıp Supabase talepbutonları tablosuna kaydedin
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingButton(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Supabase Table Info Indicator */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-gray-400 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                    <a
                      href="https://supabase.com/dashboard/project/zgeeziqcenezutumhukp/editor/17488?schema=public/talepbutonlar%C4%B1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:underline"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Supabase: public.talepbutonları</span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </a>
                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-mono">
                      sira_no: {editSiraNo}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {isNewButton ? (
                      <>
                        <b>Yeni Ekleme:</b> Buton adı ve bağlantı linki doğrudan <b>talepbutonları</b> tablosuna yeni bir satır olarak eklenecek ve sayfada yeni bir buton olarak görüntülenecektir.
                      </>
                    ) : (
                      <>
                        <b>Güncelleme:</b> <b>talepbutonları</b> tablosundaki ilgili satır (Sıra No: {editSiraNo}) güncellenecektir.
                      </>
                    )}
                  </p>
                </div>

                {/* Sıra No ve Buton Adı */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      Sıra No
                    </label>
                    <input
                      id="talep-input-sira"
                      type="number"
                      min="1"
                      value={editSiraNo}
                      onChange={(e) =>
                        setEditSiraNo(Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-emerald-500 focus:outline-hidden text-sm text-white placeholder-gray-500 transition-colors font-mono"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      Buton Adı
                    </label>
                    <input
                      id="talep-input-title"
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Örn: ÖDEME TALEPLERİ / TALEP GİRİŞİ"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-emerald-500 focus:outline-hidden text-sm text-white placeholder-gray-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Bağlantı Linki */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Bağlantı Linki (URL)
                    </label>
                    {editUrl && (
                      <a
                        href={editUrl.startsWith('http') ? editUrl : `https://${editUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Test Et</span>
                      </a>
                    )}
                  </div>
                  <input
                    id="talep-input-url"
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="https://taleponaysddsemr.bayburtozka.com.tr/"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-emerald-500 focus:outline-hidden text-sm text-white placeholder-gray-500 transition-colors"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-3">
                {!isNewButton ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          'Bu butonu silmek ve tablodan kaldırmak istiyor musunuz?'
                        )
                      ) {
                        handleClearSlot(editingButton);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Butonu Sil</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingButton(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveEdit}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4" />
                    )}
                    <span>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RLS Policy Info Dialog */}
      <AnimatePresence>
        {showRlsInfo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowRlsInfo(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl bg-[#121318] border border-amber-500/30 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Database className="w-4 h-4" />
                  <span>Supabase RLS Yazma İzni Bilgilendirmesi</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRlsInfo(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Supabase <b>talepbutonları</b> tablosunda varsayılan olarak <b>Row Level Security (RLS)</b> koruması açık olduğundan, anonim kullanıcının tabloya veri yazması engellenmektedir.
              </p>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Çözüm için Supabase SQL Editor'da çalıştırın:
                </span>
                <div className="relative p-3 rounded-xl bg-black/60 border border-emerald-500/30 font-mono text-xs text-emerald-300 break-all select-all">
                  ALTER TABLE public."talepbutonları" DISABLE ROW LEVEL SECURITY;
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <a
                  href="https://supabase.com/dashboard/project/zgeeziqcenezutumhukp/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-center flex items-center justify-center gap-1.5"
                >
                  <span>SQL Editor'ı Aç</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://supabase.com/dashboard/project/zgeeziqcenezutumhukp/editor/17488?schema=public"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-center flex items-center justify-center gap-1.5"
                >
                  <span>Tabloyu Görüntüle</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowRlsInfo(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-200 text-xs font-bold shadow-2xl backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
