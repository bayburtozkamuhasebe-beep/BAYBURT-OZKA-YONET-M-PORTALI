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
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Database,
  Loader2,
  Trash2,
  RotateCcw,
  Sliders,
  Copy,
  CheckCheck,
  FileCode,
  AlertTriangle,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import {
  fetchYoneticiDigerButonlar,
  saveYoneticiDigerButonToSupabase,
  deleteYoneticiDigerButonFromSupabase,
  checkYoneticiDigerRlsStatus,
  YONETICI_DIGER_SQL_SETUP,
  supabase,
} from '../lib/supabase';

export interface OperationButton {
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

export const YONETICI_DIGER_SLOT_COUNT = 24;
const SUPABASE_TABLE = 'yonetici_diger_butonlari';
const SUPABASE_TABLE_URL =
  'https://supabase.com/dashboard/project/zgeeziqcenezutumhukp/editor/17488?schema=public/yonetici_diger_butonlari';

const PALETTES = [
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
    from: 'from-orange-500',
    to: 'to-red-600',
    border: 'border-orange-500/30',
    hoverBorder: 'hover:border-orange-400',
    glow: 'rgba(249, 115, 22, 0.25)',
    badgeBg: 'bg-orange-500/15',
    badgeText: 'text-orange-300 border-orange-500/30',
    iconBg: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    iconColor: 'text-orange-400',
  },
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
  {
    from: 'from-pink-500',
    to: 'to-purple-600',
    border: 'border-pink-500/30',
    hoverBorder: 'hover:border-pink-400',
    glow: 'rgba(236, 72, 153, 0.25)',
    badgeBg: 'bg-pink-500/15',
    badgeText: 'text-pink-300 border-pink-500/30',
    iconBg: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
    iconColor: 'text-pink-400',
  },
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
];

const getPaletteForIndex = (index: number) => {
  const i = Math.max(0, index) % PALETTES.length;
  return PALETTES[i];
};

export const INITIAL_24_YONETICI_SLOTS: OperationButton[] = Array.from(
  { length: YONETICI_DIGER_SLOT_COUNT },
  (_, index) => {
    const slotNumber = index + 1;
    const pal = getPaletteForIndex(index);
    return {
      id: `yonetici-slot-${slotNumber}`,
      slotNumber,
      badge: `${slotNumber}. BUTON`,
      title: '',
      subtitle: '',
      url: '',
      gradient: pal,
    };
  }
);

const STORAGE_KEY = 'ozka_yonetici_diger_buttons_v3_24slots';

interface OtherOperationsScreenProps {
  onBack: () => void;
  playClickSound?: () => void;
  preloadedRows?: any[];
}

