import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Paperclip,
  Download,
  Trash2,
  Sparkles,
  Database,
  Copy,
  Check,
  X,
  Layers,
  UserCheck,
  Calendar,
  Building2,
  HardHat,
  Eye,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import {
  fetchTaleplerFromSupabase,
  updateTalepDurumInSupabase,
  deleteTalepFromSupabase,
  SupabaseTalepKaydiRow,
} from '../lib/supabase';

interface SantiyeTalepleriScreenProps {
  onBack: () => void;
  playClickSound?: () => void;
}

const SUPABASE_TALEPLER_URL =
  'https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/20580?schema=public/talepler';

export const SantiyeTalepleriScreen: React.FC<SantiyeTalepleriScreenProps> = ({
  onBack,
  playClickSound = () => {},
}) => {
  const [talepler, setTalepler] = useState<SupabaseTalepKaydiRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtreler & Arama
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTur, setSelectedTur] = useState<string>('TÜMÜ');
  const [selectedDurum, setSelectedDurum] = useState<string>('TÜMÜ');

  // Detay Modalı
  const [selectedTalep, setSelectedTalep] = useState<SupabaseTalepKaydiRow | null>(null);
  const [copiedNo, setCopiedNo] = useState<string | null>(null);

  // Toast Bildirimi
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Verileri Supabase'den Yükle
  const loadTalepler = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
      playClickSound();
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetchTaleplerFromSupabase();
      if (res.data) {
        setTalepler(res.data);
      }
      if (res.error && res.data.length === 0) {
        setError(res.error);
      }
      if (isManual) {
        showToast('Talepler Supabase tablosundan başarıyla güncellendi.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTalepler(false);
  }, []);

  // Seri No Kopyalama
  const handleCopySeriNo = (seriNo: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      navigator.clipboard.writeText(seriNo);
      setCopiedNo(seriNo);
      playClickSound();
      showToast(`Seri no kopyalandı: ${seriNo}`);
      setTimeout(() => setCopiedNo(null), 2500);
    } catch {
      // ignore
    }
  };

  // Durum Güncelleme
  const handleUpdateDurum = async (talep: SupabaseTalepKaydiRow, yeniDurum: string) => {
    if (!talep.talepno) return;
    playClickSound();

    // İyimser UI güncellemesi
    setTalepler((prev) =>
      prev.map((t) => (t.talepno === talep.talepno ? { ...t, durum: yeniDurum } : t))
    );
    if (selectedTalep && selectedTalep.talepno === talep.talepno) {
      setSelectedTalep((prev) => (prev ? { ...prev, durum: yeniDurum } : null));
    }

    try {
      const ok = await updateTalepDurumInSupabase(talep.talepno, yeniDurum);
      if (ok) {
        showToast(`Talep durumu "${yeniDurum}" olarak güncellendi.`);
      } else {
        showToast('Durum güncellendi.');
      }
    } catch (err) {
      console.warn('Durum güncelleme hatası:', err);
    }
  };

  // Talep Silme
  const handleDeleteTalep = async (talep: SupabaseTalepKaydiRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!talep.talepno) return;

    const confirmed = window.confirm(
      `#${talep.talepno} (${talep.talepserino || 'Talep'}) kaydını Supabase tablosundan silmek istediğinize emin misiniz?`
    );
    if (!confirmed) return;

    playClickSound();
    setTalepler((prev) => prev.filter((t) => t.talepno !== talep.talepno));
    if (selectedTalep && selectedTalep.talepno === talep.talepno) {
      setSelectedTalep(null);
    }

    try {
      const ok = await deleteTalepFromSupabase(talep.talepno);
      if (ok) {
        showToast('Talep kaydı Supabase üzerinden silindi.');
      }
    } catch {
      showToast('Kayıt silindi.');
    }
  };

  // İstatistikler
  const stats = useMemo(() => {
    const total = talepler.length;
    const bekleyen = talepler.filter(
      (t) => (t.durum || '').toLowerCase().includes('incele') || !t.durum
    ).length;
    const islemde = talepler.filter((t) => (t.durum || '').toLowerCase().includes('işlem')).length;
    const tamamlandi = talepler.filter((t) => (t.durum || '').toLowerCase().includes('tamam')).length;
    const evrakli = talepler.filter((t) => t.dosya && t.dosya.trim().length > 0).length;
    return { total, bekleyen, islemde, tamamlandi, evrakli };
  }, [talepler]);

  // Filtrelenmiş Liste
  const filteredTalepler = useMemo(() => {
    return talepler.filter((item) => {
      // 1. Arama
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const noStr = String(item.talepno || '').toLowerCase();
        const seriStr = String(item.talepserino || '').toLowerCase();
        const edenStr = String(item.talepeden || '').toLowerCase();
        const konuStr = String(item.konu || '').toLowerCase();
        const aciklamaStr = String(item.acıklama || item.aciklama || '').toLowerCase();
        const match =
          noStr.includes(q) ||
          seriStr.includes(q) ||
          edenStr.includes(q) ||
          konuStr.includes(q) ||
          aciklamaStr.includes(q);
        if (!match) return false;
      }

      // 2. Tür Filtresi
      if (selectedTur !== 'TÜMÜ') {
        const itemTur = (item.tür || item.tur || '').toLowerCase();
        if (itemTur !== selectedTur.toLowerCase()) return false;
      }

      // 3. Durum Filtresi
      if (selectedDurum !== 'TÜMÜ') {
        const itemDurum = (item.durum || 'İnceleniyor').toLowerCase();
        if (!itemDurum.includes(selectedDurum.toLowerCase())) return false;
      }

      return true;
    });
  }, [talepler, searchQuery, selectedTur, selectedDurum]);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col relative overflow-hidden font-sans select-none">
      {/* Arka Plan Yumuşak Ambiyans Işıkları */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* ÜST BAR (HEADER) */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0f18]/90 border-b border-white/10 px-4 sm:px-8 py-3 shadow-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {/* Geri Dön Butonu */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onBack();
              }}
              className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-amber-400/50 text-gray-200 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400 group-hover:-translate-x-1 transition-transform" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold leading-tight">Ödeme Talepleri</span>
                <span className="text-[9px] text-gray-400 leading-none hidden sm:inline">Geri Dön</span>
              </div>
            </button>

            {/* Logo ve Başlık */}
            <div className="flex items-center gap-3">
              <div className="p-0.5 rounded-lg border border-white/10 bg-white/[0.04] shadow-sm">
                <OzkaLogo size="sm" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-300 flex items-center gap-1.5">
                    <HardHat className="w-4 h-4 text-amber-400" />
                    <span>ŞANTİYE TALEPLERİ</span>
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 font-bold font-mono">
                    {talepler.length} Kayıt
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  Supabase Tablosu: <span className="font-mono text-cyan-300">public.talepler</span> • Proje: <span className="font-mono text-amber-300">mgtunrfpzbyfnmeloeeq</span>
                </p>
              </div>
            </div>

            {/* Sağ Araçlar: Supabase Tablosunu Aç & Yenile */}
            <div className="flex items-center gap-2">
              <a
                href={SUPABASE_TALEPLER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 text-emerald-200 border border-emerald-500/40 transition-all flex items-center gap-1.5 shadow-sm hover:shadow-emerald-500/20"
                title="Supabase Tablo Editörünü Yeni Sekmede Aç"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Supabase Tablosu</span>
                <ExternalLink className="w-3 h-3 text-emerald-400" />
              </a>

              <button
                type="button"
                onClick={() => loadTalepler(true)}
                disabled={refreshing}
                title="Supabase tablosundan verileri tekrar çek"
                className="p-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 hover:border-amber-400/40 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        {/* ANA İÇERİK ALANI */}
        <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 flex-1 space-y-4">
          {/* TOAST BİLDİRİMİ */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2 shadow-lg backdrop-blur-md"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* İSTATİSTİK ŞERİDİ */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Toplam Talep</p>
                <p className="text-base font-black text-white font-mono">{stats.total}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">İnceleniyor</p>
                <p className="text-base font-black text-amber-300 font-mono">{stats.bekleyen}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">İşleme Alındı</p>
                <p className="text-base font-black text-blue-300 font-mono">{stats.islemde}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Tamamlandı</p>
                <p className="text-base font-black text-emerald-300 font-mono">{stats.tamamlandi}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Paperclip className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Evraklı Dosya</p>
                <p className="text-base font-black text-indigo-300 font-mono">{stats.evrakli}</p>
              </div>
            </div>
          </div>

          {/* FİLTRE & ARAMA ÇUBUĞU */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Arama Inputu */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Seri no, talep eden kişi, konu veya açıklama ile ara..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-black/40 border border-white/10 focus:border-amber-400/60 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tür ve Durum Filtreleri */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tür Filtresi */}
              <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10 text-xs">
                <span className="text-[10px] text-slate-400 px-1 font-bold">Tür:</span>
                {['TÜMÜ', 'Talep', 'İstek', 'Öneri'].map((tur) => (
                  <button
                    key={tur}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSelectedTur(tur);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      selectedTur === tur
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tur}
                  </button>
                ))}
              </div>

              {/* Durum Filtresi */}
              <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10 text-xs">
                <span className="text-[10px] text-slate-400 px-1 font-bold">Durum:</span>
                {['TÜMÜ', 'İnceleniyor', 'İşleme', 'Tamamlandı'].map((durum) => (
                  <button
                    key={durum}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSelectedDurum(durum);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      selectedDurum === durum
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {durum === 'İşleme' ? 'İşlemde' : durum}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TABLO LİSTELEME ALANI */}
          <div className="rounded-2xl border border-white/10 bg-[#090e17]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                <p className="text-sm font-bold text-slate-300">
                  Supabase tablosundan talepler yükleniyor...
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  mgtunrfpzbyfnmeloeeq • public.talepler
                </p>
              </div>
            ) : filteredTalepler.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                  <HardHat className="w-6 h-6 text-amber-400/60" />
                </div>
                <p className="text-sm font-bold text-slate-300">Henüz kayıtlı talep bulunamadı</p>
                <p className="text-xs text-slate-500">
                  {searchQuery || selectedTur !== 'TÜMÜ' || selectedDurum !== 'TÜMÜ'
                    ? 'Arama kriterlerinize uygun talep bulunamadı.'
                    : 'Ana sayfadaki Talep • İstek Formu üzerinden gönderilen talepler burada listelenecektir.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/50 border-b border-white/10 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="py-3 px-3 w-14">No</th>
                      <th className="py-3 px-3">Seri No</th>
                      <th className="py-3 px-3">Tarih</th>
                      <th className="py-3 px-3">Talep Eden</th>
                      <th className="py-3 px-3">Tür</th>
                      <th className="py-3 px-4">Konu</th>
                      <th className="py-3 px-3">Evrak / Dosya</th>
                      <th className="py-3 px-3">Durum</th>
                      <th className="py-3 px-3 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTalepler.map((talep) => {
                      const turText = talep.tür || talep.tur || 'Talep';
                      const durumText = talep.durum || 'İnceleniyor';
                      const hasFile = Boolean(talep.dosya && talep.dosya.trim().length > 0);

                      return (
                        <tr
                          key={talep.talepno || Math.random()}
                          onClick={() => setSelectedTalep(talep)}
                          className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                        >
                          {/* Talep No */}
                          <td className="py-3 px-3 font-mono font-bold text-slate-400">
                            #{talep.talepno}
                          </td>

                          {/* Talep Seri No */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-cyan-300 px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[11px]">
                                {talep.talepserino || `TLP-${talep.talepno}`}
                              </span>
                              {talep.talepserino && (
                                <button
                                  type="button"
                                  onClick={(e) => handleCopySeriNo(talep.talepserino!, e)}
                                  className="p-1 rounded text-slate-400 hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Seri no kopyala"
                                >
                                  {copiedNo === talep.talepserino ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Tarih */}
                          <td className="py-3 px-3 text-slate-300 whitespace-nowrap text-[11px]">
                            {talep.tarih ? talep.tarih.split('T')[0] : '-'}
                          </td>

                          {/* Talep Eden */}
                          <td className="py-3 px-3 font-bold text-slate-200 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{talep.talepeden}</span>
                            </span>
                          </td>

                          {/* Tür */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                turText === 'Talep'
                                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                  : turText === 'İstek'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {turText}
                            </span>
                          </td>

                          {/* Konu */}
                          <td className="py-3 px-4 font-bold text-white max-w-xs truncate">
                            <span title={talep.konu}>{talep.konu}</span>
                          </td>

                          {/* Evrak / Dosya */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {hasFile ? (
                              <a
                                href={talep.dosya}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-200 border border-indigo-400/35 hover:bg-indigo-500/30 hover:text-white transition-colors font-bold text-[10px]"
                                title="Evrakı Görüntüle / İndir"
                              >
                                <Paperclip className="w-3 h-3 text-cyan-300" />
                                <span>Evrak Aç</span>
                                <ExternalLink className="w-2.5 h-2.5 text-indigo-300" />
                              </a>
                            ) : (
                              <span className="text-slate-500 text-[10px] italic">Evrak Yok</span>
                            )}
                          </td>

                          {/* Durum */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <select
                              value={durumText}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleUpdateDurum(talep, e.target.value)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase outline-none border cursor-pointer transition-colors ${
                                durumText.includes('İncele')
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : durumText.includes('İşlem')
                                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              <option value="İnceleniyor" className="bg-[#0b121e] text-amber-300">
                                🟡 İnceleniyor
                              </option>
                              <option value="İşleme Alındı" className="bg-[#0b121e] text-blue-300">
                                🔵 İşleme Alındı
                              </option>
                              <option value="Tamamlandı" className="bg-[#0b121e] text-emerald-300">
                                🟢 Tamamlandı
                              </option>
                            </select>
                          </td>

                          {/* İşlemler */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTalep(talep);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors"
                                title="Detay İncele"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteTalep(talep, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
                                title="Kaydı Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* DETAY MODALI */}
      <AnimatePresence>
        {selectedTalep && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl rounded-2xl bg-[#09121d] border border-cyan-500/30 text-white shadow-2xl overflow-hidden"
            >
              {/* Modal Başlığı */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <span>Talep Detayı #{selectedTalep.talepno}</span>
                      {selectedTalep.talepserino && (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          {selectedTalep.talepserino}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {selectedTalep.tarih ? selectedTalep.tarih.split('T')[0] : ''} • Gönderen:{' '}
                      <strong className="text-emerald-300">{selectedTalep.talepeden}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTalep(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal İçeriği */}
              <div className="p-4 sm:p-5 space-y-3.5 max-h-[70vh] overflow-y-auto text-xs">
                {/* Konu & Tür */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    {selectedTalep.tür || selectedTalep.tur || 'Talep'} Konusu:
                  </span>
                  <p className="text-sm font-bold text-white">{selectedTalep.konu}</p>
                </div>

                {/* Açıklama */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                    Açıklama:
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {selectedTalep.acıklama || selectedTalep.aciklama || (
                      <span className="text-slate-500 italic">Açıklama girilmemiş.</span>
                    )}
                  </p>
                </div>

                {/* Ekli Evrak / Dosya Bilgisi */}
                {selectedTalep.dosya && (
                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-400/30 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-4 h-4 text-cyan-300 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">Yüklenmiş Evrak / Belge</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                          {selectedTalep.dosya}
                        </p>
                      </div>
                    </div>

                    <a
                      href={selectedTalep.dosya}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-cyan-400 transition-colors shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Evrakı Aç / İndir</span>
                    </a>
                  </div>
                )}

                {/* Durum Değiştirme */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-300">Talep Durumu:</span>
                  <div className="flex items-center gap-1.5">
                    {['İnceleniyor', 'İşleme Alındı', 'Tamamlandı'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleUpdateDurum(selectedTalep, d)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          (selectedTalep.durum || 'İnceleniyor') === d
                            ? d.includes('İncele')
                              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                              : d.includes('İşlem')
                              ? 'bg-blue-500 text-white font-black shadow-md'
                              : 'bg-emerald-500 text-slate-950 font-black shadow-md'
                            : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Alt Bar */}
              <div className="p-3.5 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs">
                <a
                  href={SUPABASE_TALEPLER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px] font-bold"
                >
                  <ExternalLink className="w-3 h-3" />
                  Supabase Tablo Editöründe Gör
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedTalep(null)}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-all cursor-pointer"
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
