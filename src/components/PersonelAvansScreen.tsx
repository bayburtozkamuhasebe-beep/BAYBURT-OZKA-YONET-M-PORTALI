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
  Download,
  Trash2,
  Pencil,
  Sparkles,
  Database,
  Copy,
  Check,
  X,
  Layers,
  Users,
  Calendar,
  Building2,
  Wallet,
  CreditCard,
  Plus,
  Printer,
  ChevronDown,
  Eye,
  TrendingDown,
  TrendingUp,
  Banknote,
  Send,
  CheckCheck,
  FileSpreadsheet,
  Upload,
  FileUp,
  AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { OzkaLogo } from './OzkaLogo';
import {
  fetchPersonelOdemeTalepleri,
  insertPersonelOdemeTalebi,
  insertBatchPersonelOdemeTalepleri,
  updatePersonelOdemeTalebi,
  deletePersonelOdemeTalebi,
  fetchPersonelOdenenler,
  insertPersonelOdenen,
  insertBatchPersonelOdenenler,
  updatePersonelOdenen,
  deletePersonelOdenen,
  fetchPersonelOdemeOzet,
  fetchSantiyeIsimleriFromSupabase,
  fetchPersonelGorevler,
  extractSantiyeName,
  PersonelOdemeTalebiRow,
  PersonelOdenenRow,
  PersonelOdemeOzetRow,
  PERSONEL_ODEME_TALEBI_SQL_SETUP,
  bankSupabase,
} from '../lib/supabase';

interface PersonelAvansScreenProps {
  onBack: () => void;
  playClickSound?: () => void;
}

const SUPABASE_TALEP_URL =
  'https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/21236?schema=public/personelodemetalebi';

const SUPABASE_ODENEN_URL =
  'https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/21236?schema=public/personelodenen';

const formatTRY = (val?: number) => {
  if (val === undefined || val === null || isNaN(val)) return '0,00 ₺';
  return (
    new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val) + ' ₺'
  );
};

