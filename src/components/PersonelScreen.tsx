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
  Users,
  CheckCircle2,
  RefreshCw,
  Database,
  Loader2,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import {
  fetchPersonelBaglantiButonlar,
  savePersonelBaglantiButonToSupabase,
  deletePersonelBaglantiButonFromSupabase,
  supabase,
} from '../lib/supabase';

export interface PersonelButtonSlot {
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

export const PERSONEL_SLOT_COUNT = 12;

const PALETTES = [
  // 1. Mavi - İndigo
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
  // 2. Cyan - Mavi
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
  // 3. İndigo - Mor
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
  // 4. Mor - Pembe
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
  // 5. Turkuaz - Zümrüt
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
  // 6. Gök Mavisi - Mavi
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
  // 7. Kehribar - Turuncu
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
  // 8. Gül - Fuşya
  {
    from: 'from-rose-500',
    to: 'to-pink-600',
    border: 'border-rose-500/30',
    hoverBorder: 'hover:border-rose-400',
    glow: 'rgba(244, 63, 94, 0.25)',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-300 border-rose-500/30',
    iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    iconColor: 'text-rose-400',
  },
  // 9. Zümrüt - Turkuaz
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
  // 10. Fuşya - Mor
  {
    from: 'from-fuchsia-500',
    to: 'to-purple-600',
    border: 'border-fuchsia-500/30',
    hoverBorder: 'hover:border-fuchsia-400',
    glow: 'rgba(217, 70, 239, 0.25)',
    badgeBg: 'bg-fuchsia-500/15',
    badgeText: 'text-fuchsia-300 border-fuchsia-500/30',
    iconBg: 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30',
    iconColor: 'text-fuchsia-400',
  },
  // 11. Turuncu - Sarı
  {
    from: 'from-orange-500',
    to: 'to-amber-600',
    border: 'border-orange-500/30',
    hoverBorder: 'hover:border-orange-400',
    glow: 'rgba(249, 115, 22, 0.25)',
    badgeBg: 'bg-orange-500/15',
    badgeText: 'text-orange-300 border-orange-500/30',
    iconBg: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    iconColor: 'text-orange-400',
  },
  // 12. Mavi - Turkuaz
  {
    from: 'from-blue-600',
    to: 'to-cyan-500',
    border: 'border-blue-600/30',
    hoverBorder: 'hover:border-cyan-400',
    glow: 'rgba(37, 99, 235, 0.25)',
    badgeBg: 'bg-blue-600/15',
    badgeText: 'text-cyan-300 border-blue-600/30',
    iconBg: 'bg-blue-600/20 text-cyan-300 border border-blue-600/30',
    iconColor: 'text-cyan-300',
  },
];

const getPaletteForIndex = (index: number) => {
  const i = Math.max(0, index) % PALETTES.length;
  return PALETTES[i];
};

// 12 ADET BOŞ BUTON BAŞLANGIÇ LİSTESİ
export const INITIAL_12_PERSONEL_SLOTS: PersonelButtonSlot[] = Array.from(
  { length: PERSONEL_SLOT_COUNT },
  (_, index) => {
    const slotNumber = index + 1;
    const pal = getPaletteForIndex(index);
    return {
      id: `personel-slot-${slotNumber}`,
      slotNumber,
      badge: `${slotNumber}. BUTON`,
      title: '',
      subtitle: '',
      url: '',
      gradient: pal,
    };
  }
);

const STORAGE_KEY = 'ozka_personel_buttons_v3_12slots';
const LEGACY_STORAGE_KEYS = [
  'ozka_personel_buttons_v2_active',
  'ozka_personel_buttons_active',
  'ozka_personel_slots_v1',
];

interface PersonelScreenProps {
  onBack: () => void;
  playClickSound: () => void;
}

export const PersonelScreen: React.FC<PersonelScreenProps> = ({
  onBack,
  playClickSound,
}) => {
  const [buttons, setButtons] = useState<PersonelButtonSlot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PersonelButtonSlot[];
        if (Array.isArray(parsed) && parsed.length === PERSONEL_SLOT_COUNT) {
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
    return INITIAL_12_PERSONEL_SLOTS;
  });