export const OtherOperationsScreen: React.FC<OtherOperationsScreenProps> = ({
  onBack,
  playClickSound = () => {},
}) => {
  const [buttons, setButtons] = useState<OperationButton[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as OperationButton[];
        if (Array.isArray(parsed) && parsed.length === YONETICI_DIGER_SLOT_COUNT) {
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
    return INITIAL_24_YONETICI_SLOTS;
  });

  const [editingButton, setEditingButton] = useState<OperationButton | null>(null);
  const [editSiraNo, setEditSiraNo] = useState<number>(1);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [rlsBlocked, setRlsBlocked] = useState(false);

  const editingButtonRef = React.useRef<OperationButton | null>(null);
  editingButtonRef.current = editingButton;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const copySqlCode = () => {
    navigator.clipboard.writeText(YONETICI_DIGER_SQL_SETUP).then(() => {
      setCopiedSql(true);
      showToast('✓ SQL kurulum kodu panoya kopyalandı!');
      setTimeout(() => setCopiedSql(false), 2500);
    });
  };

  const loadFromSupabase = async (showNotification = false) => {
    if (showNotification) setSupabaseLoading(true);
    try {
      const rlsCheck = await checkYoneticiDigerRlsStatus();
      if (!rlsCheck.canWrite && rlsCheck.tableExists) {
        setRlsBlocked(true);
      } else {
        setRlsBlocked(false);
      }

      const rows = await fetchYoneticiDigerButonlar();

      if (rows && rows.length > 0) {
        setButtons((prev) => {
          const updated = prev.map((b) => {
            const found = rows.find((r) => r.sira_no === b.slotNumber);
            if (found && found.buton_adi && found.buton_adi.trim()) {
              let cleanUrl = (found.baglanti_linki || '').trim();
              if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                cleanUrl = 'https://' + cleanUrl;
              }
              return {
                ...b,
                dbId: found.id,
                title: found.buton_adi.trim(),
                url: cleanUrl,
              };
            }
            return b;
          });
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });

        if (showNotification) {
          showToast(`✓ Supabase tablosundan ${rows.length} buton doğrudan senkronize edildi.`);
        }
      } else {
        if (showNotification) {
          showToast(`Supabase tablosunda kayıt bulunamadı, mevcut butonlar korundu.`);
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

    const channel1 = supabase
      .channel('yonetici_diger_realtime_main')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'yonetici_diger_butonlari' },
        (payload) => {
          console.log('[Realtime] yonetici_diger_butonlari değişikliği:', payload);
          if (!editingButtonRef.current) {
            loadFromSupabase(false);
          }
        }
      )
      .subscribe();

    const channel2 = supabase
      .channel('yonetici_diger_realtime_backup')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'digerbutonlar' },
        (payload) => {
          console.log('[Realtime] digerbutonlar değişikliği:', payload);
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
    }, 6000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, []);

  const handleOpenEdit = (btn: OperationButton, e?: React.MouseEvent) => {
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
    const updatedButton: OperationButton = {
      ...pal,
      id: `yonetici-slot-${targetSlot}`,
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
          id: `yonetici-slot-${editingButton.slotNumber}`,
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
      deleteYoneticiDigerButonFromSupabase({ sira_no: editingButton.slotNumber }).catch(() => {});
    }

    setEditingButton(null);
    setIsSavingToDb(true);
    try {
      const res = await saveYoneticiDigerButonToSupabase({
        dbId: editingButton.slotNumber === targetSlot ? editingButton.dbId : undefined,
        sira_no: targetSlot,
        buton_adi: cleanTitle,
        baglanti_linki: cleanUrl,
      });

      if (res.success) {
        if (res.rlsError) {
          setRlsBlocked(true);
          showToast(`✓ ${targetSlot}. Buton kaydedildi (Yedek tablo aktif. Doğrudan senkronizasyon için SQL RLS İznini açınız).`);
        } else {
          setRlsBlocked(false);
          showToast(`✓ ${targetSlot}. Buton "${cleanTitle}" doğrudan Supabase'e kaydedildi.`);
        }
        if (res.row?.id) {
          setButtons((prev) =>
            prev.map((s) => (s.slotNumber === targetSlot ? { ...s, dbId: res.row?.id } : s))
          );
        }
      } else {
        if (res.rlsError) {
          setRlsBlocked(true);
          showToast(`⚠️ Supabase RLS İzni Gerekli. Buton yerel hafızaya kaydedildi.`);
          setShowSqlModal(true);
        } else if (res.error) {
          showToast(`⚠️ Supabase kayıt uyarısı: ${res.error}`);
        }
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('⚠️ Supabase sunucusuna kayıt yapılamadı.');
    } finally {
      setIsSavingToDb(false);
    }
  };

  const handleClearSlot = async (btn: OperationButton) => {
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
      await deleteYoneticiDigerButonFromSupabase({
        dbId: btn.dbId,
        sira_no: btn.slotNumber,
      });
    } catch {
      await saveYoneticiDigerButonToSupabase({
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
        'Tüm 24 buton yuvası sıfırlanacak. Supabase tablosundaki veriler de temizlensin mi?'
      )
    ) {
      return;
    }

    setButtons(INITIAL_24_YONETICI_SLOTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    buttons.forEach((b) => {
      if (b.dbId || b.title) {
        deleteYoneticiDigerButonFromSupabase({ dbId: b.dbId, sira_no: b.slotNumber }).catch(() => {});
      }
    });
    showToast('Tüm buton yuvaları sıfırlandı.');
  };

  const handleCardClick = (btn: OperationButton) => {
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

  const renderCard = (btn: OperationButton) => {
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
            : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/15 hover:border-purple-500/40 border-dashed'
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
                  : 'bg-white/5 text-gray-400 border border-white/10 group-hover:text-purple-400 group-hover:border-purple-500/40'
              }`}
            >
              {isConfigured ? <Sliders className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <h4
                className={`font-bold text-sm sm:text-base tracking-tight leading-snug break-words transition-colors ${
                  isConfigured
                    ? 'text-white group-hover:text-purple-300'
                    : 'text-gray-300 group-hover:text-white'
                }`}
              >
                {isConfigured ? btn.title : '+ Buton Tanımla'}
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 leading-relaxed">
                {isConfigured && hasUrl ? (
                  <span className="text-purple-400/90 font-mono text-[10px] truncate block">
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
                <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                <span>Güncelle</span>
              </button>
              <div className="flex items-center gap-1.5 text-purple-400 font-bold group-hover:text-purple-300">
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
                <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                <span>Güncelle</span>
              </button>
              <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-white font-medium">
                <Plus className="w-3.5 h-3.5" />
                <span>Link Ekle</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-purple-400 group-hover:text-purple-300 font-medium">
              <Plus className="w-3.5 h-3.5" />
              <span>Tanımlamak İçin Tıklayın</span>
            </div>
          )}

          <div
            className={`text-[11px] font-medium ${
              isConfigured && hasUrl
                ? 'text-purple-400/80'
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
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a0c]/85 border-b border-white/10 px-4 sm:px-8 py-3.5 shadow-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <button
              id="yonetici-back-btn"
              type="button"
              onClick={() => {
                playClickSound();
                onBack();
              }}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 hover:border-purple-400/50 text-gray-200 hover:text-white transition-all shadow-md active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-purple-400 group-hover:-translate-x-1 transition-transform" />
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
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>YÖNETİCİ DİĞER İŞLEMLER</span>
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold hidden sm:inline-flex">
                    {configuredCount} / {YONETICI_DIGER_SLOT_COUNT} Tanımlı
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 hidden sm:block">
                  ÖZKA Yönetici Özel ve İlave Operasyon Butonları
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                title="Supabase RLS ve Senkronizasyon İzinleri"
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  rlsBlocked
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">SQL & RLS İzni</span>
              </button>

              <button
                type="button"
                onClick={() => loadFromSupabase(true)}
                disabled={supabaseLoading}
                title="Supabase tablosundan verileri tekrar yükle"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
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
          {rlsBlocked && (
            <div className="rounded-2xl p-4 sm:p-5 bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-200">
                    Supabase yonetici_diger_butonlari Tablosu RLS İzni Bekliyor
                  </h4>
                  <p className="text-xs text-amber-300/80 mt-0.5">
                    Tablo oluşturulmuş ancak anonim yazma izni (RLS) henüz aktif değil. Yedek tablo devrede. Doğrudan senkron için SQL scriptini 1 tıkla çalıştırabilirsiniz.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5"
              >
                <FileCode className="w-4 h-4" />
                <span>SQL Kodunu Aç</span>
              </button>
            </div>
          )}

          {toastMessage && (
            <div className="p-3.5 rounded-2xl bg-purple-950/80 border border-purple-500/40 text-xs sm:text-sm text-purple-200 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
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
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-purple-300'
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
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-lg shadow-purple-500/50 animate-pulse" />
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                    <span>İSİMLENDİRİLMİŞ & TANIMLI BUTONLAR</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {configuredButtons.length} Adet
                    </span>
                  </h3>
                </div>
                <span className="text-xs text-gray-400">
                  Tanımlı butonlara tıklayarak doğrudan ilgili yönetim paneline erişebilirsiniz
                </span>
              </div>

              {configuredButtons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {configuredButtons.map(renderCard)}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 text-center space-y-2">
                  <p className="text-sm font-semibold text-gray-300">
                    Henüz tanımlanmış bir yönetici butonu bulunmuyor.
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
                  Tıklayarak modül adı ve URL bağlantısı ekleyebilirsiniz
                </span>
              </div>

              {emptyButtons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {emptyButtons.map(renderCard)}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-center space-y-1">
                  <p className="text-sm font-semibold text-purple-300">
                    Tüm {buttons.length} yönetici yuvası başarıyla tanımlanmıştır!
                  </p>
                  <p className="text-xs text-purple-400/70">
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
              className="relative z-10 w-full max-w-lg bg-[#140f1f] border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {editingButton.title ? `${editSiraNo}. Butonu Güncelle / Düzenle` : `${editSiraNo}. Butonu Tanımla`}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Supabase <span className="text-purple-300 font-mono">{SUPABASE_TABLE}</span> tablosu ile doğrudan senkronize olur
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
                    <span className="text-[11px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 text-purple-400" />
                      Otomatik (Buton Numarasından Alındı)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-purple-500/30 text-white shadow-inner">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold text-base flex items-center justify-center shadow-sm">
                      {editingButton.slotNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm">
                        {editingButton.slotNumber}. Buton Yuvası
                      </div>
                      <div className="text-xs text-gray-400">
                        Supabase Sıra No: <span className="font-mono font-bold text-purple-300">{editingButton.slotNumber}</span> (Doğrudan bu butonla eşleşir)
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 font-mono">
                      sira_no = {editingButton.slotNumber}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    İşlem / Buton Adı <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Örn: Yönetim Kurulu Kararları, İhale Takip..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-white placeholder-gray-500 transition-colors"
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
                      placeholder="https://yonetim.ozka.com.tr"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-white placeholder-gray-500 transition-colors text-xs"
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
                        className="text-xs text-purple-400 hover:underline flex items-center gap-1"
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
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
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
        {/* SQL Setup Modal */}
        {showSqlModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setShowSqlModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-[#0e1017] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-left"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <span>Supabase SQL & RLS Senkronizasyonu</span>
                    </h3>
                    <p className="text-xs text-gray-400">
                      <code className="text-purple-300 font-mono">yonetici_diger_butonlari</code> tablosu doğrudan erişim kurulumu
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Neden Bu Script Gerekli?</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Supabase PostgreSQL veri tabanında <code className="text-purple-300 font-mono">yonetici_diger_butonlari</code> tablosunda <strong>Row-Level Security (RLS)</strong> devrede olduğunda ve anonim yazma politikası tanımlanmadığında (Error 42501), doğrudan kayıt başarısız olur.
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Aşağıdaki script tabloyu eksiksiz oluşturur ve <strong>SELECT, INSERT, UPDATE, DELETE</strong> politikalarını anonim erişime açarak doğrudan çift yönlü senkronizasyonu sağlar.
                  </p>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between bg-[#151922] px-4 py-2 rounded-t-xl border border-b-0 border-white/10 text-xs font-mono text-gray-400">
                    <span>yonetici_diger_setup.sql</span>
                    <button
                      type="button"
                      onClick={copySqlCode}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-sans text-xs font-semibold transition-all shadow-sm active:scale-95"
                    >
                      {copiedSql ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Kodu Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 rounded-b-xl bg-[#090b10] border border-white/10 text-[11px] font-mono text-purple-200 overflow-x-auto max-h-60 leading-relaxed whitespace-pre selection:bg-purple-600 selection:text-white">
                    {YONETICI_DIGER_SQL_SETUP}
                  </pre>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <a
                    href="https://supabase.com/dashboard/project/zgeeziqcenezutumhukp/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-400 text-xs font-semibold text-purple-300 flex items-center justify-between transition-all group"
                  >
                    <span className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                      <span>1. Supabase SQL Editor'ı Aç</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>

                  <a
                    href={SUPABASE_TABLE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-semibold text-gray-300 flex items-center justify-between transition-all group"
                  >
                    <span className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-gray-400 group-hover:scale-110 transition-transform" />
                      <span>2. Tabloyu Görüntüle</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    loadFromSupabase(true);
                  }}
                  disabled={supabaseLoading}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${supabaseLoading ? 'animate-spin' : ''}`} />
                  <span>Bağlantıyı Test Et</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all active:scale-95"
                >
                  Anladım / Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