export const PersonelAvansScreen: React.FC<PersonelAvansScreenProps> = ({
  onBack,
  playClickSound = () => {},
}) => {
  // Aktif Görünüm Sekmesi: 'talepler' | 'odenenler' | 'ozet'
  const [activeTab, setActiveTab] = useState<'talepler' | 'odenenler' | 'ozet'>('talepler');

  // Veri Listeleri
  const [taleplerList, setTaleplerList] = useState<PersonelOdemeTalebiRow[]>([]);
  const [odenenlerList, setOdenenlerList] = useState<PersonelOdenenRow[]>([]);
  const [ozetList, setOzetList] = useState<PersonelOdemeOzetRow[]>([]);

  // Durumlar
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtreler & Arama
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSantiye, setSelectedSantiye] = useState('TÜMÜ');
  const [selectedDurum, setSelectedDurum] = useState('TÜMÜ');
  const [selectedOdemeGrubu, setSelectedOdemeGrubu] = useState('TÜMÜ');

  // Dinamik Şantiye Listesi
  const [santiyeListesi, setSantiyeListesi] = useState<string[]>([]);

  // Modallar
  const [showAddTalepModal, setShowAddTalepModal] = useState(false);
  const [showAddOdenenModal, setShowAddOdenenModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState<'talepler' | 'odenenler' | null>(null);
  const [bulkFileName, setBulkFileName] = useState('');
  const [parsedBulkRows, setParsedBulkRows] = useState<any[]>([]);
  const [isBulkParsing, setIsBulkParsing] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkParseError, setBulkParseError] = useState<string | null>(null);
  const [editTalepTarget, setEditTalepTarget] = useState<PersonelOdemeTalebiRow | null>(null);
  const [editOdenenTarget, setEditOdenenTarget] = useState<PersonelOdenenRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'talep' | 'odenen';
    id: number | string;
    label: string;
  } | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Form State: Talep
  const [formTc, setFormTc] = useState('');
  const [formAdSoyad, setFormAdSoyad] = useState('');
  const [formSantiye, setFormSantiye] = useState('');
  const [formOdemeGrubu, setFormOdemeGrubu] = useState('Ek Maaş');
  const [formTutar, setFormTutar] = useState('');
  const [formAciklama, setFormAciklama] = useState('');
  const [formDurum, setFormDurum] = useState('Beklesin');
  const [formDekontNo, setFormDekontNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ödeme Grubu Listesi
  const ODEME_GRUPLARI = [
    'Ek Maaş',
    'Harcırah',
    'Hafta Sonu',
    'Prim',
    'Arabulucu',
    'Yıllık İzin',
    'Diğer',
  ] as const;

  // Ödeme Grubu Rozeti
  const getOdemeGrubuBadge = (grup?: string) => {
    const g = (grup || '').toLowerCase().trim();
    if (g.includes('ek maaş') || g.includes('ek maas'))
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    if (g.includes('harcırah') || g.includes('harcirah'))
      return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
    if (g.includes('hafta sonu') || g.includes('haftasonu'))
      return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    if (g.includes('prim') || g.includes('ikramiye'))
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (g.includes('arabulucu'))
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    if (g.includes('yıllık izin') || g.includes('yillik izin') || g.includes('izin'))
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    if (g.includes('maaş') || g.includes('maas'))
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    if (g.includes('avans'))
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
  };

  // Durum bilgisi yardımcısı ('Ödensin' | 'Ödenmesin' | 'Beklesin')
  const getStatusInfo = (durum?: string) => {
    const norm = (durum || '').trim().toLowerCase();

    if (
      norm === 'ödenmesin' ||
      norm.includes('ödenme') ||
      norm.includes('red') ||
      norm.includes('iptal')
    ) {
      return {
        key: 'ödenmesin' as const,
        label: 'REDDEDİLDİ',
        badgeClass:
          'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/10',
        dotClass: 'bg-rose-400',
      };
    }

    if (
      norm === 'ödensin' ||
      norm === 'ödendi' ||
      norm.includes('onay') ||
      (norm.includes('öden') && !norm.includes('ödenme'))
    ) {
      return {
        key: 'ödensin' as const,
        label: norm === 'ödendi' ? 'ÖDENDİ' : 'ONAYLANDI',
        badgeClass:
          'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10',
        dotClass: 'bg-emerald-400',
      };
    }

    return {
      key: 'beklesin' as const,
      label: 'İNCELEMEDE / BEKLİYOR',
      badgeClass:
        'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10 animate-pulse',
      dotClass: 'bg-amber-400',
    };
  };

  // Hızlı Durum Değiştir (ödensin / ödenmesin / beklesin)
  const handleQuickStatusChange = async (
    talepId: number | string,
    newStatus: 'Ödensin' | 'Ödenmesin' | 'Beklesin'
  ) => {
    playClickSound();

    // Optimistik anlık güncelleme
    setTaleplerList((prev) =>
      prev.map((t) => (t.id === talepId ? { ...t, durum: newStatus } : t))
    );

    const statusTitle =
      newStatus === 'Ödensin'
        ? 'Onaylandı (Ödensin)'
        : newStatus === 'Ödenmesin'
        ? 'Reddedildi (Ödenmesin)'
        : 'İncelemeye alındı (Beklesin)';

    try {
      const res = await updatePersonelOdemeTalebi(talepId, { durum: newStatus });
      if (res.success) {
        showToast(`✓ Talep: ${statusTitle}`);
      } else {
        showToast(`⚠️ Durum güncellenemedi: ${res.error}`);
        loadAllData(false);
      }
    } catch {
      showToast('⚠️ Sunucu bağlantı hatası oluştu.');
      loadAllData(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Verileri Supabase'den Çekme
  const loadAllData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [taleplerRes, odenenlerRes, ozetRes] = await Promise.all([
        fetchPersonelOdemeTalepleri(),
        fetchPersonelOdenenler(),
        fetchPersonelOdemeOzet(),
      ]);

      setTaleplerList(taleplerRes);
      setOdenenlerList(odenenlerRes);
      setOzetList(ozetRes);

      // Şantiyeleri derle
      const sitesSet = new Set<string>();
      taleplerRes.forEach((t) => t.santiye && sitesSet.add(t.santiye.trim()));
      odenenlerRes.forEach((o) => o.santiye && sitesSet.add(o.santiye.trim()));

      // Ek şantiyeleri getir
      try {
        const [rawSites, gorevler] = await Promise.all([
          fetchSantiyeIsimleriFromSupabase(),
          fetchPersonelGorevler(),
        ]);
        rawSites.forEach((s) => {
          const clean = extractSantiyeName(s);
          if (clean) sitesSet.add(clean);
        });
        gorevler.forEach((g) => {
          if (g.santiye) sitesSet.add(g.santiye.trim());
        });
      } catch {
        // ignore
      }

      const sortedSites = Array.from(sitesSet).filter(Boolean).sort();
      setSantiyeListesi(sortedSites);

      if (isManualRefresh) {
        showToast('✓ Veriler başarıyla senkronize edildi.');
      }
    } catch (err) {
      console.error('Data load error:', err);
      showToast('⚠️ Veriler yüklenirken bağlantı sorunu oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData(false);

    // Realtime Dinleme
    const chTalep = bankSupabase
      .channel('personelodemetalebi_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personelodemetalebi' }, () => {
        loadAllData(false);
      })
      .subscribe();

    const chOdenen = bankSupabase
      .channel('personelodenen_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personelodenen' }, () => {
        loadAllData(false);
      })
      .subscribe();

    return () => {
      bankSupabase.removeChannel(chTalep);
      bankSupabase.removeChannel(chOdenen);
    };
  }, []);

  // İstatistikler (Memoized)
  const stats = useMemo(() => {
    const totalTalepTutari = taleplerList.reduce((acc, t) => acc + (t.talepedilen || 0), 0);
    const totalOdenenTutari = odenenlerList.reduce((acc, o) => acc + (o.odenen || 0), 0);
    const kalanBakiye = totalTalepTutari - totalOdenenTutari;
    const talepAdedi = taleplerList.length;
    const odenenAdedi = odenenlerList.length;
    const onayBekleyenler = taleplerList.filter((t) => {
      const d = (t.durum || '').toLowerCase();
      return (
        d.includes('bekle') ||
        d.includes('onay bek') ||
        (!d.includes('öden') && !d.includes('red') && !d.includes('iptal'))
      );
    }).length;

    return {
      totalTalepTutari,
      totalOdenenTutari,
      kalanBakiye,
      talepAdedi,
      odenenAdedi,
      onayBekleyenler,
    };
  }, [taleplerList, odenenlerList]);

  // Filtrelenmiş Talepler
  const filteredTalepler = useMemo(() => {
    return taleplerList.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (t.tckimlik || '').toLowerCase().includes(q) ||
        (t.adısyoyadı || t.adisoyadi || '').toLowerCase().includes(q) ||
        (t.santiye || '').toLowerCase().includes(q) ||
        (t.odemegrubu || t['ödemegrubu'] || '').toLowerCase().includes(q) ||
        (t.acıklama || t.aciklama || '').toLowerCase().includes(q);

      const matchSantiye = selectedSantiye === 'TÜMÜ' || (t.santiye || '').trim() === selectedSantiye;

      let matchDurum = true;
      if (selectedDurum !== 'TÜMÜ') {
        const d = (t.durum || '').toLowerCase().trim();
        if (selectedDurum === 'ödensin') {
          matchDurum =
            (d.includes('öden') && !d.includes('ödenme')) ||
            d.includes('onaylandı');
        } else if (selectedDurum === 'ödenmesin') {
          matchDurum =
            d.includes('ödenme') ||
            d.includes('red') ||
            d.includes('iptal');
        } else if (selectedDurum === 'beklesin') {
          matchDurum =
            d.includes('bekle') ||
            d.includes('onay bek') ||
            (!d.includes('öden') && !d.includes('red'));
        } else {
          matchDurum = d === selectedDurum.toLowerCase();
        }
      }

      const matchOdemeGrubu =
        selectedOdemeGrubu === 'TÜMÜ' ||
        (t.odemegrubu || t['ödemegrubu'] || 'Ek Maaş').trim().toLowerCase() ===
          selectedOdemeGrubu.toLowerCase();

      return matchSearch && matchSantiye && matchDurum && matchOdemeGrubu;
    });
  }, [taleplerList, searchQuery, selectedSantiye, selectedDurum, selectedOdemeGrubu]);

  // Filtrelenmiş Ödenenler
  const filteredOdenenler = useMemo(() => {
    return odenenlerList.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (o.tckimlik || '').toLowerCase().includes(q) ||
        (o.adısyoyadı || o.adisoyadi || '').toLowerCase().includes(q) ||
        (o.santiye || '').toLowerCase().includes(q) ||
        (o.dekont_no || '').toLowerCase().includes(q);

      const matchSantiye = selectedSantiye === 'TÜMÜ' || (o.santiye || '').trim() === selectedSantiye;

      return matchSearch && matchSantiye;
    });
  }, [odenenlerList, searchQuery, selectedSantiye]);

  // Filtrelenmiş Özet
  const filteredOzet = useMemo(() => {
    return ozetList.filter((z) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (z.tckimlik || '').toLowerCase().includes(q) ||
        (z.adisoyadi || '').toLowerCase().includes(q) ||
        (z.santiye || '').toLowerCase().includes(q);

      const matchSantiye = selectedSantiye === 'TÜMÜ' || (z.santiye || '').trim() === selectedSantiye;

      return matchSearch && matchSantiye;
    });
  }, [ozetList, searchQuery, selectedSantiye]);

  // Form Reset
  const resetForm = () => {
    setFormTc('');
    setFormAdSoyad('');
    setFormSantiye(selectedSantiye !== 'TÜMÜ' ? selectedSantiye : '');
    setFormOdemeGrubu('Ek Maaş');
    setFormTutar('');
    setFormAciklama('');
    setFormDurum('Beklesin');
    setFormDekontNo('');
    setIsSubmitting(false);
  };

  // Yeni Talep Kaydet
  const handleSaveNewTalep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTc.trim() || !formAdSoyad.trim() || !formTutar) {
      showToast('⚠️ Lütfen TC Kimlik, Ad Soyad ve Tutar alanlarını doldurunuz.');
      return;
    }

    playClickSound();
    setIsSubmitting(true);
    try {
      const res = await insertPersonelOdemeTalebi({
        tckimlik: formTc.trim(),
        adısyoyadı: formAdSoyad.trim(),
        santiye: formSantiye.trim(),
        talepedilen: parseFloat(formTutar.replace(',', '.')) || 0,
        odemegrubu: formOdemeGrubu.trim() || 'Ek Maaş',
        acıklama: formAciklama.trim(),
        durum: formDurum,
      });

      if (res.success) {
        showToast('✓ Ödeme talebi başarıyla kaydedildi.');
        setShowAddTalepModal(false);
        resetForm();
        loadAllData(false);
      } else {
        showToast(`⚠️ Kayıt hatası: ${res.error || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      showToast('⚠️ Sunucuya bağlanırken hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Yeni Ödeme Kaydet
  const handleSaveNewOdenen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTc.trim() || !formAdSoyad.trim() || !formTutar) {
      showToast('⚠️ Lütfen TC Kimlik, Ad Soyad ve Ödenen Tutar alanlarını doldurunuz.');
      return;
    }

    playClickSound();
    setIsSubmitting(true);
    try {
      const res = await insertPersonelOdenen({
        tckimlik: formTc.trim(),
        adısyoyadı: formAdSoyad.trim(),
        santiye: formSantiye.trim(),
        odenen: parseFloat(formTutar.replace(',', '.')) || 0,
        dekont_no: formDekontNo.trim(),
      });

      if (res.success) {
        showToast('✓ Ödeme kaydı başarıyla kaydedildi.');
        setShowAddOdenenModal(false);
        resetForm();
        loadAllData(false);
      } else {
        showToast(`⚠️ Kayıt hatası: ${res.error || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      showToast('⚠️ Sunucuya bağlanırken hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Talepten Hızlı Ödeme Aç
  const handleQuickPayFromTalep = (t: PersonelOdemeTalebiRow) => {
    playClickSound();
    setFormTc(t.tckimlik || '');
    setFormAdSoyad(t.adısyoyadı || t.adisoyadi || '');
    setFormSantiye(t.santiye || '');
    setFormTutar(t.talepedilen ? String(t.talepedilen) : '');
    setFormDekontNo('');
    setShowAddOdenenModal(true);
  };

  // Talep Güncelle
  const handleUpdateTalep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTalepTarget || !editTalepTarget.id) return;
    playClickSound();
    setIsSubmitting(true);
    try {
      const res = await updatePersonelOdemeTalebi(editTalepTarget.id, {
        tckimlik: formTc.trim(),
        adısyoyadı: formAdSoyad.trim(),
        santiye: formSantiye.trim(),
        talepedilen: parseFloat(formTutar.replace(',', '.')) || 0,
        odemegrubu: formOdemeGrubu.trim() || 'Ek Maaş',
        acıklama: formAciklama.trim(),
        durum: formDurum,
      });

      if (res.success) {
        showToast('✓ Ödeme talebi başarıyla güncellendi.');
        setEditTalepTarget(null);
        resetForm();
        loadAllData(false);
      } else {
        showToast(`⚠️ Güncelleme hatası: ${res.error}`);
      }
    } catch {
      showToast('⚠️ Sunucu hatası oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ödenen Güncelle
  const handleUpdateOdenen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOdenenTarget || !editOdenenTarget.id) return;
    playClickSound();
    setIsSubmitting(true);
    try {
      const res = await updatePersonelOdenen(editOdenenTarget.id, {
        tckimlik: formTc.trim(),
        adısyoyadı: formAdSoyad.trim(),
        santiye: formSantiye.trim(),
        odenen: parseFloat(formTutar.replace(',', '.')) || 0,
        dekont_no: formDekontNo.trim(),
      });

      if (res.success) {
        showToast('✓ Ödeme kaydı başarıyla güncellendi.');
        setEditOdenenTarget(null);
        resetForm();
        loadAllData(false);
      } else {
        showToast(`⚠️ Güncelleme hatası: ${res.error}`);
      }
    } catch {
      showToast('⚠️ Sunucu hatası oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Silme İşlemi
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    playClickSound();
    try {
      if (deleteTarget.type === 'talep') {
        const res = await deletePersonelOdemeTalebi(deleteTarget.id);
        if (res.success) {
          showToast('✓ Talep kaydı silindi.');
        } else {
          showToast(`⚠️ Silinemedi: ${res.error}`);
        }
      } else {
        const res = await deletePersonelOdenen(deleteTarget.id);
        if (res.success) {
          showToast('✓ Ödeme kaydı silindi.');
        } else {
          showToast(`⚠️ Silinemedi: ${res.error}`);
        }
      }
      setDeleteTarget(null);
      loadAllData(false);
    } catch {
      showToast('⚠️ Silme işlemi başarısız.');
    }
  };

  // CSV Excel Export
  const handleExportCSV = () => {
    playClickSound();
    let csvRows: string[] = [];

    if (activeTab === 'talepler') {
      csvRows.push(['ID', 'TC KIMLIK', 'ADI SOYADI', 'SANTIYE', 'ODEME GRUBU', 'TALEP EDILEN (TL)', 'DURUM', 'ACIKLAMA', 'TARIH'].join(';'));
      filteredTalepler.forEach((t) => {
        csvRows.push(
          [
            t.id,
            t.tckimlik,
            `"${t.adısyoyadı || t.adisoyadi || ''}"`,
            `"${t.santiye || ''}"`,
            `"${t.odemegrubu || t['ödemegrubu'] || 'Ek Maaş'}"`,
            t.talepedilen,
            `"${t.durum || ''}"`,
            `"${(t.acıklama || t.aciklama || '').replace(/"/g, '""')}"`,
            t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '',
          ].join(';')
        );
      });
    } else if (activeTab === 'odenenler') {
      csvRows.push(['ID', 'TC KIMLIK', 'ADI SOYADI', 'SANTIYE', 'ODENEN (TL)', 'DEKONT NO', 'ODEME TARIHI'].join(';'));
      filteredOdenenler.forEach((o) => {
        csvRows.push(
          [
            o.id,
            o.tckimlik,
            `"${o.adısyoyadı || o.adisoyadi || ''}"`,
            `"${o.santiye || ''}"`,
            o.odenen,
            `"${o.dekont_no || ''}"`,
            o.odeme_tarihi ? new Date(o.odeme_tarihi).toLocaleDateString('tr-TR') : '',
          ].join(';')
        );
      });
    } else {
      csvRows.push(['TC KIMLIK', 'ADI SOYADI', 'SANTIYE', 'TOPLAM TALEP (TL)', 'TOPLAM ODENEN (TL)', 'KALAN ODENECEK (TL)'].join(';'));
      filteredOzet.forEach((z) => {
        csvRows.push(
          [
            z.tckimlik,
            `"${z.adisoyadi || ''}"`,
            `"${z.santiye || ''}"`,
            z.toplam_talep,
            z.toplam_odenen,
            z.kalan_odenecek,
          ].join(';')
        );
      });
    }

    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Personel_${activeTab === 'talepler' ? 'Odeme_Talepleri' : activeTab === 'odenenler' ? 'Odenenler' : 'Bakiye_Ozet'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✓ Excel (CSV) dosyası indirildi.');
  };

  // Örnek Boş Excel Şablonu İndirme (Örnek verisiz - Sadece Başlık Sütunları)
  const handleDownloadSampleExcel = () => {
    playClickSound();

    if (activeTab === 'odenenler') {
      const fileName = 'Personel_Odenen_Sablonu.xlsx';
      const headers = [
        ['TC KIMLIK', 'ADI SOYADI', 'SANTIYE', 'ODENEN (TL)', 'DEKONT NO', 'ODEME TARIHI']
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(headers);
      ws['!cols'] = [
        { wch: 16 },
        { wch: 26 },
        { wch: 22 },
        { wch: 18 },
        { wch: 36 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Personel_Odenen');
      XLSX.writeFile(wb, fileName);
      showToast('✓ Personel Ödenen boş Excel şablonu indirildi (Örnek verisiz).');
    } else {
      const fileName = 'Personel_Odeme_Talebi_Sablonu.xlsx';
      const headers = [
        ['TC KIMLIK', 'ADI SOYADI', 'SANTIYE', 'ODEME GRUBU', 'TALEP EDILEN (TL)', 'ACIKLAMA', 'DURUM']
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(headers);
      ws['!cols'] = [
        { wch: 16 },
        { wch: 26 },
        { wch: 22 },
        { wch: 18 },
        { wch: 20 },
        { wch: 36 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Odeme_Talepleri');
      XLSX.writeFile(wb, fileName);
      showToast('✓ Personel Ödeme Talebi boş Excel şablonu indirildi (Örnek verisiz).');
    }
  };

  // Toplu Excel Yükleme Yardımcıları
  const resetBulkUpload = () => {
    setBulkFileName('');
    setParsedBulkRows([]);
    setIsBulkParsing(false);
    setIsBulkSaving(false);
    setBulkParseError(null);
  };

  const parseExcelAmount = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    let str = String(val).trim().replace(/\s/g, '');
    str = str.replace(/[₺TL$EUR]/gi, '').trim();
    if (str.includes(',') && str.includes('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
  };

  const formatExcelDate = (val: any): string => {
    if (!val) return new Date().toISOString().slice(0, 10);
    if (typeof val === 'number') {
      const date = new Date((val - (25567 + 2)) * 86400 * 1000);
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    }
    const str = String(val).trim();
    const parts = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if (parts) {
      const d = parts[1].padStart(2, '0');
      const m = parts[2].padStart(2, '0');
      const y = parts[3];
      return `${y}-${m}-${d}`;
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  };

  const handleBulkFileSelected = (file: File) => {
    setIsBulkParsing(true);
    setBulkParseError(null);
    setBulkFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rows || rows.length < 2) {
          setBulkParseError('Seçilen dosyada veri satırı bulunamadı. Lütfen ilk satır başlıklar ve sonraki satırlar veri olacak şekilde bir dosya seçiniz.');
          setParsedBulkRows([]);
          setIsBulkParsing(false);
          return;
        }

        const headerRow = rows[0].map((h: any) =>
          String(h || '').trim().toLowerCase().replace(/[İı]/g, 'i').replace(/[Öö]/g, 'o').replace(/[Üü]/g, 'u').replace(/[Çç]/g, 'c').replace(/[Şş]/g, 's')
        );

        const findCol = (keywords: string[]) => {
          return headerRow.findIndex((h: string) => keywords.some((k) => h.includes(k)));
        };

        const tcIdx = findCol(['tc', 'kimlik', 'tckimlik']);
        const adSoyadIdx = findCol(['ad', 'soyad', 'personel', 'isim']);
        const santiyeIdx = findCol(['santiye', 'proje', 'yer', 'lokasyon']);
        const grupIdx = findCol(['grup', 'tur', 'odeme']);
        const tutarIdx = findCol(['talep', 'odenen', 'tutar', 'tl', 'miktar']);
        const aciklamaIdx = findCol(['aciklama', 'dekont', 'not', 'neden']);
        const durumIdx = findCol(['durum', 'statu', 'onay']);
        const tarihIdx = findCol(['tarih', 'gun']);

        const isTalepler = showBulkModal === 'talepler';
        const parsed: any[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every((c: any) => String(c || '').trim() === '')) {
            continue;
          }

          const rawTc = String(tcIdx >= 0 ? row[tcIdx] : row[0] || '').trim().replace(/\D/g, '');
          const rawAdSoyad = String(adSoyadIdx >= 0 ? row[adSoyadIdx] : row[1] || '').trim().toUpperCase();
          const rawSantiye = String(santiyeIdx >= 0 ? row[santiyeIdx] : row[2] || '').trim().toUpperCase();
          const rawTutar = parseExcelAmount(tutarIdx >= 0 ? row[tutarIdx] : (isTalepler ? row[4] : row[3]));

          if (isTalepler) {
            let rawGrup = String(grupIdx >= 0 ? row[grupIdx] : row[3] || '').trim();
            const matchedGrup = ODEME_GRUPLARI.find(g => g.toLowerCase() === rawGrup.toLowerCase()) || rawGrup || 'Ek Maaş';
            const rawAciklama = String(aciklamaIdx >= 0 ? row[aciklamaIdx] : row[5] || '').trim();
            let rawDurum = String(durumIdx >= 0 ? row[durumIdx] : row[6] || '').trim();
            if (rawDurum.toLowerCase().includes('öden') && !rawDurum.toLowerCase().includes('ödenme')) {
              rawDurum = 'Ödensin';
            } else if (rawDurum.toLowerCase().includes('ödenme') || rawDurum.toLowerCase().includes('red')) {
              rawDurum = 'Ödenmesin';
            } else {
              rawDurum = 'Beklesin';
            }

            const isValid = rawAdSoyad.length > 0 && rawTutar > 0;
            let errorMsg = '';
            if (!rawAdSoyad) errorMsg = 'Ad Soyad eksik';
            else if (rawTutar <= 0) errorMsg = 'Tutar geçersiz veya 0';

            parsed.push({
              tckimlik: rawTc,
              adısyoyadı: rawAdSoyad,
              santiye: rawSantiye || (selectedSantiye !== 'TÜMÜ' ? selectedSantiye : 'MERKEZ'),
              odemegrubu: matchedGrup,
              talepedilen: rawTutar,
              acıklama: rawAciklama,
              durum: rawDurum,
              isValid,
              error: errorMsg,
            });
          } else {
            const rawDekont = String(aciklamaIdx >= 0 ? row[aciklamaIdx] : row[4] || '').trim();
            const rawTarih = formatExcelDate(tarihIdx >= 0 ? row[tarihIdx] : row[5]);

            const isValid = rawAdSoyad.length > 0 && rawTutar > 0;
            let errorMsg = '';
            if (!rawAdSoyad) errorMsg = 'Ad Soyad eksik';
            else if (rawTutar <= 0) errorMsg = 'Tutar geçersiz veya 0';

            parsed.push({
              tckimlik: rawTc,
              adısyoyadı: rawAdSoyad,
              santiye: rawSantiye || (selectedSantiye !== 'TÜMÜ' ? selectedSantiye : 'MERKEZ'),
              odenen: rawTutar,
              dekont_no: rawDekont,
              odeme_tarihi: rawTarih,
              isValid,
              error: errorMsg,
            });
          }
        }

        if (parsed.length === 0) {
          setBulkParseError('Dosyada geçerli veri satırı bulunamadı.');
        }

        setParsedBulkRows(parsed);
      } catch (err: any) {
        setBulkParseError('Excel dosyası okunurken hata oluştu: ' + (err?.message || String(err)));
        setParsedBulkRows([]);
      } finally {
        setIsBulkParsing(false);
      }
    };
    reader.onerror = () => {
      setBulkParseError('Dosya okunamadı.');
      setIsBulkParsing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveBulkToSupabase = async () => {
    if (!parsedBulkRows.length) return;
    const validRows = parsedBulkRows.filter((r) => r.isValid);
    if (!validRows.length) {
      showToast('⚠️ Kaydedilecek geçerli satır bulunamadı. Lütfen Ad Soyad ve Tutar alanlarını kontrol ediniz.');
      return;
    }

    setIsBulkSaving(true);
    playClickSound();

    try {
      if (showBulkModal === 'talepler') {
        const payload = validRows.map((r) => ({
          tckimlik: r.tckimlik,
          adısyoyadı: r.adısyoyadı,
          santiye: r.santiye,
          talepedilen: r.talepedilen,
          odemegrubu: r.odemegrubu,
          acıklama: r.acıklama,
          durum: r.durum,
        }));
        const res = await insertBatchPersonelOdemeTalepleri(payload);
        if (res.success) {
          showToast(`✓ ${res.insertedCount} adet talep başarıyla kaydedildi!`);
          setShowBulkModal(null);
          resetBulkUpload();
          loadAllData(false);
        } else {
          showToast(`⚠️ Kayıt sırasında hata: ${res.error}`);
        }
      } else {
        const payload = validRows.map((r) => ({
          tckimlik: r.tckimlik,
          adısyoyadı: r.adısyoyadı,
          santiye: r.santiye,
          odenen: r.odenen,
          dekont_no: r.dekont_no,
          odeme_tarihi: r.odeme_tarihi,
        }));
        const res = await insertBatchPersonelOdenenler(payload);
        if (res.success) {
          showToast(`✓ ${res.insertedCount} adet ödeme başarıyla kaydedildi!`);
          setShowBulkModal(null);
          resetBulkUpload();
          loadAllData(false);
        } else {
          showToast(`⚠️ Kayıt sırasında hata: ${res.error}`);
        }
      }
    } catch (err: any) {
      showToast(`⚠️ Sunucu hatası: ${err?.message || 'Bilinmeyen hata'}`);
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Yazdır
  const handlePrint = () => {
    playClickSound();
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] bg-amber-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[550px] h-[550px] bg-orange-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* TOP HEADER */}
        <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-30">
          <div className="w-full max-w-[99%] 2xl:max-w-[98%] mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onBack();
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all flex items-center gap-2 group cursor-pointer"
                title="Geri Dön"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-xs font-bold hidden sm:inline">Geri</span>
              </button>

              <div className="h-6 w-px bg-white/10 hidden sm:block" />

              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25 font-black">
                  <Wallet className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
                      <span>PERSONEL ÖDEME TALEPLERİ & AVANS PANELİ</span>
                    </h1>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Canlı Takip
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Özka İnşaat • Personel Ödeme ve Avans Takip Paneli
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadAllData(true)}
                disabled={refreshing || loading}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                title="Verileri Yenile"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
                <span className="hidden md:inline">Yenile</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Mevcut Tabloyu Excel (CSV) Olarak İndir"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Excel İndir</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSampleExcel}
                className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title={
                  activeTab === 'odenenler'
                    ? 'Personel Ödenen boş Excel şablonunu indir (örnek verisiz)'
                    : 'Personel Ödeme Talebi boş Excel şablonunu indir (örnek verisiz)'
                }
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">
                  {activeTab === 'odenenler'
                    ? 'Örnek Ödenen Excel İndir'
                    : 'Örnek Talep Excel İndir'}
                </span>
                <span className="sm:hidden">Örnek Excel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  resetBulkUpload();
                  setShowBulkModal(activeTab === 'odenenler' ? 'odenenler' : 'talepler');
                }}
                className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Excel dosyasından toplu halde sisteme kaydet"
              >
                <Upload className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Toplu Talep Gir</span>
                <span className="sm:hidden">Toplu Gir</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                title="Yazdır"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Yazdır</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  resetForm();
                  setShowAddTalepModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/30 flex items-center gap-1.5 active:scale-95 cursor-pointer border border-amber-300"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>Yeni Talep Ekle</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  resetForm();
                  setShowAddOdenenModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95 cursor-pointer border border-emerald-400/40"
              >
                <Plus className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">Ödeme Girişi</span>
              </button>
            </div>
          </div>
        </header>

        {/* TOAST MESSAGE */}
        {toastMessage && (
          <div className="fixed top-16 right-4 z-50 p-3.5 rounded-2xl bg-amber-950/90 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-bold">{toastMessage}</span>
          </div>
        )}

        <main className="w-full max-w-[99%] 2xl:max-w-[98%] mx-auto px-3 sm:px-6 py-5 flex-1 space-y-5">
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Toplam Talep Tutarı */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-amber-500/20 backdrop-blur-md shadow-lg flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Toplam Talep Edilen
                </div>
                <div className="text-lg sm:text-xl font-black text-amber-300 mt-0.5 truncate">
                  {formatTRY(stats.totalTalepTutari)}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
                  {stats.talepAdedi} adet ödeme talebi
                </div>
              </div>
            </div>

            {/* Card 2: Toplam Ödenen Tutar */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-emerald-500/20 backdrop-blur-md shadow-lg flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Toplam Ödenen
                </div>
                <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5 truncate">
                  {formatTRY(stats.totalOdenenTutari)}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
                  {stats.odenenAdedi} adet ödeme işlemi
                </div>
              </div>
            </div>

            {/* Card 3: Kalan Ödenecek Bakiye */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-rose-500/20 backdrop-blur-md shadow-lg flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Kalan Ödenecek
                </div>
                <div className="text-lg sm:text-xl font-black text-rose-300 mt-0.5 truncate">
                  {formatTRY(stats.kalanBakiye)}
                </div>
                <div className="text-[10px] text-rose-400 mt-0.5 font-medium">
                  {stats.kalanBakiye > 0 ? 'Ödenmesi gereken fark' : 'Talepler karşılandı'}
                </div>
              </div>
            </div>

            {/* Card 4: Bekleyen Talepler */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-purple-500/20 backdrop-blur-md shadow-lg flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Onay Bekleyenler
                </div>
                <div className="text-lg sm:text-xl font-black text-purple-300 mt-0.5">
                  {stats.onayBekleyenler} Talep
                </div>
                <div className="text-[10px] text-purple-400 mt-0.5 font-medium">
                  İşlem ve ödeme sırasındaki talepler
                </div>
              </div>
            </div>
          </div>

          {/* TAB BAR: 3 SEKME */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTab('talepler');
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'talepler'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>1. Ödeme Talepleri</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 text-amber-200">
                  {taleplerList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTab('odenenler');
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'odenenler'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <CheckCheck className="w-4 h-4" />
                <span>2. Ödenenler</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 text-emerald-200">
                  {odenenlerList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTab('ozet');
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'ozet'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>3. Bakiye & İcmal</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 text-purple-200">
                  {ozetList.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2"></div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search Box */}
              <div className={`${activeTab === 'talepler' ? 'md:col-span-4' : 'md:col-span-5'} relative`}>
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="TC Kimlik No, Ad Soyad, Şantiye veya Açıklama ara..."
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none text-xs sm:text-sm text-white placeholder-gray-500 transition-colors"
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

              {/* Şantiye Dropdown */}
              <div className={`${activeTab === 'talepler' ? 'md:col-span-3' : 'md:col-span-4'}`}>
                <select
                  value={selectedSantiye}
                  onChange={(e) => setSelectedSantiye(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none text-xs sm:text-sm text-gray-200"
                >
                  <option value="TÜMÜ" className="bg-slate-900 text-white">
                    Tüm Şantiyeler ({santiyeListesi.length})
                  </option>
                  {santiyeListesi.map((s) => (
                    <option key={s} value={s} className="bg-slate-900 text-white">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ödeme Grubu Filtresi (Sadece Talepler için) */}
              {activeTab === 'talepler' && (
                <div className="md:col-span-3">
                  <select
                    value={selectedOdemeGrubu}
                    onChange={(e) => setSelectedOdemeGrubu(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none text-xs sm:text-sm text-gray-200"
                  >
                    <option value="TÜMÜ" className="bg-slate-900 text-white font-bold">
                      Tüm Gruplar ({taleplerList.length})
                    </option>
                    <option value="Ek Maaş" className="bg-slate-900 text-blue-300">Ek Maaş</option>
                    <option value="Harcırah" className="bg-slate-900 text-teal-300">Harcırah</option>
                    <option value="Hafta Sonu" className="bg-slate-900 text-purple-300">Hafta Sonu</option>
                    <option value="Prim" className="bg-slate-900 text-emerald-300">Prim</option>
                    <option value="Arabulucu" className="bg-slate-900 text-amber-300">Arabulucu</option>
                    <option value="Yıllık İzin" className="bg-slate-900 text-sky-300">Yıllık İzin</option>
                    <option value="Diğer" className="bg-slate-900 text-gray-300">Diğer</option>
                  </select>
                </div>
              )}

              {/* Durum Filtresi (Sadece Talepler için) */}
              <div className={`${activeTab === 'talepler' ? 'md:col-span-2' : 'md:col-span-3'}`}>
                {activeTab === 'talepler' ? (
                  <select
                    value={selectedDurum}
                    onChange={(e) => setSelectedDurum(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none text-xs sm:text-sm text-gray-200"
                  >
                    <option value="TÜMÜ" className="bg-slate-900 text-white font-bold">
                      Tüm Durumlar
                    </option>
                    <option value="ödensin" className="bg-slate-900 text-emerald-300 font-semibold">
                      🟢 Ödensin
                    </option>
                    <option value="ödenmesin" className="bg-slate-900 text-rose-300 font-semibold">
                      🔴 Ödenmesin
                    </option>
                    <option value="beklesin" className="bg-slate-900 text-amber-300 font-semibold">
                      🟡 Beklesin
                    </option>
                  </select>
                ) : (
                  <div className="text-right text-xs text-gray-400 py-2">
                    {activeTab === 'odenenler'
                      ? `${filteredOdenenler.length} adet ödeme listeleniyor`
                      : `${filteredOzet.length} personel özeti`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TAB 1: PERSONEL ÖDEME TALEPLERİ (personelodemetalebi) */}
          {activeTab === 'talepler' && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-2xl">
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-amber-950/30 via-slate-900/40 to-transparent">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                      PERSONEL ÖDEME TALEPLERİ LİSTESİ
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Durum altındaki işaretlere tıklayarak anında <span className="text-rose-300 font-bold">Red</span>, <span className="text-emerald-300 font-bold">Onay</span> veya <span className="text-amber-300 font-bold">İnceleme</span> yapabilirsiniz.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    {filteredTalepler.length} Kayıt
                  </span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadSampleExcel}
                    className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    title="Personel Ödeme Talebi için boş örnek Excel şablon dosyasını indir"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                    <span>Örnek Excel Dosyası İndir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      resetBulkUpload();
                      setShowBulkModal('talepler');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/25 to-orange-500/25 hover:from-amber-500/40 hover:to-orange-500/40 text-amber-200 hover:text-white border border-amber-500/40 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/10 active:scale-95 cursor-pointer"
                    title="Excel dosyası yükleyerek toplu talep kaydet"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Toplu Talep Gir</span>
                  </button>

                  <div className="text-xs sm:text-sm text-gray-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                    Toplam Talep:{' '}
                    <span className="text-amber-300 font-black text-sm sm:text-base font-mono">
                      {formatTRY(filteredTalepler.reduce((a, b) => a + (b.talepedilen || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-7 h-7 animate-spin text-amber-400" />
                  <p className="text-sm font-semibold">Personel ödeme talepleri yükleniyor...</p>
                </div>
              ) : filteredTalepler.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <p className="text-base text-gray-300 font-bold">
                    Filtreye uygun ödeme talebi bulunamadı.
                  </p>
                  <p className="text-xs text-gray-500">
                    Yukarıdaki <span className="text-amber-400 font-bold">"+ Yeni Talep Ekle"</span> butonuna tıklayarak ilk talebi ekleyebilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1360px] text-left text-xs sm:text-sm text-gray-300 border-collapse">
                    <thead className="bg-white/[0.04] border-b border-white/10 text-gray-400 font-extrabold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-4 px-4 text-center w-14">#</th>
                        <th className="py-4 px-4 w-36 whitespace-nowrap">TC KİMLİK</th>
                        <th className="py-4 px-4 min-w-[200px]">ADI SOYADI</th>
                        <th className="py-4 px-4 min-w-[180px]">ŞANTİYE</th>
                        <th className="py-4 px-4 min-w-[140px] whitespace-nowrap">ÖDEME GRUBU</th>
                        <th className="py-4 px-4 text-right min-w-[150px] whitespace-nowrap">TALEP EDİLEN</th>
                        <th className="py-4 px-5 min-w-[260px]">AÇIKLAMA</th>
                        <th className="py-4 px-4 min-w-[210px]">DURUM</th>
                        <th className="py-4 px-4 text-center w-28 whitespace-nowrap">TARİH</th>
                        <th className="py-4 px-4 text-right w-48 whitespace-nowrap">İŞLEMLER</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredTalepler.map((t, index) => {
                        const statusInfo = getStatusInfo(t.durum);

                        return (
                          <tr key={t.id || index} className="hover:bg-white/[0.04] transition-colors">
                            <td className="py-4 px-4 text-center text-gray-500 font-mono text-xs">
                              {index + 1}
                            </td>
                            <td className="py-4 px-4 font-mono font-bold text-gray-200 text-sm whitespace-nowrap">
                              {t.tckimlik || '-'}
                            </td>
                            <td className="py-4 px-4 font-extrabold text-white text-sm">
                              {t.adısyoyadı || t.adisoyadi || '-'}
                            </td>
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-amber-200">
                                <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>{t.santiye || 'Belirtilmedi'}</span>
                              </span>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-sm ${getOdemeGrubuBadge(
                                  t.odemegrubu || t['ödemegrubu']
                                )}`}
                              >
                                <Layers className="w-3.5 h-3.5 opacity-70 shrink-0" />
                                <span>{t.odemegrubu || t['ödemegrubu'] || 'Ek Maaş'}</span>
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-black text-amber-300 font-mono text-base whitespace-nowrap">
                              {formatTRY(t.talepedilen)}
                            </td>
                            <td className="py-4 px-5 text-gray-300 min-w-[260px] max-w-xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {t.acıklama || t.aciklama || '-'}
                            </td>
                            <td className="py-3 px-4 min-w-[210px]">
                              <div className="flex flex-col items-start gap-1.5">
                                {/* Durum Rozeti */}
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider border shadow-sm select-none ${statusInfo.badgeClass}`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
                                  <span>{statusInfo.label}</span>
                                </span>

                                {/* Altındaki İşaretler: Red, Onay, İnceleme */}
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  {/* Red */}
                                  <button
                                    type="button"
                                    onClick={() => handleQuickStatusChange(t.id!, 'Ödenmesin')}
                                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                                      statusInfo.key === 'ödenmesin'
                                        ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/30'
                                        : 'bg-rose-500/10 text-rose-300 border-rose-500/25 hover:bg-rose-500/25 hover:border-rose-400'
                                    }`}
                                    title="Red (Ödenmesin)"
                                  >
                                    <X className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Red</span>
                                  </button>

                                  {/* Onay */}
                                  <button
                                    type="button"
                                    onClick={() => handleQuickStatusChange(t.id!, 'Ödensin')}
                                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                                      statusInfo.key === 'ödensin'
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/30'
                                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/25 hover:border-emerald-400'
                                    }`}
                                    title="Onay (Ödensin)"
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Onay</span>
                                  </button>

                                  {/* İnceleme */}
                                  <button
                                    type="button"
                                    onClick={() => handleQuickStatusChange(t.id!, 'Beklesin')}
                                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                                      statusInfo.key === 'beklesin'
                                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30'
                                        : 'bg-amber-500/10 text-amber-300 border-amber-500/25 hover:bg-amber-500/25 hover:border-amber-400'
                                    }`}
                                    title="İnceleme (Beklesin)"
                                  >
                                    <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>İnceleme</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center text-gray-400 text-xs font-mono whitespace-nowrap">
                              {t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '-'}
                            </td>
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuickPayFromTalep(t)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                                  title="Bu talep için ödeme kaydı oluştur"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Ödeme Yap</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditTalepTarget(t);
                                    setFormTc(t.tckimlik || '');
                                    setFormAdSoyad(t.adısyoyadı || t.adisoyadi || '');
                                    setFormSantiye(t.santiye || '');
                                    setFormOdemeGrubu(t.odemegrubu || t['ödemegrubu'] || 'Ek Maaş');
                                    setFormTutar(t.talepedilen ? String(t.talepedilen) : '');
                                    setFormAciklama(t.acıklama || t.aciklama || '');
                                    setFormDurum(t.durum || 'Beklesin');
                                  }}
                                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                                  title="Düzenle"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'talep',
                                      id: t.id!,
                                      label: `${t.adısyoyadı || t.adisoyadi} (${formatTRY(t.talepedilen)})`,
                                    })
                                  }
                                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer"
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
            </div>
          )}

              {/* TAB 2: PERSONEL ÖDENENLER (personelodenen) */}
          {activeTab === 'odenenler' && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-2xl">
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-emerald-950/30 via-slate-900/40 to-transparent">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                      PERSONEL ÖDENENLER LİSTESİ
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Personele yapılan tüm ödemeler, dekont ve işlem tarihleri
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    {filteredOdenenler.length} Kayıt
                  </span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadSampleExcel}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    title="Personel Ödenen tablosu için boş örnek Excel şablon dosyasını indir"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Örnek Excel Dosyası İndir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      resetBulkUpload();
                      setShowBulkModal('odenenler');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/25 to-teal-500/25 hover:from-emerald-500/40 hover:to-teal-500/40 text-emerald-200 hover:text-white border border-emerald-500/40 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95 cursor-pointer"
                    title="Excel dosyası yükleyerek toplu ödeme kaydet"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Toplu Talep Gir (Ödeme)</span>
                  </button>

                  <div className="text-xs sm:text-sm text-gray-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                    Toplam Ödenen:{' '}
                    <span className="text-emerald-400 font-black text-sm sm:text-base font-mono">
                      {formatTRY(filteredOdenenler.reduce((a, b) => a + (b.odenen || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-7 h-7 animate-spin text-emerald-400" />
                  <p className="text-sm font-semibold">Ödenen kayıtları yükleniyor...</p>
                </div>
              ) : filteredOdenenler.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <p className="text-base text-gray-300 font-bold">
                    Henüz kayıtlı bir ödeme girişi bulunamadı.
                  </p>
                  <p className="text-xs text-gray-500">
                    Yukarıdaki <span className="text-emerald-400 font-bold">"+ Ödeme Girişi"</span> butonuna basarak ilk ödemeyi kaydedebilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1300px] text-left text-xs sm:text-sm text-gray-300 border-collapse">
                    <thead className="bg-white/[0.04] border-b border-white/10 text-gray-400 font-extrabold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-4 px-4 text-center w-14">#</th>
                        <th className="py-4 px-4 w-36 whitespace-nowrap">TC KİMLİK</th>
                        <th className="py-4 px-4 min-w-[200px]">ADI SOYADI</th>
                        <th className="py-4 px-4 min-w-[200px]">ŞANTİYE</th>
                        <th className="py-4 px-4 text-right min-w-[150px] whitespace-nowrap">ÖDENEN TUTAR</th>
                        <th className="py-4 px-5 min-w-[280px]">DEKONT / AÇIKLAMA</th>
                        <th className="py-4 px-4 text-center w-28 whitespace-nowrap">ÖDEME TARİHİ</th>
                        <th className="py-4 px-4 text-right w-36 whitespace-nowrap">İŞLEMLER</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredOdenenler.map((o, index) => (
                        <tr key={o.id || index} className="hover:bg-white/[0.04] transition-colors">
                          <td className="py-4 px-4 text-center text-gray-500 font-mono text-xs">
                            {index + 1}
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-gray-200 text-sm whitespace-nowrap">
                            {o.tckimlik || '-'}
                          </td>
                          <td className="py-4 px-4 font-extrabold text-white text-sm">
                            {o.adısyoyadı || o.adisoyadi || '-'}
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-emerald-200">
                              <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{o.santiye || 'Belirtilmedi'}</span>
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-black text-emerald-400 font-mono text-base whitespace-nowrap">
                            {formatTRY(o.odenen)}
                          </td>
                          <td className="py-4 px-5 text-gray-300 min-w-[280px] max-w-xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {o.dekont_no || '-'}
                          </td>
                          <td className="py-4 px-4 text-center text-gray-400 text-xs font-mono whitespace-nowrap">
                            {o.odeme_tarihi
                              ? new Date(o.odeme_tarihi).toLocaleDateString('tr-TR')
                              : o.created_at
                              ? new Date(o.created_at).toLocaleDateString('tr-TR')
                              : '-'}
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditOdenenTarget(o);
                                  setFormTc(o.tckimlik || '');
                                  setFormAdSoyad(o.adısyoyadı || o.adisoyadi || '');
                                  setFormSantiye(o.santiye || '');
                                  setFormTutar(o.odenen ? String(o.odenen) : '');
                                  setFormDekontNo(o.dekont_no || '');
                                }}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                                title="Düzenle"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'odenen',
                                    id: o.id!,
                                    label: `${o.adısyoyadı || o.adisoyadi} (${formatTRY(o.odenen)})`,
                                  })
                                }
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer"
                                title="Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BAKİYE VE İCMAL ÖZETİ (v_personel_odeme_ozet) */}
          {activeTab === 'ozet' && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-2xl">
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-purple-950/30 via-slate-900/40 to-transparent">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-purple-400" />
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                      PERSONEL BAZINDA BAKİYE & İCMAL ÖZETİ (v_personel_odeme_ozet)
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Her personelin toplam talepleri, yapılan ödemeleri ve kalan bakiyesi
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                    {filteredOzet.length} Personel
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-gray-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                  Toplam Kalan:{' '}
                  <span className="text-rose-300 font-black text-sm sm:text-base font-mono">
                    {formatTRY(filteredOzet.reduce((a, b) => a + (b.kalan_odenecek || 0), 0))}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-7 h-7 animate-spin text-purple-400" />
                  <p className="text-sm font-semibold">Bakiye özeti hesaplanıyor...</p>
                </div>
              ) : filteredOzet.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <p className="text-base text-gray-300 font-bold">
                    Henüz bakiye özeti hesaplanacak kayıt bulunmuyor.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1250px] text-left text-xs sm:text-sm text-gray-300 border-collapse">
                    <thead className="bg-white/[0.04] border-b border-white/10 text-gray-400 font-extrabold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-4 px-4 text-center w-14">#</th>
                        <th className="py-4 px-4 w-36 whitespace-nowrap">TC KİMLİK</th>
                        <th className="py-4 px-4 min-w-[200px]">ADI SOYADI</th>
                        <th className="py-4 px-4 min-w-[200px]">ŞANTİYE</th>
                        <th className="py-4 px-4 text-right min-w-[150px] whitespace-nowrap">TOPLAM TALEP</th>
                        <th className="py-4 px-4 text-right min-w-[150px] whitespace-nowrap">TOPLAM ÖDENEN</th>
                        <th className="py-4 px-4 text-right min-w-[150px] whitespace-nowrap">KALAN ÖDENECEK</th>
                        <th className="py-4 px-4 text-center w-36 whitespace-nowrap">DURUM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredOzet.map((z, index) => {
                        const hasRemaining = (z.kalan_odenecek || 0) > 0;
                        const isFullyPaid = (z.kalan_odenecek || 0) <= 0 && (z.toplam_odenen || 0) > 0;

                        return (
                          <tr key={z.tckimlik || index} className="hover:bg-white/[0.04] transition-colors">
                            <td className="py-4 px-4 text-center text-gray-500 font-mono text-xs">
                              {index + 1}
                            </td>
                            <td className="py-4 px-4 font-mono font-bold text-gray-200 text-sm whitespace-nowrap">
                              {z.tckimlik || '-'}
                            </td>
                            <td className="py-4 px-4 font-extrabold text-white text-sm">
                              {z.adisoyadi || '-'}
                            </td>
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-gray-300">
                                <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                <span>{z.santiye || 'Belirtilmedi'}</span>
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-black text-amber-300 font-mono text-base whitespace-nowrap">
                              {formatTRY(z.toplam_talep)}
                            </td>
                            <td className="py-4 px-4 text-right font-black text-emerald-400 font-mono text-base whitespace-nowrap">
                              {formatTRY(z.toplam_odenen)}
                            </td>
                            <td className="py-4 px-4 text-right font-black font-mono text-base whitespace-nowrap">
                              <span className={hasRemaining ? 'text-rose-400' : 'text-gray-400'}>
                                {formatTRY(z.kalan_odenecek)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border shadow-sm ${
                                  isFullyPaid
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : hasRemaining
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-white/10 text-gray-300 border-white/20'
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isFullyPaid
                                      ? 'bg-emerald-400'
                                      : hasRemaining
                                      ? 'bg-rose-400 animate-pulse'
                                      : 'bg-gray-400'
                                  }`}
                                />
                                {isFullyPaid ? 'Tamamı Ödendi' : hasRemaining ? 'Ödeme Bekliyor' : 'İşlemsiz'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: YENİ TALEP EKLE */}
      <AnimatePresence>
        {showAddTalepModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-[#0f1118] border border-amber-500/30 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-white text-base">Yeni Personel Ödeme Talebi Ekle</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTalepModal(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveNewTalep} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    TC Kimlik No (11 Haneli) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={formTc}
                    onChange={(e) => setFormTc(e.target.value.replace(/\D/g, ''))}
                    placeholder="Örn: 12345678901"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none text-white text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Personel Adı Soyadı *
                  </label>
                  <input
                    type="text"
                    required
                    value={formAdSoyad}
                    onChange={(e) => setFormAdSoyad(e.target.value.toUpperCase())}
                    placeholder="Örn: AHMET YILMAZ"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      Şantiye *
                    </label>
                    <input
                      type="text"
                      required
                      list="santiye-list"
                      value={formSantiye}
                      onChange={(e) => setFormSantiye(e.target.value.toUpperCase())}
                      placeholder="Şantiye adı yazın"
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none text-white text-sm"
                    />
                    <datalist id="santiye-list">
                      {santiyeListesi.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      Ödeme Grubu *
                    </label>
                    <select
                      value={formOdemeGrubu}
                      onChange={(e) => setFormOdemeGrubu(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none text-white text-sm font-semibold"
                    >
                      <option value="Ek Maaş" className="bg-slate-900 text-blue-300">Ek Maaş</option>
                      <option value="Harcırah" className="bg-slate-900 text-teal-300">Harcırah</option>
                      <option value="Hafta Sonu" className="bg-slate-900 text-purple-300">Hafta Sonu</option>
                      <option value="Prim" className="bg-slate-900 text-emerald-300">Prim</option>
                      <option value="Arabulucu" className="bg-slate-900 text-amber-300">Arabulucu</option>
                      <option value="Yıllık İzin" className="bg-slate-900 text-sky-300">Yıllık İzin</option>
                      <option value="Diğer" className="bg-slate-900 text-gray-300">Diğer</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      Talep Edilen Tutar (TL) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formTutar}
                      onChange={(e) => setFormTutar(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none text-amber-300 font-mono text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      Talep Durumu
                    </label>
                    <select
                      value={formDurum}
                      onChange={(e) => setFormDurum(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none text-white text-sm font-semibold"
                    >
                      <option value="Beklesin" className="bg-slate-900 text-amber-300 font-semibold">
                        🟡 Beklesin (Onay Bekliyor)
                      </option>
                      <option value="Ödensin" className="bg-slate-900 text-emerald-300 font-semibold">
                        🟢 Ödensin (Onaylandı)
                      </option>
                      <option value="Ödenmesin" className="bg-slate-900 text-rose-300 font-semibold">
                        🔴 Ödenmesin (Reddedildi)
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Açıklama (Talep Nedeni / Detay)
                  </label>
                  <textarea
                    rows={2}
                    value={formAciklama}
                    onChange={(e) => setFormAciklama(e.target.value)}
                    placeholder="Örn: Aylık avans talebi, harcırah veya acil masraf"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none text-white text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddTalepModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/30 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Kaydediliyor...' : 'Talebi Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: YENİ ÖDEME GİRİŞİ */}
      <AnimatePresence>
        {showAddOdenenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-[#0f1118] border border-emerald-500/30 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-white text-base">Yeni Personel Ödeme Girişi Ekle</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddOdenenModal(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveNewOdenen} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    TC Kimlik No (11 Haneli) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={formTc}
                    onChange={(e) => setFormTc(e.target.value.replace(/\D/g, ''))}
                    placeholder="Örn: 12345678901"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-white text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Personel Adı Soyadı *
                  </label>
                  <input
                    type="text"
                    required
                    value={formAdSoyad}
                    onChange={(e) => setFormAdSoyad(e.target.value.toUpperCase())}
                    placeholder="Örn: AHMET YILMAZ"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      Şantiye *
                    </label>
                    <input
                      type="text"
                      required
                      list="santiye-list"
                      value={formSantiye}
                      onChange={(e) => setFormSantiye(e.target.value.toUpperCase())}
                      placeholder="Şantiye adı yazın"
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      Ödenen Tutar (TL) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formTutar}
                      onChange={(e) => setFormTutar(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-emerald-300 font-mono text-sm font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Dekont No / Havale Açıklaması
                  </label>
                  <input
                    type="text"
                    value={formDekontNo}
                    onChange={(e) => setFormDekontNo(e.target.value)}
                    placeholder="Örn: Garanti Bankası Havale / Dekont No: 987654"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none text-white text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddOdenenModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: TALEP DÜZENLE */}
      <AnimatePresence>
        {editTalepTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-[#0f1118] border border-amber-500/40 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-white text-base">Ödeme Talebini Güncelle</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditTalepTarget(null)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateTalep} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">TC Kimlik No</label>
                  <input
                    type="text"
                    required
                    value={formTc}
                    onChange={(e) => setFormTc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Personel Adı Soyadı</label>
                  <input
                    type="text"
                    required
                    value={formAdSoyad}
                    onChange={(e) => setFormAdSoyad(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Şantiye</label>
                    <input
                      type="text"
                      required
                      value={formSantiye}
                      onChange={(e) => setFormSantiye(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Ödeme Grubu</label>
                    <select
                      value={formOdemeGrubu}
                      onChange={(e) => setFormOdemeGrubu(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold"
                    >
                      <option value="Ek Maaş" className="bg-slate-900 text-blue-300">Ek Maaş</option>
                      <option value="Harcırah" className="bg-slate-900 text-teal-300">Harcırah</option>
                      <option value="Hafta Sonu" className="bg-slate-900 text-purple-300">Hafta Sonu</option>
                      <option value="Prim" className="bg-slate-900 text-emerald-300">Prim</option>
                      <option value="Arabulucu" className="bg-slate-900 text-amber-300">Arabulucu</option>
                      <option value="Yıllık İzin" className="bg-slate-900 text-sky-300">Yıllık İzin</option>
                      <option value="Diğer" className="bg-slate-900 text-gray-300">Diğer</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Talep Edilen Tutar (TL)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formTutar}
                      onChange={(e) => setFormTutar(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-amber-300 font-mono text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Durum</label>
                    <select
                      value={formDurum}
                      onChange={(e) => setFormDurum(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                    >
                      <option value="Beklesin" className="bg-slate-900 text-amber-300 font-semibold">
                        🟡 Beklesin (Onay Bekliyor)
                      </option>
                      <option value="Ödensin" className="bg-slate-900 text-emerald-300 font-semibold">
                        🟢 Ödensin (Onaylandı)
                      </option>
                      <option value="Ödenmesin" className="bg-slate-900 text-rose-300 font-semibold">
                        🔴 Ödenmesin (Reddedildi)
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Açıklama</label>
                  <textarea
                    rows={2}
                    value={formAciklama}
                    onChange={(e) => setFormAciklama(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditTalepTarget(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: ÖDENEN DÜZENLE */}
      <AnimatePresence>
        {editOdenenTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-[#0f1118] border border-emerald-500/40 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-white text-base">Ödeme Kaydını Güncelle</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditOdenenTarget(null)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateOdenen} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">TC Kimlik No</label>
                  <input
                    type="text"
                    required
                    value={formTc}
                    onChange={(e) => setFormTc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Personel Adı Soyadı</label>
                  <input
                    type="text"
                    required
                    value={formAdSoyad}
                    onChange={(e) => setFormAdSoyad(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Şantiye</label>
                    <input
                      type="text"
                      required
                      value={formSantiye}
                      onChange={(e) => setFormSantiye(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Ödenen Tutar (TL)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formTutar}
                      onChange={(e) => setFormTutar(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-emerald-300 font-mono text-sm font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Dekont No</label>
                  <input
                    type="text"
                    value={formDekontNo}
                    onChange={(e) => setFormDekontNo(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditOdenenTarget(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: SİLME ONAYI */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-[#0f1118] border border-rose-500/40 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Kaydı Silmek İstiyor musunuz?</h3>
                  <p className="text-xs text-rose-300/80">Bu işlem geri alınamaz.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200">
                {deleteTarget.label} kaydı kalıcı olarak silinecektir.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: SQL KODU */}
      <AnimatePresence>
        {showSqlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl rounded-2xl bg-[#0f1118] border border-white/20 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-400" />
                  <h3 className="font-black text-white text-base">Veritabanı SQL Kurulum Kodu</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-300">
                Bu SQL kodu <span className="text-amber-400 font-bold">personelodemetalebi</span>,{' '}
                <span className="text-emerald-400 font-bold">personelodenen</span> ve bakiye icmal görünümünü kurar:
              </p>

              <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-gray-300 max-h-72 overflow-y-auto selection:bg-amber-500 selection:text-black">
                {PERSONEL_ODEME_TALEBI_SQL_SETUP}
              </pre>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>SQL Editörünü Aç</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(PERSONEL_ODEME_TALEBI_SQL_SETUP);
                      setSqlCopied(true);
                      setTimeout(() => setSqlCopied(false), 2000);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    {sqlCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{sqlCopied ? 'Kopyalandı!' : 'Kodu Kopyala'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* MODAL 7: TOPLU EXCEL YÜKLEME (TOPLU TALEP GİR / TOPLU ÖDEME GİR) */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0b0e14] border ${
                showBulkModal === 'talepler' ? 'border-amber-500/40' : 'border-emerald-500/40'
              } p-5 sm:p-6 shadow-2xl space-y-4 overflow-hidden`}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      showBulkModal === 'talepler'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                      <span>
                        {showBulkModal === 'talepler'
                          ? 'Toplu Personel Ödeme Talebi Gir (Excel Yükle)'
                          : 'Toplu Personel Ödeme Girişi Yap (Excel Yükle)'}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {showBulkModal === 'talepler'
                        ? 'Excel veya CSV dosyanızı yükleyerek toplu personel ödeme talebi oluşturabilirsiniz.'
                        : 'Excel veya CSV dosyanızı yükleyerek toplu personel ödeme girişi yapabilirsiniz.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(null);
                    resetBulkUpload();
                  }}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload Dropzone / File Picker */}
              <div className="space-y-3 shrink-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-gray-300">
                    Excel (.xlsx, .xls) veya CSV Dosyası Seçiniz
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadSampleExcel}
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Boş Örnek Excel Şablonu İndir (Örnek Verisiz)</span>
                  </button>
                </div>

                <label className="border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer group">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleBulkFileSelected(f);
                    }}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-amber-500/10 group-hover:text-amber-400 text-gray-400 flex items-center justify-center transition-all mb-2">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white mb-0.5">
                    {bulkFileName ? (
                      <span className="text-emerald-400">Seçilen Dosya: {bulkFileName}</span>
                    ) : (
                      'Excel dosyasını buraya sürükleyin veya tıklayarak seçin'
                    )}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Desteklenen formatlar: .xlsx, .xls, .csv • Başlık satırı otomatik tanınır
                  </p>
                </label>
              </div>

              {/* Parsing status & Error */}
              {isBulkParsing && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-3 text-xs text-amber-300">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Excel dosyası okunuyor ve satırlar ayrıştırılıyor...</span>
                </div>
              )}

              {bulkParseError && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{bulkParseError}</span>
                </div>
              )}

              {/* Preview Section */}
              {parsedBulkRows.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0 space-y-3">
                  {/* Summary Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-xs shrink-0">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-gray-300">
                        Toplam Satır:{' '}
                        <strong className="text-white font-mono text-sm">{parsedBulkRows.length}</strong>
                      </span>
                      <span className="text-emerald-400">
                        Geçerli:{' '}
                        <strong className="font-mono text-sm">
                          {parsedBulkRows.filter((r) => r.isValid).length}
                        </strong>
                      </span>
                      {parsedBulkRows.some((r) => !r.isValid) && (
                        <span className="text-rose-400">
                          Hatalı / Eksik:{' '}
                          <strong className="font-mono text-sm">
                            {parsedBulkRows.filter((r) => !r.isValid).length}
                          </strong>
                        </span>
                      )}
                    </div>
                    <div className="text-gray-300 font-bold">
                      Toplam Tutar:{' '}
                      <span className="text-amber-300 font-mono text-sm font-black">
                        {formatTRY(
                          parsedBulkRows
                            .filter((r) => r.isValid)
                            .reduce(
                              (sum, r) => sum + (showBulkModal === 'talepler' ? r.talepedilen : r.odenen),
                              0
                            )
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Scrollable Preview Table */}
                  <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl max-h-60 bg-black/40">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-white/5 sticky top-0 z-10 text-[11px] text-gray-400 font-bold border-b border-white/10 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">TC KİMLİK</th>
                          <th className="py-2.5 px-3">ADI SOYADI</th>
                          <th className="py-2.5 px-3">ŞANTİYE</th>
                          {showBulkModal === 'talepler' ? (
                            <>
                              <th className="py-2.5 px-3">ÖDEME GRUBU</th>
                              <th className="py-2.5 px-3 text-right">TALEP (TL)</th>
                              <th className="py-2.5 px-3">DURUM</th>
                              <th className="py-2.5 px-3">AÇIKLAMA</th>
                            </>
                          ) : (
                            <>
                              <th className="py-2.5 px-3 text-right">ÖDENEN (TL)</th>
                              <th className="py-2.5 px-3">DEKONT NO</th>
                              <th className="py-2.5 px-3">ÖDEME TARİHİ</th>
                            </>
                          )}
                          <th className="py-2.5 px-3 text-center">DURUM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300">
                        {parsedBulkRows.map((r, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-white/[0.02] ${
                              !r.isValid ? 'bg-rose-500/5 text-rose-200' : ''
                            }`}
                          >
                            <td className="py-2 px-3 font-mono text-[11px] text-gray-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono">{r.tckimlik || '-'}</td>
                            <td className="py-2 px-3 font-bold text-white">{r.adısyoyadı}</td>
                            <td className="py-2 px-3">{r.santiye}</td>
                            {showBulkModal === 'talepler' ? (
                              <>
                                <td className="py-2 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getOdemeGrubuBadge(
                                      r.odemegrubu
                                    )}`}
                                  >
                                    {r.odemegrubu}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-amber-300">
                                  {formatTRY(r.talepedilen)}
                                </td>
                                <td className="py-2 px-3">
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10">
                                    {r.durum}
                                  </span>
                                </td>
                                <td className="py-2 px-3 max-w-xs truncate text-[11px] text-gray-400">
                                  {r.acıklama || '-'}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-300">
                                  {formatTRY(r.odenen)}
                                </td>
                                <td className="py-2 px-3 max-w-xs truncate text-[11px] text-gray-400">
                                  {r.dekont_no || '-'}
                                </td>
                                <td className="py-2 px-3 text-[11px] font-mono">{r.odeme_tarihi}</td>
                              </>
                            )}
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                  <Check className="w-3 h-3" /> Hazır
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/30"
                                  title={r.error}
                                >
                                  <AlertCircle className="w-3 h-3" /> {r.error || 'Hatalı'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0 flex-wrap gap-2">
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <span>Kayıtlar doğrudan sisteme aktarılacaktır.</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isBulkSaving}
                    onClick={() => {
                      setShowBulkModal(null);
                      resetBulkUpload();
                    }}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    Vazgeç
                  </button>

                  <button
                    type="button"
                    disabled={
                      isBulkSaving ||
                      isBulkParsing ||
                      parsedBulkRows.filter((r) => r.isValid).length === 0
                    }
                    onClick={handleSaveBulkToSupabase}
                    className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      showBulkModal === 'talepler'
                        ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-amber-500/25 border border-amber-300'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25 border border-emerald-400'
                    }`}
                  >
                    {isBulkSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>
                          Toplu Kaydet (
                          {parsedBulkRows.filter((r) => r.isValid).length} Satır)
                        </span>
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
