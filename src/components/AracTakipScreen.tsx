import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Truck,
  Car,
  Search,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  Shield,
  FileCheck,
  MapPin,
  User,
  Building2,
  ExternalLink,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  FileText,
  Filter,
  Eye,
  ChevronDown,
  Info,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import {
  fetchAracTakipList,
  saveAracTakipRecord,
  deleteAracTakipRecord,
  AracTakipRecord,
} from '../lib/supabase';

interface AracTakipScreenProps {
  onBack: () => void;
  playClickSound: () => void;
}

const SUPABASE_URL =
  'https://supabase.com/dashboard/project/zgeeziqcenezutumhukp/editor/18179?schema=public/aractakip';

// Date utility functions
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
}

function getDaysRemaining(dateStr?: string | null): {
  days: number | null;
  status: 'expired' | 'urgent' | 'warning' | 'ok' | 'none';
  label: string;
} {
  if (!dateStr) {
    return { days: null, status: 'none', label: 'Belirtilmedi' };
  }
  try {
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) {
      return { days: null, status: 'none', label: 'Geçersiz Tarih' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return { days, status: 'expired', label: `${Math.abs(days)} gün geçti` };
    } else if (days === 0) {
      return { days, status: 'urgent', label: 'Bugün son gün!' };
    } else if (days <= 30) {
      return { days, status: 'urgent', label: `${days} gün kaldı` };
    } else if (days <= 60) {
      return { days, status: 'warning', label: `${days} gün kaldı` };
    } else {
      return { days, status: 'ok', label: `${days} gün kaldı` };
    }
  } catch {
    return { days: null, status: 'none', label: '-' };
  }
}

