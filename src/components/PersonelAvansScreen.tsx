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
  Pencil,
  Sparkles,
  Database,
  Copy,
  Check,
  X,
  Layers,
  UserCheck,
  Calendar,
  Building2,
  Wallet,
  Coins,
  CreditCard,
  Plus,
  Printer,
  ChevronDown,
  Eye,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import {
  fetchPersonelAvansBakiyeFromSupabase,
  fetchPersonelAvansOdenenFromSupabase,
  fetchPersonelAvansKesilenFromSupabase,
  insertPersonelAvansOdenenToSupabase,
  insertPersonelAvansKesilenToSupabase,
  updatePersonelAvansOdenenInSupabase,
  deletePersonelAvansOdenenFromSupabase,
  updatePersonelAvansKesilenInSupabase,
  deletePersonelAvansKesilenFromSupabase,
  updatePersonelAvansPersonelInfoInSupabase,
  deletePersonelAvansAllForPersonelFromSupabase,
  fetchSantiyeIsimleriFromSupabase,
  extractSantiyeName,
  PersonelAvansBakiyeRow,
  PersonelAvansOdenenRow,
  PersonelAvansKesilenRow,
  PERSONEL_AVANS_TABLES_SQL_SCRIPT,
} from '../lib/supabase';

interface PersonelAvansScreenProps {
  onBack: () => void;
  playClickSound?: () => void;
}

const SUPABASE_AVANS_URL =
  'https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/20656?schema=public/v_personel_avans_bakiye';

const SUPABASE_SANTIYE_URL =
  'https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/19170?schema=public/santiyeisimleri';

