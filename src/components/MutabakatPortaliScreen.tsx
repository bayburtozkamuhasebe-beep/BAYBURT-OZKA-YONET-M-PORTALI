import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Handshake,
  Building2,
  Hash,
  Mail,
  FileText,
  DollarSign,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  Download,
  Printer,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  Database,
  Code2,
  FileDown,
  Loader2,
  X,
  MessageCircle,
  Share2,
  Phone,
  Smartphone,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import * as XLSX from 'xlsx';
import { generateMutabakatPdf, sayiyiYaziyaCevir, MutabakatPdfResult } from '../utils/mutabakatPdf';
import { generateMutabakatGroupReportPdf } from '../utils/mutabakatReportPdf';
import {
  MUTABAKAT_TABLE_SQL_SCRIPT,
  MUTABAKAT_ADD_COLUMNS_SQL_SCRIPT,
  MUTABAKAT_SUPABASE_DASHBOARD_URL,
  MUTABAKAT_SUPABASE_PROJECT_ID,
  fetchMutabakatRowsFromSupabase,
  insertMutabakatToSupabase,
  updateMutabakatInSupabase,
  deleteMutabakatFromSupabase,
  fetchSantiyeIsimleriFromSupabase,
  SupabaseSantiyeRow,
  SupabaseMutabakatRow,
} from '../lib/supabase';

export type MutabakatDurumTipi =
  | 'Gönderildi'
  | 'Onaylandı'
  | 'Onaylanmadı'
  | 'Bekliyor'
  | 'Mutabık'
  | 'İhtilaflı'
  | string;

export interface MutabakatKaydi {
  id: string;
  dbId?: number | string;
  anafirma: string; // ANA FİRMA (anafirma)
  vergino: string; // ANA FİRMA VERGİ NO (vergino)
  vergiNo: string; // MUTABAKAT YAPILACAK FİRMA VERGİ NO
  firmaUnvani: string; // MUTABAKAT YAPILACAK FİRMA ÜNVANI
  borcAlacakTipi: 'BORÇ' | 'ALACAK';
  tutar: number;
  borcAlacakMetni: string; // "BORÇ: 125.000,00 ₺" vb.
  eposta: string;
  aciklama: string;
  tarih: string;
  durum: MutabakatDurumTipi;
  paraBirimi?: string;
  donem?: string;
  createdAt: string;
}

const STORAGE_KEY = 'ozka_mutabakat_kayitlari_v1';

interface MutabakatPortaliScreenProps {
  onBack: () => void;
  onBackToHome?: () => void;
  playClickSound?: () => void;
  initialFirma?: { anafirma?: string; vergino?: string; santiyeadi?: string } | null;
  onReopenFirmaSec?: () => void;
}

