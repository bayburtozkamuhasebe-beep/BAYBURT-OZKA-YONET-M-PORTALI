import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  UserCheck,
  Calendar,
  Layers,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Sparkles,
  Lock,
  Clock,
  Inbox,
  Download,
  Trash2,
  Palette,
  Database,
  Copy,
  Check,
} from 'lucide-react';
import {
  supabase,
  TALEPLER_SUPABASE_SQL_SCRIPT,
  TALEPLER_ADD_TALEPSERINO_SQL_SCRIPT,
  DOSYALAR_STORAGE_SQL_SCRIPT,
  insertTalepKaydiToSupabase,
  uploadTalepDosyasiToStorage,
} from '../lib/supabase';

export type TalepTuru = 'Talep' | 'İstek' | 'Öneri';
export type FormBgTheme = 'zumrut' | 'kehribar' | 'safir' | 'ametist';

export interface TalepKaydi {
  id: string;
  talepserino?: string;
  talepEden: string;
  tarih: string;
  tur: TalepTuru;
  konu: string;
  aciklama: string;
  dosyaAdi?: string;
  dosyaBoyutu?: string;
  dosyaVerisi?: string; // base64
  dosyaUrl?: string; // Supabase Storage public URL
  durum: 'İnceleniyor' | 'İşleme Alındı' | 'Tamamlandı';
  olusturmaTarihi: string;
}

interface TalepIstekFormuProps {
  currentUser?: string;
  userRole?: string;
  darkMode?: boolean;
  playClickSound?: () => void;
  className?: string;
}

const STORAGE_KEY = 'ozka_talep_istek_formu_kayitlari_v1';
const THEME_STORAGE_KEY = 'ozka_talep_form_bg_theme_v1';

const THEMES: Record<
  FormBgTheme,
  {
    name: string;
    chipName: string;
    cardDark: string;
    cardLight: string;
    borderFrame: string;
    glowAura: string;
    inputDark: string;
    inputLight: string;
    labelColor: string;
    titleGradient: string;
    iconGradient: string;
    btnGradient: string;
    borderAccent: string;
    accentDot: string;
  }