  // Modal editing state
  const [editingButton, setEditingButton] = useState<PersonelButtonSlot | null>(null);
  const [isNewButton, setIsNewButton] = useState(false);
  const [editSiraNo, setEditSiraNo] = useState<number>(1);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);

  const editingButtonRef = React.useRef<PersonelButtonSlot | null>(null);
  editingButtonRef.current = editingButton;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Load buttons from Supabase personel_baglanti_butonlari table and map to exactly 12 slots
  const loadFromSupabase = async (showNotification = false) => {
    if (showNotification) setSupabaseLoading(true);
    try {
      const rows = await fetchPersonelBaglantiButonlar();

      // Exactly 12 slots: slotNumber 1 to 12
      const mapped: PersonelButtonSlot[] = Array.from(
        { length: PERSONEL_SLOT_COUNT },
        (_, idx) => {
          const slotNum = idx + 1;
          const pal = getPaletteForIndex(idx);

          // Find row matching slotNum by sira_no, or by index fallback
          const matched =
            rows?.find((r) => r.sira_no === slotNum) || (rows && rows[idx] ? rows[idx] : null);

          const hasValidTitle = Boolean(
            matched && matched.buton_adi && matched.buton_adi.trim() !== ''
          );

          let cleanUrl = (matched?.baglanti_linki || '').trim();
          if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl;
          }

          return {
            id: `personel-slot-${slotNum}`,
            dbId: matched?.id,
            slotNumber: slotNum,
            badge: `${slotNum}. BUTON`,
            title: hasValidTitle ? matched!.buton_adi.trim() : '',
            subtitle: '',
            url: hasValidTitle ? cleanUrl : '',
            gradient: pal,
          };
        }
      );

      // Only update UI state if modal is not currently open
      if (!editingButtonRef.current) {
        setButtons(mapped);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        for (const k of LEGACY_STORAGE_KEYS) {
          localStorage.removeItem(k);
        }
      } catch {
        // ignore
      }

      const filledCount = mapped.filter((b) => b.title && b.title.trim()).length;
      if (showNotification) {
        if (filledCount > 0) {
          showToast(`✓ Supabase personel_baglanti_butonlari tablosundan ${filledCount} buton eşleştirildi.`);
        } else {
          showToast('Supabase personel_baglanti_butonlari tablosunda henüz veri bulunmuyor. 12 boş buton hazır.');
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

  // Initial fetch, Realtime sync, focus listener, and 3-second polling
  useEffect(() => {
    // 1. Initial load
    loadFromSupabase(false);

    // 2. Realtime listener for personel_baglanti_butonlari table
    const channel = supabase
      .channel('personel_baglanti_butonlari_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'personel_baglanti_butonlari' },
        (payload) => {
          console.log('[Realtime] personel_baglanti_butonlari değişikliği:', payload);
          if (!editingButtonRef.current) {
            loadFromSupabase(false);
          }
        }
      )
      .subscribe();

    // 3. Sync on user focus (when switching back from Supabase dashboard)
    const onFocus = () => {
      if (!editingButtonRef.current) {
        loadFromSupabase(false);
      }
    };
    window.addEventListener('focus', onFocus);

    // 4. Polling every 3 seconds for immediate matching when data is entered in Supabase
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

  // Open modal for editing a button slot
  const handleOpenEdit = (btn: PersonelButtonSlot, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playClickSound();
    setIsNewButton(false);
    setEditingButton(btn);
    setEditSiraNo(btn.slotNumber);
    setEditTitle(btn.title || '');
    setEditSubtitle(btn.subtitle || '');
    setEditUrl(btn.url || '');
  };

  // Save edit and persist to Supabase personel_baglanti_butonlari
  const handleSaveEdit = async () => {
    if (!editingButton) return;
    playClickSound();

    let cleanUrl = editUrl.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const cleanTitle = editTitle.trim();
    const cleanSubtitle = editSubtitle.trim();
    const targetSlot = Math.min(
      PERSONEL_SLOT_COUNT,
      Math.max(1, editSiraNo || editingButton.slotNumber)
    );

    if (!cleanTitle) {
      // If title is blank, clear this slot
      await handleClearSlot(editingButton);
      return;
    }

    const pal = getPaletteForIndex(targetSlot - 1);
    const updatedButton: PersonelButtonSlot = {
      ...pal,
      id: `personel-slot-${targetSlot}`,
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
          id: `personel-slot-${editingButton.slotNumber}`,
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
      deletePersonelBaglantiButonFromSupabase({ sira_no: editingButton.slotNumber }).catch(() => {});
    }

    const isCreatingNew = isNewButton;
    setEditingButton(null);

    // Save directly to Supabase table: personel_baglanti_butonlari
    setIsSavingToDb(true);
    try {
      const res = await savePersonelBaglantiButonToSupabase({
        dbId: editingButton.slotNumber === targetSlot ? editingButton.dbId : undefined,
        sira_no: targetSlot,
        buton_adi: cleanTitle,
        baglanti_linki: cleanUrl,
        isNew: isCreatingNew,
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
      console.error('Save to supabase error:', err);
      showToast('⚠️ Supabase sunucusuna kayıt yapılamadı.');
    } finally {
      setIsSavingToDb(false);
    }
  };

  // Clear slot (reset to empty) and delete from Supabase table
  const handleClearSlot = async (btn: PersonelButtonSlot) => {
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
      await deletePersonelBaglantiButonFromSupabase({
        dbId: btn.dbId,
        sira_no: btn.slotNumber,
      });
    } catch {
      await savePersonelBaglantiButonToSupabase({
        dbId: btn.dbId,
        sira_no: btn.slotNumber,
        buton_adi: '',
        baglanti_linki: '',
      });
    }

    showToast(`${btn.slotNumber}. Buton boşaltıldı.`);
  };

  // Reset all 12 slots to empty
  const handleResetAll = () => {
    if (window.confirm('Tüm personel butonlarını sıfırlayıp 12 adet boş slota döndürmek istiyor musunuz?')) {
      playClickSound();
      setButtons(INITIAL_12_PERSONEL_SLOTS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_12_PERSONEL_SLOTS));
        for (const k of LEGACY_STORAGE_KEYS) {
          localStorage.removeItem(k);
        }
      } catch {
        // ignore
      }
      showToast('Butonlar 12 adet boş slota sıfırlandı.');
    }
  };

  // Card click: configured card opens in new tab (_blank); empty card opens edit modal
  const handleCardClick = (btn: PersonelButtonSlot) => {
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

  const renderCard = (btn: PersonelButtonSlot) => {
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
            : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/15 hover:border-blue-500/40 border-dashed'
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
                  : 'bg-white/5 text-gray-400 border border-white/10 group-hover:text-blue-400 group-hover:border-blue-500/40'
              }`}
            >
              {isConfigured ? <Users className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <h4
                className={`font-bold text-sm sm:text-base tracking-tight leading-snug break-words transition-colors ${
                  isConfigured
                    ? 'text-white group-hover:text-blue-300'
                    : 'text-gray-300 group-hover:text-white'
                }`}
              >
                {isConfigured ? btn.title : '+ Buton Tanımla'}
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 leading-relaxed">
                {isConfigured && hasUrl ? (
                  <span className="text-blue-400/90 font-mono text-[10px] truncate block">
                    {btn.url.replace(/^https?:\/\//, '')}
                  </span>
                ) : isConfigured ? (
                  <span className="text-gray-500 italic text-[11px]">Bağlantı linki yok</span>
                ) : (
                  <span className="text-gray-500 text-[10px]">
                    personel_baglanti_butonlari tablosunda Sıra No: {btn.slotNumber} bekleniyor
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
                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Güncelle</span>
              </button>
              <div className="flex items-center gap-1.5 text-blue-400 font-bold group-hover:text-blue-300">
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
                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Güncelle</span>
              </button>
              <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-white font-medium">
                <Plus className="w-3.5 h-3.5" />
                <span>Link Ekle</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-blue-400 group-hover:text-blue-300 font-medium">
              <Plus className="w-3.5 h-3.5" />
              <span>Tanımlamak İçin Tıklayın</span>
            </div>
          )}

          <div
            className={`text-[11px] font-medium ${
              isConfigured && hasUrl
                ? 'text-blue-400/80'
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
    <div className="min-h-screen bg-[#07080a] text-gray-100 flex flex-col selection:bg-blue-500/30 selection:text-blue-200 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a0c]/85 border-b border-white/10 px-4 sm:px-8 py-3.5 shadow-xl shadow-black/40">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {/* Geri Dön Button */}
            <button
              id="personel-back-btn"
              type="button"
              onClick={() => {
                playClickSound();
                onBack();
              }}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 hover:border-blue-400/50 text-gray-200 hover:text-white transition-all shadow-md active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-blue-400 group-hover:-translate-x-1 transition-transform" />
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
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>PERSONEL SAYFASI</span>
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold hidden md:inline-flex">
                    12 Slot ({configuredCount} Tanımlı)
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 hidden sm:block">
                  ÖZKA İnsan Kaynakları ve Personel İşlemleri Modülü
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadFromSupabase(true)}
                disabled={supabaseLoading}
                title="Supabase tablosundan verileri anlık senkronize et"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${supabaseLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Yenile</span>
              </button>
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
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-blue-300'
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
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-lg shadow-blue-500/50 animate-pulse" />
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                    <span>İSİMLENDİRİLMİŞ & TANIMLI BUTONLAR</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {configuredButtons.length} Adet
                    </span>
                  </h3>
                </div>
                <span className="text-xs text-gray-400">
                  Tanımlı butonlara tıklayarak doğrudan personel sistemine erişebilirsiniz
                </span>
              </div>

              {configuredButtons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {configuredButtons.map(renderCard)}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 text-center space-y-2">
                  <p className="text-sm font-semibold text-gray-300">
                    Henüz tanımlanmış bir personel butonu bulunmuyor.
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
                  Tıklayarak personel modülü adı ve URL bağlantısı ekleyebilirsiniz
                </span>
              </div>

              {emptyButtons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {emptyButtons.map(renderCard)}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-blue-950/20 border border-blue-500/20 text-center space-y-1">
                  <p className="text-sm font-semibold text-blue-300">
                    Tüm {buttons.length} personel yuvası başarıyla tanımlanmıştır!
                  </p>
                  <p className="text-xs text-blue-400/70">
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
            id="personel-edit-modal-backdrop"
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
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {isNewButton
                        ? 'Yeni Personel Butonu Ekle'
                        : editingButton.title
                        ? `${editSiraNo}. Butonu Güncelle / Düzenle`
                        : `${editSiraNo}. Butonu Tanımla`}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">
                        Buton adını ve bağlantı linkini tanımlayıp personel_baglanti_butonlari tablosuna kaydedin
                      </p>
                    </div>
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
                {/* Sıra No */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Sıra Numarası (1 - {PERSONEL_SLOT_COUNT})
                  </label>
                  <input
                    id="personel-input-sira"
                    type="number"
                    min={1}
                    max={PERSONEL_SLOT_COUNT}
                    value={editSiraNo}
                    onChange={(e) => setEditSiraNo(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-blue-500 focus:outline-hidden text-sm text-white placeholder-gray-500 transition-colors font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Supabase personel_baglanti_butonlari tablosundaki sira_no kolonuyla eşleşir.
                  </p>
                </div>

                {/* Buton Adı */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Buton Adı *
                  </label>
                  <input
                    id="personel-input-title"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Örn: Personel Takip Portali"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-blue-500 focus:outline-hidden text-sm text-white placeholder-gray-500 transition-colors"
                  />
                </div>

                {/* Alt Açıklama */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Alt Açıklama (İsteğe Bağlı)
                  </label>
                  <input
                    id="personel-input-subtitle"
                    type="text"
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    placeholder="Örn: Personel devam ve izin kontrol sistemi"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-blue-500 focus:outline-hidden text-sm text-white placeholder-gray-500 transition-colors"
                  />
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
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Yeni Sekmede Test Et</span>
                      </a>
                    )}
                  </div>
                  <input
                    id="personel-input-url"
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-blue-500 focus:outline-hidden text-sm text-white placeholder-gray-500 transition-colors"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-2">
                <div>
                  {editingButton.title && (
                    <button
                      type="button"
                      onClick={() => handleClearSlot(editingButton)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Bu Butonu Boşalt</span>
                    </button>
                  )}
                </div>

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
                    onClick={handleSaveEdit}
                    disabled={isSavingToDb}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
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

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-blue-950 border border-blue-500/40 text-blue-200 text-xs font-bold shadow-2xl backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