export const AracTakipScreen: React.FC<AracTakipScreenProps> = ({ onBack, playClickSound }) => {
  const [vehicles, setVehicles] = useState<AracTakipRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<
    'all' | 'active' | 'muayene_urgent' | 'kasko_urgent' | 'sigorta_urgent'
  >('all');
  const [sortBy, setSortBy] = useState<'plaka' | 'muayene' | 'marka' | 'id'>('id');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<AracTakipRecord | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<AracTakipRecord | null>(null);

  // Form states
  const [formPlaka, setFormPlaka] = useState('');
  const [formMarkasi, setFormMarkasi] = useState('');
  const [formModeli, setFormModeli] = useState('');
  const [formTicariUnvani, setFormTicariUnvani] = useState('');
  const [formBulunduguYer, setFormBulunduguYer] = useState('');
  const [formKullanici, setFormKullanici] = useState('');
  const [formMuayeneTarihi, setFormMuayeneTarihi] = useState('');
  const [formKaskoTarihi, setFormKaskoTarihi] = useState('');
  const [formSigortaTarihi, setFormSigortaTarihi] = useState('');
  const [formNotlar, setFormNotlar] = useState('');
  const [formAktif, setFormAktif] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const loadVehicles = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchAracTakipList();
      setVehicles(data);
      if (isManual) {
        showToast(`✓ ${data.length} adet araç verisi Supabase'den başarıyla çekildi.`);
      }
    } catch (err) {
      console.error('AracTakip yükleme hatası:', err);
      showToast('⚠️ Araç takip verileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  // Filter and Sort
  const filteredVehicles = useMemo(() => {
    let list = [...vehicles];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((v) => {
        return (
          v.plaka.toLowerCase().includes(q) ||
          (v.markasi && v.markasi.toLowerCase().includes(q)) ||
          (v.modeli && v.modeli.toLowerCase().includes(q)) ||
          (v.ticari_unvani && v.ticari_unvani.toLowerCase().includes(q)) ||
          (v.bulundugu_yer && v.bulundugu_yer.toLowerCase().includes(q)) ||
          (v.kullanici && v.kullanici.toLowerCase().includes(q)) ||
          (v.notlar && v.notlar.toLowerCase().includes(q))
        );
      });
    }

    // Filter pill
    if (filterType === 'active') {
      list = list.filter((v) => v.aktif !== false);
    } else if (filterType === 'muayene_urgent') {
      list = list.filter((v) => {
        const info = getDaysRemaining(v.muayene_tarihi);
        return info.status === 'urgent' || info.status === 'expired';
      });
    } else if (filterType === 'kasko_urgent') {
      list = list.filter((v) => {
        const info = getDaysRemaining(v.kasko_tarihi);
        return info.status === 'urgent' || info.status === 'expired';
      });
    } else if (filterType === 'sigorta_urgent') {
      list = list.filter((v) => {
        const info = getDaysRemaining(v.sigorta_tarihi);
        return info.status === 'urgent' || info.status === 'expired';
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'plaka') {
        return a.plaka.localeCompare(b.plaka);
      } else if (sortBy === 'marka') {
        return (a.markasi || '').localeCompare(b.markasi || '');
      } else if (sortBy === 'muayene') {
        const timeA = a.muayene_tarihi ? new Date(a.muayene_tarihi).getTime() : Infinity;
        const timeB = b.muayene_tarihi ? new Date(b.muayene_tarihi).getTime() : Infinity;
        return timeA - timeB;
      } else {
        return Number(a.id || 0) - Number(b.id || 0);
      }
    });

    return list;
  }, [vehicles, searchQuery, filterType, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = vehicles.length;
    const active = vehicles.filter((v) => v.aktif !== false).length;

    let muayeneUrgent = 0;
    let kaskoUrgent = 0;
    let sigortaUrgent = 0;

    vehicles.forEach((v) => {
      const m = getDaysRemaining(v.muayene_tarihi);
      if (m.status === 'urgent' || m.status === 'expired') muayeneUrgent++;

      const k = getDaysRemaining(v.kasko_tarihi);
      if (k.status === 'urgent' || k.status === 'expired') kaskoUrgent++;

      const s = getDaysRemaining(v.sigorta_tarihi);
      if (s.status === 'urgent' || s.status === 'expired') sigortaUrgent++;
    });

    return { total, active, muayeneUrgent, kaskoUrgent, sigortaUrgent };
  }, [vehicles]);

  // Modal Open for Add
  const handleOpenAdd = () => {
    playClickSound();
    setEditingVehicle(null);
    setFormPlaka('');
    setFormMarkasi('');
    setFormModeli('');
    setFormTicariUnvani('Bayburt Özka İnşaat');
    setFormBulunduguYer('Bayburt');
    setFormKullanici('');
    setFormMuayeneTarihi('');
    setFormKaskoTarihi('');
    setFormSigortaTarihi('');
    setFormNotlar('');
    setFormAktif(true);
    setModalOpen(true);
  };

  // Modal Open for Edit
  const handleOpenEdit = (vehicle: AracTakipRecord) => {
    playClickSound();
    setEditingVehicle(vehicle);
    setFormPlaka(vehicle.plaka || '');
    setFormMarkasi(vehicle.markasi || '');
    setFormModeli(vehicle.modeli || '');
    setFormTicariUnvani(vehicle.ticari_unvani || 'Bayburt Özka İnşaat');
    setFormBulunduguYer(vehicle.bulundugu_yer || '');
    setFormKullanici(vehicle.kullanici || '');
    setFormMuayeneTarihi(vehicle.muayene_tarihi || '');
    setFormKaskoTarihi(vehicle.kasko_tarihi || '');
    setFormSigortaTarihi(vehicle.sigorta_tarihi || '');
    setFormNotlar(vehicle.notlar || '');
    setFormAktif(vehicle.aktif !== false);
    setModalOpen(true);
  };

  // Save Form
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlaka.trim()) {
      showToast('⚠️ Lütfen araç plakasını giriniz.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<AracTakipRecord> = {
        id: editingVehicle ? editingVehicle.id : undefined,
        plaka: formPlaka.trim().toUpperCase(),
        markasi: formMarkasi.trim(),
        modeli: formModeli.trim(),
        ticari_unvani: formTicariUnvani.trim(),
        bulundugu_yer: formBulunduguYer.trim(),
        kullanici: formKullanici.trim(),
        muayene_tarihi: formMuayeneTarihi || null,
        kasko_tarihi: formKaskoTarihi || null,
        sigorta_tarihi: formSigortaTarihi || null,
        notlar: formNotlar.trim(),
        aktif: formAktif,
      };

      const res = await saveAracTakipRecord(payload);
      if (res.success) {
        showToast(
          editingVehicle
            ? `✓ ${payload.plaka} plakalı araç başarıyla güncellendi.`
            : `✓ ${payload.plaka} plakalı araç başarıyla kaydedildi.`
        );
        setModalOpen(false);
        loadVehicles();
      } else {
        showToast(`⚠️ Kayıt hatası: ${res.error || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      console.error('Save vehicle error:', err);
      showToast('⚠️ Sunucu bağlantı hatası oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Vehicle
  const handleDeleteVehicle = async (vehicle: AracTakipRecord) => {
    playClickSound();
    if (
      !window.confirm(
        `${vehicle.plaka} plakalı aracı tablodan ve Supabase'den silmek istediğinize emin misiniz?`
      )
    ) {
      return;
    }

    try {
      if (!vehicle.id) return;
      const res = await deleteAracTakipRecord(vehicle.id);
      if (res.success) {
        showToast(`✓ ${vehicle.plaka} plakalı araç silindi.`);
        setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
      } else {
        showToast(`⚠️ Silme hatası: ${res.error || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('⚠️ Araç silinirken hata oluştu.');
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    playClickSound();
    if (vehicles.length === 0) {
      showToast('⚠️ Dışa aktarılacak araç bulunamadı.');
      return;
    }

    const headers = [
      'ID',
      'Plaka',
      'Markası',
      'Modeli',
      'Ticari Ünvanı',
      'Bulunduğu Yer',
      'Kullanıcı',
      'Muayene Tarihi',
      'Kasko Tarihi',
      'Sigorta Tarihi',
      'Aktiflik',
      'Notlar',
    ];

    const rows = vehicles.map((v) => [
      v.id || '',
      `"${v.plaka || ''}"`,
      `"${v.markasi || ''}"`,
      `"${v.modeli || ''}"`,
      `"${v.ticari_unvani || ''}"`,
      `"${v.bulundugu_yer || ''}"`,
      `"${v.kullanici || ''}"`,
      v.muayene_tarihi || '',
      v.kasko_tarihi || '',
      v.sigorta_tarihi || '',
      v.aktif ? 'Aktif' : 'Pasif',
      `"${(v.notlar || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `bayburt_ozka_arac_takip_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('✓ Araç listesi CSV olarak dışa aktarıldı.');
  };

  // Render Status Badge for Date
  const renderDateBadge = (dateStr?: string | null) => {
    const info = getDaysRemaining(dateStr);
    const formatted = formatDate(dateStr);

    if (info.status === 'none') {
      return <span className="text-gray-500 font-mono text-xs">-</span>;
    }

    let colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (info.status === 'expired') {
      colorClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
    } else if (info.status === 'urgent') {
      colorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    } else if (info.status === 'warning') {
      colorClass = 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
    }

    return (
      <div className="flex flex-col items-start gap-1">
        <span className="font-mono text-xs font-semibold text-gray-200">{formatted}</span>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${colorClass}`}
        >
          {info.status === 'expired' && <AlertTriangle className="w-2.5 h-2.5" />}
          {info.status === 'urgent' && <Clock className="w-2.5 h-2.5" />}
          {info.status === 'ok' && <CheckCircle2 className="w-2.5 h-2.5" />}
          <span>{info.label}</span>
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex flex-col relative overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Eye-catching background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[160px]" />
        <div className="absolute top-[40%] right-[-5%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[160px]" />
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0d14]/90 border-b border-white/10 px-4 sm:px-8 py-3.5 shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center justify-between md:justify-start gap-4">
              <button
                id="aractakip-back-btn"
                type="button"
                onClick={() => {
                  playClickSound();
                  onBack();
                }}
                className="group flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-emerald-400/50 text-gray-200 hover:text-white transition-all shadow-md active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs sm:text-sm font-bold">Geri Dön</span>
              </button>

              <div className="h-7 w-[1px] bg-white/10 hidden sm:block" />

              <div className="flex items-center gap-3">
                <OzkaLogo size={36} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs tracking-wider text-emerald-400 font-extrabold uppercase">
                      BAYBURT ÖZ-KA İNŞAAT
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      CANLI FİLO
                    </span>
                  </div>
                  <h1 className="text-base sm:text-xl font-black text-white tracking-tight leading-tight">
                    BAYBURT ÖZ-KA ARAÇ TAKİP SİSTEMİ
                  </h1>
                </div>
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
              <a
                href={SUPABASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="Supabase aractakip tablosunu aç"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 hover:border-emerald-500/40 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Supabase Tablosu</span>
              </a>

              <button
                type="button"
                onClick={() => loadVehicles(true)}
                disabled={refreshing}
                title="Verileri yenile"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10 hover:border-emerald-500/40 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="hidden sm:inline">Yenile</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                title="Araç Listesini Excel / CSV olarak indir"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 hover:border-cyan-500/40 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Dışa Aktar</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 active:scale-95 border border-emerald-400/30"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Araç Ekle</span>
              </button>
            </div>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 w-full flex-1">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-xs sm:text-sm text-emerald-200 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-medium">{toastMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-emerald-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Toplam Araç */}
            <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#0e1422] to-[#0a0d14] border border-white/10 hover:border-emerald-500/30 shadow-xl transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Toplam Filo
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Truck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">{stats.total}</span>
                <span className="text-xs text-gray-400">Araç Kayıtlı</span>
              </div>
              <div className="mt-2 text-[11px] text-emerald-400/90 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{stats.active} araç aktif durumda</span>
              </div>
            </div>

            {/* Muayene Durumu */}
            <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#0e1422] to-[#0a0d14] border border-white/10 hover:border-amber-500/30 shadow-xl transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Muayene Takip
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <FileCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {stats.muayeneUrgent}
                </span>
                <span className="text-xs text-gray-400">Yaklaşan / Süresi Biten</span>
              </div>
              <div className="mt-2 text-[11px] text-amber-400/90 flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>30 gün altı kritik takip</span>
              </div>
            </div>

            {/* Kasko Takip */}
            <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#0e1422] to-[#0a0d14] border border-white/10 hover:border-cyan-500/30 shadow-xl transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Kasko Poliçeleri
                </span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Shield className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {stats.kaskoUrgent}
                </span>
                <span className="text-xs text-gray-400">Kritik Poliçe</span>
              </div>
              <div className="mt-2 text-[11px] text-cyan-400/90 flex items-center gap-1 font-medium">
                <Shield className="w-3.5 h-3.5" />
                <span>Kasko yenileme kontrolü</span>
              </div>
            </div>

            {/* Sigorta Takip */}
            <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#0e1422] to-[#0a0d14] border border-white/10 hover:border-violet-500/30 shadow-xl transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Trafik Sigortası
                </span>
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {stats.sigortaUrgent}
                </span>
                <span className="text-xs text-gray-400">Yenileme Bekleyen</span>
              </div>
              <div className="mt-2 text-[11px] text-violet-400/90 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                <span>Zorunlu trafik sigortaları</span>
              </div>
            </div>
          </div>

          {/* SEARCH, FILTER AND CONTROLS */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Plaka, Marka, Model, Şoför veya Konum ile ara..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-black/40 border border-white/15 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterType === 'all'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                }`}
              >
                Tümü ({vehicles.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterType === 'active'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                }`}
              >
                Aktif Araçlar ({stats.active})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('muayene_urgent')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterType === 'muayene_urgent'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                }`}
              >
                Muayenesi Yaklaşanlar ({stats.muayeneUrgent})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('kasko_urgent')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterType === 'kasko_urgent'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                }`}
              >
                Kaskosu Yaklaşanlar ({stats.kaskoUrgent})
              </button>
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 whitespace-nowrap">Sırala:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-emerald-500/50"
              >
                <option value="id">Varsayılan (Sıra)</option>
                <option value="plaka">Plaka (A-Z)</option>
                <option value="marka">Marka (A-Z)</option>
                <option value="muayene">Muayene Tarihi (En Yakın)</option>
              </select>
            </div>
          </div>

          {/* MAIN EYE-CATCHING TABLE */}
          <div className="relative overflow-hidden rounded-3xl bg-[#0a0d14]/80 border border-white/10 shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-4 text-center w-12">#</th>
                    <th className="py-4 px-4 min-w-[160px]">PLAKA</th>
                    <th className="py-4 px-4 min-w-[180px]">MARKASI & MODELİ</th>
                    <th className="py-4 px-4 min-w-[180px]">TİCARİ ÜNVANI</th>
                    <th className="py-4 px-4 min-w-[140px]">BULUNDUĞU YER</th>
                    <th className="py-4 px-4 min-w-[140px]">KULLANICI</th>
                    <th className="py-4 px-4 min-w-[150px]">MUAYENE TARİHİ</th>
                    <th className="py-4 px-4 min-w-[150px]">KASKO TARİHİ</th>
                    <th className="py-4 px-4 min-w-[150px]">SİGORTA TARİHİ</th>
                    <th className="py-4 px-4 text-center min-w-[120px]">İŞLEMLER</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                          <span className="text-sm font-semibold">
                            Supabase aractakip tablosundan araçlar yükleniyor...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                            <Car className="w-7 h-7" />
                          </div>
                          <h3 className="text-base font-bold text-white">Araç Bulunamadı</h3>
                          <p className="text-xs text-gray-400 max-w-sm">
                            {searchQuery
                              ? `"${searchQuery}" aramasına uygun araç kaydı bulunamadı.`
                              : 'Henüz sisteme kayıtlı bir araç bulunmuyor. Yeni Araç Ekle butonuyla hemen ekleyebilirsiniz.'}
                          </p>
                          <button
                            type="button"
                            onClick={handleOpenAdd}
                            className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            <span>İlk Aracı Ekle</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((v, index) => (
                      <tr
                        key={v.id || index}
                        className="group hover:bg-white/[0.04] transition-colors duration-150"
                      >
                        {/* Row Number & Status */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                v.aktif !== false ? 'bg-emerald-400' : 'bg-gray-500'
                              }`}
                              title={v.aktif !== false ? 'Araç Aktif' : 'Araç Pasif'}
                            />
                            <span className="text-xs text-gray-500 font-mono font-bold">
                              {index + 1}
                            </span>
                          </div>
                        </td>

                        {/* PLAKA - Turkish License Plate Aesthetic */}
                        <td className="py-4 px-4">
                          <div
                            onClick={() => {
                              playClickSound();
                              setDetailVehicle(v);
                            }}
                            className="inline-flex items-center rounded-lg bg-neutral-900 border-2 border-neutral-700 shadow-md cursor-pointer hover:border-emerald-400/80 transition-all overflow-hidden group/plate select-none"
                            title="Detayları görüntülemek için tıklayın"
                          >
                            {/* Blue TR Band */}
                            <div className="bg-blue-700 px-1.5 py-1 flex flex-col items-center justify-between text-[9px] font-black text-white leading-none tracking-tighter">
                              <span className="opacity-80 text-[7px]">★</span>
                              <span className="font-extrabold tracking-tight">TR</span>
                            </div>
                            {/* License Plate Text */}
                            <div className="px-3 py-1 bg-gradient-to-b from-white to-gray-200 text-neutral-950 font-mono font-black text-sm tracking-wider uppercase group-hover/plate:text-black">
                              {v.plaka}
                            </div>
                          </div>
                        </td>

                        {/* MARKASI & MODELİ */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                              <Car className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-black text-white text-sm block tracking-tight">
                                {v.markasi || 'Bilinmiyor'}
                              </span>
                              <span className="text-xs text-gray-400 font-medium">
                                {v.modeli || '-'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* TİCARİ ÜNVANI */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-gray-200 line-clamp-1">
                              {v.ticari_unvani || 'Bayburt Özka İnşaat'}
                            </span>
                          </div>
                        </td>

                        {/* BULUNDUĞU YER */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="text-xs text-gray-300 font-medium">
                              {v.bulundugu_yer || 'Bayburt'}
                            </span>
                          </div>
                        </td>

                        {/* KULLANICI / ŞOFÖR */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-gray-300 text-[10px] font-bold">
                              {v.kullanici ? v.kullanici.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                            </div>
                            <span className="text-xs font-medium text-gray-200">
                              {v.kullanici || '-'}
                            </span>
                          </div>
                        </td>

                        {/* MUAYENE TARİHİ */}
                        <td className="py-4 px-4">{renderDateBadge(v.muayene_tarihi)}</td>

                        {/* KASKO TARİHİ */}
                        <td className="py-4 px-4">{renderDateBadge(v.kasko_tarihi)}</td>

                        {/* SİGORTA TARİHİ */}
                        <td className="py-4 px-4">{renderDateBadge(v.sigorta_tarihi)}</td>

                        {/* İŞLEMLER */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                playClickSound();
                                setDetailVehicle(v);
                              }}
                              title="Detay Görüntüle"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(v)}
                              title="Düzenle"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-300 hover:text-emerald-300 border border-transparent hover:border-emerald-500/30 transition-all active:scale-95"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteVehicle(v)}
                              title="Sil"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-300 hover:text-rose-300 border border-transparent hover:border-rose-500/30 transition-all active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 border-t border-white/10 bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span>
                  Toplam <b>{filteredVehicles.length}</b> araç listelendi.
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-emerald-400">Supabase aractakip tablosuyla anlık senkron</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => loadVehicles(true)}
                  className="hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 text-emerald-400" />
                  <span>Listeyi Yenile</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT VEHICLE MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl rounded-3xl bg-[#0e1422] border border-emerald-500/30 shadow-2xl p-6 sm:p-8 my-8 text-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {editingVehicle ? 'Aracı Düzenle' : 'Yeni Araç Kaydı'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      BAYBURT ÖZ-KA ARAÇ TAKİP SİSTEMİ (Supabase aractakip)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveVehicle} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* PLAKA */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <span>Plaka</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formPlaka}
                      onChange={(e) => setFormPlaka(e.target.value.toUpperCase())}
                      placeholder="Örn: 69 AAF 025"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-mono font-bold text-white placeholder-gray-500 outline-none uppercase"
                    />
                  </div>

                  {/* MARKASI */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300">Markası</label>
                    <input
                      type="text"
                      value={formMarkasi}
                      onChange={(e) => setFormMarkasi(e.target.value)}
                      placeholder="Örn: RENAULT, FORD, MERCEDES"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-gray-500 outline-none"
                    />
                  </div>

                  {/* MODELİ */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300">Modeli</label>
                    <input
                      type="text"
                      value={formModeli}
                      onChange={(e) => setFormModeli(e.target.value)}
                      placeholder="Örn: MEGANE, TRANSIT, ACTROS"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-gray-500 outline-none"
                    />
                  </div>

                  {/* TİCARİ ÜNVANI */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300">Ticari Ünvanı</label>
                    <input
                      type="text"
                      value={formTicariUnvani}
                      onChange={(e) => setFormTicariUnvani(e.target.value)}
                      placeholder="Örn: Bayburt Özka İnşaat"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-gray-500 outline-none"
                    />
                  </div>

                  {/* BULUNDUĞU YER */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300">Bulunduğu Yer / Şantiye</label>
                    <input
                      type="text"
                      value={formBulunduguYer}
                      onChange={(e) => setFormBulunduguYer(e.target.value)}
                      placeholder="Örn: Bayburt Merkez / Şantiye A"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-gray-500 outline-none"
                    />
                  </div>

                  {/* KULLANICI */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300">Kullanıcı / Şoför</label>
                    <input
                      type="text"
                      value={formKullanici}
                      onChange={(e) => setFormKullanici(e.target.value)}
                      placeholder="Örn: Emirhan"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-gray-500 outline-none"
                    />
                  </div>

                  {/* MUAYENE TARİHİ */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Muayene Bitiş Tarihi</span>
                    </label>
                    <input
                      type="date"
                      value={formMuayeneTarihi}
                      onChange={(e) => setFormMuayeneTarihi(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white outline-none"
                    />
                  </div>

                  {/* KASKO TARİHİ */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Kasko Bitiş Tarihi</span>
                    </label>
                    <input
                      type="date"
                      value={formKaskoTarihi}
                      onChange={(e) => setFormKaskoTarihi(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white outline-none"
                    />
                  </div>

                  {/* SİGORTA TARİHİ */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-violet-300 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Trafik Sigortası Bitiş Tarihi</span>
                    </label>
                    <input
                      type="date"
                      value={formSigortaTarihi}
                      onChange={(e) => setFormSigortaTarihi(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white outline-none"
                    />
                  </div>
                </div>

                {/* NOTLAR */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Ek Notlar / Açıklama</label>
                  <textarea
                    rows={2}
                    value={formNotlar}
                    onChange={(e) => setFormNotlar(e.target.value)}
                    placeholder="Araçla ilgili ek bilgiler, bakım notları..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-gray-500 outline-none resize-none"
                  />
                </div>

                {/* AKTİF Mİ */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="vehicle-active-check"
                    checked={formAktif}
                    onChange={(e) => setFormAktif(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500 bg-black/50"
                  />
                  <label htmlFor="vehicle-active-check" className="text-xs font-bold text-gray-200 cursor-pointer">
                    Araç aktif olarak filoda çalışıyor
                  </label>
                </div>

                {/* Modal Buttons */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all"
                  >
                    İptal
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingVehicle ? 'Güncellemeyi Kaydet' : 'Aracı Sisteme Ekle'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* VEHICLE DETAIL MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {detailVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-3xl bg-[#0e1422] border border-emerald-500/30 shadow-2xl p-6 sm:p-8 text-gray-100 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center rounded-lg bg-neutral-900 border-2 border-neutral-700 overflow-hidden">
                    <div className="bg-blue-700 px-1.5 py-1 text-[8px] font-black text-white">TR</div>
                    <div className="px-3 py-1 bg-white text-black font-mono font-black text-sm tracking-wider uppercase">
                      {detailVehicle.plaka}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {detailVehicle.markasi} {detailVehicle.modeli}
                    </h3>
                    <span className="text-xs text-gray-400">{detailVehicle.ticari_unvani}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailVehicle(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 space-y-3.5 text-xs">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Bulunduğu Yer:</span>
                  <span className="font-bold text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {detailVehicle.bulundugu_yer || 'Bayburt'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Kullanıcı / Şoför:</span>
                  <span className="font-bold text-white flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    {detailVehicle.kullanici || '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-200 font-medium">Muayene Tarihi:</span>
                  </div>
                  <div>{renderDateBadge(detailVehicle.muayene_tarihi)}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span className="text-cyan-200 font-medium">Kasko Tarihi:</span>
                  </div>
                  <div>{renderDateBadge(detailVehicle.kasko_tarihi)}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-violet-400" />
                    <span className="text-violet-200 font-medium">Trafik Sigortası:</span>
                  </div>
                  <div>{renderDateBadge(detailVehicle.sigorta_tarihi)}</div>
                </div>

                {detailVehicle.notlar && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                    <span className="text-gray-400 font-medium block mb-1">Notlar:</span>
                    <p className="text-gray-300 leading-relaxed">{detailVehicle.notlar}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailVehicle(null);
                    handleOpenEdit(detailVehicle);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Düzenle</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailVehicle(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white"
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