> = {
  zumrut: {
    name: 'Sakin Zümrüt & Petrol (Göz Dostu & Dinlendirici)',
    chipName: 'Zümrüt Yeşili',
    cardDark:
      'bg-gradient-to-br from-[#062423]/95 via-[#08302f]/95 to-[#041a19]/95 border-emerald-500/35 text-emerald-50 shadow-[0_4px_35px_rgba(16,185,129,0.18)]',
    cardLight:
      'bg-gradient-to-br from-[#f0fdf4] via-[#ecfdf5] to-[#f0fdf9] border-emerald-300 text-slate-800 shadow-md shadow-emerald-900/10',
    borderFrame: 'from-emerald-400/50 via-teal-400/40 to-emerald-500/50',
    glowAura: 'from-emerald-600/25 via-teal-500/20 to-emerald-600/25',
    inputDark:
      'bg-[#041716]/90 border-emerald-500/35 text-emerald-100 placeholder:text-emerald-400/40 focus:border-emerald-400 focus:bg-[#072524] focus:ring-1 focus:ring-emerald-400/40',
    inputLight:
      'bg-white/95 border-emerald-300/80 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400/30',
    labelColor: 'text-emerald-400',
    titleGradient: 'from-emerald-300 via-teal-200 to-cyan-300',
    iconGradient: 'from-emerald-400 to-teal-600 shadow-emerald-500/30',
    btnGradient:
      'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/30 border-emerald-300/40',
    borderAccent: 'border-emerald-500/30',
    accentDot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
  },
  kehribar: {
    name: 'Ilık Kehribar & Bal (Göz Yormayan Sıcak Ton)',
    chipName: 'Ilık Kehribar',
    cardDark:
      'bg-gradient-to-br from-[#241a08]/95 via-[#2d2009]/95 to-[#1c1306]/95 border-amber-500/35 text-amber-50 shadow-[0_4px_35px_rgba(245,158,11,0.18)]',
    cardLight:
      'bg-gradient-to-br from-[#fffbeb] via-[#fef3c7] to-[#fffdf5] border-amber-300 text-slate-800 shadow-md shadow-amber-900/10',
    borderFrame: 'from-amber-400/50 via-yellow-400/40 to-amber-500/50',
    glowAura: 'from-amber-600/25 via-yellow-500/20 to-amber-600/25',
    inputDark:
      'bg-[#181105]/90 border-amber-500/35 text-amber-100 placeholder:text-amber-400/40 focus:border-amber-400 focus:bg-[#241a08] focus:ring-1 focus:ring-amber-400/40',
    inputLight:
      'bg-white/95 border-amber-300/80 text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-400/30',
    labelColor: 'text-amber-400',
    titleGradient: 'from-amber-300 via-yellow-200 to-orange-300',
    iconGradient: 'from-amber-400 to-yellow-600 shadow-amber-500/30',
    btnGradient:
      'bg-gradient-to-r from-amber-600 via-yellow-500 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/30 border-amber-300/40',
    borderAccent: 'border-amber-500/30',
    accentDot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
  },
  safir: {
    name: 'Derin Gece Safiri (Dingin Lacivert)',
    chipName: 'Gece Safiri',
    cardDark:
      'bg-gradient-to-br from-[#09152b]/95 via-[#0c1c38]/95 to-[#071022]/95 border-blue-500/35 text-blue-50 shadow-[0_4px_35px_rgba(59,130,246,0.18)]',
    cardLight:
      'bg-gradient-to-br from-[#eff6ff] via-[#dbeafe] to-[#f0f9ff] border-blue-300 text-slate-800 shadow-md shadow-blue-900/10',
    borderFrame: 'from-blue-400/50 via-cyan-400/40 to-indigo-500/50',
    glowAura: 'from-blue-600/25 via-cyan-500/20 to-indigo-600/25',
    inputDark:
      'bg-[#060e1d]/90 border-blue-500/35 text-blue-100 placeholder:text-blue-400/40 focus:border-blue-400 focus:bg-[#09152b] focus:ring-1 focus:ring-blue-400/40',
    inputLight:
      'bg-white/95 border-blue-300/80 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-400/30',
    labelColor: 'text-blue-400',
    titleGradient: 'from-cyan-300 via-blue-200 to-indigo-300',
    iconGradient: 'from-blue-400 to-cyan-600 shadow-blue-500/30',
    btnGradient:
      'bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 border-blue-400/40',
    borderAccent: 'border-blue-500/30',
    accentDot: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]',
  },
  ametist: {
    name: 'Kozmik Leylak & Mor (Zarif Dinlendirici)',
    chipName: 'Kozmik Leylak',
    cardDark:
      'bg-gradient-to-br from-[#1c0c27]/95 via-[#251034]/95 to-[#15091e]/95 border-purple-500/35 text-purple-50 shadow-[0_4px_35px_rgba(168,85,247,0.18)]',
    cardLight:
      'bg-gradient-to-br from-[#faf5ff] via-[#f3e8ff] to-[#fdf4ff] border-purple-300 text-slate-800 shadow-md shadow-purple-900/10',
    borderFrame: 'from-purple-400/50 via-pink-400/40 to-purple-500/50',
    glowAura: 'from-purple-600/25 via-pink-500/20 to-purple-600/25',
    inputDark:
      'bg-[#12071a]/90 border-purple-500/35 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-400 focus:bg-[#1c0c27] focus:ring-1 focus:ring-purple-400/40',
    inputLight:
      'bg-white/95 border-purple-300/80 text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-400/30',
    labelColor: 'text-purple-400',
    titleGradient: 'from-purple-300 via-pink-200 to-violet-300',
    iconGradient: 'from-purple-400 to-pink-600 shadow-purple-500/30',
    btnGradient:
      'bg-gradient-to-r from-purple-600 via-pink-500 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-purple-600/30 border-purple-400/40',
    borderAccent: 'border-purple-500/30',
    accentDot: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]',
  },
};

