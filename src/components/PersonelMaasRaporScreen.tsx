import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Download,
  Printer,
  Users,
  Banknote,
  Building2,
  Briefcase,
  Copy,
  Check,
  Edit3,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Filter,
  FileText,
  Wallet,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import {
  fetchPersonelGorevler,
  updatePersonelGorev,
  insertPersonelGorev,
  deletePersonelGorev,
  fetchSantiyeIsimleriFromSupabase,
  PersonelGorevRow,
  SupabaseSantiyeRow,
} from '../lib/supabase';
import { generateSantiyeMaasPdf } from '../utils/personelMaasPdf';

interface PersonelMaasRaporScreenProps {
  onBack: () => void;
  playClickSound?: () => void;
  darkMode?: boolean;
  onOpenPersonelOdemeTalepleri?: () => void;
}

export const PersonelMaasRaporScreen: React.FC<PersonelMaasRaporScreenProps> = ({
  onBack,
  playClickSound = () => {},
  darkMode = true,
  onOpenPersonelOdemeTalepleri,
}) => {
  const [data, setData] = useState<PersonelGorevRow[]>([]);
  const [santiyeler, setSantiyeler] = useState<SupabaseSantiyeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSantiye, setSelectedSantiye] = useState<string>('ALL');
  const [selectedGorev, setSelectedGorev] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'salary_desc' | 'salary_asc' | 'santiye'>('name_asc');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeViewMode, setActiveViewMode] = useState<'personel' | 'santiye_icmali'>('personel');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedTc, setCopiedTc] = useState<string | null>(null);

  // Edit / Add Modal
  const [editingItem, setEditingItem] = useState<PersonelGorevRow | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [formTc, setFormTc] = useState('');
  const [formAdSoyad, setFormAdSoyad] = useState('');
  const [formGorev, setFormGorev] = useState('');
  const [formMaas, setFormMaas] = useState('');
  const [formSantiye, setFormSantiye] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<PersonelGorevRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // PDF Modal & State
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [showSantiyePdfModal, setShowSantiyePdfModal] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDownloadSantiyePdf = async (santiyeTarget?: string) => {
    playClickSound();
    const targetName = (santiyeTarget !== undefined ? santiyeTarget : selectedSantiye).trim();
    if (!targetName || targetName === 'ALL') {
      setShowSantiyePdfModal(true);
      return;
    }

    let targetPersoneller: PersonelGorevRow[] = [];
    let displayTitle = targetName;

    if (targetName === 'EMPTY') {
      targetPersoneller = data.filter((d) => !d.santiyesi || !d.santiyesi.trim());
      displayTitle = 'Şantiyesi Belirtilmemiş Personeller';
    } else {
      targetPersoneller = data.filter(
        (d) => (d.santiyesi || '').trim().toLowerCase() === targetName.toLowerCase()
      );
    }

    if (targetPersoneller.length === 0) {
      alert(`"${displayTitle}" için kayıtlı personel bulunamadı.`);
      return;
    }

    setIsPdfGenerating(true);
    showToast(`⏳ "${displayTitle}" PDF raporu hazırlanıyor...`);

    try {
      const res = await generateSantiyeMaasPdf(targetPersoneller, {
        santiyeAdi: displayTitle,
        companyName: 'BAYBURT ÖZ-KA İNŞ.İTH.İHR.TİC.LTD.ŞTİ',
        autoDownload: true,
      });
      showToast(`✓ "${displayTitle}" için ${res.totalCount} personelli PDF raporu indirildi!`);
      setShowSantiyePdfModal(false);
    } catch (err: any) {
      console.error('PDF üretme hatası:', err);
      alert('PDF oluşturulurken bir hata oluştu: ' + (err.message || String(err)));
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleDownloadAllPdf = async () => {
    playClickSound();
    if (data.length === 0) {
      alert('Listelenecek personel kaydı bulunmuyor.');
      return;
    }

    setIsPdfGenerating(true);
    showToast('⏳ Tüm şantiyeler genel PDF raporu hazırlanıyor...');

    try {
      const res = await generateSantiyeMaasPdf(data, {
        santiyeAdi: 'TÜM ŞANTİYELER GENEL İCMALİ',
        companyName: 'BAYBURT ÖZ-KA İNŞ.İTH.İHR.TİC.LTD.ŞTİ',
        autoDownload: true,
      });
      showToast(`✓ Tüm şantiyeler için ${res.totalCount} personelli PDF raporu indirildi!`);
      setShowSantiyePdfModal(false);
    } catch (err: any) {
      console.error('PDF üretme hatası:', err);
      alert('PDF oluşturulurken bir hata oluştu: ' + (err.message || String(err)));
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const loadData = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
      playClickSound();
    } else {
      setLoading(true);
    }

    try {
      const [gorevRes, santiyeRes] = await Promise.all([
        fetchPersonelGorevler(),
        fetchSantiyeIsimleriFromSupabase(),
      ]);
      setData(gorevRes);
      setSantiyeler(santiyeRes);
      if (isManual) {
        showToast(`✓ ${gorevRes.length} personel kaydı başarıyla güncellendi.`);
      }
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
      showToast('⚠️ Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const formatTRY = (amount?: number | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0,00 ₺';
    return (
      new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ' ₺'
    );
  };

  // Distinct Görevler
  const uniqueGorevler = useMemo(() => {
    const set = new Set<string>();
    data.forEach((d) => {
      if (d.gorevi && d.gorevi.trim()) {
        set.add(d.gorevi.trim());
      }
    });
    return Array.from(set).sort();
  }, [data]);

  // Distinct Şantiyeler (from both santiyeisimleri and personel data)
  const uniqueSantiyeler = useMemo(() => {
    const set = new Set<string>();
    santiyeler.forEach((s) => {
      if (s.Santiyeadı && s.Santiyeadı.trim()) set.add(s.Santiyeadı.trim());
    });
    data.forEach((d) => {
      if (d.santiyesi && d.santiyesi.trim()) set.add(d.santiyesi.trim());
    });
    return Array.from(set).sort();
  }, [santiyeler, data]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = data.length;
    let totalSalary = 0;
    let withSiteCount = 0;

    data.forEach((d) => {
      const salary = Number(d.mevcut_maasi) || 0;
      totalSalary += salary;
      if (d.santiyesi && d.santiyesi.trim()) {
        withSiteCount++;
      }
    });

    const avgSalary = totalCount > 0 ? totalSalary / totalCount : 0;
    const withoutSiteCount = totalCount - withSiteCount;

    return {
      totalCount,
      totalSalary,
      avgSalary,
      withSiteCount,
      withoutSiteCount,
    };
  }, [data]);

  // Şantiye bazlı icmal ve dağılım tablosu verileri
  const santiyeSummaryList = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        displayName: string;
        personeller: PersonelGorevRow[];
        totalSalary: number;
        uniqueGorevler: Set<string>;
      }
    >();

    // Supabase'den gelen tüm şantiyeleri başlat
    uniqueSantiyeler.forEach((s) => {
      map.set(s.toLowerCase(), {
        name: s,
        displayName: s,
        personeller: [],
        totalSalary: 0,
        uniqueGorevler: new Set(),
      });
    });

    let unassignedPersoneller: PersonelGorevRow[] = [];
    let unassignedSalary = 0;
    const unassignedGorevler = new Set<string>();

    data.forEach((p) => {
      const site = (p.santiyesi || '').trim();
      const salary = Number(p.mevcut_maasi) || 0;
      const gorev = (p.gorevi || '').trim();

      if (!site) {
        unassignedPersoneller.push(p);
        unassignedSalary += salary;
        if (gorev) unassignedGorevler.add(gorev);
      } else {
        const key = site.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            name: site,
            displayName: site,
            personeller: [],
            totalSalary: 0,
            uniqueGorevler: new Set(),
          });
        }
        const entry = map.get(key)!;
        entry.personeller.push(p);
        entry.totalSalary += salary;
        if (gorev) entry.uniqueGorevler.add(gorev);
      }
    });

    const list = Array.from(map.values())
      .filter((item) => item.personeller.length > 0)
      .map((item) => ({
        ...item,
        personelCount: item.personeller.length,
        avgSalary: item.personeller.length > 0 ? item.totalSalary / item.personeller.length : 0,
        gorevCount: item.uniqueGorevler.size,
        topGorevler: Array.from(item.uniqueGorevler).slice(0, 3),
      }))
      .sort((a, b) => b.totalSalary - a.totalSalary);

    if (unassignedPersoneller.length > 0) {
      list.push({
        name: 'EMPTY',
        displayName: 'Şantiyesi Belirtilmemiş',
        personeller: unassignedPersoneller,
        totalSalary: unassignedSalary,
        avgSalary: unassignedSalary / unassignedPersoneller.length,
        uniqueGorevler: unassignedGorevler,
        personelCount: unassignedPersoneller.length,
        gorevCount: unassignedGorevler.size,
        topGorevler: Array.from(unassignedGorevler).slice(0, 3),
      });
    }

    return list;
  }, [data, uniqueSantiyeler]);

  // Filtered & Sorted Data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((d) => {
        const name = (d.personel_adi || '').toLowerCase();
        const tc = (d.tcno || '').toLowerCase();
        const gorev = (d.gorevi || '').toLowerCase();
        const santiye = (d.santiyesi || '').toLowerCase();
        return (
          name.includes(q) ||
          tc.includes(q) ||
          gorev.includes(q) ||
          santiye.includes(q)
        );
      });
    }

    // Santiye filter
    if (selectedSantiye === 'EMPTY') {
      result = result.filter((d) => !d.santiyesi || !d.santiyesi.trim());
    } else if (selectedSantiye !== 'ALL') {
      result = result.filter(
        (d) => (d.santiyesi || '').trim().toLowerCase() === selectedSantiye.toLowerCase()
      );
    }

    // Gorev filter
    if (selectedGorev !== 'ALL') {
      result = result.filter(
        (d) => (d.gorevi || '').trim().toLowerCase() === selectedGorev.toLowerCase()
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return (a.personel_adi || '').localeCompare(b.personel_adi || '', 'tr');
      }
      if (sortBy === 'name_desc') {
        return (b.personel_adi || '').localeCompare(a.personel_adi || '', 'tr');
      }
      if (sortBy === 'salary_desc') {
        return (Number(b.mevcut_maasi) || 0) - (Number(a.mevcut_maasi) || 0);
      }
      if (sortBy === 'salary_asc') {
        return (Number(a.mevcut_maasi) || 0) - (Number(b.mevcut_maasi) || 0);
      }
      if (sortBy === 'santiye') {
        return (a.santiyesi || '').localeCompare(b.santiyesi || '', 'tr');
      }
      return 0;
    });

    return result;
  }, [data, searchQuery, selectedSantiye, selectedGorev, sortBy]);

  // Filtered statistics
  const filteredStats = useMemo(() => {
    const totalSalary = filteredData.reduce((acc, curr) => acc + (Number(curr.mevcut_maasi) || 0), 0);
    return {
      count: filteredData.length,
      totalSalary,
      avgSalary: filteredData.length > 0 ? totalSalary / filteredData.length : 0,
    };
  }, [filteredData]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const pagedData = useMemo(() => {
    if (pageSize >= 9999) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSantiye, selectedGorev, sortBy, pageSize]);

  const handleCopyTc = (tc?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!tc) return;
    navigator.clipboard.writeText(tc).then(() => {
      setCopiedTc(tc);
      setTimeout(() => setCopiedTc(null), 2000);
      showToast(`✓ TC Kimlik No (${tc}) kopyalandı.`);
    });
  };

  const handleOpenEdit = (item: PersonelGorevRow) => {
    playClickSound();
    setEditingItem(item);
    setFormTc(item.tcno || '');
    setFormAdSoyad(item.personel_adi || '');
    setFormGorev(item.gorevi || '');
    setFormMaas(item.mevcut_maasi ? String(item.mevcut_maasi) : '');
    setFormSantiye(item.santiyesi || '');
  };

  const handleOpenNew = () => {
    playClickSound();
    setIsNewModalOpen(true);
    setFormTc('');
    setFormAdSoyad('');
    setFormGorev('');
    setFormMaas('');
    setFormSantiye('');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!formAdSoyad.trim()) {
      alert('Lütfen personel adını ve soyadını giriniz.');
      return;
    }
    setIsSubmitting(true);
    try {
      const maasNum = parseFloat(formMaas.replace(/\./g, '').replace(',', '.')) || 0;
      const res = await updatePersonelGorev(editingItem.id, {
        tcno: formTc.trim(),
        personel_adi: formAdSoyad.trim().toUpperCase(),
        gorevi: formGorev.trim(),
        mevcut_maasi: maasNum,
        santiyesi: formSantiye.trim(),
      });

      if (res.success) {
        setData((prev) =>
          prev.map((p) =>
            p.id === editingItem.id
              ? {
                  ...p,
                  tcno: formTc.trim(),
                  personel_adi: formAdSoyad.trim().toUpperCase(),
                  gorevi: formGorev.trim(),
                  mevcut_maasi: maasNum,
                  santiyesi: formSantiye.trim(),
                  updated_at: new Date().toISOString(),
                }
              : p
          )
        );
        showToast(`✓ ${formAdSoyad.trim().toUpperCase()} kaydı güncellendi.`);
        setEditingItem(null);
      } else {
        alert('Güncelleme sırasında hata: ' + (res.error || 'Bilinmeyen hata'));
      }
    } catch (err: any) {
      alert('İşlem hatası: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNew = async () => {
    if (!formAdSoyad.trim()) {
      alert('Lütfen personel adını ve soyadını giriniz.');
      return;
    }
    setIsSubmitting(true);
    try {
      const maasNum = parseFloat(formMaas.replace(/\./g, '').replace(',', '.')) || 0;
      const res = await insertPersonelGorev({
        tcno: formTc.trim() || '11111111111',
        personel_adi: formAdSoyad.trim().toUpperCase(),
        gorevi: formGorev.trim(),
        mevcut_maasi: maasNum,
        santiyesi: formSantiye.trim(),
      });

      if (res.success && res.data) {
        setData((prev) => [res.data!, ...prev]);
        showToast(`✓ Yeni personel "${formAdSoyad.trim().toUpperCase()}" eklendi.`);
        setIsNewModalOpen(false);
      } else {
        alert('Kayıt ekleme hatası: ' + (res.error || 'Bilinmeyen hata'));
      }
    } catch (err: any) {
      alert('İşlem hatası: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deletePersonelGorev(deleteTarget.id);
      if (res.success) {
        setData((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        showToast(`✓ ${deleteTarget.personel_adi} kaydı silindi.`);
        setDeleteTarget(null);
      } else {
        alert('Silme sırasında hata: ' + (res.error || 'Bilinmeyen hata'));
      }
    } catch (err: any) {
      alert('Silme hatası: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to CSV/Excel
  const handleExportCSV = () => {
    playClickSound();
    if (filteredData.length === 0) {
      alert('Dışa aktarılacak kayıt bulunmuyor.');
      return;
    }

    const headers = ['Sıra No', 'TC Kimlik No', 'Personel Adı Soyadı', 'Görevi', 'Şantiyesi', 'Mevcut Maaşı (TL)'];
    const rows = filteredData.map((d, index) => [
      index + 1,
      `="${d.tcno || ''}"`,
      `"${(d.personel_adi || '').replace(/"/g, '""')}"`,
      `"${(d.gorevi || '').replace(/"/g, '""')}"`,
      `"${(d.santiyesi || '').replace(/"/g, '""')}"`,
      Number(d.mevcut_maasi) || 0,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `ozka_personel_maas_raporu_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Excel (CSV) raporu indirildi.');
  };

  const handlePrint = () => {
    playClickSound();
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* TOP HEADER */}
        <header className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onBack();
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all flex items-center gap-2 group"
                title="Geri Dön"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-xs font-bold hidden sm:inline">Geri</span>
              </button>

              <div className="h-6 w-px bg-white/10 hidden sm:block" />

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                      <span>PERSONEL MAAŞ & GÖREV RAPORU</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {data.length} Personel
                      </span>
                    </h1>

                    {/* PERSONEL MAAŞ YANINDAKİ BUTON: PERSONEL ÖDEME TALEPLERİ */}
                    {onOpenPersonelOdemeTalepleri && (
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          onOpenPersonelOdemeTalepleri();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/30 border border-amber-300 active:scale-95 cursor-pointer ring-2 ring-amber-400/40 animate-pulse hover:animate-none"
                        title="Personel Avans ve Ödeme Talepleri Paneline Geç"
                      >
                        <Wallet className="w-3.5 h-3.5 text-slate-950" />
                        <span className="tracking-tight uppercase">PERSONEL ÖDEME TALEPLERİ</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-950" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Özka İnşaat • public.personelgorev Veri Tabanı İcmal Listesi
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={refreshing || loading}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1.5"
                title="Supabase'den Yenile"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
                <span className="hidden md:inline">Yenile</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5"
                title="Excel (CSV) İndir"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Excel İndir</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedSantiye !== 'ALL') {
                    handleDownloadSantiyePdf(selectedSantiye);
                  } else {
                    setShowSantiyePdfModal(true);
                  }
                }}
                disabled={isPdfGenerating}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                title="Şantiyeye Göre Gruplandırılmış PDF Maaş Raporu İndir"
              >
                {isPdfGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                <span>
                  {selectedSantiye !== 'ALL' && selectedSantiye !== 'EMPTY'
                    ? `${selectedSantiye} PDF İndir`
                    : 'Şantiye PDF İndir'}
                </span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1.5"
                title="Yazdır"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Yazdır</span>
              </button>

              {onOpenPersonelOdemeTalepleri && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onOpenPersonelOdemeTalepleri();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/30 flex items-center gap-1.5 active:scale-95 cursor-pointer border border-amber-300"
                  title="Personel Avans ve Ödeme Talepleri Portalı"
                >
                  <Wallet className="w-3.5 h-3.5 text-slate-950" />
                  <span>PERSONEL ÖDEME TALEPLERİ</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenNew}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Personel</span>
              </button>
            </div>
          </div>
        </header>

        {/* TOAST MESSAGE */}
        {toastMessage && (
          <div className="fixed top-16 right-4 z-50 p-3.5 rounded-2xl bg-purple-950/90 border border-purple-500/40 text-xs text-purple-200 flex items-center gap-2.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 py-5 flex-1 w-full space-y-4">
          {/* PERSONEL MAAŞ VE ÖDEME TALEPLERİ HIZLI GEÇİŞ ÇUBUĞU */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900/80 to-amber-950/60 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-xs">
                <span className="text-purple-300 font-bold">Aktif Sayfa:</span>{' '}
                <span className="text-white font-extrabold tracking-wide">PERSONEL MAAŞ & GÖREV RAPORU</span>
                <span className="text-gray-400 ml-2 hidden md:inline">({data.length} Personel Kaydı)</span>
              </div>
            </div>

            {onOpenPersonelOdemeTalepleri && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onOpenPersonelOdemeTalepleri();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 border border-amber-300 active:scale-95 cursor-pointer ring-2 ring-amber-400/40"
                title="Personel Avans ve Ödeme Talepleri Paneline Geç"
              >
                <Wallet className="w-4 h-4 text-slate-950" />
                <span className="tracking-wide uppercase">PERSONEL ÖDEME TALEPLERİ</span>
                <ChevronRight className="w-4 h-4 text-slate-950" />
              </button>
            )}
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Toplam Personel */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Toplam Personel
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  {stats.totalCount}
                </div>
                <div className="text-[10px] text-purple-400 mt-0.5 font-medium">
                  {stats.withSiteCount} şantiyesi tanımlı
                </div>
              </div>
            </div>

            {/* Card 2: Toplam Aylık Maaş Tutarı */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-purple-500/20 backdrop-blur-md shadow-lg flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Toplam Aylık Bordro
                </div>
                <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5 truncate">
                  {formatTRY(stats.totalSalary)}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Tüm personeller icmali
                </div>
              </div>
            </div>

            {/* Card 3: Ortalama Maaş */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Ortalama Maaş
                </div>
                <div className="text-lg sm:text-xl font-black text-blue-300 mt-0.5 truncate">
                  {formatTRY(stats.avgSalary)}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Kişi başı aylık ortalama
                </div>
              </div>
            </div>

            {/* Card 4: Şantiye Dağılımı */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Şantiye Durumu
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">
                  {uniqueSantiyeler.length} Şantiye
                </div>
                <div className="text-[10px] text-amber-400/80 mt-0.5 font-medium">
                  {stats.withoutSiteCount > 0 ? `${stats.withoutSiteCount} şantiyesiz bekleyen` : 'Tümü şantiyelere dağıtılmış'}
                </div>
              </div>
            </div>
          </div>

          {/* SEÇİLİ ŞANTİYE ÖZEL PDF İNDİR BANNERI */}
          {selectedSantiye !== 'ALL' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/70 via-purple-950/70 to-amber-950/70 border border-rose-500/40 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/30">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-rose-300 uppercase tracking-wider">
                      Seçili Şantiye Raporu
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-200 text-[10px] font-bold border border-rose-500/30">
                      {filteredData.length} Personel
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                    {selectedSantiye === 'EMPTY' ? 'Şantiyesi Belirtilmemiş Personeller' : selectedSantiye}
                  </h3>
                  <p className="text-xs text-gray-300">
                    Toplam Aylık Bordro: <strong className="text-emerald-400 font-bold">{formatTRY(filteredStats.totalSalary)}</strong> • Görevlerine göre renkli gruplandırılmış resmi PDF çıktısı
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedSantiye('ALL')}
                  className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-300 hover:text-white transition-all shrink-0"
                  title="Filtreyi Temizle"
                >
                  Şantiye Filtresini Kaldır
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSantiyePdf(selectedSantiye)}
                  disabled={isPdfGenerating}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs shadow-lg shadow-rose-600/40 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isPdfGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>PDF Hazırlanıyor...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>PDF İNDİR (ŞANTİYE MAAŞ RAPORU)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* GÖRÜNÜM SEÇİM SEKMELERİ */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveViewMode('personel');
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeViewMode === 'personel'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Personel Listesi (Detaylı Tablo)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 text-purple-200">
                  {filteredData.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveViewMode('santiye_icmali');
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeViewMode === 'santiye_icmali'
                    ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-pink-600 text-white shadow-lg shadow-amber-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Şantiyeler Dağılım İcmal Tablosu</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 text-amber-200">
                  {santiyeSummaryList.length} Şantiye
                </span>
              </button>
            </div>

            <div className="text-xs text-gray-400 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSantiyePdfModal(true)}
                disabled={isPdfGenerating}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Şantiyeye Göre PDF Seç</span>
              </button>
            </div>
          </div>

          {/* GÖRÜNÜM 1: PERSONEL LİSTESİ */}
          {activeViewMode === 'personel' ? (
            <>
              {/* FILTERS & SEARCH BAR */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search Box */}
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Personel adı, T.C. kimlik, görev veya şantiye ara..."
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-xs sm:text-sm text-white placeholder-gray-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Şantiye Filtresi */}
              <div className="md:col-span-3">
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedSantiye}
                    onChange={(e) => setSelectedSantiye(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-xs text-white transition-colors cursor-pointer"
                  >
                    <option value="ALL" className="bg-[#140f1f] text-white">Tüm Şantiyeler ({uniqueSantiyeler.length})</option>
                    <option value="EMPTY" className="bg-[#140f1f] text-amber-300 font-bold">⚠️ Şantiyesi Atanmamışlar ({stats.withoutSiteCount})</option>
                    {uniqueSantiyeler.map((s) => (
                      <option key={s} value={s} className="bg-[#140f1f] text-white">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Görev Filtresi */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedGorev}
                    onChange={(e) => setSelectedGorev(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-xs text-white transition-colors cursor-pointer truncate"
                  >
                    <option value="ALL" className="bg-[#140f1f] text-white">Tüm Görevler</option>
                    {uniqueGorevler.map((g) => (
                      <option key={g} value={g} className="bg-[#140f1f] text-white truncate">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sıralama */}
              <div className="md:col-span-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-xs text-white transition-colors cursor-pointer"
                >
                  <option value="name_asc" className="bg-[#140f1f] text-white">İsim (A → Z)</option>
                  <option value="name_desc" className="bg-[#140f1f] text-white">İsim (Z → A)</option>
                  <option value="salary_desc" className="bg-[#140f1f] text-emerald-300">Maaş (En Yüksek)</option>
                  <option value="salary_asc" className="bg-[#140f1f] text-blue-300">Maaş (En Düşük)</option>
                  <option value="santiye" className="bg-[#140f1f] text-amber-300">Şantiye Adına Göre</option>
                </select>
              </div>
            </div>

            {/* Filter Sub-Bar & Active Info */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span>
                  Filtrelenen: <strong className="text-white">{filteredData.length}</strong> / {data.length} Personel
                </span>
                <span>•</span>
                <span>
                  Filtre Toplam Maaş: <strong className="text-emerald-400 font-bold">{formatTRY(filteredStats.totalSalary)}</strong>
                </span>
                <span>•</span>
                <span>
                  Filtre Ort: <strong className="text-blue-300">{formatTRY(filteredStats.avgSalary)}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span>Sayfa Başı:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white text-xs"
                >
                  <option value={25} className="bg-[#140f1f]">25</option>
                  <option value={50} className="bg-[#140f1f]">50</option>
                  <option value={100} className="bg-[#140f1f]">100</option>
                  <option value={9999} className="bg-[#140f1f]">Hepsi ({filteredData.length})</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-xl">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <p className="text-sm text-gray-400">Personel maaş ve görev listesi yükleniyor...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-sm font-semibold text-gray-300">Aradığınız kriterlere uygun personel bulunamadı.</p>
                <p className="text-xs text-gray-500">Arama terimini değiştirebilir veya filtreleri temizleyebilirsiniz.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04] text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                      <th className="py-3 px-3 sm:px-4 text-center w-12">#</th>
                      <th className="py-3 px-3 sm:px-4">T.C. KİMLİK NO</th>
                      <th className="py-3 px-3 sm:px-4">PERSONEL ADI SOYADI</th>
                      <th className="py-3 px-3 sm:px-4">GÖREVİ</th>
                      <th className="py-3 px-3 sm:px-4">ŞANTİYESİ</th>
                      <th className="py-3 px-3 sm:px-4 text-right">MEVCUT MAAŞI</th>
                      <th className="py-3 px-3 sm:px-4 text-center w-28">İŞLEMLER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-normal">
                    {pagedData.map((item, index) => {
                      const rowNum = (currentPage - 1) * pageSize + index + 1;
                      const hasSantiye = Boolean(item.santiyesi && item.santiyesi.trim());

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-white/[0.04] transition-colors group"
                        >
                          {/* Row Number */}
                          <td className="py-2.5 px-3 sm:px-4 text-center text-gray-500 font-mono text-xs">
                            {rowNum}
                          </td>

                          {/* TC No */}
                          <td className="py-2.5 px-3 sm:px-4 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-300 font-semibold">{item.tcno || '-'}</span>
                              {item.tcno && (
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyTc(item.tcno, e)}
                                  className="p-1 rounded text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="TC Kopyala"
                                >
                                  {copiedTc === item.tcno ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Adı Soyadı */}
                          <td className="py-2.5 px-3 sm:px-4 font-bold text-white tracking-wide">
                            <span className="group-hover:text-purple-300 transition-colors">
                              {item.personel_adi}
                            </span>
                          </td>

                          {/* Görevi */}
                          <td className="py-2.5 px-3 sm:px-4">
                            {item.gorevi ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[11px] font-medium max-w-xs truncate">
                                {item.gorevi}
                              </span>
                            ) : (
                              <span className="text-gray-500 italic text-xs">-</span>
                            )}
                          </td>

                          {/* Şantiyesi */}
                          <td className="py-2.5 px-3 sm:px-4">
                            {hasSantiye ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSantiye(item.santiyesi!.trim());
                                  showToast(`"${item.santiyesi}" şantiyesine göre filtrelendi.`);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 hover:border-amber-500/50 text-xs font-semibold transition-all group/sbadge"
                                title={`"${item.santiyesi}" şantiyesine göre filtrele`}
                              >
                                <Building2 className="w-3 h-3 text-amber-400 shrink-0 group-hover/sbadge:scale-110 transition-transform" />
                                <span className="truncate max-w-[190px]">{item.santiyesi}</span>
                                <Filter className="w-2.5 h-2.5 opacity-0 group-hover/sbadge:opacity-100 transition-opacity text-amber-300" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-300 border border-dashed border-white/20 hover:border-amber-500/40 text-[11px] transition-all"
                                title="Şantiye Ata"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Şantiye Ata</span>
                              </button>
                            )}
                          </td>

                          {/* Mevcut Maaşı */}
                          <td className="py-2.5 px-3 sm:px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                            {formatTRY(item.mevcut_maasi)}
                          </td>

                          {/* İşlemler */}
                          <td className="py-2.5 px-3 sm:px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 rounded-lg text-purple-400 hover:text-white hover:bg-purple-600/30 border border-purple-500/20 transition-all"
                                title="Düzenle / Şantiye Ata"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600/30 border border-rose-500/20 transition-all"
                                title="Sil"
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

            {/* PAGINATION BAR */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 bg-white/[0.02]">
                <div>
                  Toplam <strong className="text-white">{filteredData.length}</strong> kayıttan{' '}
                  <strong className="text-white">
                    {(currentPage - 1) * pageSize + 1} -{' '}
                    {Math.min(currentPage * pageSize, filteredData.length)}
                  </strong>{' '}
                  arası gösteriliyor
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-200 font-bold">
                    Sayfa {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
            </>
          ) : (
            /* GÖRÜNÜM 2: ŞANTİYELER DAĞILIM İCMAL TABLOSU */
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-xl">
              <div className="p-4 border-b border-white/10 bg-white/[0.03] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                      <span>ŞANTİYELER PERSONEL VE MAAŞ DAĞILIM İCMAL TABLOSU</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        {santiyeSummaryList.length} Şantiye Sahası
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Tüm şantiyelerin personel sayısı, pozisyon çeşitliliği, toplam aylık bordro yükü ve tek tıkla resmi renkli PDF raporu
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadAllPdf}
                    disabled={isPdfGenerating}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tüm Şantiyeler Genel PDF İndir</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04] text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                      <th className="py-3 px-4 text-center w-12">#</th>
                      <th className="py-3 px-4">ŞANTİYE SAHASI / ADI</th>
                      <th className="py-3 px-4 text-center">PERSONEL SAYISI</th>
                      <th className="py-3 px-4">GÖREV DAĞILIMI</th>
                      <th className="py-3 px-4 text-right">AYLIK TOPLAM BORDRO</th>
                      <th className="py-3 px-4 text-right">ORTALAMA MAAŞ</th>
                      <th className="py-3 px-4 text-center w-56">RAPOR & İŞLEMLER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-normal">
                    {santiyeSummaryList.map((siteItem, idx) => {
                      const isUnassigned = siteItem.name === 'EMPTY';
                      return (
                        <tr key={siteItem.name} className="hover:bg-white/[0.04] transition-colors group">
                          {/* # */}
                          <td className="py-3 px-4 text-center text-gray-500 font-mono text-xs">{idx + 1}</td>

                          {/* Şantiye Adı */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isUnassigned
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                }`}
                              >
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                                  {siteItem.displayName}
                                </div>
                                <div className="text-[11px] text-gray-400">
                                  {isUnassigned ? 'Şantiye ataması bekleyen personeller' : 'Aktif Çalışma Sahası'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Personel Sayısı */}
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30 font-bold text-xs">
                              <Users className="w-3.5 h-3.5 text-purple-400" />
                              <span>{siteItem.personelCount} Kişi</span>
                            </span>
                          </td>

                          {/* Görev Dağılımı */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                                <Briefcase className="w-3 h-3 text-blue-400" />
                                <span>{siteItem.gorevCount} Farklı Görev Pozisyonu</span>
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {siteItem.topGorevler.map((g, gi) => (
                                  <span
                                    key={gi}
                                    className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 truncate max-w-[150px]"
                                  >
                                    {g}
                                  </span>
                                ))}
                                {siteItem.gorevCount > 3 && (
                                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-500">
                                    +{siteItem.gorevCount - 3} diğer
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Aylık Toplam Bordro */}
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-400 text-sm sm:text-base">
                            {formatTRY(siteItem.totalSalary)}
                          </td>

                          {/* Ortalama Maaş */}
                          <td className="py-3 px-4 text-right font-mono font-semibold text-blue-300 text-xs sm:text-sm">
                            {formatTRY(siteItem.avgSalary)}
                          </td>

                          {/* İşlemler */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSantiye(siteItem.name);
                                  setActiveViewMode('personel');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1"
                                title="Bu şantiyedeki personelleri incele"
                              >
                                <Users className="w-3.5 h-3.5 text-purple-400" />
                                <span>Personeller</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadSantiyePdf(siteItem.name)}
                                disabled={isPdfGenerating}
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 flex items-center gap-1 active:scale-95 disabled:opacity-50"
                                title="Bu şantiyenin görev bazlı renkli PDF raporunu indir"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>PDF İndir</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-white/20 bg-white/[0.06] font-bold text-xs sm:text-sm">
                      <td colSpan={2} className="py-3.5 px-4 text-white font-extrabold">
                        GENEL İCMAL TOPLAMI ({santiyeSummaryList.length} Şantiye)
                      </td>
                      <td className="py-3.5 px-4 text-center text-purple-300 font-black">
                        {stats.totalCount} Personel
                      </td>
                      <td className="py-3.5 px-4 text-gray-300 text-xs">
                        {uniqueGorevler.length} Farklı Görev Pozisyonu
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-400 text-base">
                        {formatTRY(stats.totalSalary)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-300">
                        {formatTRY(stats.avgSalary)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={handleDownloadAllPdf}
                          disabled={isPdfGenerating}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all flex items-center justify-center gap-1 active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Genel PDF İndir</span>
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* EDIT / NEW MODAL */}
      <AnimatePresence>
        {(editingItem || isNewModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setEditingItem(null);
                setIsNewModalOpen(false);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="relative z-10 w-full max-w-lg bg-[#140f1f] border border-purple-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {editingItem ? 'Personel & Maaş Bilgisi Düzenle' : 'Yeni Personel Tanımla'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Supabase <span className="font-mono text-purple-300">public.personelgorev</span> tablosu
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setIsNewModalOpen(false);
                  }}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                {/* T.C. Kimlik No */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    T.C. Kimlik No (11 Hane)
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={formTc}
                    onChange={(e) => setFormTc(e.target.value.replace(/\D/g, ''))}
                    placeholder="12345678901"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-white font-mono"
                  />
                </div>

                {/* Personel Adı Soyadı */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Personel Adı Soyadı <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formAdSoyad}
                    onChange={(e) => setFormAdSoyad(e.target.value)}
                    placeholder="Örn: AHMET YILMAZ"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-white font-bold"
                  />
                </div>

                {/* Görevi */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Görevi / Pozisyonu
                  </label>
                  <input
                    type="text"
                    value={formGorev}
                    onChange={(e) => setFormGorev(e.target.value)}
                    placeholder="Örn: 3123.06 - Şantiye Şefi-İnşaat -"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-white"
                  />
                </div>

                {/* Şantiyesi (Listbox / Seçim) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-300">
                      Şantiyesi (Görev Yeri)
                    </label>
                    <span className="text-[10px] text-amber-400">santiyeisimleri tablosundan</span>
                  </div>
                  <div className="space-y-1.5">
                    <select
                      value={formSantiye}
                      onChange={(e) => setFormSantiye(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-amber-500/30 focus:border-amber-400 focus:outline-none text-white text-xs cursor-pointer"
                    >
                      <option value="" className="bg-[#140f1f] text-gray-400">-- Şantiye Seçiniz (veya aşağıya elle yazınız) --</option>
                      {uniqueSantiyeler.map((s) => (
                        <option key={s} value={s} className="bg-[#140f1f] text-white">
                          {s}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={formSantiye}
                      onChange={(e) => setFormSantiye(e.target.value)}
                      placeholder="Şantiye adını doğrudan buraya da yazabilirsiniz..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-white text-xs"
                    />
                  </div>
                </div>

                {/* Mevcut Maaşı */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Mevcut Maaşı (TL)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={formMaas}
                      onChange={(e) => setFormMaas(e.target.value)}
                      placeholder="50000"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-white font-mono font-bold text-emerald-400"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                      ₺
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setIsNewModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={editingItem ? handleSaveEdit : handleSaveNew}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingItem ? 'Güncellemeyi Kaydet' : 'Personeli Ekle'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-md bg-[#160c14] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Personel Kaydını Sil</h3>
                  <p className="text-xs text-rose-300/80">Bu işlem geri alınamaz</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-sm font-bold text-white">{deleteTarget.personel_adi}</div>
                <div className="text-xs text-gray-400">TC: {deleteTarget.tcno || '-'}</div>
                <div className="text-xs text-gray-400">Görev: {deleteTarget.gorevi || '-'}</div>
                <div className="text-xs text-emerald-400 font-mono font-bold">
                  Maaş: {formatTRY(deleteTarget.mevcut_maasi)}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Silmeyi Onayla</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ŞANTİYE SEÇ & PDF İNDİR MODALI */}
      <AnimatePresence>
        {showSantiyePdfModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSantiyePdfModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="relative z-10 w-full max-w-2xl bg-[#120e1d] border border-purple-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/30">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      Şantiye Seçimi & PDF Maaş Raporu İndir
                    </h3>
                    <p className="text-xs text-gray-400">
                      Görevlerine göre renkli gruplandırılmış, ara toplamlı ve genel toplamlı resmi bordro çıktısı
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSantiyePdfModal(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* TÜM ŞANTİYELER GENEL İCMAL BUTONU */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-blue-900/40 border border-purple-500/30 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-purple-300">GENEL İCMAL ÇIKTISI</div>
                  <div className="text-sm font-black text-white">Tüm Şantiyeler ve Personeller ({data.length} Kişi)</div>
                  <div className="text-xs text-emerald-400 font-bold mt-0.5">
                    Toplam Bordro: {formatTRY(stats.totalSalary)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadAllPdf}
                  disabled={isPdfGenerating}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 shrink-0 active:scale-95 disabled:opacity-50"
                >
                  {isPdfGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>Genel PDF İndir</span>
                </button>
              </div>

              {/* ŞANTİYE LİSTESİ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400 px-1 font-semibold">
                  <span>ŞANTİYE ADI</span>
                  <span>PERSONEL & İŞLEM</span>
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {uniqueSantiyeler.map((sName) => {
                    const sPersoneller = data.filter(
                      (d) => (d.santiyesi || '').trim().toLowerCase() === sName.toLowerCase()
                    );
                    const sTotalSalary = sPersoneller.reduce(
                      (acc, curr) => acc + (Number(curr.mevcut_maasi) || 0),
                      0
                    );

                    return (
                      <div
                        key={sName}
                        className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-rose-500/40 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-xs sm:text-sm truncate group-hover:text-amber-300 transition-colors">
                              {sName}
                            </div>
                            <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                              <span>{sPersoneller.length} Personel</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-mono font-bold">
                                {formatTRY(sTotalSalary)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadSantiyePdf(sName)}
                          disabled={isPdfGenerating || sPersoneller.length === 0}
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0 active:scale-95 disabled:opacity-40"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>PDF İndir</span>
                        </button>
                      </div>
                    );
                  })}

                  {/* Şantiyesizler */}
                  {stats.withoutSiteCount > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-amber-200 text-xs sm:text-sm">
                            Şantiyesi Belirtilmemiş Personeller
                          </div>
                          <div className="text-[11px] text-amber-300/80">
                            {stats.withoutSiteCount} Personel
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadSantiyePdf('EMPTY')}
                        disabled={isPdfGenerating}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>PDF İndir</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSantiyePdfModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
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