export const MutabakatPortaliScreen: React.FC<MutabakatPortaliScreenProps> = ({
  onBack,
  onBackToHome,
  playClickSound = () => {},
  initialFirma,
  onReopenFirmaSec,
}) => {
  // Şantiye / Firma Listbox State'leri (santiyeisimleri tablosundan)
  const [santiyeListesi, setSantiyeListesi] = useState<SupabaseSantiyeRow[]>([]);
  const [santiyeLoading, setSantiyeLoading] = useState(false);
  const [selectedSantiyeId, setSelectedSantiyeId] = useState<string>(''); // Başlangıçta boş: "veri olmasın"
  const santiyeSelectRef = useRef<HTMLSelectElement>(null);

  // Firma Seçimi Modalı & Textbox Arama State'i (yeniden firma seç butonuna tıklandığında açılır)
  const [showFirmaSecPortalModal, setShowFirmaSecPortalModal] = useState(false);
  const [firmaSearchInput, setFirmaSearchInput] = useState('');

  // Yeni Eklenen Sütunlar: Ana Firma ve Vergi No (anafirma, vergino)
  const [anaFirma, setAnaFirma] = useState(initialFirma?.anafirma || 'ÖZKA İNŞAAT A.Ş.');
  const [anaFirmaVergiNo, setAnaFirmaVergiNo] = useState(initialFirma?.vergino || '');

  // Form Alanları (Mutabakat Yapılacak Cari Alanları)
  const [vergiNo, setVergiNo] = useState('');
  const [firmaUnvani, setFirmaUnvani] = useState('');
  const [borcAlacakTipi, setBorcAlacakTipi] = useState<'BORÇ' | 'ALACAK'>('BORÇ');
  const [tutarGirdisi, setTutarGirdisi] = useState('');
  const [borcAlacakMetin, setBorcAlacakMetin] = useState('');
  const [eposta, setEposta] = useState('');
  const [aciklama, setAciklama] = useState('');

  // Ek Alanlar
  const [paraBirimi, setParaBirimi] = useState('₺');
  const [mutabakatTarihi, setMutabakatTarihi] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Kayıt Düzenleme Durumu
  const [editingId, setEditingId] = useState<string | null>(null);

  // Kayıt Listesi
  const [kayitlar, setKayitlar] = useState<MutabakatKaydi[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Eğer sadece eski sahte demo veriler varsa temizle
          const isMockOnly = parsed.every((k: any) => k.id === 'mut-1' || k.id === 'mut-2');
          if (!isMockOnly) return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Arama ve Filtre
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTip, setFilterTip] = useState<'all' | 'BORÇ' | 'ALACAK'>('all');
  const [filterDurum, setFilterDurum] = useState<string>('all');
  // Kullanıcı Talebi: Mutabakat portalına gelindiğinde Vergi No filtreleme yapma
  const [filterVergiNo, setFilterVergiNo] = useState<string>(initialFirma?.vergino || '');

  // Tablodaki Kutucuklarla Seçim State'i (Tekli ve Çoklu Seçim)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Kullanıcı Talebi: Ünvan yanındaki SORGULA butonu ile Supabase mutabakat tablosundan arama modalı
  const [showSorgulaModal, setShowSorgulaModal] = useState<boolean>(false);
  const [sorgulaSearchQuery, setSorgulaSearchQuery] = useState<string>('');
  const [sorgulaLoading, setSorgulaLoading] = useState<boolean>(false);
  const [supabaseMutabakatRecords, setSupabaseMutabakatRecords] = useState<SupabaseMutabakatRow[]>([]);

  // SQL Tablo Kodu Modalı
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlTab, setSqlTab] = useState<'columns' | 'full'>('columns');
  const [sqlCopied, setSqlCopied] = useState(false);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [activeProject, setActiveProject] = useState<'primary' | 'bank' | null>(null);

  // Mektup Önizleme Modalı
  const [selectedForLetter, setSelectedForLetter] = useState<MutabakatKaydi | null>(null);

  // WhatsApp ile Mutabakat Gönderim Modalı (PDF oluşturup seçilene gönderme)
  const [whatsappModalData, setWhatsappModalData] = useState<{
    kayit: MutabakatKaydi;
    phone: string;
    pdfBlob?: Blob;
    pdfFile?: File | null;
    fileName?: string;
    isGeneratingPdf: boolean;
    pdfReady: boolean;
    copied: boolean;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Supabase'den Canlı Kayıtları Çekme Fonksiyonu
  const loadFromSupabase = async (isManual = false) => {
    setSupabaseLoading(true);
    try {
      const res = await fetchMutabakatRowsFromSupabase();
      if (res.activeClient && res.data && res.data.length > 0) {
        setSupabaseConnected(true);
        setActiveProject(res.activeClient);
        const mapped: MutabakatKaydi[] = res.data.map((r) => {
          const numTutar = typeof r.tutar === 'number' ? r.tutar : parseFloat(String(r.tutar || 0)) || 0;
          return {
            id: String(r.id),
            dbId: r.id,
            anafirma: r.anafirma || 'ÖZKA İNŞAAT A.Ş.',
            vergino: r.vergino || '',
            vergiNo: r.vergi_no || '',
            firmaUnvani: r.firma_unvani || '',
            borcAlacakTipi: (r.borc_alacak_tipi === 'ALACAK' ? 'ALACAK' : 'BORÇ') as 'BORÇ' | 'ALACAK',
            tutar: numTutar,
            borcAlacakMetni: r.borc_alacak_metni || `${r.borc_alacak_tipi || 'BORÇ'}: ${numTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${r.para_birimi || '₺'}`,
            eposta: r.eposta || '',
            aciklama: r.aciklama || '',
            tarih: r.tarih || new Date().toISOString().split('T')[0],
            durum: (r.durumu || r.durum || 'Bekliyor') as any,
            paraBirimi: r.para_birimi || '₺',
            createdAt: r.created_at || new Date().toISOString(),
          };
        });
        setKayitlar(mapped);
        if (isManual) showToast('Supabase tablosundan veriler başarıyla güncellendi.');
      } else if (res.activeClient && res.data && res.data.length === 0) {
        setSupabaseConnected(true);
        setActiveProject(res.activeClient);
        if (isManual) showToast('Supabase tablosuna bağlandı (Henüz kayıt yok).');
      } else {
        setSupabaseConnected(false);
        setActiveProject(null);
        if (isManual) {
          showToast('Supabase tablosu henüz bulunamadı. Tabloyu oluşturmak için "SQL Tablo Kodu" butonuna tıklayınız.');
        }
      }
    } catch (err) {
      setSupabaseConnected(false);
      setActiveProject(null);
      if (isManual) showToast('Supabase sorgusu sırasında hata oluştu.');
    } finally {
      setSupabaseLoading(false);
    }
  };

  // Sayfa açıldığında Supabase kontrolü yap
  useEffect(() => {
    loadFromSupabase(false);
  }, []);

  // Şantiye isimleri listesini Supabase'den çek
  const loadSantiyeListesi = async () => {
    setSantiyeLoading(true);
    try {
      const rows = await fetchSantiyeIsimleriFromSupabase();
      setSantiyeListesi(rows);
      if (initialFirma?.santiyeadi) {
        const match = rows.find(
          (r) => r.Santiyeadı?.toLowerCase() === initialFirma.santiyeadi?.toLowerCase()
        );
        if (match) setSelectedSantiyeId(match.id);
      }
    } catch (err) {
      console.warn('Şantiye isimleri yüklenemedi:', err);
    } finally {
      setSantiyeLoading(false);
    }
  };

  useEffect(() => {
    loadSantiyeListesi();
  }, []);

  // initialFirma prop değiştiğinde form alanlarını ve vergi no filtresini güncelle
  useEffect(() => {
    if (initialFirma) {
      if (initialFirma.anafirma) setAnaFirma(initialFirma.anafirma);
      if (initialFirma.vergino) {
        setAnaFirmaVergiNo(initialFirma.vergino);
        // Kullanıcı talebi: Mutabakat portalına git tıklandığında açılan sayfadaki tabloda vergi no filtreleme yapsın
        setFilterVergiNo(initialFirma.vergino);
      }
    }
  }, [initialFirma]);

  // Listbox'tan Şantiye / Firma Seçildiğinde
  const handleSelectSantiye = (id: string) => {
    setSelectedSantiyeId(id);
    if (!id) {
      setFilterVergiNo('');
      return;
    }
    const chosen = santiyeListesi.find((s) => s.id === id);
    if (chosen) {
      playClickSound();
      const targetUnvan = chosen.unvani || chosen.Santiyeadı || '';
      if (targetUnvan) setAnaFirma(targetUnvan);
      if (chosen.vergino) {
        setAnaFirmaVergiNo(chosen.vergino);
        // Kullanıcı talebi: Şantiye/firma seçildiğinde vergi no filtresi otomatik güncellensin
        setFilterVergiNo(chosen.vergino);
      }
      showToast(`${chosen.Santiyeadı} bilgileri forma aktarıldı ve tablo filtrelendi.`);
    }
  };

  // LocalStorage senkronizasyonu
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kayitlar));
    } catch {
      // ignore
    }
  }, [kayitlar]);

  // Tutar değiştiğinde borcAlacakMetin'i otomatik güncelle (kullanıcı isterse direkt text olarak da değiştirebilir)
  const handleTutarChange = (val: string) => {
    setTutarGirdisi(val);
    const cleaned = val.replace(/[^0-9.,]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      const formatted = num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      setBorcAlacakMetin(`${borcAlacakTipi}: ${formatted} ${paraBirimi}`);
    } else {
      setBorcAlacakMetin(`${borcAlacakTipi}: ${val}`);
    }
  };

  const handleTipChange = (tip: 'BORÇ' | 'ALACAK') => {
    setBorcAlacakTipi(tip);
    const cleaned = tutarGirdisi.replace(/[^0-9.,]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      const formatted = num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      setBorcAlacakMetin(`${tip}: ${formatted} ${paraBirimi}`);
    } else if (borcAlacakMetin) {
      setBorcAlacakMetin(`${tip} - ${tutarGirdisi}`);
    }
  };

  // Form Sıfırlama
  const handleResetForm = () => {
    playClickSound();
    setSelectedSantiyeId('');
    setAnaFirma('ÖZKA İNŞAAT A.Ş.');
    setAnaFirmaVergiNo('');
    setVergiNo('');
    setFirmaUnvani('');
    setBorcAlacakTipi('BORÇ');
    setTutarGirdisi('');
    setBorcAlacakMetin('');
    setEposta('');
    setAciklama('');
    setEditingId(null);
  };

  // Kaydet / Güncelle
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    if (!vergiNo.trim() && !firmaUnvani.trim()) {
      showToast('Lütfen en azından Vergi No veya Firma Ünvanı giriniz.');
      return;
    }

    const cleanedAmount = tutarGirdisi.replace(/[^0-9.,]/g, '').replace(',', '.');
    const numAmount = parseFloat(cleanedAmount) || 0;

    const finalMetin = borcAlacakMetin.trim()
      ? borcAlacakMetin.trim()
      : `${borcAlacakTipi}: ${numAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${paraBirimi}`;

    const safeAnaFirma = anaFirma.trim() || 'ÖZKA İNŞAAT A.Ş.';
    const safeAnaFirmaVergiNo = anaFirmaVergiNo.trim();

    if (editingId) {
      // Düzenleme
      const existing = kayitlar.find((k) => k.id === editingId);
      const dbTargetId = existing?.dbId || existing?.id;

      setKayitlar((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                anafirma: safeAnaFirma,
                vergino: safeAnaFirmaVergiNo,
                vergiNo: vergiNo.trim(),
                firmaUnvani: firmaUnvani.trim().toLocaleUpperCase('tr-TR'),
                borcAlacakTipi,
                tutar: numAmount,
                borcAlacakMetni: finalMetin,
                eposta: eposta.trim(),
                aciklama: aciklama.trim(),
                tarih: mutabakatTarihi,
                paraBirimi,
              }
            : item
        )
      );

      if (dbTargetId) {
        updateMutabakatInSupabase(dbTargetId, {
          anafirma: safeAnaFirma,
          vergino: safeAnaFirmaVergiNo,
          vergi_no: vergiNo.trim(),
          firma_unvani: firmaUnvani.trim().toLocaleUpperCase('tr-TR'),
          borc_alacak_tipi: borcAlacakTipi,
          tutar: numAmount,
          borc_alacak_metni: finalMetin,
          eposta: eposta.trim(),
          aciklama: aciklama.trim(),
          tarih: mutabakatTarihi,
          para_birimi: paraBirimi,
        }).catch(() => {});
      }

      showToast('Mutabakat kaydı başarıyla güncellendi.');
    } else {
      // Yeni Kayıt
      const tempId = `mut-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newKayit: MutabakatKaydi = {
        id: tempId,
        anafirma: safeAnaFirma,
        vergino: safeAnaFirmaVergiNo,
        vergiNo: vergiNo.trim(),
        firmaUnvani: (firmaUnvani.trim() || 'BELİRTİLMEDİ').toLocaleUpperCase('tr-TR'),
        borcAlacakTipi,
        tutar: numAmount,
        borcAlacakMetni: finalMetin,
        eposta: eposta.trim(),
        aciklama: aciklama.trim(),
        tarih: mutabakatTarihi,
        durum: 'Bekliyor',
        paraBirimi,
        createdAt: new Date().toISOString(),
      };

      setKayitlar((prev) => [newKayit, ...prev]);
      showToast('Yeni mutabakat kaydı kaydedildi.');

      // Supabase'e ekle
      insertMutabakatToSupabase({
        anafirma: safeAnaFirma,
        vergino: safeAnaFirmaVergiNo,
        vergi_no: vergiNo.trim(),
        firma_unvani: (firmaUnvani.trim() || 'BELİRTİLMEDİ').toLocaleUpperCase('tr-TR'),
        borc_alacak_tipi: borcAlacakTipi,
        tutar: numAmount,
        borc_alacak_metni: finalMetin,
        eposta: eposta.trim(),
        aciklama: aciklama.trim(),
        tarih: mutabakatTarihi,
        durum: 'Bekliyor',
        para_birimi: paraBirimi,
      }).then((res) => {
        if (res.success && res.data) {
          setKayitlar((prev) =>
            prev.map((k) => (k.id === tempId ? { ...k, dbId: res.data!.id, id: String(res.data!.id) } : k))
          );
          setSupabaseConnected(true);
        }
      }).catch(() => {});
    }

    handleResetForm();
  };

  // Düzenleme Moduna Al
  const handleStartEdit = (kayit: MutabakatKaydi) => {
    playClickSound();
    setEditingId(kayit.id);
    setAnaFirma(kayit.anafirma || 'ÖZKA İNŞAAT A.Ş.');
    setAnaFirmaVergiNo(kayit.vergino || '');
    setVergiNo(kayit.vergiNo);
    setFirmaUnvani(kayit.firmaUnvani);
    setBorcAlacakTipi(kayit.borcAlacakTipi);
    setTutarGirdisi(kayit.tutar ? String(kayit.tutar) : '');
    setBorcAlacakMetin(kayit.borcAlacakMetni);
    setEposta(kayit.eposta);
    setAciklama(kayit.aciklama);
    setMutabakatTarihi(kayit.tarih || new Date().toISOString().split('T')[0]);
    if (kayit.paraBirimi) setParaBirimi(kayit.paraBirimi);

    // Form alanına kaydır
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`"${kayit.firmaUnvani}" kaydı düzenleme formuna yüklendi.`);
  };

  // Tekil Satır Sil
  const handleDelete = (id: string) => {
    playClickSound();
    const target = kayitlar.find((k) => k.id === id);
    const targetName = target?.firmaUnvani || 'bu mutabakatı';
    if (window.confirm(`"${targetName}" kaydını silmek istediğinize emin misiniz?`)) {
      setKayitlar((prev) => prev.filter((k) => k.id !== id));
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (editingId === id) handleResetForm();

      if (target?.dbId || target?.id) {
        deleteMutabakatFromSupabase(target.dbId || target.id).catch(() => {});
      }

      showToast('Kayıt silindi.');
    }
  };

  // Tekil Satır Kutucuk Seç / Kaldır
  const toggleSelectRow = (id: string) => {
    playClickSound();
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Tüm Filtrelenmiş Satırları Seç / Seçimi Kaldır
  const handleSelectAllRows = () => {
    playClickSound();
    if (filteredKayitlar.length === 0) return;
    const allFilteredSelected = filteredKayitlar.every((k) => selectedRowIds.has(k.id));
    if (allFilteredSelected) {
      // Hepsini kaldır
      setSelectedRowIds(new Set());
    } else {
      // Hepsini ekle
      const next = new Set(selectedRowIds);
      filteredKayitlar.forEach((k) => next.add(k.id));
      setSelectedRowIds(next);
    }
  };

  // Tablo Üzerindeki Butonlar: Gönderildi, Onaylandı, Onaylanmadı Toplu Durum Güncelleme
  const handleUpdateStatusBulk = (newStatus: 'Gönderildi' | 'Onaylandı' | 'Onaylanmadı') => {
    playClickSound();
    if (selectedRowIds.size === 0) {
      showToast(`Lütfen durumunu "${newStatus}" yapmak istediğiniz kayıtların başındaki kutucukları işaretleyiniz.`);
      return;
    }

    const count = selectedRowIds.size;
    setKayitlar((prev) =>
      prev.map((k) => (selectedRowIds.has(k.id) ? { ...k, durum: newStatus } : k))
    );

    // Supabase'e asenkron kaydet
    kayitlar.forEach((k) => {
      if (selectedRowIds.has(k.id)) {
        const targetId = k.dbId || k.id;
        if (targetId) {
          updateMutabakatInSupabase(targetId, { durum: newStatus }).catch(() => {});
        }
      }
    });

    showToast(`Seçilen ${count} adet kaydın durumu "${newStatus}" olarak güncellendi.`);
  };

  // Seçilen Kayıtları Toplu Silme (Kullanıcı Talebi: Tabloda silme güncelleme yapılabilsin)
  const handleDeleteSelected = () => {
    playClickSound();
    if (selectedRowIds.size === 0) {
      showToast('Lütfen silmek istediğiniz kayıtları kutucuklardan seçiniz.');
      return;
    }

    const count = selectedRowIds.size;
    if (window.confirm(`Seçilen ${count} adet mutabakat kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      const idsToDelete = new Set(selectedRowIds);

      kayitlar.forEach((k) => {
        if (idsToDelete.has(k.id)) {
          const targetId = k.dbId || k.id;
          if (targetId) {
            deleteMutabakatFromSupabase(targetId).catch(() => {});
          }
        }
      });

      setKayitlar((prev) => prev.filter((k) => !idsToDelete.has(k.id)));
      if (editingId && idsToDelete.has(editingId)) {
        handleResetForm();
      }
      setSelectedRowIds(new Set());
      showToast(`${count} adet kayıt başarıyla silindi.`);
    }
  };

  // Seçili Kaydı Formda Düzenle / Güncelle
  const handleEditSelected = () => {
    playClickSound();
    if (selectedRowIds.size === 0) {
      showToast('Lütfen düzenlemek istediğiniz kaydı seçiniz.');
      return;
    }
    const firstId = Array.from(selectedRowIds)[0];
    const target = kayitlar.find((k) => k.id === firstId);
    if (target) {
      handleStartEdit(target);
    }
  };

  // Satır Üzerinden Durum Değiştir (Döngüsel: Gönderildi -> Onaylandı -> Onaylanmadı -> Bekliyor)
  const handleToggleDurum = (id: string, current: string) => {
    playClickSound();
    let nextDurum: string;
    if (current === 'Gönderildi') {
      nextDurum = 'Onaylandı';
    } else if (current === 'Onaylandı' || current === 'Mutabık') {
      nextDurum = 'Onaylanmadı';
    } else if (current === 'Onaylanmadı' || current === 'İhtilaflı') {
      nextDurum = 'Bekliyor';
    } else {
      nextDurum = 'Gönderildi';
    }

    const target = kayitlar.find((k) => k.id === id);

    setKayitlar((prev) =>
      prev.map((k) => (k.id === id ? { ...k, durum: nextDurum } : k))
    );

    if (target?.dbId || target?.id) {
      updateMutabakatInSupabase(target.dbId || target.id, { durum: nextDurum }).catch(() => {});
    }
    showToast(`Durum "${nextDurum}" olarak güncellendi.`);
  };

  // Filtrelenmiş Kayıtlar (Vergi No, Arama ve Tip/Durum Filtreleri)
  const filteredKayitlar = useMemo(() => {
    return kayitlar.filter((k) => {
      // 1. Vergi No Filtresi (Kullanıcı Talebi: Mutabakat portalına git tıklandığında açılan sayfadaki tabloda vergi no filtreleme yapsın)
      if (filterVergiNo && filterVergiNo.trim()) {
        const vq = filterVergiNo.trim().toLowerCase();
        const matchVergi =
          (k.vergino && k.vergino.toLowerCase().includes(vq)) ||
          (k.vergiNo && k.vergiNo.toLowerCase().includes(vq));
        if (!matchVergi) return false;
      }

      // 2. Genel Metin Arama
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        (k.anafirma && k.anafirma.toLowerCase().includes(q)) ||
        (k.vergino && k.vergino.toLowerCase().includes(q)) ||
        k.firmaUnvani.toLowerCase().includes(q) ||
        k.vergiNo.toLowerCase().includes(q) ||
        k.eposta.toLowerCase().includes(q) ||
        k.aciklama.toLowerCase().includes(q) ||
        k.borcAlacakMetni.toLowerCase().includes(q);

      // 3. Borç/Alacak Filtresi
      const matchTip = filterTip === 'all' || k.borcAlacakTipi === filterTip;

      // 4. Durum Filtresi
      let matchDurum = filterDurum === 'all';
      if (!matchDurum) {
        if (filterDurum === 'Onaylandı') {
          matchDurum = k.durum === 'Onaylandı' || k.durum === 'Mutabık';
        } else if (filterDurum === 'Onaylanmadı') {
          matchDurum = k.durum === 'Onaylanmadı' || k.durum === 'İhtilaflı';
        } else if (filterDurum === 'Mutabık') {
          matchDurum = k.durum === 'Mutabık' || k.durum === 'Onaylandı';
        } else if (filterDurum === 'İhtilaflı') {
          matchDurum = k.durum === 'İhtilaflı' || k.durum === 'Onaylanmadı';
        } else {
          matchDurum = k.durum === filterDurum;
        }
      }

      return matchSearch && matchTip && matchDurum;
    });
  }, [kayitlar, searchTerm, filterTip, filterDurum, filterVergiNo]);

  // ============================================================================
  // SORGULA MODALI FONKSİYONLARI (public.mutabakat TABLOSUNDAN SORGULA VE AKTAR)
  // ============================================================================
  const handleOpenSorgulaModal = async () => {
    playClickSound();
    setSorgulaSearchQuery(firmaUnvani.trim());
    setShowSorgulaModal(true);
    setSorgulaLoading(true);
    try {
      const res = await fetchMutabakatRowsFromSupabase();
      if (res.data && res.data.length > 0) {
        setSupabaseMutabakatRecords(res.data);
      }
    } catch (err) {
      console.error('Supabase mutabakat tablosu sorgulanamadı:', err);
    } finally {
      setSorgulaLoading(false);
    }
  };

  // Sorgu Sonuçları (Firma Ünvanı ve Vergi Noya göre anlık arama)
  const filteredSorgulaResults = useMemo(() => {
    const q = sorgulaSearchQuery.toLowerCase().trim();
    const sourceList: Array<{
      id: string | number;
      firmaUnvani: string;
      vergiNo: string;
      anafirma: string;
      vergino: string;
      tutar: number;
      borcAlacakTipi: string;
      borcAlacakMetni: string;
      eposta: string;
      tarih: string;
      durum: string;
    }> = [];

    // Supabase kayıtları (public.mutabakat)
    supabaseMutabakatRecords.forEach((r, idx) => {
      if (r.firma_unvani || r.vergi_no) {
        sourceList.push({
          id: r.id || `sb-${idx}`,
          firmaUnvani: r.firma_unvani || '',
          vergiNo: r.vergi_no || '',
          anafirma: r.anafirma || '',
          vergino: r.vergino || '',
          tutar: typeof r.tutar === 'number' ? r.tutar : parseFloat(String(r.tutar || 0)) || 0,
          borcAlacakTipi: r.borc_alacak_tipi || 'BORÇ',
          borcAlacakMetni: r.borc_alacak_metni || '',
          eposta: r.eposta || '',
          tarih: r.tarih || '',
          durum: r.durum || 'Bekliyor',
        });
      }
    });

    // Mevcut kayıtlar (varsa ve listede yoksa ekle)
    kayitlar.forEach((k) => {
      const exists = sourceList.some(
        (s) => s.firmaUnvani.toLowerCase() === k.firmaUnvani.toLowerCase() && s.vergiNo === k.vergiNo
      );
      if (!exists && (k.firmaUnvani || k.vergiNo)) {
        sourceList.push({
          id: k.id,
          firmaUnvani: k.firmaUnvani,
          vergiNo: k.vergiNo,
          anafirma: k.anafirma,
          vergino: k.vergino,
          tutar: k.tutar,
          borcAlacakTipi: k.borcAlacakTipi,
          borcAlacakMetni: k.borcAlacakMetni,
          eposta: k.eposta,
          tarih: k.tarih,
          durum: k.durum,
        });
      }
    });

    if (!q) return sourceList;

    return sourceList.filter(
      (item) =>
        item.firmaUnvani.toLowerCase().includes(q) ||
        item.vergiNo.toLowerCase().includes(q) ||
        item.anafirma.toLowerCase().includes(q) ||
        item.vergino.toLowerCase().includes(q)
    );
  }, [supabaseMutabakatRecords, kayitlar, sorgulaSearchQuery]);

  // Sorgulanan firmayı seç ve SADECE Firma Ünvanı ile Firma Vergi Numarasını forma aktar
  const handleSelectFirmaFromSorgu = (item: {
    firmaUnvani: string;
    vergiNo: string;
  }) => {
    playClickSound();
    setFirmaUnvani(item.firmaUnvani || '');
    setVergiNo(item.vergiNo || '');
    setShowSorgulaModal(false);
    showToast(`Firma Ünvanı "${item.firmaUnvani}" ve Vergi No (${item.vergiNo}) başarıyla forma aktarıldı.`);
  };

  // İstatistikler
  const stats = useMemo(() => {
    let toplamBorc = 0;
    let toplamAlacak = 0;
    let mutabikSayisi = 0;

    kayitlar.forEach((k) => {
      if (k.borcAlacakTipi === 'BORÇ') toplamBorc += k.tutar || 0;
      if (k.borcAlacakTipi === 'ALACAK') toplamAlacak += k.tutar || 0;
      if (k.durum === 'Mutabık' || k.durum === 'Onaylandı') mutabikSayisi++;
    });

    return {
      toplam: kayitlar.length,
      toplamBorc,
      toplamAlacak,
      netBakiye: toplamAlacak - toplamBorc,
      mutabikSayisi,
    };
  }, [kayitlar]);

  // Şantiye Arama Filtreleme (Firma Seç Textbox'ı için)
  const filteredSantiyeListesi = useMemo(() => {
    if (!firmaSearchInput.trim()) return santiyeListesi;
    const q = firmaSearchInput.toLocaleLowerCase('tr-TR').trim();
    return santiyeListesi.filter((s) => {
      const adi = (s.Santiyeadı || '').toLocaleLowerCase('tr-TR');
      const unvan = (s.unvani || '').toLocaleLowerCase('tr-TR');
      const vkn = (s.vergino || '').toLocaleLowerCase('tr-TR');
      return adi.includes(q) || unvan.includes(q) || vkn.includes(q);
    });
  }, [santiyeListesi, firmaSearchInput]);

  // "YENİDEN FİRMA SEÇ" BUTONU İŞLEVİ (Kullanıcı Talebi: Tıklandığında firma seç textbox'ını aç)
  const handleResetToFirmaSec = () => {
    playClickSound();
    setSelectedSantiyeId('');
    setFirmaSearchInput('');
    setShowFirmaSecPortalModal(true);
    showToast('Firma seçimi arama kutusu açıldı. Listedeki firmalardan arayarak seçebilirsiniz.');
  };

  // Firma / Şantiye Seçim Modalından firma seçildiğinde
  const handleSelectFirmaFromPortalModal = (s: SupabaseSantiyeRow) => {
    playClickSound();
    setSelectedSantiyeId(s.id);
    setAnaFirma(s.unvani || s.Santiyeadı || 'ÖZKA İNŞAAT A.Ş.');
    setAnaFirmaVergiNo(s.vergino || '');
    if (s.vergino) {
      setFilterVergiNo(s.vergino);
    }
    setShowFirmaSecPortalModal(false);
    showToast(`${s.Santiyeadı} seçildi ve forma aktarıldı.`);
  };

  // E-Posta ile Mutabakat Gönderme (PDF oluşturup indirir ve E-Posta istemcisini açar)
  const handleSendEmailWithPdf = async (kayit: MutabakatKaydi) => {
    playClickSound();
    try {
      showToast('Mutabakat PDF mektubu hazırlanıyor ve E-Posta açılıyor...');
      // 1. Resmi PDF oluştur ve indir
      await generateMutabakatPdf(kayit);

      const anaFirmaAdi = kayit.anafirma || 'ÖZKA İNŞAAT A.Ş.';
      const formattedTutar = (kayit.tutar || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
      const subject = encodeURIComponent(`${anaFirmaAdi} - Resmi Cari Hesap Mutabakat Formu (${kayit.firmaUnvani})`);
      const body = encodeURIComponent(
`Sayın Yetkili,
Firma: ${kayit.firmaUnvani}
Vergi / TC No: ${kayit.vergiNo}

${kayit.tarih} tarihi itibarıyla sistem kayıtlarımıza göre şirketimiz nezdindeki cari hesap durumunuz:
Bakiye Durumu: ${kayit.borcAlacakMetni} (${formattedTutar} ${kayit.paraBirimi || '₺'})

Açıklama: ${kayit.aciklama || 'Cari hesap bakiye teyidi'}

Yukarıda belirtilen bakiye üzerinde mutabık olup olmadığınızı en kısa sürede tarafımıza bildirmenizi rica ederiz. İndirilen ekteki resmi mutabakat mektubu (PDF) belgesini inceleyip kaşe/imza ile onaylayarak iletebilirsiniz.

Saygılarımızla,
${anaFirmaAdi.toUpperCase()}
${kayit.vergino ? `Vergi / TC No: ${kayit.vergino}\n` : ''}MUHASEBE VE FİNANS DİREKTÖRLÜĞÜ`
      );

      const targetMail = kayit.eposta || '';
      window.open(`mailto:${targetMail}?subject=${subject}&body=${body}`, '_blank');
      showToast('Mutabakat PDF belgesi indirildi ve E-Posta istemcisi açıldı.');
    } catch (err) {
      console.error('E-posta mutabakat hatası:', err);
      showToast('Mutabakat hazırlanırken bir hata oluştu.');
    }
  };

  // Telefon numarasını WhatsApp formatına çevirme (05321234567 -> 905321234567)
  const formatWhatsAppPhone = (raw: string): string => {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 11) {
      return '90' + digits.slice(1);
    }
    if (digits.length === 10 && digits.startsWith('5')) {
      return '90' + digits;
    }
    return digits;
  };

  // WhatsApp Resmi Mutabakat Mesaj Metni Şablonu
  const buildWhatsAppMessage = (kayit: MutabakatKaydi): string => {
    const anaFirmaAdi = kayit.anafirma || 'ÖZKA İNŞAAT A.Ş.';
    const formattedTutar = (kayit.tutar || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    return `*${anaFirmaAdi.toUpperCase()} - RESMİ CARİ MUTABAKAT MEKTUBU*

*Muhatap Firma:* ${kayit.firmaUnvani}
*Vergi / TC No:* ${kayit.vergiNo || '-'}
*Mutabakat Tarihi:* ${kayit.tarih} itibarıyla
*Bakiye Durumu:* ${kayit.borcAlacakMetni} (${formattedTutar} ${kayit.paraBirimi || '₺'})

*Açıklama:* ${kayit.aciklama || 'Cari hesap bakiye teyidi'}

Sayın Yetkili, şirketimiz nezdindeki cari hesabınıza ilişkin resmi mutabakat mektubu PDF olarak hazırlanmıştır. İndirilen PDF belgesini inceleyip mutabık olup olmadığınızı kaşe ve imzanızla bildirmenizi rica ederiz.

İyi çalışmalar dileriz.
${anaFirmaAdi}`;
  };

  // WhatsApp ile Mutabakat Gönderme (PDF oluşturur, indirir ve WhatsApp gönderim modalını açar)
  const handleSendWhatsApp = async (kayit: MutabakatKaydi) => {
    playClickSound();

    // Hafızada bu firma için kayıtlı telefon numarası varsa çek
    let savedPhone = '';
    try {
      const stored = JSON.parse(localStorage.getItem('ozka_mutabakat_telefonlar_v1') || '{}');
      if (kayit.vergiNo && stored[kayit.vergiNo]) {
        savedPhone = stored[kayit.vergiNo];
      } else if (kayit.firmaUnvani && stored[kayit.firmaUnvani]) {
        savedPhone = stored[kayit.firmaUnvani];
      }
    } catch {}

    // Modalı hemen göster (kullanıcı beklemesin, durum görsün)
    setWhatsappModalData({
      kayit,
      phone: savedPhone,
      isGeneratingPdf: true,
      pdfReady: false,
      copied: false,
    });

    try {
      showToast('Mutabakat PDF mektubu hazırlanıyor ve indiriliyor...');
      // 1. Resmi PDF oluştur ve kullanıcının cihazına otomatik indir
      const pdfResult = await generateMutabakatPdf(kayit, true);

      setWhatsappModalData((prev) =>
        prev
          ? {
              ...prev,
              pdfBlob: pdfResult.blob,
              pdfFile: pdfResult.file,
              fileName: pdfResult.fileName,
              isGeneratingPdf: false,
              pdfReady: true,
            }
          : null
      );
      showToast('Mutabakat mektubu PDF olarak hazırlandı ve indirildi.');
    } catch (err) {
      console.error('WhatsApp mutabakat hatası:', err);
      showToast('WhatsApp mutabakatı hazırlanırken hata oluştu.');
      setWhatsappModalData((prev) => (prev ? { ...prev, isGeneratingPdf: false } : null));
    }
  };

  // WhatsApp ile Seçilene Gönder Butonuna Basıldığında
  const handleConfirmWhatsAppSend = (overridePhone?: string) => {
    if (!whatsappModalData) return;
    const { kayit } = whatsappModalData;
    const rawPhone = overridePhone !== undefined ? overridePhone : whatsappModalData.phone;
    const cleanPhone = formatWhatsAppPhone(rawPhone);

    // Telefon numarasını sonraki gönderimler için hafızaya kaydet
    if (rawPhone.trim()) {
      try {
        const stored = JSON.parse(localStorage.getItem('ozka_mutabakat_telefonlar_v1') || '{}');
        if (kayit.vergiNo) stored[kayit.vergiNo] = rawPhone.trim();
        if (kayit.firmaUnvani) stored[kayit.firmaUnvani] = rawPhone.trim();
        localStorage.setItem('ozka_mutabakat_telefonlar_v1', JSON.stringify(stored));
      } catch {}
    }

    const msg = buildWhatsAppMessage(kayit);
    let whatsappUrl = '';
    if (cleanPhone) {
      whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    } else {
      whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    }

    window.open(whatsappUrl, '_blank');
    showToast(
      cleanPhone
        ? `WhatsApp açılıyor (${cleanPhone}). İndirilen PDF dosyasını sohbete ekleyebilirsiniz.`
        : 'WhatsApp açılıyor. Kişi veya grup seçip indirilen PDF dosyasını ekleyebilirsiniz.'
    );
  };

  // Cihaz Paylaşımı (Web Share API) ile Doğrudan PDF Dosyasını WhatsApp'a Gönderme
  const handleDirectWebShare = async () => {
    if (!whatsappModalData?.pdfFile) {
      showToast('PDF dosyası henüz hazır değil, lütfen bekleyiniz.');
      return;
    }
    const { kayit, pdfFile } = whatsappModalData;
    const msg = buildWhatsAppMessage(kayit);

    try {
      if (typeof navigator !== 'undefined' && (navigator as any).canShare && (navigator as any).canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `${kayit.firmaUnvani} - Resmi Cari Mutabakat Mektubu`,
          text: msg,
        });
        showToast('Mutabakat mektubu ve PDF dosyası başarıyla paylaşıldı.');
      } else {
        handleConfirmWhatsAppSend();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Paylaşım hatası:', err);
        handleConfirmWhatsAppSend();
      }
    }
  };

  // Excel'e Aktar
  const handleExportExcel = () => {
    playClickSound();
    try {
      const dataToExport = filteredKayitlar.map((k, index) => ({
        'Sıra': index + 1,
        'Ana Firma': k.anafirma || 'ÖZKA İNŞAAT A.Ş.',
        'Ana Firma Vergi No': k.vergino || '',
        'Mutabakat Yapılacak Vergi No': k.vergiNo,
        'Mutabakat Yapılacak Firma Ünvanı': k.firmaUnvani,
        'Borç/Alacak': k.borcAlacakTipi,
        'Tutar': k.tutar,
        'Para Birimi': k.paraBirimi || '₺',
        'Borç/Alacak Detay Metni': k.borcAlacakMetni,
        'E-Posta': k.eposta,
        'Açıklama': k.aciklama,
        'Tarih': k.tarih,
        'Durum': k.durum,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mutabakatlar');
      XLSX.writeFile(wb, `Mutabakat_Listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Excel dosyası başarıyla indirildi.');
    } catch (err) {
      console.error(err);
      showToast('Excel dışa aktarımı sırasında hata oluştu.');
    }
  };

  // Mutabakat Mektubu PDF İndirme Fonksiyonu (100% Türkçe Karakter, Sayfa ve Kutu Dışına Taşmayan Resmi Format)
  const handleDownloadPdf = async (item: MutabakatKaydi) => {
    playClickSound();
    try {
      showToast('PDF mutabakat mektubu oluşturuluyor...');
      await generateMutabakatPdf(item);
      showToast(`${item.firmaUnvani} mutabakat mektubu PDF olarak indirildi.`);
    } catch (err) {
      console.error('PDF indirme hatası:', err);
      setSelectedForLetter(item);
      showToast('PDF mektup önizleme ekranı açıldı.');
    }
  };

  // Kullanıcı Talebi: Tablodaki Verileri VKN'ye Göre Gruplandıran Rengarenk Yatay PDF Raporu Oluşturma
  const [reportLoading, setReportLoading] = useState<boolean>(false);

  const handleGeneratePdfReport = async () => {
    playClickSound();
    if (kayitlar.length === 0) {
      showToast('Rapora aktarılacak mutabakat kaydı bulunamadı.');
      return;
    }

    // Eğer kutucuklarla seçim yapılmışsa sadece seçilenleri, yoksa tablodaki filtrelenmiş verileri aktar
    let targetList = filteredKayitlar;
    if (selectedRowIds.size > 0) {
      const selected = filteredKayitlar.filter((k) => selectedRowIds.has(k.id));
      targetList = selected.length > 0 ? selected : kayitlar.filter((k) => selectedRowIds.has(k.id));
    }

    if (targetList.length === 0) {
      showToast('Seçilen veya filtrelenen mutabakat kaydı bulunamadı.');
      return;
    }

    setReportLoading(true);
    showToast('Rengarenk Yatay PDF Mutabakat Raporu hazırlanıyor...');

    try {
      const res = await generateMutabakatGroupReportPdf(targetList, {
        filterVergiNo: filterVergiNo || undefined,
        anaFirmaAdi: anaFirma || 'ÖZKA İNŞAAT A.Ş.',
        autoDownload: true,
      });
      showToast(
        `Harika! ${res.totalRecords} adet mutabakat (${res.totalGroups} VKN Grubu) yatay PDF raporu olarak başarıyla indirildi.`
      );
    } catch (err) {
      console.error('PDF Rapor Hatası:', err);
      showToast('PDF raporu oluşturulurken bir hata oluştu.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 flex flex-col transition-colors selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* ÜST BAŞLIK ÇUBUĞU */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3 shadow-lg">
        <div className="max-w-[100rem] mx-auto flex items-center justify-between gap-3">
          {/* Sol: Geri Dön Butonu ve Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onBack();
              }}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 hover:border-emerald-500/40 transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95 shadow-sm"
              title="Fatura Portalı Ekranına Geri Dön"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Fatura Portalı'na Dön</span>
            </button>

            {onBackToHome && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onBackToHome();
                }}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 border border-white/10 transition-all text-xs font-semibold active:scale-95 hidden md:flex items-center gap-1"
                title="Ana Yönetim Paneline Dön"
              >
                <span>Ana Portal</span>
              </button>
            )}

            <div className="h-6 w-px bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/20">
                <Handshake className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
                    MUTABAKAT PORTALI
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Cari & Bakiye Takip
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 hidden sm:block">
                  ÖZKA İnşaat Cari Hesap, Borç/Alacak ve Mutabakat Yönetim Sistemi
                </p>
              </div>
            </div>
          </div>

          {/* Sağ: Aksiyon Butonları */}
          <div className="flex items-center gap-2">
            <a
              href={MUTABAKAT_SUPABASE_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Supabase mgtunrfpzbyfnmeloeeq tablosunu yeni sekmede aç"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>Supabase'de Aç</span>
            </a>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowSqlModal(true);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Supabase SQL Tablo Kurulum Kodunu Görüntüle & Kopyala"
            >
              <Database className="w-4 h-4 text-amber-400" />
              <span>SQL Tablo Kodu</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                loadFromSupabase(true);
              }}
              disabled={supabaseLoading}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              title="Supabase tablosundaki verileri yenile"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${supabaseLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Kayıtları Excel (.xlsx) olarak indir"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Excel'e Aktar</span>
            </button>

            {/* PDF RAPOR AL BUTONU (Yatay, Renkli, VKN Gruplu) */}
            <button
              type="button"
              onClick={handleGeneratePdfReport}
              disabled={reportLoading}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 border border-indigo-400"
              title="Tablodaki tüm verileri VKN/Vergi No'ya göre gruplandırarak rengarenk yatay PDF raporu oluşturur"
            >
              {reportLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
              ) : (
                <FileText className="w-4 h-4 text-purple-200 stroke-[2.5]" />
              )}
              <span className="hidden sm:inline">PDF Rapor Al (Yatay)</span>
            </button>
          </div>
        </div>
      </header>

      {/* BİLDİRİM TOAST */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 right-4 z-50 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-xl flex items-center gap-2 border border-emerald-400"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ANA İÇERİK ALANI (GENİŞLETİLMİŞ GÖRÜNÜM) */}
      <main className="max-w-[100rem] mx-auto w-full px-3 sm:px-6 py-6 flex-1 flex flex-col gap-6">
        {/* İSTATİSTİK SAYAÇLARI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Toplam Mutabakat</span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-white">{stats.toplam} Adet</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-rose-300 mb-1">
              <span>Toplam Borç</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20">Firmaya Borç</span>
            </div>
            <div className="text-xl font-black text-rose-300">
              {stats.toplamBorc.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-teal-300 mb-1">
              <span>Toplam Alacak</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20">Firmadan Alacak</span>
            </div>
            <div className="text-xl font-black text-teal-300">
              {stats.toplamAlacak.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-emerald-300 mb-1">
              <span>Mutabık Kalınan</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-300">
              {stats.mutabikSayisi} / {stats.toplam}
            </div>
          </div>
        </div>

        {/* YENİ MUTABAKAT BİLGİ GİRİŞİ ÜZERİNDEKİ BUTON: YENİDEN FİRMA SEÇ (TEXTBOX AÇ) & PORTALA DÖN */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-slate-900 border-2 border-emerald-500/35 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 font-black shadow-md flex-shrink-0">
              <Building2 className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                <span>FİRMA SEÇİMİ VE ŞANTİYE YÖNETİMİ</span>
                {selectedSantiyeId ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 font-bold">
                    Seçili: {santiyeListesi.find((s) => s.id === selectedSantiyeId)?.Santiyeadı || 'Firma'}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                    Henüz Firma Seçilmedi
                  </span>
                )}
              </p>
              <p className="text-[11px] text-gray-300 mt-0.5">
                Yeni bir firma veya şantiye seçmek için aşağıdaki butona basınız; firma seç arama textbox'ı açılır.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleResetToFirmaSec}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/30 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              title="Firma seç arama kutusunu (textbox) aç ve yeni firma seç"
            >
              <Search className="w-3.5 h-3.5 stroke-[3]" />
              <span>YENİDEN FİRMA SEÇ (Arama Textbox'ı Aç)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                if (onReopenFirmaSec) {
                  onReopenFirmaSec();
                } else {
                  onBack();
                }
              }}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 flex items-center gap-1.5 active:scale-95 transition-all"
              title="Faturalar ekranındaki 'Mutabakat Portalına Git' seçim modalına dön"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal Ekranına Dön</span>
            </button>
          </div>
        </div>

        {/* MUTABAKAT FORMU KARTI - KULLANICININ İSTEDİĞİ 5 TEXTBOX */}
        <section className="bg-slate-900/80 border border-emerald-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Form Başlığı */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                  {editingId ? 'MUTABAKAT KAYDINI DÜZENLE' : 'YENİ MUTABAKAT BİLGİ GİRİŞİ'}
                </h2>
                <button
                  type="button"
                  onClick={handleResetToFirmaSec}
                  className="ml-2 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold hover:bg-emerald-500/25 transition-all flex items-center gap-1"
                  title="Firma seçme kutusuna dön"
                >
                  <Building2 className="w-3 h-3" />
                  <span>Firma Seçimine Dön</span>
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Mutabakat yapılacak cari firmaya ait bilgileri ve bakiye detaylarını aşağıdaki alanlara giriniz.
              </p>
            </div>

            {editingId && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                  Düzenleme Modu Aktif
                </span>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition-all"
                >
                  Vazgeç
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ANA FİRMA VE ŞANTİYE LİSTBOX SEÇİMİ (santiyeisimleri, anafirma, vergino) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/[0.07] via-teal-500/[0.04] to-transparent border border-emerald-500/25 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <h3 className="text-xs font-black tracking-wider text-emerald-300 uppercase">
                    Ana Firma & Şantiye Bilgileri (santiyeisimleri / anafirma & vergino)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadSantiyeListesi}
                    disabled={santiyeLoading}
                    className="text-[11px] text-gray-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                    title="Şantiye listesini Supabase'den yenile"
                  >
                    <RefreshCw className={`w-3 h-3 ${santiyeLoading ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>Yenile</span>
                  </button>
                  <span className="text-gray-600">|</span>
                  <a
                    href="https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/19170?schema=public/santiyeisimleri"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1 font-mono"
                    title="Supabase santiyeisimleri tablosunu aç"
                  >
                    <span>public.santiyeisimleri</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* FİRMA SEÇ TEXTBOX & AÇILIR LİSTE (santiyeadı sütunu) */}
              <div className="space-y-2">
                <label className="text-xs font-black tracking-wider text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    FİRMA SEÇ TEXTBOX'I & LİSTESİ (santiyeadı)
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    {santiyeLoading ? 'Şantiyeler yükleniyor...' : `${santiyeListesi.length} Kayıtlı Şantiye`}
                  </span>
                </label>

                {/* Tıklanabilir Arama Textbox'ı - Doğrudan arama modalını açar */}
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <div
                    onClick={() => {
                      playClickSound();
                      setFirmaSearchInput('');
                      setShowFirmaSecPortalModal(true);
                    }}
                    className="flex-1 relative cursor-pointer group"
                    title="Arama kutusu ile firma / şantiye seçmek için tıklayınız"
                  >
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <input
                      type="text"
                      readOnly
                      value={
                        selectedSantiyeId
                          ? `${santiyeListesi.find((s) => s.id === selectedSantiyeId)?.Santiyeadı || 'Firma'} ${
                              anaFirmaVergiNo ? `(VKN: ${anaFirmaVergiNo})` : ''
                            }`
                          : ''
                      }
                      placeholder="Firma / Şantiye seçmek için tıklayınız (Arama Textbox'ı Açılır)..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border-2 border-emerald-500/40 group-hover:border-emerald-500 text-slate-900 text-sm font-bold outline-none cursor-pointer shadow-sm placeholder:text-slate-500 placeholder:font-normal transition-all"
                    />
                  </div>

                  {/* Textbox Arama Butonu */}
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setFirmaSearchInput('');
                      setShowFirmaSecPortalModal(true);
                    }}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                    title="Firma arama ve seçim penceresini aç"
                  >
                    <Search className="w-4 h-4 stroke-[2.5]" />
                    <span>FİRMA SEÇ TEXTBOX'INI AÇ</span>
                  </button>
                </div>

                {/* Hızlı Açılır Menü (Alternatif Doğrudan Seçim) */}
                <div className="relative">
                  <select
                    ref={santiyeSelectRef}
                    value={selectedSantiyeId}
                    onChange={(e) => handleSelectSantiye(e.target.value)}
                    disabled={santiyeLoading}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-emerald-500/30 text-slate-200 text-xs font-semibold transition-all outline-none appearance-none cursor-pointer pr-10 hover:border-emerald-500/60"
                  >
                    <option value="" className="text-slate-400 bg-slate-900">-- Veya Açılır Listeden Hızlıca Seçiniz --</option>
                    {santiyeListesi.map((s) => (
                      <option key={s.id} value={s.id} className="text-white bg-slate-900">
                        {s.Santiyeadı} {s.vergino ? `(VKN: ${s.vergino})` : ''} {s.unvani ? `- ${s.unvani}` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>

                {selectedSantiyeId && (
                  <p className="text-[11px] text-emerald-300/90">
                    Seçilen şantiye bilgileri ve vergi numarası aşağıdaki Ana Firma alanlarına aktarıldı.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-1">
                {/* 1. SÜTUN: ANA FİRMA (anafirma) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black tracking-wider text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                      ANA FİRMA (anafirma)
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">Şirketimiz</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={anaFirma}
                      onChange={(e) => setAnaFirma(e.target.value)}
                      placeholder="Örn: ÖZKA İNŞAAT A.Ş."
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder-slate-400 text-sm font-bold transition-all outline-none uppercase shadow-sm"
                    />
                    {anaFirma && anaFirma !== 'ÖZKA İNŞAAT A.Ş.' && (
                      <button
                        type="button"
                        onClick={() => setAnaFirma('ÖZKA İNŞAAT A.Ş.')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-xs"
                        title="Varsayılan 'ÖZKA İNŞAAT A.Ş.' yap"
                      >
                        Sıfırla
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. SÜTUN: ANA FİRMA VERGİ NO (vergino) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black tracking-wider text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-emerald-400" />
                      ANA FİRMA VERGİ NO (vergino)
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">
                      {anaFirmaVergiNo.length > 0 && `${anaFirmaVergiNo.length} hane`}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={anaFirmaVergiNo}
                      onChange={(e) => setAnaFirmaVergiNo(e.target.value)}
                      placeholder="Örn: 6320054321 / VKN / TCKN"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder-slate-400 text-sm font-bold transition-all outline-none font-mono shadow-sm"
                      maxLength={11}
                    />
                    {anaFirmaVergiNo && (
                      <button
                        type="button"
                        onClick={() => setAnaFirmaVergiNo('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* MUTABAKAT YAPILACAK CARİ FİRMA ALANLARI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {/* MUTABAKAT YAPILACAK FİRMA VERGİ NO */}
              <div className="space-y-1.5">
                <label className="text-xs font-black tracking-wider text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-emerald-400" />
                    MUTABAKAT YAPILACAK FİRMA VERGİ NO
                  </span>
                  <span className="text-[10px] font-normal text-gray-400">
                    {vergiNo.length > 0 && `${vergiNo.length} hane`}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={vergiNo}
                    onChange={(e) => setVergiNo(e.target.value)}
                    placeholder="Örn: 1234567890 (Vergi No / TCKN)"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder-slate-400 text-sm font-bold transition-all outline-none font-mono shadow-sm"
                    maxLength={11}
                  />
                  {vergiNo && (
                    <button
                      type="button"
                      onClick={() => setVergiNo('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. TEXTBOX: MUTABAKAT YAPILACAK FİRMA ÜNVANI VE SORGULA BUTONU */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>MUTABAKAT YAPILACAK FİRMA ÜNVANI</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenSorgulaModal}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                    title="Supabase mutabakat tablosundan firma sorgula ve vergi nosuyla forma aktar"
                  >
                    <Search className="w-3 h-3 stroke-[3]" />
                    <span>SORGULA</span>
                  </button>
                </div>
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={firmaUnvani}
                      onChange={(e) => setFirmaUnvani(e.target.value)}
                      placeholder="Örn: ÖZKA İNŞAAT VEYA TEDARİKÇİ CARİ ÜNVANI"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder-slate-400 text-sm font-bold transition-all outline-none uppercase shadow-sm"
                    />
                    {firmaUnvani && (
                      <button
                        type="button"
                        onClick={() => setFirmaUnvani('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenSorgulaModal}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/25 flex items-center gap-1.5 active:scale-95 transition-all flex-shrink-0 border border-emerald-300"
                    title="public.mutabakat tablosundan firma sorgula ve vergi nosuyla forma aktar"
                  >
                    <Search className="w-4 h-4 stroke-[3]" />
                    <span>SORGULA</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. TEXTBOX: BORÇ/ALACAK (Hem Tutar Girişi, Hem Tip Seçimi, Hem Özel Metin) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
              {/* Borç / Alacak Tipi Seçimi */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-black tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  BORÇ / ALACAK TÜRÜ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTipChange('BORÇ')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border ${
                      borcAlacakTipi === 'BORÇ'
                        ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/25 scale-[1.02]'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-rose-400'
                    }`}
                  >
                    <span>BORÇ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTipChange('ALACAK')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border ${
                      borcAlacakTipi === 'ALACAK'
                        ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-600/25 scale-[1.02]'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500'
                    }`}
                  >
                    <span>ALACAK</span>
                  </button>
                </div>
              </div>

              {/* Tutar Girişi */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-black tracking-wider text-gray-200 flex items-center justify-between">
                  <span>TUTAR ({paraBirimi})</span>
                  <div className="flex gap-1">
                    {['₺', '$', '€'].map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => {
                          setParaBirimi(curr);
                          if (tutarGirdisi) handleTutarChange(tutarGirdisi);
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          paraBirimi === curr ? 'bg-emerald-500 text-slate-950' : 'text-gray-300 bg-white/10'
                        }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </label>
                <input
                  type="text"
                  value={tutarGirdisi}
                  onChange={(e) => handleTutarChange(e.target.value)}
                  placeholder="Örn: 145.850,00"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder-slate-400 text-sm font-black transition-all outline-none font-mono shadow-sm"
                />
              </div>

              {/* 3. ANA TEXTBOX: BORÇ/ALACAK TAM METNİ */}
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-xs font-black tracking-wider text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    BORÇ/ALACAK (METİNSEL İFADE)
                  </span>
                  <span className="text-[10px] text-gray-300 font-normal">Form & Mektup Metni</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={borcAlacakMetin}
                    onChange={(e) => setBorcAlacakMetin(e.target.value)}
                    placeholder="Örn: BORÇ: 145.850,00 ₺ veya BAKİYESİZ"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-emerald-800 font-black placeholder-slate-400 text-sm transition-all outline-none shadow-sm"
                  />
                  {borcAlacakMetin && (
                    <button
                      type="button"
                      onClick={() => setBorcAlacakMetin('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 4. ve 5. TEXTBOX: E-POSTA VE AÇIKLAMA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {/* 4. TEXTBOX: E-POSTA */}
              <div className="space-y-1.5">
                <label className="text-xs font-black tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  E-POSTA
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={eposta}
                    onChange={(e) => setEposta(e.target.value)}
                    placeholder="Örn: muhasebe@firmasi.com.tr"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder-slate-400 text-sm font-semibold transition-all outline-none shadow-sm"
                  />
                  {eposta && (
                    <button
                      type="button"
                      onClick={() => setEposta('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mutabakat Tarihi */}
              <div className="space-y-1.5">
                <label className="text-xs font-black tracking-wider text-gray-200 flex items-center justify-between">
                  <span>MUTABAKAT DÖNEMİ / BAZ TARİHİ</span>
                  <span className="text-[10px] text-gray-400">İtibarıyla</span>
                </label>
                <input
                  type="date"
                  value={mutabakatTarihi}
                  onChange={(e) => setMutabakatTarihi(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 text-sm font-bold transition-all outline-none shadow-sm"
                />
              </div>
            </div>

            {/* 5. TEXTBOX: AÇIKLAMA */}
            <div className="space-y-1.5">
              <label className="text-xs font-black tracking-wider text-emerald-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  AÇIKLAMA
                </span>
                <span className="text-[10px] text-gray-300 font-normal">Mutabakat Notu / Fatura Referansları</span>
              </label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={2}
                placeholder="Örn: 2026 yılı 3. çeyrek bakiye mutabakatı. Vadesi geçmiş faturalar dahil edilmiştir."
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder-slate-400 text-sm font-medium transition-all outline-none resize-none shadow-sm"
              />
            </div>

            {/* FORM BUTONLARI */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                  <span>Formu Temizle</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Geçici Mektup Önizle */}
                {(firmaUnvani || vergiNo) && (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      const cleanedAmount = tutarGirdisi.replace(/[^0-9.,]/g, '').replace(',', '.');
                      const numAmount = parseFloat(cleanedAmount) || 0;
                      setSelectedForLetter({
                        id: 'temp-preview',
                        anafirma: anaFirma.trim() || 'ÖZKA İNŞAAT A.Ş.',
                        vergino: anaFirmaVergiNo.trim(),
                        vergiNo: vergiNo.trim(),
                        firmaUnvani: (firmaUnvani.trim() || 'FİRMA ÜNVANI').toLocaleUpperCase('tr-TR'),
                        borcAlacakTipi,
                        tutar: numAmount,
                        borcAlacakMetni:
                          borcAlacakMetin.trim() ||
                          `${borcAlacakTipi}: ${numAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${paraBirimi}`,
                        eposta: eposta.trim(),
                        aciklama: aciklama.trim(),
                        tarih: mutabakatTarihi,
                        durum: 'Bekliyor',
                        paraBirimi,
                        createdAt: new Date().toISOString(),
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Mektup Önizle</span>
                  </button>
                )}

                {/* Formdan Hızlı WhatsApp ile PDF Hazırla ve Gönder */}
                {(firmaUnvani || vergiNo) && (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      const cleanedAmount = tutarGirdisi.replace(/[^0-9.,]/g, '').replace(',', '.');
                      const numAmount = parseFloat(cleanedAmount) || 0;
                      handleSendWhatsApp({
                        id: 'temp-' + Date.now(),
                        anafirma: anaFirma.trim() || 'ÖZKA İNŞAAT A.Ş.',
                        vergino: anaFirmaVergiNo.trim(),
                        vergiNo: vergiNo.trim(),
                        firmaUnvani: (firmaUnvani.trim() || 'FİRMA ÜNVANI').toLocaleUpperCase('tr-TR'),
                        borcAlacakTipi,
                        tutar: numAmount,
                        borcAlacakMetni:
                          borcAlacakMetin.trim() ||
                          `${borcAlacakTipi}: ${numAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${paraBirimi}`,
                        eposta: eposta.trim(),
                        aciklama: aciklama.trim(),
                        tarih: mutabakatTarihi,
                        durum: 'Bekliyor',
                        paraBirimi,
                        createdAt: new Date().toISOString(),
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black border border-emerald-400 text-xs transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-emerald-500/20"
                    title="Bu firma için mutabakatı PDF olarak hazırla ve WhatsApp üzerinden seçilene gönder"
                  >
                    <MessageCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>WhatsApp</span>
                  </button>
                )}

                {/* Kaydet Butonu */}
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black tracking-wide shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingId ? 'KAYDI GÜNCELLE' : 'MUTABAKAT KAYDI OLUŞTUR'}</span>
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* KAYITLI MUTABAKATLAR LİSTESİ VE GENİŞLETİLMİŞ BEYAZ TABLO */}
        <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-200/50 flex flex-col gap-4 text-slate-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-wide flex items-center gap-2">
                  <span>KAYITLI MUTABAKATLAR LİSTESİ</span>
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-xs">
                  {filteredKayitlar.length} Kayıt
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kayıtlı mutabakatları arayabilir, durumları güncelleyebilir ve tek tıkla resmi mektup (PDF) hazırlayabilirsiniz.
              </p>
            </div>

            {/* Arama ve Filtreler */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Vergi No Filtresi (Öncelikli Talep: Vergi No Filtreleme Yapsın) */}
              <div className="relative min-w-[190px]">
                <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold" />
                <input
                  type="text"
                  value={filterVergiNo}
                  onChange={(e) => setFilterVergiNo(e.target.value)}
                  placeholder="Vergi No ile filtrele..."
                  className="w-full pl-9 pr-7 py-2 rounded-xl bg-white border-2 border-emerald-500/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-900 placeholder-slate-400 outline-none shadow-sm font-bold font-mono"
                  title="Tabloyu Ana Firma veya Cari Firma Vergi Numarasına göre filtreler"
                />
                {filterVergiNo && (
                  <button
                    type="button"
                    onClick={() => setFilterVergiNo('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600"
                    title="Vergi No filtresini kaldır"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Genel Metin Arama */}
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Firma, E-posta, Açıklama..."
                  className="w-full pl-9 pr-7 py-2 rounded-xl bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-900 placeholder-slate-400 outline-none shadow-sm font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title="Aramayı temizle"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Borç/Alacak Filtresi */}
              <select
                value={filterTip}
                onChange={(e) => setFilterTip(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-700 font-bold outline-none focus:border-emerald-500 shadow-sm cursor-pointer"
              >
                <option value="all">Tüm Bakiyeler</option>
                <option value="BORÇ">Sadece Borç</option>
                <option value="ALACAK">Sadece Alacak</option>
              </select>

              {/* Durum Filtresi */}
              <select
                value={filterDurum}
                onChange={(e) => setFilterDurum(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-700 font-bold outline-none focus:border-emerald-500 shadow-sm cursor-pointer"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="Gönderildi">Gönderildi</option>
                <option value="Onaylandı">Onaylandı</option>
                <option value="Onaylanmadı">Onaylanmadı</option>
                <option value="Bekliyor">Bekliyor</option>
                <option value="Mutabık">Mutabık</option>
                <option value="İhtilaflı">İhtilaflı</option>
              </select>

              {/* Filtreleri Sıfırla Butonu */}
              {(filterVergiNo || searchTerm || filterTip !== 'all' || filterDurum !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterVergiNo('');
                    setSearchTerm('');
                    setFilterTip('all');
                    setFilterDurum('all');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition-all flex items-center gap-1.5 shadow-xs"
                  title="Tüm filtreleri sıfırla ve tüm kayıtları listele"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sıfırla</span>
                </button>
              )}

              {/* PDF RAPOR AL HIZLI BUTONU (Yatay & Renkli) */}
              <button
                type="button"
                onClick={handleGeneratePdfReport}
                disabled={reportLoading}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 border border-indigo-400"
                title="Tablodaki verileri VKN'ye göre gruplandırarak rengarenk yatay PDF raporu olarak indir"
              >
                {reportLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-200" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-purple-200 stroke-[2.5]" />
                )}
                <span>PDF Rapor Al</span>
              </button>
            </div>
          </div>

          {/* Aktif Vergi No Filtresi Bildirimi */}
          {filterVergiNo && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  <strong>Vergi No Filtresi Aktif:</strong> Tabloda VKN/TCKN <strong className="font-mono text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">"{filterVergiNo}"</strong> içeren kayıtlar filtreleniyor ({filteredKayitlar.length} kayıt bulundu).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFilterVergiNo('')}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
              >
                <span>Filtreyi Kaldır</span>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* TABLO ÜZERİNDEKİ TOPLU DURUM VE İŞLEM BUTONLARI (Gönderildi, Onaylandı, Onaylanmadı, Güncelle, Sil) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-slate-50 via-slate-100/80 to-slate-50 border border-slate-200">
            {/* Sol Taraf: Seçim Kutusu & Bilgisi */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filteredKayitlar.length > 0 && filteredKayitlar.every((k) => selectedRowIds.has(k.id))}
                  onChange={handleSelectAllRows}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
                <span className="text-xs font-bold text-slate-700">
                  {selectedRowIds.size > 0 ? (
                    <span className="text-emerald-700 font-black">
                      {selectedRowIds.size} / {filteredKayitlar.length} seçildi
                    </span>
                  ) : (
                    <span>Tümünü Seç ({filteredKayitlar.length})</span>
                  )}
                </span>
              </label>

              {selectedRowIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedRowIds(new Set())}
                  className="text-[11px] text-slate-500 hover:text-slate-700 underline font-semibold"
                >
                  Seçimi Temizle
                </button>
              )}
            </div>

            {/* Sağ Taraf: Durum Butonları (Gönderildi, Onaylandı, Onaylanmadı) + Güncelle & Sil */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                Durum Belirle:
              </span>

              {/* GÖNDERİLDİ BUTONU */}
              <button
                type="button"
                onClick={() => handleUpdateStatusBulk('Gönderildi')}
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-black text-xs shadow-sm shadow-sky-600/20 flex items-center gap-1.5 transition-all"
                title="Seçilen kayıtların durumunu 'Gönderildi' yapar"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gönderildi</span>
                {selectedRowIds.size > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-sky-800 text-[10px] text-white">
                    {selectedRowIds.size}
                  </span>
                )}
              </button>

              {/* ONAYLANDI BUTONU */}
              <button
                type="button"
                onClick={() => handleUpdateStatusBulk('Onaylandı')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                title="Seçilen kayıtların durumunu 'Onaylandı' yapar"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Onaylandı</span>
                {selectedRowIds.size > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-emerald-800 text-[10px] text-white">
                    {selectedRowIds.size}
                  </span>
                )}
              </button>

              {/* ONAYLANMADI BUTONU */}
              <button
                type="button"
                onClick={() => handleUpdateStatusBulk('Onaylanmadı')}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs shadow-sm shadow-rose-600/20 flex items-center gap-1.5 transition-all"
                title="Seçilen kayıtların durumunu 'Onaylanmadı' yapar"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Onaylanmadı</span>
                {selectedRowIds.size > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-800 text-[10px] text-white">
                    {selectedRowIds.size}
                  </span>
                )}
              </button>

              {/* DÜZENLE / GÜNCELLE BUTONU */}
              <button
                type="button"
                onClick={handleEditSelected}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs shadow-sm flex items-center gap-1.5 transition-all ml-1"
                title="Seçili kaydı forma yükler ve güncellenmesini sağlar"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Güncelle</span>
              </button>

              {/* SİLME BUTONU */}
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 active:scale-95 font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition-all"
                title="Seçilen kayıtları tablodan siler"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Sil{selectedRowIds.size > 0 ? ` (${selectedRowIds.size})` : ''}</span>
              </button>

              {/* PDF RAPOR AL BUTONU (Kullanıcı Talebi: Rengarenk, Yatay, VKN Gruplu Mükemmel PDF Raporu) */}
              <button
                type="button"
                onClick={handleGeneratePdfReport}
                disabled={reportLoading}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 active:scale-95 text-white font-black text-xs shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition-all border border-indigo-400 disabled:opacity-50 ml-1"
                title="Tablodaki verileri VKN/Vergi No'ya göre gruplandırarak rengarenk yatay PDF raporu oluşturur ve indirir"
              >
                {reportLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-200" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-purple-200 stroke-[2.5]" />
                )}
                <span>PDF Rapor Al (Yatay)</span>
              </button>
            </div>
          </div>

          {/* Genişletilmiş ve Ekrana Tam Sığdırılmış Beyaz Tablo Görünümü */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm mt-1">
            <table className="w-full text-left text-xs min-w-[980px]">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-2 w-[38px] text-center">
                    <input
                      type="checkbox"
                      checked={filteredKayitlar.length > 0 && filteredKayitlar.every((k) => selectedRowIds.has(k.id))}
                      onChange={handleSelectAllRows}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      title="Tümünü Seç / Kaldır"
                    />
                  </th>
                  <th className="py-2.5 px-2 w-[115px]">Ana Firma</th>
                  <th className="py-2.5 px-2 w-[85px]">Ana VKN</th>
                  <th className="py-2.5 px-2 w-[90px]">Cari VKN</th>
                  <th className="py-2.5 px-2 max-w-[170px]">Cari Firma Ünvanı</th>
                  <th className="py-2.5 px-1 text-center w-[60px]">Tür</th>
                  <th className="py-2.5 px-2 text-right w-[95px]">Tutar</th>
                  <th className="py-2.5 px-1.5 w-[80px]">E-Posta</th>
                  <th className="py-2.5 px-1.5 max-w-[95px]">Açıklama</th>
                  <th className="py-2.5 px-1 text-center w-[75px]">Durum</th>
                  <th className="py-2.5 px-1.5 text-center w-[90px]">PDF</th>
                  <th className="py-2.5 px-2 text-center w-[185px]">İletim & İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                {filteredKayitlar.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-500 bg-slate-50/50">
                      Hiç mutabakat kaydı bulunamadı. Yukarıdaki formu kullanarak yeni bir mutabakat ekleyebilirsiniz.
                    </td>
                  </tr>
                ) : (
                  filteredKayitlar.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors group ${
                        selectedRowIds.has(item.id)
                          ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600'
                          : 'hover:bg-emerald-50/40'
                      }`}
                    >
                      {/* Seçim Kutucuğu (Tık Kutucuğu) */}
                      <td className="py-2 px-2 text-center w-[38px]">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(item.id)}
                          onChange={() => toggleSelectRow(item.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          title="Bu kaydı seç"
                        />
                      </td>
                      {/* Ana Firma (anafirma) - Daraltılmış */}
                      <td className="py-2 px-2 max-w-[115px]">
                        <span
                          className="font-bold text-teal-800 text-[10px] bg-teal-50 px-2 py-0.5 rounded border border-teal-200 truncate block shadow-xs"
                          title={item.anafirma || 'ÖZKA İNŞAAT A.Ş.'}
                        >
                          {item.anafirma || 'ÖZKA İNŞAAT A.Ş.'}
                        </span>
                      </td>

                      {/* Ana Firma Vergi No (vergino) */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        <span className="font-mono text-slate-700 font-semibold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block">
                          {item.vergino || '-'}
                        </span>
                      </td>

                      {/* Mutabakat Yapılacak Firma Vergi No */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        <span className="font-mono text-emerald-800 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shadow-xs inline-block">
                          {item.vergiNo || '-'}
                        </span>
                      </td>

                      {/* Mutabakat Yapılacak Firma Ünvanı */}
                      <td className="py-2 px-2 font-black text-slate-900 max-w-[170px] truncate text-xs" title={item.firmaUnvani}>
                        {item.firmaUnvani}
                      </td>

                      {/* Borç / Alacak Tipi */}
                      <td className="py-2 px-1 whitespace-nowrap text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[9px] font-black border shadow-xs inline-block ${
                            item.borcAlacakTipi === 'BORÇ'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-teal-50 text-teal-700 border-teal-200'
                          }`}
                        >
                          {item.borcAlacakTipi}
                        </span>
                      </td>

                      {/* Tutar */}
                      <td className="py-2 px-2 whitespace-nowrap text-right font-mono font-black text-slate-900 text-xs">
                        {item.tutar ? item.tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}{' '}
                        {item.paraBirimi || '₺'}
                      </td>

                      {/* E-Posta - Daraltılmış */}
                      <td className="py-2 px-1.5 text-slate-600 max-w-[80px] truncate">
                        {item.eposta ? (
                          <button
                            type="button"
                            onClick={() => handleSendEmailWithPdf(item)}
                            className="text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 font-semibold text-[10px] truncate max-w-[75px]"
                            title={`PDF oluştur ve E-Posta ile Gönder: ${item.eposta}`}
                          >
                            <Mail className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            <span className="truncate">{item.eposta}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>

                      {/* Açıklama */}
                      <td className="py-2 px-1.5 text-slate-500 max-w-[95px] truncate text-[10px]" title={item.aciklama}>
                        {item.aciklama || '-'}
                      </td>

                      {/* Durum */}
                      <td className="py-2 px-1 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleDurum(item.id, item.durum)}
                          className={`px-2 py-0.5 rounded text-[10px] font-black border transition-all shadow-xs ${
                            item.durum === 'Onaylandı' || item.durum === 'Mutabık'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : item.durum === 'Onaylanmadı' || item.durum === 'İhtilaflı'
                              ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                              : item.durum === 'Gönderildi'
                              ? 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100'
                              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                          }`}
                          title="Durumu değiştirmek için tıklayınız (Gönderildi -> Onaylandı -> Onaylanmadı -> Bekliyor)"
                        >
                          {item.durum}
                        </button>
                      </td>

                      {/* MUTABAKAT HAZIRLA BUTONU (PDF İNDİR) */}
                      <td className="py-2 px-1.5 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(item)}
                          className="px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[10px] shadow-xs flex items-center justify-center gap-1 border border-emerald-400 mx-auto active:scale-95 transition-all"
                          title="Resmi Mutabakat Mektubunu PDF olarak indir"
                        >
                          <FileDown className="w-3 h-3 text-white" />
                          <span>PDF İndir</span>
                        </button>
                      </td>

                      {/* İLETİM (WHATSAPP & MAİL) VE İŞLEMLER */}
                      <td className="py-2 px-2 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* WHATSAPP GÖNDER BUTONU */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(item)}
                            className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] shadow-xs flex items-center gap-1 active:scale-95 transition-all border border-emerald-400"
                            title="Resmi Mutabakat PDF mektubunu hazırla ve WhatsApp üzerinden ilet"
                          >
                            <MessageCircle className="w-3 h-3 stroke-[2.5]" />
                            <span>WhatsApp</span>
                          </button>

                          {/* MAİL GÖNDER BUTONU */}
                          <button
                            type="button"
                            onClick={() => handleSendEmailWithPdf(item)}
                            className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] shadow-xs flex items-center gap-1 active:scale-95 transition-all border border-sky-400"
                            title="Resmi Mutabakat PDF mektubunu hazırla ve E-Posta ile ilet"
                          >
                            <Mail className="w-3 h-3" />
                            <span>Mail</span>
                          </button>

                          {/* Mektup Önizle */}
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setSelectedForLetter(item);
                            }}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-all border border-slate-200"
                            title="Resmi Mutabakat Mektubu Görüntüle & Yazdır"
                          >
                            <Printer className="w-3 h-3" />
                          </button>

                          {/* Düzenle */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition-all border border-slate-200"
                            title="Kaydı Düzenle"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>

                          {/* Sil */}
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-700 transition-all border border-slate-200"
                            title="Kaydı Sil"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* RESMİ MUTABAKAT MEKTUBU ÖNİZLEME MODALI */}
      <AnimatePresence>
        {selectedForLetter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8"
            >
              {/* Üst Butonlar (Yazdır, Kapat) */}
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <Handshake className="w-6 h-6 text-emerald-600" />
                  <h3 className="text-lg font-black tracking-tight text-slate-900">
                    RESMİ CARİ HESAP MUTABAKAT MEKTUBU
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* WhatsApp Gönder */}
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(selectedForLetter)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all border border-emerald-400"
                    title="PDF oluştur ve WhatsApp ile ilet"
                  >
                    <MessageCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>WhatsApp</span>
                  </button>

                  {/* Mail Gönder */}
                  <button
                    type="button"
                    onClick={() => handleSendEmailWithPdf(selectedForLetter)}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all border border-sky-400"
                    title="PDF oluştur ve E-Posta ile ilet"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Mail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(selectedForLetter)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center gap-1.5 hover:from-emerald-500 hover:to-teal-500 shadow-sm active:scale-95"
                    title="Bu mektubu doğrudan PDF olarak indir"
                  >
                    <FileDown className="w-3.5 h-3.5 text-white" />
                    <span>PDF İndir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-700 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Yazdır</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedForLetter(null)}
                    className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mektup Kağıdı İçeriği */}
              <div className="space-y-6 text-sm text-gray-800 leading-relaxed font-sans border p-6 rounded-xl bg-slate-50/50">
                {/* Antet */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-wide">
                      {selectedForLetter.anafirma || 'ÖZKA İNŞAAT A.Ş.'}
                    </h2>
                    {selectedForLetter.vergino && (
                      <p className="text-xs text-gray-600 font-mono">VKN / TCKN: {selectedForLetter.vergino}</p>
                    )}
                    <p className="text-xs text-gray-600">Muhasebe ve Finans Departmanı</p>
                    <p className="text-xs text-gray-500">Bayburt / Türkiye</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-semibold text-gray-700">Tarih: {selectedForLetter.tarih || new Date().toLocaleDateString('tr-TR')}</p>
                    <p className="text-gray-500">Referans: MTB-{selectedForLetter.id.slice(-6).toUpperCase()}</p>
                  </div>
                </div>

                {/* Muhatap */}
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold uppercase">SAYIN YETKİLİ,</p>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{selectedForLetter.firmaUnvani}</p>
                  <p className="text-xs text-gray-600 font-mono mt-0.5">
                    Vergi / TC Kimlik No: <strong className="text-slate-900">{selectedForLetter.vergiNo || 'Belirtilmedi'}</strong>
                  </p>
                  {selectedForLetter.eposta && (
                    <p className="text-xs text-gray-600 font-mono">
                      E-Posta: <span className="text-slate-900">{selectedForLetter.eposta}</span>
                    </p>
                  )}
                </div>

                {/* Metin */}
                <p>
                  Şirketimiz nezdindeki cari hesabınızın{' '}
                  <strong>{selectedForLetter.tarih || new Date().toLocaleDateString('tr-TR')}</strong> tarihi itibarıyla
                  incelemesi neticesinde, kayıtlarımızda:
                </p>

                {/* Vurgulu Bakiye Kutusu (TL Olarak ve Altında Yazıyla) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-center my-4 shadow-sm">
                  <p className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                    MUTABAKATA KONU BAKİYE DURUMU
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1 tracking-tight">
                    {selectedForLetter.tutar.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    TL ({selectedForLetter.borcAlacakTipi})
                  </p>
                  <p className="text-xs sm:text-sm font-black text-emerald-800 mt-2 px-2 break-words bg-emerald-100/70 py-1.5 rounded-lg border border-emerald-300/60 inline-block max-w-full">
                    {sayiyiYaziyaCevir(selectedForLetter.tutar)}
                  </p>
                  <p className="text-[11px] text-emerald-700 italic mt-2">
                    ({selectedForLetter.anafirma || 'ÖZKA İNŞAAT A.Ş.'} kayıtlarına göre{' '}
                    {selectedForLetter.tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL tutarında{' '}
                    <strong>{selectedForLetter.borcAlacakTipi}</strong> bakiyeniz mevcuttur)
                  </p>
                </div>

                {selectedForLetter.aciklama && (
                  <p className="text-xs text-gray-700 italic bg-gray-100 p-3 rounded-xl border border-gray-200">
                    <strong className="text-gray-900 not-italic">Açıklama / Not:</strong> {selectedForLetter.aciklama}
                  </p>
                )}

                <p className="text-xs text-gray-700 leading-relaxed">
                  Yukarıda kayıtlı bakiyenin şirketiniz muhasebe kayıtlarıyla mutabık olup olmadığını, mutabık değilseniz
                  cari hesap ekstreniz ile birlikte en geç <strong>7 (yedi) iş günü</strong> içerisinde e-posta veya kaşe/imzalı
                  olarak tarafımıza iletmenizi rica ederiz.
                </p>

                {/* KAŞE İMZA BÖLÜMLERİ (ARKA FONLAR BEYAZ, METİNLER TAŞMAZ, İKİ ADET KUTUCUK) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 text-xs">
                  {/* KUTU 1 (SOL): ANA FİRMA (BEYAZ ARKA FON) */}
                  <div className="text-center p-4 bg-white rounded-2xl border-2 border-slate-300 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="font-black text-sm text-slate-900 break-words leading-tight">
                        {selectedForLetter.anafirma || 'ÖZKA İNŞAAT A.Ş.'}
                      </p>
                      {selectedForLetter.vergino && (
                        <p className="text-[11px] text-gray-600 font-mono mt-0.5">VKN / TCKN: {selectedForLetter.vergino}</p>
                      )}
                      <p className="text-[11px] text-slate-500 font-semibold mt-1">Yetkili Kaşe & İmza</p>
                    </div>
                    <div className="h-28 mt-3 flex items-center justify-center text-slate-400 italic text-[11px] border border-dashed border-slate-200 rounded-xl bg-white">
                      [ Şirket Kaşesi ve Yetkili İmza ]
                    </div>
                  </div>

                  {/* KUTU 2 (SAĞ): CARİ FİRMA VE İKİ ADET KUTUCUK (BEYAZ ARKA FON) */}
                  <div className="text-center p-4 bg-white rounded-2xl border-2 border-slate-300 shadow-sm flex flex-col justify-between">
                    <div>
                      {/* İKİ ADET KUTUCUK: [ ] MUTABIKIZ  /  [ ] MUTABIK DEĞİLİZ */}
                      <div className="flex items-center justify-center gap-3 pb-2.5 mb-2.5 border-b border-slate-200">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-2 border-slate-800 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-black text-[11px] text-emerald-700">MUTABIKIZ</span>
                        </label>
                        <span className="text-gray-300">|</span>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-2 border-slate-800 text-rose-600 focus:ring-rose-500"
                          />
                          <span className="font-black text-[11px] text-rose-700">MUTABIK DEĞİLİZ</span>
                        </label>
                      </div>

                      <p className="font-black text-sm text-slate-900 break-words leading-tight">
                        {selectedForLetter.firmaUnvani}
                      </p>
                      {selectedForLetter.vergiNo && (
                        <p className="text-[11px] text-gray-600 font-mono mt-0.5">VKN / TCKN: {selectedForLetter.vergiNo}</p>
                      )}
                      <p className="text-[11px] text-slate-500 font-semibold mt-1">Cevap Kaşe & İmza</p>
                    </div>
                    <div className="h-28 mt-3 flex items-center justify-center text-slate-400 italic text-[11px] border border-dashed border-slate-200 rounded-xl bg-white">
                      [ Kaşe, Yetkili İmza ve Tarih ]
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* SORGULA MODALI (public.mutabakat TABLOSUNDAN SORGULA VE VERGİ NOSUYLA BİRLİKTE AKTAR) */}
        {showSorgulaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-300 text-slate-900 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl relative my-6 max-h-[90vh] flex flex-col"
            >
              {/* Modal Başlığı */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/20">
                    <Search className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span>FİRMA VE VERGİ NO SORGULA</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        public.mutabakat
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Supabase tablosundan firma sorgulayın; seçtiğinizde <strong>sadece Firma Ünvanı ve Firma Vergi No</strong> forma aktarılır.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenSorgulaModal}
                    disabled={sorgulaLoading}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1 text-xs font-semibold"
                    title="Supabase tablosunu tekrar sorgula"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${sorgulaLoading ? 'animate-spin text-emerald-600' : ''}`} />
                    <span className="hidden sm:inline">Yenile</span>
                  </button>
                  <a
                    href="https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/20384?schema=public/mutabakat"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-emerald-700 transition-all flex items-center gap-1 text-xs font-mono font-bold"
                    title="Supabase Editörünü Aç"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Supabase</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowSorgulaModal(false)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Arama Alanı */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 flex-shrink-0">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={sorgulaSearchQuery}
                    onChange={(e) => setSorgulaSearchQuery(e.target.value)}
                    placeholder="Firma ünvanı veya vergi no yazarak anlık filtreleyin..."
                    autoFocus
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 focus:bg-white text-xs sm:text-sm text-slate-900 font-bold outline-none shadow-xs transition-all uppercase placeholder:normal-case placeholder:font-normal"
                  />
                  {sorgulaSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSorgulaSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-xs px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-xs">
                    {filteredSorgulaResults.length} Sonuç
                  </span>
                </div>
              </div>

              {/* Sonuç Tablosu */}
              <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 shadow-inner min-h-[220px] max-h-[420px]">
                {sorgulaLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-slate-500">
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                    <span className="text-xs font-semibold">Supabase 'mutabakat' tablosu taranıyor...</span>
                  </div>
                ) : filteredSorgulaResults.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500 text-center px-4">
                    <Search className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-bold text-slate-700">Kayıt Bulunamadı</p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      {sorgulaSearchQuery
                        ? `"${sorgulaSearchQuery}" aramasına uygun firma veya vergi numarası bulunamadı.`
                        : "Supabase mutabakat tablosunda henüz kayıt bulunamadı."}
                    </p>
                    {sorgulaSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setSorgulaSearchQuery('')}
                        className="mt-2 text-xs text-emerald-700 hover:text-emerald-800 font-bold underline"
                      >
                        Aramayı Temizle
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200 z-10 shadow-xs">
                      <tr>
                        <th className="py-3 px-3.5">Firma Ünvanı</th>
                        <th className="py-3 px-3.5">Vergi No / VKN</th>
                        <th className="py-3 px-3.5">Ana Firma & VKN</th>
                        <th className="py-3 px-3.5 text-right">Bakiye / Tutar</th>
                        <th className="py-3 px-3.5 text-center">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredSorgulaResults.map((item, idx) => (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-emerald-50/70 transition-colors group cursor-pointer"
                          onClick={() => handleSelectFirmaFromSorgu(item)}
                        >
                          {/* Firma Ünvanı */}
                          <td className="py-3 px-3.5 font-black text-slate-900">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <span className="text-xs sm:text-sm">{item.firmaUnvani || '-'}</span>
                            </div>
                            {item.eposta && (
                              <p className="text-[10px] text-slate-400 font-medium pl-5 mt-0.5">{item.eposta}</p>
                            )}
                          </td>

                          {/* Vergi No / VKN */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="font-mono font-black text-emerald-900 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg text-xs shadow-xs">
                              {item.vergiNo || '-'}
                            </span>
                          </td>

                          {/* Ana Firma & VKN */}
                          <td className="py-3 px-3.5">
                            <p className="text-slate-800 font-bold text-xs">{item.anafirma || 'ÖZKA İNŞAAT A.Ş.'}</p>
                            {item.vergino && (
                              <p className="text-[10px] text-slate-500 font-mono">VKN: {item.vergino}</p>
                            )}
                          </td>

                          {/* Bakiye / Tutar */}
                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            {item.tutar ? (
                              <div>
                                <span
                                  className={`text-xs font-black ${
                                    item.borcAlacakTipi === 'BORÇ' ? 'text-rose-700' : 'text-teal-700'
                                  }`}
                                >
                                  {item.tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                </span>
                                <span className="text-[10px] text-slate-500 block font-semibold">
                                  {item.borcAlacakTipi}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* İşlem Butonu */}
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectFirmaFromSorgu(item);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 active:scale-95 mx-auto"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>SEÇ VE AKTAR</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Alt Bilgi ve Kapat */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-200 flex-shrink-0">
                <p className="text-[11px] text-slate-500">
                  💡 <strong>İpucu:</strong> "SEÇ VE AKTAR" butonuna tıkladığınızda seçilen kaydın <strong>sadece Firma Ünvanı ve Firma Vergi No'su</strong> forma aktarılır; tutar, tarih veya borç/alacak tipi değiştirilmez.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSorgulaModal(false)}
                  className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all active:scale-95"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* SUPABASE SQL TABLO KODU MODALI */}
        {showSqlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-amber-500/30 text-gray-100 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl relative my-6 max-h-[90vh] flex flex-col"
            >
              {/* Modal Başlığı */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                      <span>SUPABASE 'mutabakat' TABLO SQL KODU</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        PostgreSQL
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Bu SQL komutunu Supabase SQL Editörüne yapıştırıp "RUN" butonuna basarak tabloyu saniyeler içinde oluşturabilirsiniz.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Hızlı Bağlantılar ve Açıklama */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 mb-4 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
                <div className="space-y-1">
                  <p className="font-bold">Kurulum Adımları:</p>
                  <ol className="list-decimal list-inside text-[11px] text-amber-300/90 space-y-0.5">
                    <li>Aşağıdaki <strong>"Kodu Kopyala"</strong> butonuna basın.</li>
                    <li>Supabase SQL Editörünü açın ve kodu yapıştırın.</li>
                    <li>Yeşil <strong>"RUN"</strong> butonuna basıp çalıştırın.</li>
                  </ol>
                </div>

                <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                  <a
                    href="https://supabase.com/dashboard/project/zgeeziqcenezutumhukp/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <span>1. Proje SQL Editörü</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>2. Proje SQL Editörü</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Tab Seçimi: Sütun Ekleme vs Tüm Tablo */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setSqlTab('columns')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    sqlTab === 'columns'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Sadece Sütun Ekleme (anafirma & vergino)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950/40 text-amber-950 font-black">
                    Önerilen
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSqlTab('full')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    sqlTab === 'full'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Tüm Tablo Kurulum Kodu</span>
                </button>
              </div>

              {/* SQL Kod Kutusu */}
              <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 flex flex-col">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-400 text-[11px]">
                      {sqlTab === 'columns' ? 'alter_table_add_columns.sql' : 'mutabakat_schema.sql'}
                    </span>
                    <span className="text-[10px] text-gray-500 hidden sm:inline">
                      {sqlTab === 'columns'
                        ? 'Mevcut tabloya durumu, anafirma ve vergino sütunlarını ekler'
                        : 'Tabloyu sıfırdan oluşturur'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const textToCopy =
                        sqlTab === 'columns' ? MUTABAKAT_ADD_COLUMNS_SQL_SCRIPT : MUTABAKAT_TABLE_SQL_SCRIPT;
                      navigator.clipboard.writeText(textToCopy);
                      setSqlCopied(true);
                      showToast('SQL Kodu panoya kopyalandı.');
                      setTimeout(() => setSqlCopied(false), 2500);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      sqlCopied
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {sqlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{sqlCopied ? 'Kopyalandı!' : 'Kodu Kopyala'}</span>
                  </button>
                </div>
                <div className="p-4 overflow-y-auto font-mono text-xs text-emerald-300/90 leading-relaxed max-h-[360px] whitespace-pre selection:bg-emerald-500/30">
                  {sqlTab === 'columns' ? MUTABAKAT_ADD_COLUMNS_SQL_SCRIPT : MUTABAKAT_TABLE_SQL_SCRIPT}
                </div>
              </div>

              {/* Alt Butonlar */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10 flex-shrink-0">
                <span className="text-[11px] text-gray-400">
                  Tablo oluşturulduktan sonra kayıtlar doğrudan Supabase veritabanına kaydedilir.
                </span>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* WHATSAPP İLE MUTABAKAT GÖNDERME MODALI (PDF OLUŞTUR VE SEÇİLENE GÖNDER) */}
        {whatsappModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl relative text-white flex flex-col gap-4 my-auto"
            >
              {/* Modal Başlığı */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30">
                    <MessageCircle className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                      <span>WHATSAPP İLE MUTABAKAT GÖNDER</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        PDF Hazırlandı
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Resmi cari hesap mutabakat mektubu PDF olarak üretildi; WhatsApp üzerinden seçilen kişiye iletin.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWhatsappModalData(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                  title="Pencereyi Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* PDF Durum Çubuğu */}
              {whatsappModalData.isGeneratingPdf ? (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400 flex-shrink-0" />
                  <span>Resmi Mutabakat Mektubu (PDF) yüksek çözünürlükte oluşturuluyor ve indiriliyor...</span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">
                      <strong>PDF İndirildi:</strong> {whatsappModalData.fileName || 'Mutabakat_Mektubu.pdf'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => generateMutabakatPdf(whatsappModalData.kayit, true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex-shrink-0 transition-all flex items-center gap-1 shadow-xs active:scale-95"
                    title="PDF dosyasını tekrar indirin"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Tekrar İndir</span>
                  </button>
                </div>
              )}

              {/* Seçilen Firma & Mutabakat Özeti */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px]">Muhatap Firma:</span>
                  <span className="font-black text-white text-right truncate max-w-[320px]">
                    {whatsappModalData.kayit.firmaUnvani}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px]">Firma Vergi / TC No:</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {whatsappModalData.kayit.vergiNo || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px]">Ana Firma:</span>
                  <span className="text-slate-200 font-semibold truncate max-w-[300px]">
                    {whatsappModalData.kayit.anafirma || 'ÖZKA İNŞAAT A.Ş.'}{' '}
                    {whatsappModalData.kayit.vergino && `(VKN: ${whatsappModalData.kayit.vergino})`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/60">
                  <span className="text-slate-400 text-[11px]">Bakiye / Mutabakat Tutarı:</span>
                  <span className="text-emerald-400 font-black text-sm font-mono">
                    {(whatsappModalData.kayit.tutar || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                    {whatsappModalData.kayit.paraBirimi || '₺'}{' '}
                    <span className="text-[10px] font-bold text-slate-300">
                      ({whatsappModalData.kayit.borcAlacakTipi})
                    </span>
                  </span>
                </div>
              </div>

              {/* Alıcı WhatsApp Telefon Numarası Girişi (Seçilene Gönder) */}
              <div className="space-y-1.5">
                <label className="text-xs font-black tracking-wider text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <span>ALICI WHATSAPP NUMARASI (SEÇİLENE GÖNDER)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">İsteğe Bağlı / Otomatik Kayıt</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={whatsappModalData.phone}
                    onChange={(e) =>
                      setWhatsappModalData({ ...whatsappModalData, phone: e.target.value })
                    }
                    placeholder="Örn: 0532 123 45 67 veya 5321234567"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border-2 border-emerald-500/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 text-white placeholder-slate-500 text-sm font-mono font-bold outline-none transition-all"
                  />
                  {whatsappModalData.phone && (
                    <button
                      type="button"
                      onClick={() => setWhatsappModalData({ ...whatsappModalData, phone: '' })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title="Numarayı Temizle"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  💡 Numara yazarsanız doğrudan o kişinin sohbet penceresi açılır. Boş bırakırsanız WhatsApp Web'de dilediğiniz kişi veya grubu seçebilirsiniz.
                </p>
              </div>

              {/* Mesaj Şablonu ve Kopyalama */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Gönderilecek WhatsApp Mesajı:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(buildWhatsAppMessage(whatsappModalData.kayit));
                      setWhatsappModalData({ ...whatsappModalData, copied: true });
                      showToast('WhatsApp mesaj metni panoya kopyalandı.');
                      setTimeout(() => {
                        setWhatsappModalData((prev) => (prev ? { ...prev, copied: false } : null));
                      }, 2000);
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    {whatsappModalData.copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{whatsappModalData.copied ? 'Kopyalandı!' : 'Metni Kopyala'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                  {buildWhatsAppMessage(whatsappModalData.kayit)}
                </div>
              </div>

              {/* İpucu Kutusu */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/70 text-[11px] text-slate-300 flex items-start gap-2">
                <span className="text-emerald-400 text-sm">📎</span>
                <div className="leading-relaxed">
                  <strong>PDF Belgesini Ekleyip Gönderme:</strong> WhatsApp penceresi açıldığında, indirilen <strong>{whatsappModalData.fileName || 'PDF'}</strong> belgesini sohbetteki <strong>Ataş (📎)</strong> simgesine tıklayıp <strong>"Belge"</strong> seçerek veya doğrudan sohbet alanına sürükleyerek gönderiniz.
                </div>
              </div>

              {/* Aksiyon Butonları */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setWhatsappModalData(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-all order-2 sm:order-1"
                >
                  Kapat
                </button>

                {/* Cihaz destekliyorsa doğrudan PDF Paylaş */}
                {typeof navigator !== 'undefined' && typeof (navigator as any).canShare === 'function' && whatsappModalData.pdfFile && (
                  <button
                    type="button"
                    onClick={handleDirectWebShare}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 order-1 sm:order-2"
                    title="PDF dosyasını cihaz paylaşımı ile doğrudan WhatsApp'a ilet"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>PDF'i Doğrudan Paylaş</span>
                  </button>
                )}

                {/* Ana WhatsApp Aç ve Gönder Butonu */}
                <button
                  type="button"
                  onClick={() => handleConfirmWhatsAppSend()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25 active:scale-95 order-1 sm:order-3 cursor-pointer"
                  title="WhatsApp Web veya uygulamasını aç ve seçilene gönder"
                >
                  <MessageCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>WHATSAPP İLE SEÇİLENE GÖNDER</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* FİRMA SEÇ TEXTBOX VE ARAMA MODALI (Yeniden Firma Seç Tıklandığında Açılır) */}
        {showFirmaSecPortalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl relative text-white flex flex-col gap-4 my-auto max-h-[90vh]"
            >
              {/* Modal Başlığı */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                      <span>MUTABAKAT PORTALI - FİRMA / ŞANTİYE SEÇ</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {filteredSantiyeListesi.length} Firma
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Aşağıdaki arama kutusuna yazarak firmayı filtreleyin ve seçiniz; vergi no ve ünvan otomatik forma aktarılır.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFirmaSecPortalModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                  title="Pencereyi Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* FİRMA SEÇ ARAMA TEXTBOX'I */}
              <div className="relative flex-shrink-0">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold" />
                <input
                  type="text"
                  autoFocus
                  value={firmaSearchInput}
                  onChange={(e) => setFirmaSearchInput(e.target.value)}
                  placeholder="Firma Ünvanı, Şantiye Adı veya Vergi Numarası ile arayınız..."
                  className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white text-slate-900 border-2 border-emerald-500 font-bold text-sm outline-none shadow-lg placeholder:text-slate-400 placeholder:font-normal focus:ring-4 focus:ring-emerald-500/20"
                />
                {firmaSearchInput && (
                  <button
                    type="button"
                    onClick={() => setFirmaSearchInput('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Aramayı Temizle"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Firma Listesi */}
              <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/70 p-2 space-y-2 min-h-[220px] max-h-[380px]">
                {santiyeLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                    <span className="text-xs font-semibold">Şantiyeler yükleniyor...</span>
                  </div>
                ) : filteredSantiyeListesi.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-center px-4">
                    <Search className="w-8 h-8 text-slate-600" />
                    <p className="text-sm font-bold text-slate-300">Firma Bulunamadı</p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      "{firmaSearchInput}" aramasına uygun firma veya şantiye bulunamadı.
                    </p>
                    {firmaSearchInput && (
                      <button
                        type="button"
                        onClick={() => setFirmaSearchInput('')}
                        className="mt-2 text-xs text-emerald-400 hover:underline font-bold"
                      >
                        Aramayı Temizle
                      </button>
                    )}
                  </div>
                ) : (
                  filteredSantiyeListesi.map((s) => {
                    const isSelected = selectedSantiyeId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectFirmaFromPortalModal(s)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                            : 'bg-slate-900/90 hover:bg-emerald-950/40 border-slate-800 hover:border-emerald-500/40 text-slate-200'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <span className="font-black text-sm text-white truncate">
                              {s.Santiyeadı}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black">
                                Seçili
                              </span>
                            )}
                          </div>
                          {s.unvani && s.unvani !== s.Santiyeadı && (
                            <p className="text-xs text-slate-400 truncate pl-6">
                              {s.unvani}
                            </p>
                          )}
                          {s.vergino && (
                            <p className="text-[11px] font-mono text-emerald-300 pl-6 flex items-center gap-1">
                              <span>VKN / TCKN:</span>
                              <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                {s.vergino}
                              </strong>
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectFirmaFromPortalModal(s);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-sm flex items-center gap-1.5 flex-shrink-0 active:scale-95 transition-all"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>SEÇ VE AKTAR</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Alt Butonlar */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowFirmaSecPortalModal(false);
                    if (onReopenFirmaSec) {
                      onReopenFirmaSec();
                    } else {
                      onBack();
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Portal Giriş Modalı ile Seç</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFirmaSecPortalModal(false)}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
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