export const TalepIstekFormu: React.FC<TalepIstekFormuProps> = ({
  currentUser = 'Yönetici',
  userRole = 'admin',
  darkMode = true,
  playClickSound,
  className = '',
}) => {
  // Bugünün tarihi (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];

  // Arka Fon Teması: Kullanıcı talebi doğrultusunda göz yormayan farklı renk
  // Varsayılan: 'zumrut' (Sakin Zümrüt & Petrol Yeşili)
  const [bgTheme, setBgTheme] = useState<FormBgTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'zumrut' || saved === 'kehribar' || saved === 'safir' || saved === 'ametist') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'zumrut';
  });

  const handleSelectTheme = (theme: FormBgTheme) => {
    setBgTheme(theme);
    if (playClickSound) playClickSound();
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  };

  const currentTheme = THEMES[bgTheme] || THEMES.zumrut;

  // Form State
  const [talepEden] = useState<string>(currentUser || 'Yönetici');
  const [tarih, setTarih] = useState<string>(todayStr);
  const [tur, setTur] = useState<TalepTuru>('Talep');
  const [konu, setKonu] = useState<string>('');
  const [aciklama, setAciklama] = useState<string>('');
  const [dosya, setDosya] = useState<{
    file?: File;
    adi: string;
    boyut: string;
    veri?: string;
    storageUrl?: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [lastSubmittedTalep, setLastSubmittedTalep] = useState<TalepKaydi | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [sqlTab, setSqlTab] = useState<'storage' | 'alter' | 'full'>('storage');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const playSuccessChime = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (harmonious celebratory arpeggio)
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.4);
      });
    } catch {
      // ignore
    }
  };

  const handleCopySql = () => {
    try {
      let code = DOSYALAR_STORAGE_SQL_SCRIPT;
      if (sqlTab === 'alter') code = TALEPLER_ADD_TALEPSERINO_SQL_SCRIPT;
      else if (sqlTab === 'full') code = TALEPLER_SUPABASE_SQL_SCRIPT;
      navigator.clipboard.writeText(code);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      // ignore
    }
  };

  // Kayıtlı talepleri yükleme
  const [gecmisTalepler, setGecmisTalepler] = useState<TalepKaydi[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Dosya Yükleme İşlemi (Sade & Pratik)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('Dosya boyutu 25 MB sınırını aşamaz.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      };

      setDosya({
        file: file,
        adi: file.name,
        boyut: formatSize(file.size),
        veri: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setDosya(null);
  };

  // Form Gönderme
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (playClickSound) playClickSound();

    if (!konu.trim()) {
      setErrorMessage('Lütfen talep/istek konusunu giriniz.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const talepSeriNo =
      'TLP-' +
      new Date().getFullYear() +
      '-' +
      String(Date.now()).slice(-4);

    // Evrak/dosya yüklendiyse: Talep Seri Nosu ile Supabase Storage DOSYALAR/TALEPLER/ klasörüne kaydet
    let uploadedStorageUrl: string | undefined;
    if (dosya) {
      try {
        const uploadRes = await uploadTalepDosyasiToStorage(
          dosya.file || dosya.veri || '',
          talepSeriNo,
          dosya.adi
        );
        if (uploadRes.publicUrl) {
          uploadedStorageUrl = uploadRes.publicUrl;
        }
      } catch (uploadErr) {
        console.warn('Storage upload error:', uploadErr);
      }
    }

    const yeniTalep: TalepKaydi = {
      id: 'talep_' + Date.now(),
      talepserino: talepSeriNo,
      talepEden: talepEden,
      tarih: tarih,
      tur: tur,
      konu: konu.trim(),
      aciklama: aciklama.trim(),
      dosyaAdi: dosya?.adi,
      dosyaBoyutu: dosya?.boyut,
      dosyaVerisi: dosya?.veri,
      dosyaUrl: uploadedStorageUrl || dosya?.veri,
      durum: 'İnceleniyor',
      olusturmaTarihi: new Date().toLocaleString('tr-TR'),
    };

    // 1. Yerel veritabanına kaydet
    try {
      const guncelListe = [yeniTalep, ...gecmisTalepler];
      setGecmisTalepler(guncelListe);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(guncelListe));
    } catch (err) {
      console.warn('LocalStorage kayıt uyarısı:', err);
    }

    // 2. Supabase talepler tablosuna kaydet
    try {
      await insertTalepKaydiToSupabase({
        talepeden: yeniTalep.talepEden,
        talepserino: talepSeriNo,
        tarih: yeniTalep.tarih,
        tür: yeniTalep.tur,
        konu: yeniTalep.konu,
        acıklama: yeniTalep.aciklama,
        dosya: uploadedStorageUrl || yeniTalep.dosyaVerisi || yeniTalep.dosyaAdi || '',
      });
    } catch (err) {
      console.warn('Supabase talepler kaydı eklenemedi:', err);
    }

    setLastSubmittedTalep(yeniTalep);
    setIsSubmitting(false);
    setShowSuccessToast(true);
    playSuccessChime();

    // Formu sıfırla
    setKonu('');
    setAciklama('');
    setDosya(null);

    setTimeout(() => {
      setShowSuccessToast(false);
    }, 10000);
  };

  const handleDeleteKayit = (id: string) => {
    const filtrelenmis = gecmisTalepler.filter((t) => t.id !== id);
    setGecmisTalepler(filtrelenmis);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtrelenmis));
    } catch {
      // ignore
    }
  };

  return (
    <div className={`relative w-full transition-all duration-500 ${className}`}>
      {/* BAŞLIK & FORM KARTI: KULLANICI TALEBİNE ÖZEL GÖZ YORMAYAN FARKLI ARKA FON */}
      <div
        className={`relative rounded-2xl p-[1.5px] bg-gradient-to-r ${currentTheme.borderFrame} transition-all duration-700 shadow-xl`}
      >
        {/* Arkada yumuşak ışıltı aurası */}
        <div
          className={`absolute -inset-1 rounded-2xl bg-gradient-to-r ${currentTheme.glowAura} blur-xl pointer-events-none -z-10 transition-all duration-700`}
        />

        <div
          className={`rounded-2xl p-3.5 sm:p-5 backdrop-blur-xl transition-all duration-700 ${
            darkMode ? currentTheme.cardDark : currentTheme.cardLight
          }`}
        >
          {/* ÜST BİLGİ, MODÜL BAŞLIĞI & GÖZ DOSTU RENK SEÇİCİ */}
          <div
            className={`flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b ${
              darkMode ? 'border-white/10' : 'border-slate-200'
            } mb-3.5`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-br ${currentTheme.iconGradient} flex items-center justify-center text-white shadow-md transition-all duration-500`}
              >
                <Sparkles className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <div>
                <h3
                  className={`text-xs sm:text-sm font-black tracking-wide uppercase bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.titleGradient} transition-all duration-500`}
                >
                  TALEP • İSTEK • ÖNERİ FORMU
                </h3>
                <p className={`text-[10px] font-medium transition-colors ${darkMode ? 'text-emerald-300/70' : 'text-slate-600'}`}>
                  Yönetim merkezine taleplerinizi doğrudan iletin • {currentTheme.name}
                </p>
              </div>
            </div>

            {/* Sağ Üst: Göz Yormayan Arka Fon Renk Seçicisi & Kayıtlarım */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Farklı Göz Dostu Renk Seçicisi */}
              <div className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl bg-black/20 dark:bg-black/40 border border-white/10 backdrop-blur-xs">
                <span className="text-[10px] font-bold text-slate-300 hidden md:inline px-1 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-cyan-400" />
                  <span>Arka Fon:</span>
                </span>
                {(['zumrut', 'kehribar', 'safir', 'ametist'] as FormBgTheme[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectTheme(t)}
                    className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      bgTheme === t
                        ? 'bg-white/25 text-white shadow-sm ring-1 ring-white/40 scale-105'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title={THEMES[t].name}
                  >
                    <span className={`w-2 h-2 rounded-full ${THEMES[t].accentDot}`} />
                    <span className="hidden sm:inline">{THEMES[t].chipName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* HATA BİLDİRİMİ */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="mb-3 overflow-hidden"
              >
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              </motion.div>
            )}

            {showSuccessToast && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="mb-4 relative overflow-hidden rounded-2xl p-[1.5px] bg-gradient-to-r from-emerald-400 via-cyan-400 via-teal-300 to-indigo-400 shadow-2xl shadow-emerald-500/25"
              >
                {/* Arkada yumuşak yanar-döner neon ambiyans aurası */}
                <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/35 via-cyan-500/30 to-indigo-500/35 blur-xl animate-pulse pointer-events-none -z-10" />

                <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#051c17]/95 via-[#082b23]/95 to-[#061826]/95 backdrop-blur-xl text-white">
                  {/* Üst Kısım: Başarı İkonu + Başlık + Kapat Butonu */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Animasyonlu Işıltılı Başarı Rozeti */}
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                        className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-[1.5px] shadow-lg shadow-emerald-500/50 flex items-center justify-center shrink-0"
                      >
                        <div className="w-full h-full rounded-2xl bg-[#041c16] flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-emerald-300 drop-shadow-[0_0_10px_#34d399]" />
                        </div>
                      </motion.div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 uppercase">
                            GÖNDERİM İŞLEMİ BAŞARIYLA TAMAMLANDI!
                          </h4>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 shadow-xs animate-pulse">
                            <Sparkles className="w-3 h-3 text-cyan-300" />
                            İletildi &amp; Kaydedildi
                          </span>
                        </div>
                        <p className="text-xs text-emerald-200/80 mt-1 font-medium">
                          Talebiniz yönetim merkezine doğrudan iletilmiş ve Supabase sistemine güvenle kaydedilmiştir.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSuccessToast(false)}
                      className="p-1.5 rounded-xl hover:bg-white/10 text-emerald-300/70 hover:text-white transition-colors cursor-pointer shrink-0"
                      title="Bildirimi Kapat"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bilgi Çipleri ve Detay Şeridi */}
                  {lastSubmittedTalep && (
                    <div className="mt-3.5 pt-3 border-t border-emerald-500/25 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      {/* 1. Talep Seri No */}
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-emerald-500/30 shadow-inner">
                        <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider">
                          Seri No:
                        </span>
                        <span className="font-mono font-black text-cyan-300 text-xs tracking-wider">
                          {lastSubmittedTalep.talepserino || 'TLP-TALEP'}
                        </span>
                      </div>

                      {/* 2. Konu */}
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-emerald-500/30 truncate shadow-inner">
                        <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider shrink-0">
                          Konu:
                        </span>
                        <span className="font-bold text-white truncate text-xs">
                          {lastSubmittedTalep.konu}
                        </span>
                      </div>

                      {/* 3. Durum Işığı */}
                      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/40 border border-emerald-500/30 shadow-inner">
                        <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider">
                          Durum:
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                          İnceleniyor (Aktif)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Evrak / Belge Durumu */}
                  {lastSubmittedTalep?.dosyaAdi && (
                    <div className="mt-2.5 px-3 py-2 rounded-xl bg-indigo-950/50 border border-indigo-400/40 text-[11px] flex items-center justify-between flex-wrap gap-2 text-indigo-200">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                        <span className="font-medium text-slate-300">Eklenen Evrak:</span>
                        <span className="font-bold text-white truncate">{lastSubmittedTalep.dosyaAdi}</span>
                        {lastSubmittedTalep.dosyaBoyutu && (
                          <span className="text-[10px] text-indigo-300 font-mono">
                            ({lastSubmittedTalep.dosyaBoyutu})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/15 px-2.5 py-0.5 rounded-lg border border-cyan-400/30 shrink-0 flex items-center gap-1">
                        <Check className="w-3 h-3 text-cyan-300" />
                        DOSYALAR/TALEPLER/ Arşivlendi
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FORM ALANI: DİNLENDİRİCİ, GÖZ DOSTU İNPUT RENKLERİ */}
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            {/* SATIR 1: TALEP EDEN (KULLANICI ADINDAN OTOMATİK), TARİH, TÜR LİSTBOX */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. TALEP EDEN (KULLANICI ADINDAN DİREK ALINIR) */}
              <div className="space-y-1">
                <label className={`block text-[10px] font-black uppercase tracking-wider ${currentTheme.labelColor} flex items-center gap-1`}>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>TALEP EDEN</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={talepEden}
                    readOnly
                    className={`w-full pl-8 pr-7 py-2 rounded-xl text-xs font-bold outline-none border transition-colors cursor-not-allowed shadow-inner ${
                      darkMode ? currentTheme.inputDark : currentTheme.inputLight
                    }`}
                  />
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-emerald-400">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div
                    className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-400"
                    title="Kullanıcı adından otomatik alındı"
                  >
                    <Lock className="w-3 h-3 text-emerald-400/80" />
                  </div>
                </div>
              </div>

              {/* 2. TARİH */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>TARİH</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={tarih}
                    onChange={(e) => setTarih(e.target.value)}
                    className={`w-full pl-8 pr-2.5 py-2 rounded-xl text-xs font-bold outline-none border transition-colors shadow-inner ${
                      darkMode ? currentTheme.inputDark : currentTheme.inputLight
                    }`}
                  />
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-teal-400">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* 3. LİST BOKS: TALEP, İSTEK, ÖNERİ */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>TÜR (LİSTE)</span>
                </label>
                <div className="relative">
                  <select
                    value={tur}
                    onChange={(e) => setTur(e.target.value as TalepTuru)}
                    className={`w-full pl-8 pr-8 py-2 rounded-xl text-xs font-bold outline-none border transition-colors appearance-none cursor-pointer shadow-inner ${
                      darkMode ? currentTheme.inputDark : currentTheme.inputLight
                    }`}
                  >
                    <option value="Talep" className="bg-[#051c1b] text-cyan-300">
                      📌 Talep (İş / Süreç Talebi)
                    </option>
                    <option value="İstek" className="bg-[#051c1b] text-amber-300">
                      💡 İstek (Sistem / Geliştirme İsteği)
                    </option>
                    <option value="Öneri" className="bg-[#051c1b] text-emerald-300">
                      🌟 Öneri (İyileştirme Önerisi)
                    </option>
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-amber-300">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-amber-300 text-[10px]">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* SATIR 2: KONU TEXTBOX */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center justify-between">
                <span>KONU</span>
                <span className="text-[9px] text-slate-400 lowercase font-medium">kısa başlık</span>
              </label>
              <input
                type="text"
                value={konu}
                onChange={(e) => {
                  setKonu(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Örn: Muhasebe ekranında yeni raporlama alanı / Ek malzeme temini"
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none border transition-colors shadow-inner ${
                  darkMode ? currentTheme.inputDark : currentTheme.inputLight
                }`}
              />
            </div>

            {/* SATIR 3: AÇIKLAMA TEXTAREA (İSTEĞE BAĞLI / ZORUNLU DEĞİL) */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-teal-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>AÇIKLAMA</span>
                  <span className="text-[9px] font-bold text-slate-400 normal-case px-1.5 py-0.2 rounded bg-white/5 border border-white/10">
                    İsteğe Bağlı
                  </span>
                </span>
                <span className="text-[9px] text-slate-400 lowercase font-medium">detaylı bilgi (opsiyonel)</span>
              </label>
              <textarea
                value={aciklama}
                onChange={(e) => {
                  setAciklama(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                rows={3}
                placeholder="Varsa talep veya isteğinizle ilgili detaylar, açıklamalar (isteğe bağlı)..."
                className={`w-full px-3 py-2 rounded-xl text-xs font-medium outline-none border resize-none transition-colors shadow-inner ${
                  darkMode ? currentTheme.inputDark : currentTheme.inputLight
                }`}
              />
            </div>

            {/* SATIR 4: FARKLI RENKLİ ÖZEL EVRAK YÜKLEME & GÖNDER BUTONU */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              {/* FARKLI GÖZ ALICI RENKTE (İNDİGO & CAMGÖBEĞİ) SADE EVRAK YÜKLEME ALANI */}
              <div className="flex-1">
                {!dosya ? (
                  <label
                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-dashed transition-all cursor-pointer group shadow-sm ${
                      darkMode
                        ? 'border-indigo-400/60 bg-gradient-to-r from-[#0e1630]/90 via-[#151c3d]/85 to-[#1a1842]/90 hover:from-[#131d42] hover:to-[#221f57] text-indigo-200 hover:border-indigo-300 shadow-indigo-950/40'
                        : 'border-indigo-300 bg-gradient-to-r from-indigo-50 via-sky-50 to-indigo-100/70 hover:bg-indigo-100 text-indigo-900 hover:border-indigo-400 shadow-indigo-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform shrink-0">
                        <Paperclip className="w-3.5 h-3.5 text-cyan-300" />
                      </div>
                      <span className="truncate text-xs font-black tracking-wide text-indigo-100 dark:text-indigo-100 light:text-indigo-900">
                        Evrak / Dosya Ekle
                      </span>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shrink-0">
                      Dosya Seç
                    </span>

                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx,.doc,.txt"
                    />
                  </label>
                ) : (
                  <div
                    className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border transition-all text-xs shadow-md ${
                      darkMode
                        ? 'bg-gradient-to-r from-[#0d1633] via-[#141d44] to-[#1a1744] border-indigo-400/60 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                        : 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-indigo-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-cyan-300" />
                      </div>
                      <span className="truncate font-black text-indigo-200 dark:text-indigo-100">
                        {dosya.adi}
                      </span>
                      <span className="text-[10px] text-indigo-300/80 shrink-0 font-mono">
                        ({dosya.boyut})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      title="Dosyayı kaldır"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* GÖNDER BUTONU: GÖZ ALICI HAREKETLİ ANBİYANSLI */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`py-2 px-6 rounded-xl font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                  isSubmitting ? 'bg-slate-700 text-slate-300 cursor-wait' : currentTheme.btnGradient
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>İletiliyor...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>TALEBİ GÖNDER</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </div>

      {/* GÖNDERİLEN TALEPLER GEÇMİŞİ MODALI */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-2xl rounded-2xl bg-[#061e1d] border border-emerald-500/30 p-5 shadow-2xl text-white space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm">
                  <Inbox className="w-4 h-4 text-emerald-400" />
                  <span>Gönderilen Talep & İstek Kayıtlarım ({gecmisTalepler.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {gecmisTalepler.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Henüz iletilmiş bir talep veya istek bulunmuyor.
                </div>
              ) : (
                <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
                  {gecmisTalepler.map((kayit) => (
                    <div
                      key={kayit.id}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {kayit.talepserino && (
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 font-black">
                              {kayit.talepserino}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              kayit.tur === 'Talep'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : kayit.tur === 'İstek'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {kayit.tur}
                          </span>
                          <span className="font-extrabold text-xs text-white">
                            {kayit.konu}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {kayit.tarih}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteKayit(kayit.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                            title="Kaydı sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 font-normal whitespace-pre-wrap">
                        {kayit.aciklama}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                        <span>
                          Gönderen: <strong className="text-emerald-300">{kayit.talepEden}</strong>
                        </span>

                        {kayit.dosyaAdi && (
                          <div className="flex items-center gap-1 text-emerald-300">
                            <Paperclip className="w-3 h-3" />
                            <span>{kayit.dosyaAdi}</span>
                            {(kayit.dosyaUrl || kayit.dosyaVerisi) && (
                              <a
                                href={kayit.dosyaUrl || kayit.dosyaVerisi}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={kayit.dosyaAdi}
                                className="ml-1 text-teal-400 hover:underline flex items-center gap-0.5 font-bold"
                              >
                                <Download className="w-3 h-3" /> İndir / Aç
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* SUPABASE SQL KODU MODALI */}
        {showSqlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#091522] border border-emerald-500/30 text-white shadow-2xl overflow-hidden"
            >
              {/* Modal Başlığı */}
              <div className="flex items-center justify-between p-4 border-b border-emerald-500/20 bg-emerald-950/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md">
                    <Database className="w-4 h-4 text-emerald-200" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <span>Supabase &quot;talepler&quot; SQL Kodu</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        {sqlTab === 'alter' ? 'ALTER TABLE' : 'CREATE TABLE'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-emerald-300/70 font-medium">
                      talepno • talepserino • tarih • talepeden • tür • konu • acıklama • dosya
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      copiedSql
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                        : 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40'
                    }`}
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kodu Kopyala</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSqlModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sekmeler: Storage vs talepserino vs Tüm Tablo */}
              <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-950/30 border-b border-emerald-500/20 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSqlTab('storage')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    sqlTab === 'storage'
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-1 ring-emerald-300/50'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  📦 &apos;DOSYALAR&apos; Storage Bucket (TALEPLER/)
                </button>
                <button
                  type="button"
                  onClick={() => setSqlTab('alter')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    sqlTab === 'alter'
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-1 ring-emerald-300/50'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  ⚡ &apos;talepserino&apos; Sütununu Ekle (ALTER TABLE)
                </button>
                <button
                  type="button"
                  onClick={() => setSqlTab('full')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    sqlTab === 'full'
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-1 ring-emerald-300/50'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  📄 Tüm Tabloyu Sıfırdan Oluştur (CREATE TABLE)
                </button>
              </div>

              {/* Kurulum Adımları Özeti */}
              <div className="px-4 py-2 bg-emerald-950/20 border-b border-emerald-500/10 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Supabase &gt; SQL Editor &gt; New Query alanına yapıştırıp &quot;Run&quot; butonuna basınız.
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {sqlTab === 'storage'
                    ? 'Storage: DOSYALAR/TALEPLER/'
                    : sqlTab === 'alter'
                    ? 'Hedef: public.talepler (ALTER)'
                    : 'Hedef: public.talepler (CREATE)'}
                </span>
              </div>

              {/* Kod Görüntüleme Alanı */}
              <div className="p-4 overflow-y-auto max-h-[55vh] space-y-3 font-mono text-xs">
                <div className="relative">
                  <pre className="p-3.5 rounded-xl bg-[#040910] border border-white/10 text-emerald-200 overflow-x-auto text-[11px] leading-relaxed selection:bg-emerald-500/30">
                    {sqlTab === 'storage'
                      ? DOSYALAR_STORAGE_SQL_SCRIPT
                      : sqlTab === 'alter'
                      ? TALEPLER_ADD_TALEPSERINO_SQL_SCRIPT
                      : TALEPLER_SUPABASE_SQL_SCRIPT}
                  </pre>
                </div>
              </div>

              {/* Alt Bilgi */}
              <div className="p-3.5 border-t border-emerald-500/20 bg-emerald-950/30 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  {sqlTab === 'storage'
                    ? "Supabase Storage üzerinde 'DOSYALAR' bucket'ını oluşturur ve 'TALEPLER/' klasörüne dosya yükleme izinlerini tanımlar."
                    : sqlTab === 'alter'
                    ? "Mevcut 'talepler' tablonuza 'talepserino' sütunu, indeks ve otomatik seri no tetikleyicisi ekler."
                    : 'RLS güvenlik politikaları, indeksler ve otomatik senkronizasyon dahildir.'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
