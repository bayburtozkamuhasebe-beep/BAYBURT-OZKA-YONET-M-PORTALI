import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Printer,
  Users,
  Building2,
  Briefcase,
  Copy,
  Check,
  CheckCircle2,
  UserX,
  UserCheck,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Filter,
  Calendar,
  ClipboardList,
  ArrowUpDown,
  X,
  Info,
  FilePlus2,
  Save,
  Pencil,
  Trash2,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import {
  fetchPuantajRaporPersonelListesi,
  fetchPuantajDevirByTc,
  fetchAllPuantajDevir,
  fetchPersonelPuantajHaftaSonuOzet,
  fetchPuantajTahakkukByTc,
  insertPuantajTahakkuk,
  updatePuantajTahakkuk,
  deletePuantajTahakkuk,
  PUANTAJTAHAKKUK_RLS_SQL,
  PuantajPersonelRaporRow,
  PuantajTabloIstatistik,
  PuantajDevirRow,
  PuantajPersonelHaftaSonuOzet,
  PuantajTahakkukRow,
} from '../lib/supabase';

interface PuantajRaporSistemiScreenProps {
  onBack: () => void;
  playClickSound?: () => void;
  darkMode?: boolean;
}

type SortField =
  | 'personel_adi_soyadi'
  | 'tc_no'
  | 'gorevi'
  | 'santiyesi'
  | 'ise_giris_tarihi'
  | 'cikis_tarihi';

type DevirSortField =
  | 'tc_kimlik_no'
  | 'personel_adi_soyadi'
  | 'santiyesi'
  | 'devir'
  | 'aciklama'
  | 'updated_at';