export const PersonelAvansScreen: React.FC<PersonelAvansScreenProps> = ({
  onBack,
  playClickSound = () => {},
}) => {
  // Aktif Görünüm Sekmesi
  const [activeTab, setActiveTab] = useState<'bakiye' | 'odenen' | 'kesilen'>('bakiye');

  // Veriler
  const [bakiyeList, setBakiyeList] = useState<PersonelAvansBakiyeRow[]>([]);
  const [odenenList, setOdenenList] = useState<PersonelAvansOdenenRow[]>([]);
  const [kesilenList, setKesilenList] = useState<PersonelAvansKesilenRow[]>([]);

  // Yükleme Durumları
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtreler & Arama
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSantiye, setSelectedSantiye] = useState('TÜMÜ');
  const [selectedBakiyeDurumu, setSelectedBakiyeDurumu] = useState<'TÜMÜ' | 'BORCLU' | 'SIFIR'>('TÜMÜ');

  // Şantiye Listesi (public.santiyeisimleri tablosundan)
  const [santiyeListesi, setSantiyeListesi] = useState<string[]>([]);
  const [santiyeLoading, setSantiyeLoading] = useState(false);

  // Yeni Kayıt Modalı
  const [showAddModal, setShowAddModal] = useState<'odenen' | 'kesilen' | null>(null);
  const [formTc, setFormTc] = useState('');
  const [formAdSoyad, setFormAdSoyad] = useState('');
  const [formSantiye, setFormSantiye] = useState('');
  const [formTutar, setFormTutar] = useState('');
  const [formTarih, setFormTarih] = useState(() => new Date().toISOString().slice(0, 10));
  const [formBordroDonem, setFormBordroDonem] = useState(() => new Date().toISOString().slice(0, 7));
  const [formAciklama, setFormAciklama] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SQL Kodu Modalı
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Seçili Personel Detay Modalı
  const [selectedPersonel, setSelectedPersonel] = useState<PersonelAvansBakiyeRow | null>(null);

  // Güncelleme (Düzenleme) Modalı
  const [editTarget, setEditTarget] = useState<
    | { type: 'odenen'; item: PersonelAvansOdenenRow }
    | { type: 'kesilen'; item: PersonelAvansKesilenRow }
    | { type: 'bakiye'; item: PersonelAvansBakiyeRow }
    | null
  >(null);
  const [editTc, setEditTc] = useState('');
  const [editAdSoyad, setEditAdSoyad] = useState('');
  const [editSantiye, setEditSantiye] = useState('');
  const [editTutar, setEditTutar] = useState('');
  const [editTarih, setEditTarih] = useState('');
  const [editBordroDonem, setEditBordroDonem] = useState('');
  const [editAciklama, setEditAciklama] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Silme Onay Modalı
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<
    | { type: 'odenen'; item: PersonelAvansOdenenRow }
    | { type: 'kesilen'; item: PersonelAvansKesilenRow }
    | { type: 'bakiye'; item: PersonelAvansBakiyeRow }
    | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedTc, setCopiedTc] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatTRY = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '0,00 ₺';
    return (
      new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ' ₺'
    );
  };

  const formatDateTR = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const clean = dateStr.split('T')[0];
      const p = clean.split('-');
      if (p.length === 3) return `${p[2]}.${p[1]}.${p[0]}`;
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Verileri Supabase'den Yükle
  const loadAllData = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
      playClickSound();
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      setSantiyeLoading(true);
      const [bakiyeRes, odenenRes, kesilenRes, santiyelerData] = await Promise.all([
        fetchPersonelAvansBakiyeFromSupabase(),
        fetchPersonelAvansOdenenFromSupabase(),
        fetchPersonelAvansKesilenFromSupabase(),
        fetchSantiyeIsimleriFromSupabase(),
      ]);

      if (bakiyeRes.data) {
        setBakiyeList(bakiyeRes.data);
      }
      if (odenenRes.data) {
        setOdenenList(odenenRes.data);
      }
      if (kesilenRes.data) {
        setKesilenList(kesilenRes.data);
      }

      if (santiyelerData && santiyelerData.length > 0) {
        const names = Array.from(
          new Set(santiyelerData.map((s) => extractSantiyeName(s)).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b, 'tr'));
        setSantiyeListesi(names);
        if (names.length > 0) {
          setFormSantiye((prev) => (prev ? prev : names[0]));
        }
      }

      if (bakiyeRes.error && bakiyeRes.data.length === 0) {
        setError(bakiyeRes.error);
      }

      if (isManual) {
        showToast('Supabase public.v_personel_avans_bakiye tablosu güncellendi.');
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
    loadAllData(false);
  }, []);

  // TC Kopyalama
  const handleCopyTc = (tc: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      navigator.clipboard.writeText(tc);
      setCopiedTc(tc);
      playClickSound();
      showToast(`TC No kopyalandı: ${tc}`);
      setTimeout(() => setCopiedTc(null), 2500);
    } catch {
      // ignore
    }
  };

  // SQL Kopyalama
  const handleCopySql = () => {
    try {
      navigator.clipboard.writeText(PERSONEL_AVANS_TABLES_SQL_SCRIPT);
      setSqlCopied(true);
      playClickSound();
      showToast('Supabase SQL kodu panoya kopyalandı.');
      setTimeout(() => setSqlCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  // Yeni Kayıt Kaydet (Ödenen veya Kesilen)
  const handleSubmitNewRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAdSoyad.trim()) {
      showToast('Lütfen personel adı ve soyadını giriniz.');
      return;
    }
    const parsedTutar = parseFloat(formTutar.replace(/\./g, '').replace(',', '.'));
    if (isNaN(parsedTutar) || parsedTutar <= 0) {
      showToast('Lütfen geçerli bir tutar giriniz.');
      return;
    }

    setIsSubmitting(true);
    playClickSound();

    try {
      if (showAddModal === 'odenen') {
        const res = await insertPersonelAvansOdenenToSupabase({
          tcno: formTc.trim() || '11111111111',
          adisoyadi: formAdSoyad.trim(),
          santiyesi: formSantiye.trim(),
          odenen: parsedTutar,
          tarih: formTarih,
          aciklama: formAciklama.trim(),
        });
        if (res.success) {
          showToast('Yeni avans ödemesi Supabase personelavans tablosuna eklendi.');
        } else {
          showToast(res.error || 'Ödeme kaydı eklendi.');
        }
      } else if (showAddModal === 'kesilen') {
        const res = await insertPersonelAvansKesilenToSupabase({
          tcno: formTc.trim() || '11111111111',
          adisoyadi: formAdSoyad.trim(),
          santiyesi: formSantiye.trim(),
          kesilen: parsedTutar,
          tarih: formTarih,
          bordro_donemi: formBordroDonem,
          aciklama: formAciklama.trim(),
        });
        if (res.success) {
          showToast('Avans kesintisi Supabase personelavanskesilen tablosuna eklendi.');
        } else {
          showToast(res.error || 'Kesinti kaydı eklendi.');
        }
      }

      // Temizle ve yeniden yükle
      setShowAddModal(null);
      setFormTc('');
      setFormAdSoyad('');
      setFormTutar('');
      setFormAciklama('');
      await loadAllData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Hata: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Düzenleme / Güncelleme Modalını Aç
  const handleOpenEditModal = (
    type: 'bakiye' | 'odenen' | 'kesilen',
    item: PersonelAvansBakiyeRow | PersonelAvansOdenenRow | PersonelAvansKesilenRow
  ) => {
    if (type === 'odenen') {
      const o = item as PersonelAvansOdenenRow;
      setEditTarget({ type: 'odenen', item: o });
      setEditTc(o.tcno || '');
      setEditAdSoyad(o.adisoyadi || '');
      setEditSantiye(o.santiyesi || '');
      setEditTutar(o.odenen ? String(o.odenen) : '');
      setEditTarih(o.tarih ? o.tarih.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setEditBordroDonem('');
      setEditAciklama(o.aciklama || '');
    } else if (type === 'kesilen') {
      const k = item as PersonelAvansKesilenRow;
      setEditTarget({ type: 'kesilen', item: k });
      setEditTc(k.tcno || '');
      setEditAdSoyad(k.adisoyadi || '');
      setEditSantiye(k.santiyesi || '');
      setEditTutar(k.kesilen ? String(k.kesilen) : '');
      setEditTarih(k.tarih ? k.tarih.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setEditBordroDonem(k.bordro_donemi || '');
      setEditAciklama(k.aciklama || '');
    } else {
      const b = item as PersonelAvansBakiyeRow;
      setEditTarget({ type: 'bakiye', item: b });
      setEditTc(b.tcno || '');
      setEditAdSoyad(b.adisoyadi || '');
      setEditSantiye(b.santiyesi || '');
      setEditTutar('');
      setEditTarih('');
      setEditBordroDonem('');
      setEditAciklama('');
    }
  };

  // Güncellemeyi Kaydet
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    if (!editAdSoyad.trim()) {
      showToast('Personel Adı Soyadı alanı zorunludur.');
      return;
    }

    setIsUpdating(true);
    try {
      if (editTarget.type === 'odenen') {
        const cleanTutar = parseFloat(
          editTutar.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')
        );
        if (isNaN(cleanTutar) || cleanTutar <= 0) {
          showToast('Geçerli bir ödenen tutar giriniz.');
          setIsUpdating(false);
          return;
        }

        const res = await updatePersonelAvansOdenenInSupabase(editTarget.item.id, {
          tcno: editTc.trim(),
          adisoyadi: editAdSoyad.trim(),
          santiyesi: editSantiye.trim(),
          odenen: cleanTutar,
          tarih: editTarih,
          aciklama: editAciklama.trim() || undefined,
        });

        if (!res.success) {
          throw new Error(res.error || 'Ödeme kaydı güncellenemedi');
        }
        showToast('Ödenen avans kaydı başarıyla güncellendi.');
      } else if (editTarget.type === 'kesilen') {
        const cleanTutar = parseFloat(
          editTutar.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')
        );
        if (isNaN(cleanTutar) || cleanTutar <= 0) {
          showToast('Geçerli bir kesinti tutarı giriniz.');
          setIsUpdating(false);
          return;
        }

        const res = await updatePersonelAvansKesilenInSupabase(editTarget.item.id, {
          tcno: editTc.trim(),
          adisoyadi: editAdSoyad.trim(),
          santiyesi: editSantiye.trim(),
          kesilen: cleanTutar,
          bordro_donemi: editBordroDonem || undefined,
          tarih: editTarih,
          aciklama: editAciklama.trim() || undefined,
        });

        if (!res.success) {
          throw new Error(res.error || 'Kesinti kaydı güncellenemedi');
        }
        showToast('Kesilen avans kaydı başarıyla güncellendi.');
      } else if (editTarget.type === 'bakiye') {
        const res = await updatePersonelAvansPersonelInfoInSupabase(
          editTarget.item.tcno,
          editTarget.item.adisoyadi,
          {
            tcno: editTc.trim() || undefined,
            adisoyadi: editAdSoyad.trim(),
            santiyesi: editSantiye.trim() || undefined,
          }
        );

        if (!res.success) {
          throw new Error(res.error || 'Personel bilgileri güncellenemedi');
        }
        showToast('Personel bilgileri tablolarda başarıyla güncellendi.');
      }

      setEditTarget(null);
      await loadAllData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Hata: ${msg}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Silme Onay Modalını Aç
  const handleOpenDeleteModal = (
    type: 'bakiye' | 'odenen' | 'kesilen',
    item: PersonelAvansBakiyeRow | PersonelAvansOdenenRow | PersonelAvansKesilenRow
  ) => {
    setDeleteConfirmTarget({ type, item } as any);
  };

  // Silmeyi Onayla ve Gerçekleştir
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;

    setIsDeleting(true);
    try {
      if (deleteConfirmTarget.type === 'odenen') {
        const res = await deletePersonelAvansOdenenFromSupabase(deleteConfirmTarget.item.id);
        if (!res.success) throw new Error(res.error || 'Silme işlemi başarısız');
        showToast('Ödenen avans kaydı silindi.');
      } else if (deleteConfirmTarget.type === 'kesilen') {
        const res = await deletePersonelAvansKesilenFromSupabase(deleteConfirmTarget.item.id);
        if (!res.success) throw new Error(res.error || 'Silme işlemi başarısız');
        showToast('Kesilen avans kaydı silindi.');
      } else if (deleteConfirmTarget.type === 'bakiye') {
        const res = await deletePersonelAvansAllForPersonelFromSupabase(
          deleteConfirmTarget.item.tcno,
          deleteConfirmTarget.item.adisoyadi
        );
        if (!res.success) throw new Error(res.error || 'Silme işlemi başarısız');
        showToast('Personele ait tüm avans ve kesinti kayıtları başarıyla silindi.');
      }

      setDeleteConfirmTarget(null);
      if (
        selectedPersonel &&
        deleteConfirmTarget.type === 'bakiye' &&
        (selectedPersonel.tcno === (deleteConfirmTarget.item as PersonelAvansBakiyeRow).tcno ||
          selectedPersonel.adisoyadi === (deleteConfirmTarget.item as PersonelAvansBakiyeRow).adisoyadi)
      ) {
        setSelectedPersonel(null);
      }
      await loadAllData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Hata: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Mevcut Şantiye Listesi (public.santiyeisimleri + girilmiş kayıtlar)
  const availableSantiyeler = useMemo(() => {
    const set = new Set<string>();
    santiyeListesi.forEach((s) => s && set.add(s.trim()));
    bakiyeList.forEach((b) => b.santiyesi && set.add(b.santiyesi.trim()));
    odenenList.forEach((o) => o.santiyesi && set.add(o.santiyesi.trim()));
    kesilenList.forEach((k) => k.santiyesi && set.add(k.santiyesi.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [santiyeListesi, bakiyeList, odenenList, kesilenList]);

  // Modal Listbox için Şantiye Seçenekleri: public.santiyeisimleri tablosu verileri
  const modalSantiyeOptions = useMemo(() => {
    const set = new Set<string>();
    santiyeListesi.forEach((s) => s && set.add(s.trim()));
    availableSantiyeler.forEach((s) => s && set.add(s.trim()));
    if (formSantiye && formSantiye.trim()) set.add(formSantiye.trim());
    if (editSantiye && editSantiye.trim()) set.add(editSantiye.trim());
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [santiyeListesi, availableSantiyeler, formSantiye, editSantiye]);

  // İstatistikler (KPI)
  const stats = useMemo(() => {
    const totalPersonel = bakiyeList.length;
    const totalOdenen = bakiyeList.reduce((sum, b) => sum + (Number(b.toplam_odenen) || 0), 0);
    const totalKesilen = bakiyeList.reduce((sum, b) => sum + (Number(b.toplam_kesilen) || 0), 0);
    const totalKalan = bakiyeList.reduce((sum, b) => sum + (Number(b.kalan_avans_bakiyesi) || 0), 0);
    const borcluPersonelSayisi = bakiyeList.filter((b) => (Number(b.kalan_avans_bakiyesi) || 0) > 0).length;
    const sifirlananSayisi = bakiyeList.filter((b) => (Number(b.kalan_avans_bakiyesi) || 0) <= 0).length;

    return {
      totalPersonel,
      totalOdenen,
      totalKesilen,
      totalKalan,
      borcluPersonelSayisi,
      sifirlananSayisi,
    };
  }, [bakiyeList]);

  // Filtrelenmiş Bakiye Listesi
  const filteredBakiye = useMemo(() => {
    return bakiyeList.filter((item) => {
      // 1. Arama
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tc = String(item.tcno || '').toLowerCase();
        const ad = String(item.adisoyadi || '').toLowerCase();
        const santiye = String(item.santiyesi || '').toLowerCase();
        if (!tc.includes(q) && !ad.includes(q) && !santiye.includes(q)) {
          return false;
        }
      }

      // 2. Şantiye
      if (selectedSantiye !== 'TÜMÜ' && item.santiyesi !== selectedSantiye) {
        return false;
      }

      // 3. Bakiye Durumu
      const kalan = Number(item.kalan_avans_bakiyesi) || 0;
      if (selectedBakiyeDurumu === 'BORCLU' && kalan <= 0) return false;
      if (selectedBakiyeDurumu === 'SIFIR' && kalan > 0) return false;

      return true;
    });
  }, [bakiyeList, searchQuery, selectedSantiye, selectedBakiyeDurumu]);

  // Filtrelenmiş Ödenen Listesi
  const filteredOdenen = useMemo(() => {
    return odenenList.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tc = String(item.tcno || '').toLowerCase();
        const ad = String(item.adisoyadi || '').toLowerCase();
        const santiye = String(item.santiyesi || '').toLowerCase();
        const acik = String(item.aciklama || '').toLowerCase();
        if (!tc.includes(q) && !ad.includes(q) && !santiye.includes(q) && !acik.includes(q)) {
          return false;
        }
      }
      if (selectedSantiye !== 'TÜMÜ' && item.santiyesi !== selectedSantiye) {
        return false;
      }
      return true;
    });
  }, [odenenList, searchQuery, selectedSantiye]);

  // Filtrelenmiş Kesilen Listesi
  const filteredKesilen = useMemo(() => {
    return kesilenList.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tc = String(item.tcno || '').toLowerCase();
        const ad = String(item.adisoyadi || '').toLowerCase();
        const santiye = String(item.santiyesi || '').toLowerCase();
        const acik = String(item.aciklama || '').toLowerCase();
        const donem = String(item.bordro_donemi || '').toLowerCase();
        if (!tc.includes(q) && !ad.includes(q) && !santiye.includes(q) && !acik.includes(q) && !donem.includes(q)) {
          return false;
        }
      }
      if (selectedSantiye !== 'TÜMÜ' && item.santiyesi !== selectedSantiye) {
        return false;
      }
      return true;
    });
  }, [kesilenList, searchQuery, selectedSantiye]);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col relative overflow-hidden font-sans select-none">
      {/* Arka Plan Yumuşak Ambiyans Işıkları */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-1/4 w-[550px] h-[300px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[300px] bg-amber-600/10 rounded-full blur-[140px]" />
      </div>

      {/* ÜST BAŞLIK (HEADER) */}
      <header className="relative z-10 border-b border-white/10 bg-[#0c101a]/85 backdrop-blur-md sticky top-0">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-3.5 flex items-center justify-between gap-3">
          {/* Sol: Geri Dön & Başlık */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onBack();
              }}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Ödeme Talepleri Sayfasına Geri Dön"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Ödeme Talepleri</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <span>PERSONEL AVANS & BAKİYE TABLOSU</span>
                  </h1>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                    v_personel_avans_bakiye
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  BAYBURT ÖZKA İNŞAAT A.Ş. • Canlı Supabase Avans Ödeme, Kesinti ve Kalan Bakiye Portalı
                </p>
              </div>
            </div>
          </div>

          {/* Sağ: Yenile & Yeni Ekle Butonları */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadAllData(true)}
              disabled={refreshing}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Supabase tablosundan verileri tekrar yükle"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>

            {/* Yeni Ekle Butonları */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowAddModal('odenen');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-600/25 flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Yeni Avans Ödemesi Kaydet (personelavans)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Ödeme Ekle</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowAddModal('kesilen');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Maaştan Kesilen Avans Kaydet (personelavanskesilen)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Kesinti Ekle</span>
            </button>
          </div>
        </div>
      </header>

      {/* TOAST BİLDİRİMİ */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="fixed top-16 right-4 sm:right-8 z-50 p-3.5 rounded-2xl bg-indigo-950/90 border border-indigo-500/40 text-xs sm:text-sm text-indigo-200 flex items-center gap-3 shadow-2xl backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-1 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ANA İÇERİK */}
      <main className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-6 flex-1 relative z-10 w-full">
        {/* HATA MESAJI */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs sm:text-sm text-rose-200 flex items-start justify-between gap-3 backdrop-blur-md">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Supabase Bağlantı Uyarısı:</p>
                <p className="text-rose-300/80 mt-0.5">{error}</p>
                <p className="text-[11px] text-rose-400 mt-1">
                  Eğer tabloları henüz oluşturmadıysanız sağ üstteki <strong>"SQL Kodu"</strong> butonundan SQL scriptini kopyalayıp Supabase SQL Editor'de çalıştırabilirsiniz.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* KPI İSTATİSTİK KARTLARI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Kayıtlı Personel */}
          <div className="p-4 rounded-2xl bg-[#0c101a]/90 border border-white/10 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Kayıtlı Personel</span>
              <UserCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {stats.totalPersonel} <span className="text-xs font-normal text-slate-400">Kişi</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats.borcluPersonelSayisi} personelin açık avansı var
            </div>
          </div>

          {/* 2. Toplam Ödenen Avans */}
          <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-blue-300 mb-1 font-bold">
              <span>Toplam Ödenen Avans</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-200 font-mono">
              {formatTRY(stats.totalOdenen)}
            </div>
            <div className="text-[11px] text-blue-300/80 mt-1 font-mono">
              public.personelavans
            </div>
          </div>

          {/* 3. Toplam Kesilen / Mahsup Edilen */}
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-emerald-300 mb-1 font-bold">
              <span>Toplam Kesilen / Mahsup</span>
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-200 font-mono">
              {formatTRY(stats.totalKesilen)}
            </div>
            <div className="text-[11px] text-emerald-300/80 mt-1 font-mono">
              public.personelavanskesilen
            </div>
          </div>

          {/* 4. Net Kalan Avans Bakiyesi */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 backdrop-blur-sm relative overflow-hidden shadow-lg shadow-amber-500/10">
            <div className="flex items-center justify-between text-xs text-amber-300 mb-1 font-bold">
              <span>Net Kalan Avans Borcu</span>
              <Wallet className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-200 font-mono">
              {formatTRY(stats.totalKalan)}
            </div>
            <div className="text-[11px] text-amber-300 font-bold mt-1">
              Ödenen - Kesilen = Kalan
            </div>
          </div>
        </div>

        {/* TAB VE FİLTRE ÇUBUĞU */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          {/* Tab Seçimi */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('bakiye');
              }}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'bakiye'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Bakiye Tablosu ({bakiyeList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('odenen');
              }}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'odenen'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Ödenen Avanslar ({odenenList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('kesilen');
              }}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'kesilen'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Kesilen Avanslar ({kesilenList.length})</span>
            </button>
          </div>

          {/* Arama ve Filtreler */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Arama Inputu */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="TC No, Personel veya Şantiye ara..."
                className="w-full pl-9 pr-7 py-2 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 outline-none focus:border-indigo-400 transition-colors"
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

            {/* Şantiye Filtresi */}
            {availableSantiyeler.length > 0 && (
              <select
                value={selectedSantiye}
                onChange={(e) => setSelectedSantiye(e.target.value)}
                className="px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-slate-200 outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option value="TÜMÜ">Tüm Şantiyeler</option>
                {availableSantiyeler.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}

            {/* Bakiye Durumu (Sadece Bakiye sekmesinde) */}
            {activeTab === 'bakiye' && (
              <select
                value={selectedBakiyeDurumu}
                onChange={(e) => setSelectedBakiyeDurumu(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-slate-200 outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option value="TÜMÜ">Tüm Durumlar</option>
                <option value="BORCLU">Borcu Olanlar (Kalan &gt; 0)</option>
                <option value="SIFIR">Borcu Kapananlar (Kalan = 0)</option>
              </select>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
              title="Mevcut Tabloyu Yazdır / PDF Kaydet"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TABLOLAR */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-300 font-bold">Supabase verileri yükleniyor...</p>
            <p className="text-xs text-slate-500">public.v_personel_avans_bakiye tablosu sorgulanıyor</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xl">
            {/* 1. SEKME: BAKİYE TABLOSU */}
            {activeTab === 'bakiye' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                      <th className="py-3 px-4">TC Kimlik No</th>
                      <th className="py-3 px-4">Personel Adı Soyadı</th>
                      <th className="py-3 px-4">Şantiyesi</th>
                      <th className="py-3 px-4 text-right">Toplam Ödenen</th>
                      <th className="py-3 px-4 text-right">Toplam Kesilen</th>
                      <th className="py-3 px-4 text-right">Kalan Bakiye</th>
                      <th className="py-3 px-4 text-center">Durum</th>
                      <th className="py-3 px-4 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans bg-white">
                    {filteredBakiye.length > 0 ? (
                      filteredBakiye.map((item, index) => {
                        const kalan = Number(item.kalan_avans_bakiyesi) || 0;
                        const isBorclu = kalan > 0;
                        return (
                          <tr
                            key={item.tcno || index}
                            className="hover:bg-slate-50 transition-colors group bg-white"
                          >
                            {/* TC Kimlik No */}
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <span>{item.tcno || '-'}</span>
                                {item.tcno && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyTc(item.tcno, e)}
                                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                    title="TC Kimlik No Kopyala"
                                  >
                                    {copiedTc === item.tcno ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Personel Adı Soyadı */}
                            <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {item.adisoyadi || '-'}
                            </td>

                            {/* Şantiyesi */}
                            <td className="py-3.5 px-4 text-slate-700">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700">
                                <Building2 className="w-3 h-3 text-slate-500" />
                                <span>{item.santiyesi || '-'}</span>
                              </span>
                            </td>

                            {/* Toplam Ödenen */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-700">
                              {formatTRY(item.toplam_odenen)}
                            </td>

                            {/* Toplam Kesilen */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                              {formatTRY(item.toplam_kesilen)}
                            </td>

                            {/* Kalan Bakiye */}
                            <td className="py-3.5 px-4 text-right font-mono font-black text-sm">
                              <span
                                className={
                                  isBorclu
                                    ? 'text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-300 shadow-xs'
                                    : 'text-slate-500 font-bold'
                                }
                              >
                                {formatTRY(item.kalan_avans_bakiyesi)}
                              </span>
                            </td>

                            {/* Durum Rozeti */}
                            <td className="py-3.5 px-4 text-center">
                              {isBorclu ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>Avans Borcu Var</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  <Check className="w-3 h-3 text-emerald-700" />
                                  <span>Bakiye Sıfırlandı</span>
                                </span>
                              )}
                            </td>

                            {/* İşlem: Yalnızca Ekstre */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  setSelectedPersonel(item);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-all inline-flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
                                title="Personel Avans Ekstresi Görüntüle"
                              >
                                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Ekstre</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-slate-500 space-y-2 bg-white">
                          <Wallet className="w-10 h-10 mx-auto text-slate-400 mb-1" />
                          <p className="font-bold text-slate-800">
                            {bakiyeList.length === 0
                              ? 'Supabase v_personel_avans_bakiye tablosunda henüz kayıt bulunamadı.'
                              : 'Arama kriterlerine uygun kayıt bulunamadı.'}
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowAddModal('odenen')}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-sm"
                            >
                              + Yeni Avans Ödemesi Ekle
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowSqlModal(true)}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-all cursor-pointer shadow-sm"
                            >
                              Supabase SQL Kodunu Aç
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. SEKME: ÖDENEN AVANSLAR (personelavans) */}
            {activeTab === 'odenen' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                      <th className="py-3 px-4">TC Kimlik No</th>
                      <th className="py-3 px-4">Personel Adı Soyadı</th>
                      <th className="py-3 px-4">Şantiyesi</th>
                      <th className="py-3 px-4 text-right">Ödenen Tutar</th>
                      <th className="py-3 px-4">Tarih</th>
                      <th className="py-3 px-4">Açıklama</th>
                      <th className="py-3 px-4 text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans bg-white">
                    {filteredOdenen.length > 0 ? (
                      filteredOdenen.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-slate-50 transition-colors bg-white">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                            {item.tcno}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {item.adisoyadi}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700">
                              {item.santiyesi}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-blue-700 text-sm">
                            {formatTRY(item.odenen)}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {formatDateTR(item.tarih)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                            {item.aciklama || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  handleOpenEditModal('odenen', item);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
                                title="Ödeme Kaydını Güncelle"
                              >
                                <Pencil className="w-3 h-3 text-amber-700" />
                                <span>Güncelle</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  handleOpenDeleteModal('odenen', item);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
                                title="Ödeme Kaydını Sil"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>Sil</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 bg-white">
                          Ödenen avans kaydı bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. SEKME: KESİLEN AVANSLAR (personelavanskesilen) */}
            {activeTab === 'kesilen' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                      <th className="py-3 px-4">TC Kimlik No</th>
                      <th className="py-3 px-4">Personel Adı Soyadı</th>
                      <th className="py-3 px-4">Şantiyesi</th>
                      <th className="py-3 px-4 text-right">Kesilen Tutar</th>
                      <th className="py-3 px-4">Bordro Dönemi</th>
                      <th className="py-3 px-4">Tarih</th>
                      <th className="py-3 px-4">Açıklama</th>
                      <th className="py-3 px-4 text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans bg-white">
                    {filteredKesilen.length > 0 ? (
                      filteredKesilen.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-slate-50 transition-colors bg-white">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                            {item.tcno}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {item.adisoyadi}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700">
                              {item.santiyesi}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                            {formatTRY(item.kesilen)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px]">
                              {item.bordro_donemi || '-'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {formatDateTR(item.tarih)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                            {item.aciklama || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  handleOpenEditModal('kesilen', item);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
                                title="Kesinti Kaydını Güncelle"
                              >
                                <Pencil className="w-3 h-3 text-amber-700" />
                                <span>Güncelle</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  handleOpenDeleteModal('kesilen', item);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
                                title="Kesinti Kaydını Sil"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>Sil</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500 bg-white">
                          Kesilen avans kaydı bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ALT BAR */}
      <footer className="relative z-10 py-4 px-4 sm:px-8 lg:px-10 border-t border-white/10 bg-[#0c101a]/90 text-xs text-slate-400">
        <div className="max-w-[1680px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>Tablo: </span>
            <code className="text-indigo-300 font-mono font-bold">
              mgtunrfpzbyfnmeloeeq.public.{activeTab === 'bakiye' ? 'v_personel_avans_bakiye' : activeTab === 'odenen' ? 'personelavans' : 'personelavanskesilen'}
            </code>
          </div>
          <p>© Bayburt Öz-Ka İnş.İth.İhr.Tic.Ltd.Şti • Personel Avans Portalı</p>
        </div>
      </footer>

      {/* YENİ KAYIT EKLEME MODALI */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={() => setShowAddModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl bg-slate-950 border border-indigo-500/30 p-6 shadow-2xl text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl text-white ${
                    showAddModal === 'odenen'
                      ? 'bg-blue-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {showAddModal === 'odenen'
                      ? 'Yeni Avans Ödemesi Ekle'
                      : 'Yeni Avans Kesintisi Ekle'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {showAddModal === 'odenen'
                      ? 'public.personelavans tablosuna kayıt oluşturulur'
                      : 'public.personelavanskesilen tablosuna kayıt oluşturulur'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewRecord} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-white font-bold mb-1.5 text-xs">TC Kimlik No (11 hane)</label>
                <input
                  type="text"
                  maxLength={11}
                  value={formTc}
                  onChange={(e) => setFormTc(e.target.value.replace(/\D/g, ''))}
                  placeholder="Örn: 28475910382"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold outline-none focus:border-indigo-400 placeholder-slate-400 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-white font-bold mb-1.5 text-xs">Personel Adı Soyadı *</label>
                <input
                  type="text"
                  required
                  value={formAdSoyad}
                  onChange={(e) => setFormAdSoyad(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-indigo-400 placeholder-slate-400 shadow-inner"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-white font-bold text-xs">
                    Şantiyesi / Proje *
                  </label>
                  <a
                    href={SUPABASE_SANTIYE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-semibold"
                    title="Supabase santiyeisimleri tablosunu aç"
                  >
                    <span>santiyeisimleri</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <select
                  required
                  value={formSantiye}
                  onChange={(e) => setFormSantiye(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-indigo-400 cursor-pointer shadow-inner"
                >
                  <option value="" disabled className="bg-slate-900 text-slate-400">
                    {santiyeLoading ? 'Şantiyeler yükleniyor...' : 'Şantiye Seçiniz...'}
                  </option>
                  {modalSantiyeOptions.map((s) => (
                    <option key={s} value={s} className="bg-slate-900 text-white font-semibold">
                      {s}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Veriler <span className="text-indigo-300 font-mono">public.santiyeisimleri</span> tablosunun şantiye adından çekilmektedir.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white font-bold mb-1.5 text-xs">
                    {showAddModal === 'odenen' ? 'Ödenen Tutar (₺) *' : 'Kesilen Tutar (₺) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formTutar}
                    onChange={(e) => setFormTutar(e.target.value)}
                    placeholder="Örn: 15.000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold outline-none focus:border-indigo-400 placeholder-slate-400 shadow-inner"
                  />
                </div>

                {showAddModal === 'kesilen' ? (
                  <div>
                    <label className="block text-white font-bold mb-1.5 text-xs">Bordro Dönemi</label>
                    <input
                      type="month"
                      value={formBordroDonem}
                      onChange={(e) => setFormBordroDonem(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold outline-none focus:border-indigo-400 shadow-inner"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-white font-bold mb-1.5 text-xs">İşlem Tarihi</label>
                    <input
                      type="date"
                      value={formTarih}
                      onChange={(e) => setFormTarih(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold outline-none focus:border-indigo-400 shadow-inner"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-white font-bold mb-1.5 text-xs">Açıklama / Not</label>
                <input
                  type="text"
                  value={formAciklama}
                  onChange={(e) => setFormAciklama(e.target.value)}
                  placeholder="Banka dekont no, mahsup şekli veya avans sebebi..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-indigo-400 placeholder-slate-400 shadow-inner"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 rounded-xl font-black text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    showAddModal === 'odenen'
                      ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Kaydediliyor...' : 'Supabase Tablosuna Kaydet'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* SQL KODU MODALI */}
      {showSqlModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md overflow-y-auto"
          onClick={() => setShowSqlModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-950 border border-amber-500/40 p-5 sm:p-7 shadow-2xl text-slate-100 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                  <Database className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Supabase SQL Tablo Kurulum Kodu</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      public.v_personel_avans_bakiye
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Hedef Proje: <code className="text-amber-300 font-mono">mgtunrfpzbyfnmeloeeq</code> (Editor ID: 20656)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-slate-400">
                Aşağıdaki kodu Supabase SQL Editor'de çalıştırarak tabloları ve görünümü oluşturabilirsiniz.
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
                  sqlCopied
                    ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/25'
                }`}
              >
                {sqlCopied ? (
                  <>
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>Kopyalandı!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-950" />
                    <span>SQL Kodunu Kopyala</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-amber-200/90 leading-relaxed select-all">
              <pre className="whitespace-pre-wrap">{PERSONEL_AVANS_TABLES_SQL_SCRIPT}</pre>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* PERSONEL EKSTRE MODALI */}
      {selectedPersonel && (() => {
        const pOdenenler = odenenList.filter((o) =>
          selectedPersonel.tcno && o.tcno
            ? o.tcno === selectedPersonel.tcno
            : o.adisoyadi.toLowerCase() === selectedPersonel.adisoyadi.toLowerCase()
        );
        const pKesilenler = kesilenList.filter((k) =>
          selectedPersonel.tcno && k.tcno
            ? k.tcno === selectedPersonel.tcno
            : k.adisoyadi.toLowerCase() === selectedPersonel.adisoyadi.toLowerCase()
        );

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
            onClick={() => setSelectedPersonel(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-950 border border-indigo-500/30 p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 overflow-hidden"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-3 flex-shrink-0">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{selectedPersonel.adisoyadi}</span>
                    <span className="text-xs text-slate-400 font-mono">({selectedPersonel.tcno || 'TC Yok'})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Şantiye: <span className="text-slate-200 font-bold">{selectedPersonel.santiyesi || '-'}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPersonel(null)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Bakiye Özeti Kartı */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 text-center font-mono flex-shrink-0">
                <div>
                  <span className="text-[11px] text-slate-400 block">Toplam Ödenen</span>
                  <span className="text-sm font-black text-blue-300">{formatTRY(selectedPersonel.toplam_odenen)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Toplam Kesilen</span>
                  <span className="text-sm font-black text-emerald-300">{formatTRY(selectedPersonel.toplam_kesilen)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-amber-300 block font-bold">Kalan Borç Bakiyesi</span>
                  <span className="text-sm font-black text-amber-300">{formatTRY(selectedPersonel.kalan_avans_bakiyesi)}</span>
                </div>
              </div>

              {/* Hareketler Listesi */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                {/* 1. Ödenen Hareketleri */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <div className="px-3.5 py-2 bg-blue-50 border-b border-slate-200 text-blue-900 font-bold flex items-center justify-between">
                    <span>Ödenen Avans Hareketleri ({pOdenenler.length})</span>
                    <span className="text-[11px] font-mono text-blue-700">public.personelavans</span>
                  </div>
                  {pOdenenler.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold text-[11px] border-b border-slate-200">
                            <th className="py-2 px-3">Tarih</th>
                            <th className="py-2 px-3 text-right">Tutar</th>
                            <th className="py-2 px-3">Açıklama</th>
                            <th className="py-2 px-3 text-center">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {pOdenenler.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-slate-600">{formatDateTR(item.tarih)}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">{formatTRY(item.odenen)}</td>
                              <td className="py-2 px-3 text-slate-600 text-[11px]">{item.aciklama || '-'}</td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal('odenen', item)}
                                    className="p-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                                    title="Düzenle"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDeleteModal('odenen', item)}
                                    className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                                    title="Sil"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-400 bg-white">Ödenen avans kaydı bulunmuyor.</div>
                  )}
                </div>

                {/* 2. Kesilen Hareketleri */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <div className="px-3.5 py-2 bg-emerald-50 border-b border-slate-200 text-emerald-900 font-bold flex items-center justify-between">
                    <span>Maaştan Kesilen Avanslar ({pKesilenler.length})</span>
                    <span className="text-[11px] font-mono text-emerald-700">public.personelavanskesilen</span>
                  </div>
                  {pKesilenler.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold text-[11px] border-b border-slate-200">
                            <th className="py-2 px-3">Tarih</th>
                            <th className="py-2 px-3">Bordro Dönemi</th>
                            <th className="py-2 px-3 text-right">Kesilen</th>
                            <th className="py-2 px-3">Açıklama</th>
                            <th className="py-2 px-3 text-center">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {pKesilenler.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-slate-600">{formatDateTR(item.tarih)}</td>
                              <td className="py-2 px-3 font-mono text-indigo-700 font-bold">{item.bordro_donemi || '-'}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{formatTRY(item.kesilen)}</td>
                              <td className="py-2 px-3 text-slate-600 text-[11px]">{item.aciklama || '-'}</td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal('kesilen', item)}
                                    className="p-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                                    title="Düzenle"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDeleteModal('kesilen', item)}
                                    className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                                    title="Sil"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-400 bg-white">Kesilen avans kaydı bulunmuyor.</div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormTc(selectedPersonel.tcno || '');
                      setFormAdSoyad(selectedPersonel.adisoyadi || '');
                      setFormSantiye(selectedPersonel.santiyesi || 'Merkez Yönetim Ofisi');
                      setShowAddModal('odenen');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    + Ödeme Ekle
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormTc(selectedPersonel.tcno || '');
                      setFormAdSoyad(selectedPersonel.adisoyadi || '');
                      setFormSantiye(selectedPersonel.santiyesi || 'Merkez Yönetim Ofisi');
                      setShowAddModal('kesilen');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    + Kesinti Ekle
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPersonel(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* GÜNCELLEME MODALI */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={() => setEditTarget(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-amber-500/40 p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editTarget.type === 'bakiye'
                      ? 'Personel Bilgilerini Güncelle'
                      : editTarget.type === 'odenen'
                      ? 'Ödenen Avans Kaydını Güncelle'
                      : 'Kesilen Avans Kaydını Güncelle'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editTarget.type === 'bakiye'
                      ? 'Personel adı, TC kimlik ve şantiye bilgisi güncellenir'
                      : editTarget.type === 'odenen'
                      ? 'public.personelavans tablosundaki kayıt güncellenir'
                      : 'public.personelavanskesilen tablosundaki kayıt güncellenir'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-white font-bold mb-1.5 text-xs">TC Kimlik No (11 hane)</label>
                <input
                  type="text"
                  maxLength={11}
                  value={editTc}
                  onChange={(e) => setEditTc(e.target.value.replace(/\D/g, ''))}
                  placeholder="Örn: 28475910382"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold outline-none focus:border-amber-400 placeholder-slate-400 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-white font-bold mb-1.5 text-xs">Personel Adı Soyadı *</label>
                <input
                  type="text"
                  required
                  value={editAdSoyad}
                  onChange={(e) => setEditAdSoyad(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-amber-400 placeholder-slate-400 shadow-inner"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-white font-bold text-xs">
                    Şantiyesi / Proje *
                  </label>
                  <a
                    href={SUPABASE_SANTIYE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-semibold"
                    title="Supabase santiyeisimleri tablosunu aç"
                  >
                    <span>santiyeisimleri</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <select
                  required
                  value={editSantiye}
                  onChange={(e) => setEditSantiye(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-amber-400 cursor-pointer shadow-inner"
                >
                  <option value="" disabled className="bg-slate-900 text-slate-400">
                    {santiyeLoading ? 'Şantiyeler yükleniyor...' : 'Şantiye Seçiniz...'}
                  </option>
                  {modalSantiyeOptions.map((s) => (
                    <option key={s} value={s} className="bg-slate-900 text-white font-semibold">
                      {s}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Veriler <span className="text-indigo-300 font-mono">public.santiyeisimleri</span> tablosunun şantiye adından çekilmektedir.
                </p>
              </div>

              {editTarget.type !== 'bakiye' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white font-bold mb-1.5 text-xs">
                      {editTarget.type === 'odenen' ? 'Ödenen Tutar (₺) *' : 'Kesilen Tutar (₺) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editTutar}
                      onChange={(e) => setEditTutar(e.target.value)}
                      placeholder="Örn: 15.000"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold outline-none focus:border-amber-400 placeholder-slate-400 shadow-inner"
                    />
                  </div>

                  {editTarget.type === 'kesilen' ? (
                    <div>
                      <label className="block text-white font-bold mb-1.5 text-xs">Bordro Dönemi</label>
                      <input
                        type="month"
                        value={editBordroDonem}
                        onChange={(e) => setEditBordroDonem(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold outline-none focus:border-amber-400 shadow-inner"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-white font-bold mb-1.5 text-xs">İşlem Tarihi</label>
                      <input
                        type="date"
                        value={editTarih}
                        onChange={(e) => setEditTarih(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold outline-none focus:border-amber-400 shadow-inner"
                      />
                    </div>
                  )}
                </div>
              )}

              {editTarget.type !== 'bakiye' && (
                <div>
                  <label className="block text-white font-bold mb-1.5 text-xs">Açıklama / Not</label>
                  <input
                    type="text"
                    value={editAciklama}
                    onChange={(e) => setEditAciklama(e.target.value)}
                    placeholder="Banka dekont no, mahsup şekli veya avans sebebi..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-amber-400 placeholder-slate-400 shadow-inner"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>{isUpdating ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* SİLME ONAY MODALI */}
      {deleteConfirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={() => setDeleteConfirmTarget(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/40 p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Kaydı Silmek İstiyor Musunuz?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {deleteConfirmTarget.type === 'bakiye' ? (
                    <>
                      <strong className="text-white">
                        {(deleteConfirmTarget.item as PersonelAvansBakiyeRow).adisoyadi}
                      </strong>{' '}
                      personeline ait <strong className="text-rose-400">tüm avans ödeme ve kesinti</strong> kayıtları Supabase veritabanından kalıcı olarak silinecektir.
                    </>
                  ) : deleteConfirmTarget.type === 'odenen' ? (
                    <>
                      <strong className="text-white">
                        {(deleteConfirmTarget.item as PersonelAvansOdenenRow).adisoyadi}
                      </strong>{' '}
                      personeline ait{' '}
                      <strong className="text-rose-400">
                        {formatTRY((deleteConfirmTarget.item as PersonelAvansOdenenRow).odenen)}
                      </strong>{' '}
                      tutarındaki avans ödeme kaydı silinecektir.
                    </>
                  ) : (
                    <>
                      <strong className="text-white">
                        {(deleteConfirmTarget.item as PersonelAvansKesilenRow).adisoyadi}
                      </strong>{' '}
                      personeline ait{' '}
                      <strong className="text-rose-400">
                        {formatTRY((deleteConfirmTarget.item as PersonelAvansKesilenRow).kesilen)}
                      </strong>{' '}
                      tutarındaki kesinti kaydı silinecektir.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Siliniyor...' : 'Evet, Kalıcı Olarak Sil'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