function formatTrDate(isoDate?: string): string {
  if (!isoDate) return '-';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}.${match[2]}.${match[1]}`;
  }
  return isoDate;
}

export const PuantajRaporSistemiScreen: React.FC<PuantajRaporSistemiScreenProps> = ({
  onBack,
  playClickSound = () => {},
  darkMode = true,
}) => {
  const [rows, setRows] = useState<PuantajPersonelRaporRow[]>([]);
  const [tableStats, setTableStats] = useState<PuantajTabloIstatistik[]>([]);
  const [totalRawRows, setTotalRawRows] = useState<number>(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [devirTableRows, setDevirTableRows] = useState<PuantajDevirRow[]>([]);
  const [devirTableLoading, setDevirTableLoading] = useState<boolean>(false);
  const [devirTableError, setDevirTableError] = useState<string | null>(null);
  const [devirSortField, setDevirSortField] = useState<DevirSortField>('personel_adi_soyadi');
  const [devirSortDir, setDevirSortDir] = useState<'asc' | 'desc'>('asc');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSantiye, setSelectedSantiye] = useState<string>('ALL');
  const [selectedGorev, setSelectedGorev] = useState<string>('ALL');
  const [durumFilter, setDurumFilter] = useState<'ALL' | 'AKTIF' | 'CIKIS' | 'EKIM_2026_ONCESI'>('ALL');
  const [sortField, setSortField] = useState<SortField>('personel_adi_soyadi');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [copiedTc, setCopiedTc] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bilgi (Devir + Hafta Sonu Alacağı + Tahakkuk) Modal State
  const [bilgiTarget, setBilgiTarget] = useState<PuantajPersonelRaporRow | null>(null);
  const [devirLoading, setDevirLoading] = useState<boolean>(false);
  const [devirRows, setDevirRows] = useState<PuantajDevirRow[]>([]);
  const [toplamDevir, setToplamDevir] = useState<number>(0);
  const [devirError, setDevirError] = useState<string | null>(null);
  const [haftaSonuOzet, setHaftaSonuOzet] = useState<PuantajPersonelHaftaSonuOzet | null>(null);
  const [tahakkukRows, setTahakkukRows] = useState<PuantajTahakkukRow[]>([]);
  const [toplamTahakkuk, setToplamTahakkuk] = useState<number>(0);
  const [tahakkukError, setTahakkukError] = useState<string | null>(null);
  const [tahakkukRefreshing, setTahakkukRefreshing] = useState<boolean>(false);

  // Tahakkuk Ettir Kayıt Ekranı State
  const [showTahakkukModal, setShowTahakkukModal] = useState<boolean>(false);
  const [tahakkukInput, setTahakkukInput] = useState<string>('');
  const [tahakkukSaving, setTahakkukSaving] = useState<boolean>(false);
  const [tahakkukSaveError, setTahakkukSaveError] = useState<string | null>(null);
  const [tahakkukRlsError, setTahakkukRlsError] = useState<boolean>(false);

  // Tahakkuk Listeleme / Güncelleme / Silme Ekranı State
  const [showTahakkukListModal, setShowTahakkukListModal] = useState<boolean>(false);
  const [editingTahakkukId, setEditingTahakkukId] = useState<number | string | null>(null);
  const [editingTahakkukValue, setEditingTahakkukValue] = useState<string>('');
  const [tahakkukActionLoadingId, setTahakkukActionLoadingId] = useState<number | string | null>(null);
  const [confirmDeleteTahakkukId, setConfirmDeleteTahakkukId] = useState<number | string | null>(null);
  const [tahakkukManageError, setTahakkukManageError] = useState<string | null>(null);
  const [tahakkukManageRlsError, setTahakkukManageRlsError] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleOpenBilgi = async (personel: PuantajPersonelRaporRow) => {
    playClickSound();
    setBilgiTarget(personel);
    setShowTahakkukModal(false);
    setShowTahakkukListModal(false);
    setEditingTahakkukId(null);
    setConfirmDeleteTahakkukId(null);
    setTahakkukManageError(null);
    setTahakkukManageRlsError(false);
    setDevirLoading(true);
    setDevirRows([]);
    setToplamDevir(0);
    setDevirError(null);
    setHaftaSonuOzet(null);
    setTahakkukRows([]);
    setToplamTahakkuk(0);
    setTahakkukError(null);

    const [devirRes, puantajRes, tahakkukRes] = await Promise.all([
      fetchPuantajDevirByTc(personel.tc_no),
      fetchPersonelPuantajHaftaSonuOzet(personel.tc_no),
      fetchPuantajTahakkukByTc(personel.tc_no),
    ]);

    setDevirRows(devirRes.rows);
    setToplamDevir(devirRes.toplamDevir);
    if (devirRes.error) {
      setDevirError(devirRes.error);
    }
    setHaftaSonuOzet(puantajRes);
    setTahakkukRows(tahakkukRes.rows);
    setToplamTahakkuk(tahakkukRes.toplamTahakkuk);
    if (tahakkukRes.error) {
      setTahakkukError(tahakkukRes.error);
    }
    setDevirLoading(false);
  };

  const handleRefreshTahakkuk = async () => {
    if (!bilgiTarget) return;
    playClickSound();
    setTahakkukRefreshing(true);
    setTahakkukError(null);
    setTahakkukManageError(null);
    setTahakkukManageRlsError(false);
    const tahakkukRes = await fetchPuantajTahakkukByTc(bilgiTarget.tc_no);
    setTahakkukRows(tahakkukRes.rows);
    setToplamTahakkuk(tahakkukRes.toplamTahakkuk);
    if (tahakkukRes.error) {
      setTahakkukError(tahakkukRes.error);
    }
    setTahakkukRefreshing(false);
  };

  const handleOpenTahakkukListModal = async () => {
    if (!bilgiTarget) return;
    playClickSound();
    setEditingTahakkukId(null);
    setEditingTahakkukValue('');
    setConfirmDeleteTahakkukId(null);
    setTahakkukManageError(null);
    setTahakkukManageRlsError(false);
    setShowTahakkukListModal(true);
    await handleRefreshTahakkuk();
  };

  const handleStartEditTahakkuk = (row: PuantajTahakkukRow) => {
    playClickSound();
    setConfirmDeleteTahakkukId(null);
    setTahakkukManageError(null);
    setTahakkukManageRlsError(false);
    setEditingTahakkukId(row.id);
    setEditingTahakkukValue(String(row.tahakkukedilen));
  };

  const handleSaveEditTahakkuk = async (row: PuantajTahakkukRow) => {
    if (!bilgiTarget) return;
    const normalized = editingTahakkukValue.replace(',', '.').trim();
    if (!normalized) {
      setTahakkukManageError('Lütfen geçerli bir tahakkuk değeri giriniz.');
      return;
    }
    const numericVal = Number(normalized);
    if (!Number.isFinite(numericVal)) {
      setTahakkukManageError('Tahakkuk değeri sayısal olmalıdır.');
      return;
    }

    setTahakkukActionLoadingId(row.id);
    setTahakkukManageError(null);
    setTahakkukManageRlsError(false);

    const res = await updatePuantajTahakkuk({
      id: row.id,
      tahakkukedilen: numericVal,
    });

    if (!res.success) {
      setTahakkukActionLoadingId(null);
      setTahakkukManageRlsError(Boolean(res.rlsError));
      setTahakkukManageError(res.error || 'Tahakkuk kaydı güncellenemedi.');
      return;
    }

    const refreshed = await fetchPuantajTahakkukByTc(bilgiTarget.tc_no);
    setTahakkukRows(refreshed.rows);
    setToplamTahakkuk(refreshed.toplamTahakkuk);
    setTahakkukError(refreshed.error || null);
    setEditingTahakkukId(null);
    setEditingTahakkukValue('');
    setTahakkukActionLoadingId(null);
    showToast(`✓ Tahakkuk kaydı ${numericVal} olarak güncellendi.`);
  };

  const handleDeleteTahakkuk = async (row: PuantajTahakkukRow) => {
    if (!bilgiTarget) return;
    setTahakkukActionLoadingId(row.id);
    setTahakkukManageError(null);
    setTahakkukManageRlsError(false);

    const res = await deletePuantajTahakkuk(row.id);
    if (!res.success) {
      setTahakkukActionLoadingId(null);
      setTahakkukManageRlsError(Boolean(res.rlsError));
      setTahakkukManageError(res.error || 'Tahakkuk kaydı silinemedi.');
      return;
    }

    const refreshed = await fetchPuantajTahakkukByTc(bilgiTarget.tc_no);
    setTahakkukRows(refreshed.rows);
    setToplamTahakkuk(refreshed.toplamTahakkuk);
    setTahakkukError(refreshed.error || null);
    setConfirmDeleteTahakkukId(null);
    setTahakkukActionLoadingId(null);
    showToast('✓ Tahakkuk kaydı silindi.');
  };

  const handleOpenTahakkukModal = () => {
    playClickSound();
    setTahakkukInput('');
    setTahakkukSaveError(null);
    setTahakkukRlsError(false);
    setShowTahakkukModal(true);
  };

  const handleSaveTahakkuk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bilgiTarget) return;

    const normalizedStr = tahakkukInput.replace(',', '.').trim();
    if (!normalizedStr) {
      setTahakkukSaveError('Lütfen "Tahakkuk Edilen" alanına değer giriniz.');
      return;
    }

    const numericVal = Number(normalizedStr);
    if (!Number.isFinite(numericVal)) {
      setTahakkukSaveError('Lütfen geçerli bir sayısal değer giriniz.');
      return;
    }

    setTahakkukSaving(true);
    setTahakkukSaveError(null);
    setTahakkukRlsError(false);

    const res = await insertPuantajTahakkuk({
      tcno: bilgiTarget.tc_no,
      adısoyadı: bilgiTarget.personel_adi_soyadi,
      tahakkukedilen: numericVal,
    });

    setTahakkukSaving(false);

    if (!res.success) {
      setTahakkukRlsError(Boolean(res.rlsError));
      setTahakkukSaveError(res.error || 'Tahakkuk kaydı oluşturulamadı.');
      return;
    }

    const refreshed = await fetchPuantajTahakkukByTc(bilgiTarget.tc_no);
    setTahakkukRows(refreshed.rows);
    setToplamTahakkuk(refreshed.toplamTahakkuk);
    setTahakkukError(refreshed.error || null);
    setShowTahakkukModal(false);
    showToast(`✓ ${bilgiTarget.personel_adi_soyadi} için ${numericVal} tahakkuk kaydedildi.`);
  };

  const loadDevirList = async () => {
    setDevirTableLoading(true);
    setDevirTableError(null);
    const devirAll = await fetchAllPuantajDevir();
    setDevirTableRows(devirAll.rows);
    if (devirAll.error) {
      setDevirTableError(devirAll.error);
    }
    setDevirTableLoading(false);
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [result, devirAll] = await Promise.all([
        fetchPuantajRaporPersonelListesi(),
        fetchAllPuantajDevir(),
      ]);
      setRows(result.rows);
      setTableStats(result.tableStats);
      setTotalRawRows(result.totalRawRows);
      setErrors(result.errors);
      setDevirTableRows(devirAll.rows);
      setDevirTableError(devirAll.error || null);
      if (isRefresh) {
        showToast(
          durumFilter === 'EKIM_2026_ONCESI'
            ? `✓ ${devirAll.rows.length} Ekim 2026 öncesi devir kaydı güncellendi.`
            : `✓ ${result.rows.length} tekil personel kaydı güncellendi.`
        );
      }
    } catch (err) {
      console.error('Puantaj rapor yükleme hatası:', err);
      setErrors(['Puantaj kayıtları yüklenirken beklenmeyen bir hata oluştu.']);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTahakkukModal) {
          setShowTahakkukModal(false);
        } else if (showTahakkukListModal) {
          setShowTahakkukListModal(false);
        } else if (bilgiTarget) {
          setBilgiTarget(null);
        } else {
          onBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, bilgiTarget, showTahakkukModal, showTahakkukListModal]);

  const isEkimOncesi = durumFilter === 'EKIM_2026_ONCESI';

  const uniqueSantiyeler = useMemo(() => {
    const set = new Set<string>();
    if (isEkimOncesi) {
      devirTableRows.forEach((r) => {
        if (r.santiyesi && r.santiyesi.trim()) set.add(r.santiyesi.trim());
      });
    } else {
      rows.forEach((r) => {
        if (r.santiyesi && r.santiyesi.trim()) set.add(r.santiyesi.trim());
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [rows, devirTableRows, isEkimOncesi]);

  const uniqueGorevler = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.gorevi && r.gorevi.trim()) set.add(r.gorevi.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [rows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const cikisli = rows.filter((r) => Boolean(r.cikis_tarihi && r.cikis_tarihi.trim())).length;
    const aktif = total - cikisli;
    return {
      total,
      aktif,
      cikisli,
      santiyeCount: uniqueSantiyeler.length,
    };
  }, [rows, uniqueSantiyeler]);

  const filteredAndSortedRows = useMemo(() => {
    if (isEkimOncesi) return [];
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');

    const filtered = rows.filter((r) => {
      if (selectedSantiye !== 'ALL') {
        if (selectedSantiye === 'EMPTY') {
          if (r.santiyesi && r.santiyesi.trim()) return false;
        } else if ((r.santiyesi || '').trim() !== selectedSantiye) {
          return false;
        }
      }

      if (selectedGorev !== 'ALL') {
        if ((r.gorevi || '').trim() !== selectedGorev) return false;
      }

      const hasCikis = Boolean(r.cikis_tarihi && r.cikis_tarihi.trim());
      if (durumFilter === 'AKTIF' && hasCikis) return false;
      if (durumFilter === 'CIKIS' && !hasCikis) return false;

      if (q) {
        const hay = `${r.tc_no} ${r.personel_adi_soyadi} ${r.gorevi} ${r.santiyesi} ${formatTrDate(r.ise_giris_tarihi)} ${formatTrDate(r.cikis_tarihi)}`.toLocaleLowerCase('tr-TR');
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const va = (a[sortField] || '').trim();
      const vb = (b[sortField] || '').trim();

      if (sortField === 'ise_giris_tarihi' || sortField === 'cikis_tarihi') {
        if (!va && !vb) return 0;
        if (!va) return 1;
        if (!vb) return -1;
        const cmp = va.localeCompare(vb);
        return sortDir === 'asc' ? cmp : -cmp;
      }

      const cmp = va.localeCompare(vb, 'tr-TR');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [rows, searchQuery, selectedSantiye, selectedGorev, durumFilter, sortField, sortDir, isEkimOncesi]);

  const filteredAndSortedDevirRows = useMemo(() => {
    if (!isEkimOncesi) return [];
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');

    const filtered = devirTableRows.filter((r) => {
      if (selectedSantiye !== 'ALL') {
        if (selectedSantiye === 'EMPTY') {
          if (r.santiyesi && r.santiyesi.trim()) return false;
        } else if ((r.santiyesi || '').trim() !== selectedSantiye) {
          return false;
        }
      }

      if (q) {
        const hay = `${r.tc_kimlik_no} ${r.personel_adi_soyadi} ${r.santiyesi} ${r.aciklama} ${r.devir}`.toLocaleLowerCase('tr-TR');
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (devirSortField === 'devir') {
        const diff = a.devir - b.devir;
        return devirSortDir === 'asc' ? diff : -diff;
      }
      const va = String(a[devirSortField] || '').trim();
      const vb = String(b[devirSortField] || '').trim();
      if (devirSortField === 'updated_at') {
        if (!va && !vb) return 0;
        if (!va) return 1;
        if (!vb) return -1;
        const cmp = va.localeCompare(vb);
        return devirSortDir === 'asc' ? cmp : -cmp;
      }
      const cmp = va.localeCompare(vb, 'tr-TR');
      return devirSortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [devirTableRows, isEkimOncesi, searchQuery, selectedSantiye, devirSortField, devirSortDir]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSantiye, selectedGorev, durumFilter, pageSize]);

  const activeFilteredCount = isEkimOncesi ? filteredAndSortedDevirRows.length : filteredAndSortedRows.length;
  const activeTotalCount = isEkimOncesi ? devirTableRows.length : rows.length;

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(activeFilteredCount / pageSize));
  const paginatedRows = useMemo(() => {
    if (pageSize === 0) return filteredAndSortedRows;
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, currentPage, pageSize]);

  const paginatedDevirRows = useMemo(() => {
    if (pageSize === 0) return filteredAndSortedDevirRows;
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedDevirRows.slice(start, start + pageSize);
  }, [filteredAndSortedDevirRows, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    playClickSound();
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleDevirSort = (field: DevirSortField) => {
    playClickSound();
    if (devirSortField === field) {
      setDevirSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDevirSortField(field);
      setDevirSortDir('asc');
    }
  };

  const handleSelectEkim2026Oncesi = () => {
    playClickSound();
    setSelectedGorev('ALL');
    setSelectedSantiye('ALL');
    setDurumFilter('EKIM_2026_ONCESI');
    if (devirTableRows.length === 0 || devirTableError) {
      loadDevirList();
    }
  };

  const handleOpenBilgiFromDevir = (devirRow: PuantajDevirRow) => {
    const matched = rows.find((r) => r.tc_no === devirRow.tc_kimlik_no);
    if (matched) {
      handleOpenBilgi(matched);
      return;
    }
    handleOpenBilgi({
      tc_no: devirRow.tc_kimlik_no,
      personel_adi_soyadi: devirRow.personel_adi_soyadi,
      gorevi: '',
      santiyesi: devirRow.santiyesi,
      ise_giris_tarihi: '',
      cikis_tarihi: '',
      kaynak_aylar: [],
      toplam_kayit: 1,
    });
  };

  const handleCopyTc = async (tc: string) => {
    if (!tc) return;
    try {
      await navigator.clipboard.writeText(tc);
      setCopiedTc(tc);
      setTimeout(() => setCopiedTc(null), 1500);
    } catch {
      // ignore
    }
  };

  const handleExportExcel = () => {
    playClickSound();
    const dateStr = new Date().toISOString().slice(0, 10);

    if (isEkimOncesi) {
      if (filteredAndSortedDevirRows.length === 0) {
        showToast('Dışa aktarılacak kayıt bulunamadı.');
        return;
      }

      const exportData = filteredAndSortedDevirRows.map((r, index) => ({
        'Sıra No': index + 1,
        'TC Kimlik No': r.tc_kimlik_no || '-',
        'Personel Adı Soyadı': r.personel_adi_soyadi || '-',
        Şantiyesi: r.santiyesi || '-',
        Devir: r.devir,
        Açıklama: r.aciklama || '-',
        'Güncelleme Tarihi': r.updated_at ? new Date(r.updated_at).toLocaleString('tr-TR') : '-',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 8 },
        { wch: 15 },
        { wch: 30 },
        { wch: 26 },
        { wch: 12 },
        { wch: 36 },
        { wch: 22 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ekim 2026 Öncesi Devir');
      XLSX.writeFile(wb, `Puantaj_Ekim_2026_Oncesi_Devir_${dateStr}.xlsx`);
      showToast(`✓ ${filteredAndSortedDevirRows.length} devir kaydı Excel olarak indirildi.`);
      return;
    }

    if (filteredAndSortedRows.length === 0) {
      showToast('Dışa aktarılacak kayıt bulunamadı.');
      return;
    }

    const exportData = filteredAndSortedRows.map((r, index) => ({
      'Sıra No': index + 1,
      'TC No': r.tc_no || '-',
      'Personel Adı Soyadı': r.personel_adi_soyadi || '-',
      Görevi: r.gorevi || '-',
      Şantiyesi: r.santiyesi || '-',
      'İşe Giriş Tarihi': formatTrDate(r.ise_giris_tarihi),
      'Çıkış Tarihi': formatTrDate(r.cikis_tarihi),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 8 },
      { wch: 15 },
      { wch: 30 },
      { wch: 24 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Puantaj Personel Raporu');
    XLSX.writeFile(wb, `Puantaj_Rapor_Sistemi_${dateStr}.xlsx`);
    showToast(`✓ ${filteredAndSortedRows.length} kayıt Excel olarak indirildi.`);
  };

  const handlePrint = () => {
    playClickSound();
    window.print();
  };

  const resetFilters = () => {
    playClickSound();
    setSearchQuery('');
    setSelectedSantiye('ALL');
    setSelectedGorev('ALL');
    setDurumFilter('ALL');
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans relative overflow-x-hidden transition-colors ${
        darkMode ? 'bg-[#07080d] text-gray-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Background Ambience */}
      {darkMode && (
        <div className="fixed inset-0 pointer-events-none z-0 print:hidden">
          <div className="absolute top-[-10%] left-[-5%] w-[520px] h-[520px] bg-emerald-600/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[520px] h-[520px] bg-cyan-600/10 rounded-full blur-[140px]" />
        </div>
      )}

      {/* Top Sticky Header */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-xl border-b px-4 sm:px-8 py-3.5 shadow-lg print:hidden ${
          darkMode
            ? 'bg-[#0b0d14]/90 border-white/10 shadow-black/40'
            : 'bg-white/90 border-slate-200 shadow-slate-200/50'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Geri Dön */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onBack();
            }}
            className={`group flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all shadow-sm active:scale-95 ${
              darkMode
                ? 'bg-white/5 hover:bg-white/15 border-white/15 hover:border-emerald-400/50 text-gray-200 hover:text-white'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-1 transition-transform" />
            <div className="flex flex-col text-left">
              <span className="text-xs sm:text-sm font-bold tracking-tight">Geri Dön</span>
              <span className={`text-[10px] -mt-0.5 hidden sm:inline ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                Personel Sayfası
              </span>
            </div>
          </button>

          {/* Center Title */}
          <div className="flex items-center gap-3">
            <OzkaLogo size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-emerald-400" />
                  <span>PUANTAJ RAPOR SİSTEMİ</span>
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold hidden md:inline-flex">
                  Yönetici Özel • 12 Ay Tekil
                </span>
              </div>
              <p className={`text-[11px] hidden sm:block ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                Ocak – Aralık Puantaj Kayıtları • TC No Bazlı Tekil (Son Giriş & Son Çıkış)
              </p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                loadData(true);
              }}
              disabled={refreshing || loading}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                darkMode
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading || filteredAndSortedRows.length === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 border border-emerald-400/40 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel İndir</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || filteredAndSortedRows.length === 0}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/15 text-gray-200 border-white/15'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Yazdır</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Print-only Header */}
        <div className="hidden print:block mb-4 border-b pb-3">
          <h2 className="text-lg font-bold text-black">
            BAYBURT ÖZ-KA İNŞAAT — PUANTAJ RAPOR SİSTEMİ (TC BAZLI TEKİL PERSONEL LİSTESİ)
          </h2>
          <p className="text-xs text-gray-600">
            Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')} • Toplam Kayıt: {filteredAndSortedRows.length}
          </p>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border backdrop-blur-md ${
              darkMode
                ? 'bg-white/[0.04] border-emerald-500/30'
                : 'bg-white border-emerald-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                Tekil Personel (TC Bazlı)
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-emerald-400">
              {loading ? '...' : stats.total}
            </div>
            <div className={`text-[11px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
              {totalRawRows} aylık kayıttan tekilleştirildi
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`p-4 rounded-2xl border backdrop-blur-md ${
              darkMode
                ? 'bg-white/[0.04] border-cyan-500/30'
                : 'bg-white border-cyan-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                Aktif Çalışan
              </span>
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-cyan-400">
              {loading ? '...' : stats.aktif}
            </div>
            <div className={`text-[11px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
              Çıkış tarihi girilmemiş personel
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-4 rounded-2xl border backdrop-blur-md ${
              darkMode
                ? 'bg-white/[0.04] border-amber-500/30'
                : 'bg-white border-amber-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                Çıkışı Yapılan
              </span>
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-amber-400">
              {loading ? '...' : stats.cikisli}
            </div>
            <div className={`text-[11px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
              Son çıkış tarihi baz alınmıştır
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`p-4 rounded-2xl border backdrop-blur-md ${
              darkMode
                ? 'bg-white/[0.04] border-indigo-500/30'
                : 'bg-white border-indigo-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                Şantiye Sayısı
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-indigo-400">
              {loading ? '...' : stats.santiyeCount}
            </div>
            <div className={`text-[11px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
              Farklı şantiye / birim
            </div>
          </motion.div>
        </div>

        {/* 12 Monthly Tables Status Strip */}
        {tableStats.length > 0 && (
          <div
            className={`p-3 rounded-2xl border print:hidden ${
              darkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                12 Aylık Puantaj Veri Kapsamı
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
              {tableStats.map((st) => {
                const hasData = st.rowCount > 0;
                return (
                  <div
                    key={st.table}
                    className={`px-2 py-1.5 rounded-lg border text-center transition-colors ${
                      st.error
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : hasData
                        ? darkMode
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : darkMode
                        ? 'bg-white/[0.02] border-white/10 text-gray-500'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                    title={st.error ? `${st.label}: ${st.error}` : `${st.label}: ${st.rowCount} kayıt`}
                  >
                    <div className="text-[10px] font-bold truncate">{st.label}</div>
                    <div className="text-xs font-black">{st.rowCount}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Errors notice if any table failed */}
        {errors.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2 print:hidden">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Bazı aylık tablolarda okuma uyarısı: </span>
              <span>{errors.join(' | ')}</span>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div
          className={`p-4 rounded-2xl border space-y-3 print:hidden ${
            darkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="TC No, Ad Soyad, Görev veya Şantiye ara..."
                className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                  darkMode
                    ? 'bg-black/40 border-white/15 text-white placeholder-gray-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Şantiye Filter */}
            <div className="md:col-span-4 relative">
              <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedSantiye}
                onChange={(e) => setSelectedSantiye(e.target.value)}
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                  darkMode
                    ? 'bg-black/40 border-white/15 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="ALL">Tüm Şantiyeler ({uniqueSantiyeler.length})</option>
                {uniqueSantiyeler.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="EMPTY">Şantiyesi Belirtilmemiş</option>
              </select>
            </div>

            {/* Görev Filter */}
            <div className="md:col-span-3 relative">
              <Briefcase className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedGorev}
                onChange={(e) => setSelectedGorev(e.target.value)}
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                  darkMode
                    ? 'bg-black/40 border-white/15 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="ALL">Tüm Görevler ({uniqueGorevler.length})</option>
                {uniqueGorevler.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-xs font-semibold flex items-center gap-1 mr-1 ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                <Filter className="w-3.5 h-3.5" /> Durum:
              </span>
              {(
                [
                  { id: 'ALL', label: `Tümü (${stats.total})` },
                  { id: 'AKTIF', label: `Aktif (${stats.aktif})` },
                  { id: 'CIKIS', label: `Çıkış Yapılan (${stats.cikisli})` },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setDurumFilter(item.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    durumFilter === item.id
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : darkMode
                      ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <button
                type="button"
                onClick={handleSelectEkim2026Oncesi}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isEkimOncesi
                    ? 'bg-cyan-500 text-slate-950 shadow-sm font-black'
                    : darkMode
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20'
                    : 'bg-cyan-50 text-cyan-700 border border-cyan-300 hover:bg-cyan-100'
                }`}
              >
                Ekim 2026 Öncesi ({devirTableRows.length})
              </button>

              {(searchQuery || selectedSantiye !== 'ALL' || selectedGorev !== 'ALL' || durumFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 transition-all"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>

            {/* Page size & summary */}
            <div className="flex items-center gap-3 text-xs">
              <span className={darkMode ? 'text-gray-400' : 'text-slate-600'}>
                Gösterilen:{' '}
                <strong className={isEkimOncesi ? 'text-cyan-400' : 'text-emerald-400'}>
                  {activeFilteredCount}
                </strong>{' '}
                / {activeTotalCount}
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                  darkMode
                    ? 'bg-black/40 border-white/15 text-gray-200'
                    : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value={50}>50 Satır</option>
                <option value={100}>100 Satır</option>
                <option value={250}>250 Satır</option>
                <option value={0}>Tümü</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div
          className={`rounded-2xl border overflow-hidden shadow-xl ${
            darkMode ? 'bg-[#0d1018]/90 border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          {loading || (isEkimOncesi && devirTableLoading) ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                {isEkimOncesi
                  ? 'Ekim 2026 öncesi devir kayıtları yükleniyor...'
                  : '12 aylık puantaj kayıtları taranıyor ve tekilleştiriliyor...'}
              </p>
            </div>
          ) : isEkimOncesi ? (
            devirTableError ? (
              <div className="py-16 text-center space-y-3 px-4">
                <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
                <p className="text-sm font-bold text-rose-400">
                  Ekim 2026 öncesi devir kayıtları alınamadı: {devirTableError}
                </p>
                <button
                  type="button"
                  onClick={loadDevirList}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
                >
                  Tekrar Dene
                </button>
              </div>
            ) : filteredAndSortedDevirRows.length === 0 ? (
              <div className="py-16 text-center space-y-2 px-4">
                <Users className="w-10 h-10 text-gray-500 mx-auto" />
                <p className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                  Kriterlere uygun Ekim 2026 öncesi devir kaydı bulunamadı.
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                  Arama veya şantiye filtresini temizleyerek tekrar deneyebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className={`border-b text-[11px] font-black uppercase tracking-wider ${
                        darkMode
                          ? 'bg-cyan-500/10 border-white/10 text-cyan-200'
                          : 'bg-cyan-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <th className="py-3.5 px-3 w-12 text-center">#</th>
                      {(
                        [
                          { field: 'tc_kimlik_no', label: 'TC Kimlik No' },
                          { field: 'personel_adi_soyadi', label: 'Personel Adı Soyadı' },
                          { field: 'santiyesi', label: 'Şantiyesi' },
                          { field: 'devir', label: 'Devir' },
                          { field: 'aciklama', label: 'Açıklama' },
                          { field: 'updated_at', label: 'Güncelleme Tarihi' },
                        ] as { field: DevirSortField; label: string }[]
                      ).map((col) => (
                        <th
                          key={col.field}
                          onClick={() => handleDevirSort(col.field)}
                          className="py-3.5 px-3.5 cursor-pointer select-none hover:text-cyan-400 transition-colors whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col.label}</span>
                            <ArrowUpDown
                              className={`w-3 h-3 print:hidden ${
                                devirSortField === col.field ? 'text-cyan-400' : 'opacity-40'
                              }`}
                            />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs sm:text-sm ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                    {paginatedDevirRows.map((row, idx) => {
                      const rowIndex = pageSize === 0 ? idx + 1 : (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <tr
                          key={row.id || `${row.tc_kimlik_no}-${rowIndex}`}
                          className={`transition-colors ${
                            darkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-cyan-50/50'
                          }`}
                        >
                          <td className={`py-3 px-3 text-center text-xs font-mono ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                            {rowIndex}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-xs sm:text-[13px] whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className={darkMode ? 'text-cyan-300 font-semibold' : 'text-cyan-700 font-semibold'}>
                                {row.tc_kimlik_no || '-'}
                              </span>
                              {row.tc_kimlik_no && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyTc(row.tc_kimlik_no)}
                                  title="TC No Kopyala"
                                  className={`p-1 rounded transition-colors print:hidden ${
                                    copiedTc === row.tc_kimlik_no
                                      ? 'text-emerald-400'
                                      : 'text-gray-500 hover:text-white'
                                  }`}
                                >
                                  {copiedTc === row.tc_kimlik_no ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 font-bold whitespace-nowrap">
                            <div className="flex items-center justify-between gap-2.5">
                              <span className={darkMode ? 'text-white' : 'text-slate-900'}>
                                {row.personel_adi_soyadi || '-'}
                              </span>
                              {row.tc_kimlik_no && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenBilgiFromDevir(row)}
                                  title={`${row.personel_adi_soyadi || row.tc_kimlik_no} devir ve hafta sonu bilgisini sorgula`}
                                  className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all active:scale-95 print:hidden ${
                                    darkMode
                                      ? 'bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
                                      : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-300'
                                  }`}
                                >
                                  <Info className="w-3.5 h-3.5" />
                                  <span>Bilgi</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {row.santiyesi ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                                  darkMode
                                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}
                              >
                                {row.santiyesi}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 font-mono whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-black border ${
                                row.devir > 0
                                  ? darkMode
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : row.devir < 0
                                  ? darkMode
                                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                    : 'bg-rose-50 text-rose-700 border-rose-300'
                                  : darkMode
                                  ? 'bg-white/5 text-gray-300 border-white/15'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              {row.devir > 0 ? `+${row.devir}` : row.devir}
                            </span>
                          </td>
                          <td className={`py-3 px-3.5 max-w-xs truncate ${darkMode ? 'text-amber-300' : 'text-amber-700'}`} title={row.aciklama || ''}>
                            {row.aciklama || '-'}
                          </td>
                          <td className={`py-3 px-3.5 font-mono text-xs whitespace-nowrap ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                            {row.updated_at ? new Date(row.updated_at).toLocaleString('tr-TR') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredAndSortedRows.length === 0 ? (
            <div className="py-16 text-center space-y-2 px-4">
              <Users className="w-10 h-10 text-gray-500 mx-auto" />
              <p className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                Kriterlere uygun personel kaydı bulunamadı.
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                Arama veya şantiye/görev filtrelerini temizleyerek tekrar deneyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`border-b text-[11px] font-black uppercase tracking-wider ${
                      darkMode
                        ? 'bg-white/[0.04] border-white/10 text-gray-300'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <th className="py-3.5 px-3 w-12 text-center">#</th>
                    {(
                      [
                        { field: 'tc_no', label: 'TC No' },
                        { field: 'personel_adi_soyadi', label: 'Personel Adı Soyadı' },
                        { field: 'gorevi', label: 'Görevi' },
                        { field: 'santiyesi', label: 'Şantiyesi' },
                        { field: 'ise_giris_tarihi', label: 'İşe Giriş Tarihi' },
                        { field: 'cikis_tarihi', label: 'Çıkış Tarihi' },
                      ] as { field: SortField; label: string }[]
                    ).map((col) => (
                      <th
                        key={col.field}
                        onClick={() => handleSort(col.field)}
                        className="py-3.5 px-3.5 cursor-pointer select-none hover:text-emerald-400 transition-colors whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{col.label}</span>
                          <ArrowUpDown
                            className={`w-3 h-3 print:hidden ${
                              sortField === col.field ? 'text-emerald-400' : 'opacity-40'
                            }`}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs sm:text-sm ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                  {paginatedRows.map((row, idx) => {
                    const rowIndex = pageSize === 0 ? idx + 1 : (currentPage - 1) * pageSize + idx + 1;
                    const hasCikis = Boolean(row.cikis_tarihi && row.cikis_tarihi.trim());
                    return (
                      <tr
                        key={row.tc_no || `row-${rowIndex}`}
                        className={`transition-colors ${
                          darkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-emerald-50/50'
                        }`}
                      >
                        <td className={`py-3 px-3 text-center text-xs font-mono ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                          {rowIndex}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-xs sm:text-[13px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={darkMode ? 'text-cyan-300 font-semibold' : 'text-cyan-700 font-semibold'}>
                              {row.tc_no || '-'}
                            </span>
                            {row.tc_no && (
                              <button
                                type="button"
                                onClick={() => handleCopyTc(row.tc_no)}
                                title="TC No Kopyala"
                                className={`p-1 rounded transition-colors print:hidden ${
                                  copiedTc === row.tc_no
                                    ? 'text-emerald-400'
                                    : 'text-gray-500 hover:text-white'
                                }`}
                              >
                                {copiedTc === row.tc_no ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-bold whitespace-nowrap">
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={darkMode ? 'text-white' : 'text-slate-900'}>
                                {row.personel_adi_soyadi || '-'}
                              </span>
                              {row.toplam_kayit > 1 && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold print:hidden"
                                  title={`Bulunduğu Aylar: ${row.kaynak_aylar.join(', ')}`}
                                >
                                  {row.kaynak_aylar.join(', ')}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenBilgi(row)}
                              title={`${row.personel_adi_soyadi || row.tc_no} devir bilgisini sorgula`}
                              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all active:scale-95 print:hidden ${
                                darkMode
                                  ? 'bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
                                  : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-300'
                              }`}
                            >
                              <Info className="w-3.5 h-3.5" />
                              <span>Bilgi</span>
                            </button>
                          </div>
                        </td>
                        <td className={`py-3 px-3.5 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                          {row.gorevi || '-'}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {row.santiyesi ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                                darkMode
                                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}
                            >
                              {row.santiyesi}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-xs sm:text-[13px] whitespace-nowrap">
                          <span className={darkMode ? 'text-emerald-300 font-semibold' : 'text-emerald-700 font-semibold'}>
                            {formatTrDate(row.ise_giris_tarihi)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-xs sm:text-[13px] whitespace-nowrap">
                          {hasCikis ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold ${
                                darkMode
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {formatTrDate(row.cikis_tarihi)}
                            </span>
                          ) : (
                            <span className={darkMode ? 'text-gray-500' : 'text-slate-400'}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && !(isEkimOncesi && devirTableLoading) && activeFilteredCount > 0 && pageSize > 0 && totalPages > 1 && (
            <div
              className={`px-4 py-3 border-t flex items-center justify-between gap-2 print:hidden ${
                darkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                Sayfa <strong>{currentPage}</strong> / {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={`p-1.5 rounded-lg border disabled:opacity-40 ${
                    darkMode
                      ? 'bg-white/5 border-white/15 hover:bg-white/15'
                      : 'bg-white border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={`p-1.5 rounded-lg border disabled:opacity-40 ${
                    darkMode
                      ? 'bg-white/5 border-white/15 hover:bg-white/15'
                      : 'bg-white border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-2xl border border-emerald-400/40 flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Bilgi (Devir & Hafta Sonu Alacağı Sorgulama) Modal */}
      <AnimatePresence>
        {bilgiTarget && (
          <div
            onClick={() => setBilgiTarget(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm print:hidden"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[95vw] max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900">
                      Personel Devir ve Hafta Sonu Alacağı Bilgisi
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      12 Aylık Puantaj, Devir ve Tahakkuk Sorgulama Sonucu
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBilgiTarget(null)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-slate-200 text-slate-500 hover:text-slate-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto bg-white">
                {/* Personel Özet Kartı */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm sm:text-base font-black text-slate-900">{bilgiTarget.personel_adi_soyadi || '-'}</span>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold">
                      TC: {bilgiTarget.tc_no || '-'}
                    </span>
                  </div>
                  <div className="text-xs flex flex-wrap gap-x-5 gap-y-1 text-slate-600">
                    <span>Görev: <strong className="text-slate-900">{bilgiTarget.gorevi || '-'}</strong></span>
                    <span>Şantiye: <strong className="text-slate-900">{bilgiTarget.santiyesi || '-'}</strong></span>
                    <span>Son Giriş: <strong className="text-emerald-700">{formatTrDate(bilgiTarget.ise_giris_tarihi)}</strong></span>
                    <span>Son Çıkış: <strong className="text-amber-700">{formatTrDate(bilgiTarget.cikis_tarihi)}</strong></span>
                  </div>
                </div>

                {devirLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2.5">
                    <Loader2 className="w-7 h-7 text-cyan-600 animate-spin" />
                    <span className="text-xs font-semibold text-slate-600">
                      Devir, tahakkuk ve 12 aylık puantaj kayıtları sorgulanıyor...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* YANA DOĞRU GENİŞ 2 SÜTUNLU ANA ALAN */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* SOL SÜTUN: HAFTA SONU ALACAĞI VE AYLIK DETAYLAR */}
                      <div className="lg:col-span-7 space-y-3">
                        {haftaSonuOzet && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Hafta Sonu Alacağı Hesaplaması</span>
                              </h4>
                              <span className="text-[11px] text-slate-500">
                                {haftaSonuOzet.aylar.length} Ayda Kayıt Bulundu
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                                <div className="text-[10px] font-bold uppercase text-slate-500">
                                  Kanuni Hafta Sonu
                                </div>
                                <div className="text-lg font-black font-mono mt-0.5 text-cyan-700">
                                  {haftaSonuOzet.toplamKanuniHaftaSonu} gün
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Pazar sayısı
                                </div>
                              </div>

                              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                                <div className="text-[10px] font-bold uppercase text-emerald-800">
                                  Hafta Sonu Çalışma (Ç)
                                </div>
                                <div className="text-lg font-black font-mono mt-0.5 text-emerald-700">
                                  +{haftaSonuOzet.toplamHaftaSonuCalisma} gün
                                </div>
                                <div className="text-[10px] text-emerald-700/80">
                                  Brüt alacak
                                </div>
                              </div>

                              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50">
                                <div className="text-[10px] font-bold uppercase text-rose-800">
                                  Düşülen (YÇ, Üİ, İ, D)
                                </div>
                                <div className="text-lg font-black font-mono mt-0.5 text-rose-700">
                                  -{haftaSonuOzet.toplamDusulen} gün
                                </div>
                                <div className="text-[10px] text-rose-700/80">
                                  YÇ:{haftaSonuOzet.toplamYC} Üİ:{haftaSonuOzet.toplamUI} İ:{haftaSonuOzet.toplamI} D:{haftaSonuOzet.toplamD}
                                </div>
                              </div>

                              <div
                                className={`p-3 rounded-xl border-2 ${
                                  haftaSonuOzet.netHaftaSonuAlacagi > 0
                                    ? 'bg-emerald-50 border-emerald-400'
                                    : haftaSonuOzet.netHaftaSonuAlacagi < 0
                                    ? 'bg-rose-50 border-rose-400'
                                    : 'bg-slate-100 border-slate-300'
                                }`}
                              >
                                <div className="text-[10px] font-black uppercase text-slate-800">
                                  Net Hafta Sonu Alacağı
                                </div>
                                <div
                                  className={`text-xl font-black font-mono mt-0.5 ${
                                    haftaSonuOzet.netHaftaSonuAlacagi > 0
                                      ? 'text-emerald-700'
                                      : haftaSonuOzet.netHaftaSonuAlacagi < 0
                                      ? 'text-rose-700'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  {haftaSonuOzet.netHaftaSonuAlacagi > 0
                                    ? `+${haftaSonuOzet.netHaftaSonuAlacagi}`
                                    : haftaSonuOzet.netHaftaSonuAlacagi}{' '}
                                  gün
                                </div>
                                <div className="text-[10px] text-slate-600">
                                  Düşüm sonrası net
                                </div>
                              </div>
                            </div>

                            {/* Düşüm Formülü Açıklaması */}
                            <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-[11px] flex flex-wrap items-center justify-between gap-2">
                              <span>
                                Formül: <strong className="text-emerald-700">Hafta Sonu Ç ({haftaSonuOzet.toplamHaftaSonuCalisma})</strong>
                                {' − '}
                                <strong className="text-rose-700">
                                  [YÇ ({haftaSonuOzet.toplamYC}×0.5={haftaSonuOzet.toplamYC * 0.5}) + Üİ ({haftaSonuOzet.toplamUI}) + İ ({haftaSonuOzet.toplamI}) + D ({haftaSonuOzet.toplamD})]
                                </strong>
                              </span>
                              <span className="font-mono font-black text-slate-900">
                                = {haftaSonuOzet.netHaftaSonuAlacagi > 0 ? `+${haftaSonuOzet.netHaftaSonuAlacagi}` : haftaSonuOzet.netHaftaSonuAlacagi} gün
                              </span>
                            </div>

                            {/* Aylık Detaylar */}
                            {haftaSonuOzet.aylar.length > 0 && (
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {haftaSonuOzet.aylar.map((ay) => (
                                  <div
                                    key={`${ay.table}-${ay.yil}`}
                                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-black text-indigo-800 px-2 py-0.5 rounded bg-indigo-100 border border-indigo-200">
                                          {ay.ayLabel} {ay.yil}
                                        </span>
                                        {ay.santiyesi && (
                                          <span className="text-slate-600 font-medium">
                                            {ay.santiyesi}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 font-mono text-[11px]">
                                        <span className="text-cyan-700 font-semibold">Kanuni:{ay.kanuniHaftaSonuSayisi}</span>
                                        <span className="text-emerald-700 font-semibold">Ç:+{ay.haftaSonuCalismaSayisi}</span>
                                        <span className="text-rose-700 font-semibold">Düşülen:-{ay.dusulecekGun}</span>
                                        <span
                                          className={`font-black px-1.5 py-0.5 rounded ${
                                            ay.ayNetAlacak > 0
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : ay.ayNetAlacak < 0
                                              ? 'bg-rose-100 text-rose-800'
                                              : 'bg-slate-200 text-slate-700'
                                          }`}
                                        >
                                          Net: {ay.ayNetAlacak > 0 ? `+${ay.ayNetAlacak}` : ay.ayNetAlacak}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Pazar Günleri Dağılımı */}
                                    <div className="flex flex-wrap gap-1.5">
                                      {ay.pazarDetaylari.map((p) => (
                                        <span
                                          key={p.tarih}
                                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                                            p.alindi
                                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                              : p.kod === 'H'
                                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                              : 'bg-white text-slate-600 border-slate-300'
                                          }`}
                                          title={`${p.tarih} Pazar: ${p.kod}${p.alindi ? ' (Hafta Sonu Alacağı +1)' : ''}`}
                                        >
                                          {p.tarih.slice(0, 5)}: {p.kod}
                                          {p.alindi ? ' (+1)' : ''}
                                        </span>
                                      ))}
                                    </div>

                                    {ay.dusulecekGun > 0 && (
                                      <div className="flex flex-wrap gap-2 text-[10px] text-rose-700 font-semibold">
                                        {ay.ycCount > 0 && <span>YÇ: {ay.ycCount} ({ay.ycCount * 0.5} gün)</span>}
                                        {ay.uiCount > 0 && <span>Üİ: {ay.uiCount} gün</span>}
                                        {ay.iCount > 0 && <span>İ: {ay.iCount} gün</span>}
                                        {ay.dCount > 0 && <span>D: {ay.dCount} gün</span>}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* SAĞ SÜTUN: PUANTAJ DEVİR VE TAHAKKUK KAYITLARI */}
                      <div className="lg:col-span-5 space-y-4">
                        {/* BÖLÜM 2: PUANTAJ DEVİR TABLOSU SONUCU */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-700">
                              Puantaj Devir Kaydı
                            </h4>
                            <span className="text-xs font-mono font-bold text-cyan-700">
                              Devir: {toplamDevir > 0 ? `+${toplamDevir}` : toplamDevir}
                            </span>
                          </div>

                          {devirError ? (
                            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>Devir sorgulama hatası: {devirError}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenBilgi(bilgiTarget)}
                                className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold shrink-0"
                              >
                                Tekrar Dene
                              </button>
                            </div>
                          ) : devirRows.length === 0 ? (
                            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-1">
                              <p className="text-xs font-bold text-amber-700">Devir Tablosunda Kayıt Bulunamadı</p>
                              <p className="text-[11px] text-slate-600">
                                <span className="font-mono font-semibold">{bilgiTarget.tc_no}</span> için önceki devir bakiyesi 0 kabul edilir.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div
                                className={`p-3 rounded-xl border flex items-center justify-between ${
                                  toplamDevir > 0
                                    ? 'bg-emerald-50 border-emerald-300'
                                    : toplamDevir < 0
                                    ? 'bg-rose-50 border-rose-300'
                                    : 'bg-slate-100 border-slate-300'
                                }`}
                              >
                                <div>
                                  <span className="text-[11px] font-bold uppercase text-slate-700">
                                    {devirRows.length > 1 ? `Önceki Devir (${devirRows.length} Kayıt)` : 'Önceki Devir'}
                                  </span>
                                  <p className="text-[10px] text-slate-500">
                                    Devir tablosundan alınan
                                  </p>
                                </div>
                                <div
                                  className={`text-xl font-black font-mono ${
                                    toplamDevir > 0
                                      ? 'text-emerald-700'
                                      : toplamDevir < 0
                                      ? 'text-rose-700'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  {toplamDevir > 0 ? `+${toplamDevir}` : toplamDevir}
                                </div>
                              </div>

                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {devirRows.map((d) => (
                                  <div
                                    key={d.id}
                                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs flex items-start justify-between gap-3"
                                  >
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-slate-900">{d.personel_adi_soyadi || bilgiTarget.personel_adi_soyadi}</span>
                                        {d.santiyesi && (
                                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                                            {d.santiyesi}
                                          </span>
                                        )}
                                      </div>
                                      {d.aciklama && (
                                        <p className="text-amber-700 font-medium">{d.aciklama}</p>
                                      )}
                                      {d.updated_at && (
                                        <p className="text-[10px] text-slate-500">
                                          Güncelleme: {new Date(d.updated_at).toLocaleString('tr-TR')}
                                        </p>
                                      )}
                                    </div>
                                    <span
                                      className={`shrink-0 font-mono text-sm font-black px-2.5 py-1 rounded-lg border ${
                                        d.devir > 0
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                          : d.devir < 0
                                          ? 'bg-rose-50 text-rose-700 border-rose-300'
                                          : 'bg-slate-100 text-slate-700 border-slate-300'
                                      }`}
                                    >
                                      {d.devir > 0 ? `+${d.devir}` : d.devir}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* BÖLÜM 3: TAHAKKUK KAYITLARI (SADECE TOPLAM TAHAKKUK) */}
                        <div className="space-y-2.5 pt-3 border-t border-slate-200">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-black uppercase tracking-wider text-amber-700">
                              Tahakkuk Kayıtları
                            </h4>
                            <button
                              type="button"
                              onClick={handleRefreshTahakkuk}
                              disabled={tahakkukRefreshing}
                              title="TC ile tahakkuk toplamını yeniden sorgula"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors disabled:opacity-50 bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                            >
                              <RefreshCw className={`w-3 h-3 ${tahakkukRefreshing ? 'animate-spin' : ''}`} />
                              <span>Yenile</span>
                            </button>
                          </div>

                          {tahakkukError ? (
                            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>Tahakkuk sorgulama hatası: {tahakkukError}</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleRefreshTahakkuk}
                                className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold shrink-0"
                              >
                                Tekrar Dene
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleOpenTahakkukListModal}
                              title="Tahakkuk kayıtlarını listelemek, güncellemek ve silmek için tıklayın"
                              className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 group cursor-pointer active:scale-[0.99] ${
                                toplamTahakkuk > 0
                                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 hover:border-amber-400'
                                  : 'bg-slate-50 hover:bg-amber-50 border-slate-300 hover:border-amber-400'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className="text-xs font-black uppercase text-amber-900">
                                  Toplam Tahakkuk
                                </span>
                                <p className="text-[10px] flex items-center gap-1 font-semibold text-amber-700">
                                  <span>Kayıtları görüntüle / güncelle / sil</span>
                                  <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                                </p>
                              </div>
                              <div className="text-2xl font-black font-mono text-amber-700">
                                {toplamTahakkuk}
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* EN ALT: NET ALACAK / BORÇ ÖZET PANELİ */}
                    {(() => {
                      const netHaftaSonu = haftaSonuOzet?.netHaftaSonuAlacagi ?? 0;
                      const netSonuc = Math.round((netHaftaSonu - toplamTahakkuk) * 100) / 100;
                      const devirDahilNet = Math.round((toplamDevir + netHaftaSonu - toplamTahakkuk) * 100) / 100;

                      return (
                        <div className="pt-3 border-t border-slate-200">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            {/* Net Hafta Sonu Alacağından Tahakkuk Düşümü */}
                            <div
                              className={`md:col-span-7 p-4 rounded-xl border-2 flex flex-wrap items-center justify-between gap-3 ${
                                netSonuc > 0
                                  ? 'bg-emerald-50 border-emerald-400'
                                  : netSonuc < 0
                                  ? 'bg-rose-50 border-rose-400'
                                  : 'bg-slate-100 border-slate-300'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                                  NET ALACAK / BORÇ (Hafta Sonu − Tahakkuk)
                                </div>
                                <div className="text-xs font-mono text-slate-600">
                                  Net Hafta Sonu ({netHaftaSonu > 0 ? `+${netHaftaSonu}` : netHaftaSonu}) − Tahakkuk Edilen ({toplamTahakkuk})
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`text-2xl font-black font-mono ${
                                    netSonuc > 0
                                      ? 'text-emerald-700'
                                      : netSonuc < 0
                                      ? 'text-rose-700'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  {netSonuc > 0 ? `+${netSonuc}` : netSonuc}
                                </span>
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase border ${
                                    netSonuc > 0
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : netSonuc < 0
                                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                                      : 'bg-slate-200 text-slate-700 border-slate-300'
                                  }`}
                                >
                                  {netSonuc > 0 ? 'ALACAK' : netSonuc < 0 ? 'BORÇ' : 'DENK'}
                                </span>
                              </div>
                            </div>

                            {/* Devir Dahil Genel Net Alacak / Borç */}
                            <div
                              className={`md:col-span-5 p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                                devirDahilNet > 0
                                  ? 'bg-cyan-50 border-cyan-300'
                                  : devirDahilNet < 0
                                  ? 'bg-rose-50 border-rose-300'
                                  : 'bg-slate-100 border-slate-300'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                                  DEVİR DAHİL GENEL NET
                                </div>
                                <div className="text-[11px] font-mono text-slate-600">
                                  Devir ({toplamDevir > 0 ? `+${toplamDevir}` : toplamDevir}) + ({netSonuc > 0 ? `+${netSonuc}` : netSonuc})
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xl font-black font-mono ${
                                    devirDahilNet > 0
                                      ? 'text-cyan-700'
                                      : devirDahilNet < 0
                                      ? 'text-rose-700'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  {devirDahilNet > 0 ? `+${devirDahilNet}` : devirDahilNet}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${
                                    devirDahilNet > 0
                                      ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                                      : devirDahilNet < 0
                                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                                      : 'bg-slate-200 text-slate-700 border-slate-300'
                                  }`}
                                >
                                  {devirDahilNet > 0 ? 'ALACAK' : devirDahilNet < 0 ? 'BORÇ' : 'DENK'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenTahakkukModal}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/25 border border-amber-300 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>Tahakkuk Ettir</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBilgiTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tahakkuk Kayıtları Listeleme / Güncelleme / Silme Ekranı */}
      <AnimatePresence>
        {bilgiTarget && showTahakkukListModal && (
          <div
            onClick={() => tahakkukActionLoadingId === null && setShowTahakkukListModal(false)}
            className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-[95vw] max-w-3xl max-h-[88vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
                darkMode
                  ? 'bg-[#111522] border-amber-500/30 text-gray-100'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Header */}
              <div
                className={`px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
                  darkMode ? 'border-white/10 bg-amber-500/10' : 'border-slate-200 bg-amber-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black tracking-tight">
                      Tahakkuk Kayıtları Yönetimi
                    </h3>
                    <p className={`text-[11px] flex flex-wrap items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                      <span className="font-bold">{bilgiTarget.personel_adi_soyadi}</span>
                      <span className="font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                        TC: {bilgiTarget.tc_no}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-black">
                    Toplam: {toplamTahakkuk}
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshTahakkuk}
                    disabled={tahakkukRefreshing}
                    className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                      darkMode ? 'border-white/15 hover:bg-white/10 text-gray-300' : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                    }`}
                    title="Listeyi Yenile"
                  >
                    <RefreshCw className={`w-4 h-4 ${tahakkukRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTahakkukListModal(false)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      darkMode ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3 overflow-y-auto flex-1">
                {tahakkukManageError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{tahakkukManageError}</span>
                    </div>
                    {tahakkukManageRlsError && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(PUANTAJTAHAKKUK_RLS_SQL);
                            showToast('✓ Yetki SQL kodu panoya kopyalandı.');
                          } catch {
                            // ignore
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/25 hover:bg-rose-500/35 text-rose-200 font-bold transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>SQL İzin Kodunu Kopyala</span>
                      </button>
                    )}
                  </div>
                )}

                {tahakkukRefreshing && tahakkukRows.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                    <span className="text-xs text-gray-400">Tahakkuk kayıtları sorgulanıyor...</span>
                  </div>
                ) : tahakkukRows.length === 0 ? (
                  <div
                    className={`p-8 rounded-xl border text-center space-y-2 ${
                      darkMode ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <p className="text-sm font-bold text-amber-400">Tahakkuk Kaydı Bulunamadı</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                      TC <span className="font-mono">{bilgiTarget.tc_no}</span> için kayıtlı tahakkuk bulunmamaktadır.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr
                          className={`border-b text-[11px] font-black uppercase tracking-wider ${
                            darkMode
                              ? 'bg-white/[0.04] border-white/10 text-gray-300'
                              : 'bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <th className="py-2.5 px-3">ID</th>
                          <th className="py-2.5 px-3">TC No</th>
                          <th className="py-2.5 px-3">Adı Soyadı</th>
                          <th className="py-2.5 px-3">Tahakkuk Edilen</th>
                          <th className="py-2.5 px-3">Kayıt Tarihi</th>
                          <th className="py-2.5 px-3 text-right">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-white/10' : 'divide-slate-200'}`}>
                        {tahakkukRows.map((t) => {
                          const isEditing = editingTahakkukId === t.id;
                          const isConfirmDelete = confirmDeleteTahakkukId === t.id;
                          const isBusy = tahakkukActionLoadingId === t.id;

                          return (
                            <tr
                              key={t.id}
                              className={darkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'}
                            >
                              <td className="py-2.5 px-3 font-mono text-gray-400">#{t.id}</td>
                              <td className="py-2.5 px-3 font-mono text-cyan-400 font-semibold whitespace-nowrap">
                                {t.tcno}
                              </td>
                              <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                                {t.adısoyadı || bilgiTarget.personel_adi_soyadi}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    autoFocus
                                    value={editingTahakkukValue}
                                    onChange={(e) => setEditingTahakkukValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveEditTahakkuk(t);
                                      } else if (e.key === 'Escape') {
                                        setEditingTahakkukId(null);
                                      }
                                    }}
                                    className={`w-28 px-2.5 py-1 rounded-lg font-mono font-bold border focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                                      darkMode
                                        ? 'bg-black/60 border-amber-500/50 text-white'
                                        : 'bg-white border-amber-400 text-slate-900'
                                    }`}
                                  />
                                ) : (
                                  <span className="font-mono text-sm font-black px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    {t.tahakkukedilen}
                                  </span>
                                )}
                              </td>
                              <td className={`py-2.5 px-3 whitespace-nowrap ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                {t.created_at ? new Date(t.created_at).toLocaleString('tr-TR') : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleSaveEditTahakkuk(t)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black inline-flex items-center gap-1 disabled:opacity-50"
                                      >
                                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        <span>Kaydet</span>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => setEditingTahakkukId(null)}
                                        className={`px-2 py-1 rounded-lg font-bold border ${
                                          darkMode ? 'border-white/15 hover:bg-white/10' : 'border-slate-300 hover:bg-slate-200'
                                        }`}
                                      >
                                        İptal
                                      </button>
                                    </>
                                  ) : isConfirmDelete ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleDeleteTahakkuk(t)}
                                        className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-black inline-flex items-center gap-1 disabled:opacity-50"
                                      >
                                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        <span>Evet, Sil</span>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => setConfirmDeleteTahakkukId(null)}
                                        className={`px-2 py-1 rounded-lg font-bold border ${
                                          darkMode ? 'border-white/15 hover:bg-white/10' : 'border-slate-300 hover:bg-slate-200'
                                        }`}
                                      >
                                        Vazgeç
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleStartEditTahakkuk(t)}
                                        className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-bold inline-flex items-center gap-1 transition-colors"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                        <span>Güncelle</span>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => {
                                          playClickSound();
                                          setEditingTahakkukId(null);
                                          setConfirmDeleteTahakkukId(t.id);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold inline-flex items-center gap-1 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Sil</span>
                                      </button>
                                    </>
                                  )}
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

              {/* Footer */}
              <div
                className={`px-5 py-3 border-t flex items-center justify-between gap-3 shrink-0 ${
                  darkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={handleOpenTahakkukModal}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md border border-amber-300 inline-flex items-center gap-1.5 active:scale-95"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>Yeni Tahakkuk Ekle</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTahakkukListModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    darkMode
                      ? 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'
                  }`}
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tahakkuk Ettir Kayıt Ekranı Modal */}
      <AnimatePresence>
        {bilgiTarget && showTahakkukModal && (
          <div
            onClick={() => !tahakkukSaving && setShowTahakkukModal(false)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
                darkMode
                  ? 'bg-[#121622] border-amber-500/30 text-gray-100'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Header */}
              <div
                className={`px-5 py-4 border-b flex items-center justify-between ${
                  darkMode ? 'border-white/10 bg-amber-500/10' : 'border-slate-200 bg-amber-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <FilePlus2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black tracking-tight">
                      Tahakkuk Kayıt Ekranı
                    </h3>
                    <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                      Personel için tahakkuk kaydı oluşturun
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={tahakkukSaving}
                  onClick={() => setShowTahakkukModal(false)}
                  className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                    darkMode ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveTahakkuk} className="p-5 space-y-4">
                {/* TC NO (Direkt Yazılı) */}
                <div className="space-y-1.5">
                  <label className={`block text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                    TC NO
                  </label>
                  <input
                    type="text"
                    value={bilgiTarget.tc_no || ''}
                    readOnly
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono font-bold border focus:outline-none ${
                      darkMode
                        ? 'bg-white/[0.04] border-white/15 text-cyan-300 cursor-not-allowed'
                        : 'bg-slate-100 border-slate-300 text-cyan-700 cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* ADI SOYADI (Direkt Yazılı) */}
                <div className="space-y-1.5">
                  <label className={`block text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                    ADI SOYADI
                  </label>
                  <input
                    type="text"
                    value={bilgiTarget.personel_adi_soyadi || ''}
                    readOnly
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold border focus:outline-none ${
                      darkMode
                        ? 'bg-white/[0.04] border-white/15 text-white cursor-not-allowed'
                        : 'bg-slate-100 border-slate-300 text-slate-900 cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* TAHAKKUK EDİLEN (Manuel Girilecek) */}
                <div className="space-y-1.5">
                  <label className={`block text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                    TAHAKKUK EDİLEN
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={tahakkukInput}
                    onChange={(e) => {
                      setTahakkukInput(e.target.value);
                      if (tahakkukSaveError) setTahakkukSaveError(null);
                    }}
                    placeholder="Manuel değer giriniz (örn: 5 veya 2.5)"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono font-bold border focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                      darkMode
                        ? 'bg-black/50 border-amber-500/40 text-white placeholder-gray-500'
                        : 'bg-white border-amber-400 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {tahakkukSaveError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{tahakkukSaveError}</span>
                    </div>
                    {tahakkukRlsError && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(PUANTAJTAHAKKUK_RLS_SQL);
                            showToast('✓ Yetki SQL kodu panoya kopyalandı.');
                          } catch {
                            // ignore
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/25 hover:bg-rose-500/35 text-rose-200 font-bold transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>SQL İzin Kodunu Kopyala</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Form Actions */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={tahakkukSaving}
                    onClick={() => setShowTahakkukModal(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 ${
                      darkMode
                        ? 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'
                    }`}
                  >
                    İptal
                  </button>

                  <button
                    type="submit"
                    disabled={tahakkukSaving}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/25 border border-amber-300 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {tahakkukSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Kaydet</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
