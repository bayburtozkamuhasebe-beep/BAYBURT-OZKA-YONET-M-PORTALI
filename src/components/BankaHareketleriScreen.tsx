import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  Edit3,
  Globe,
  Check,
  X,
  Landmark,
  CheckCircle2,
  RefreshCw,
  Database,
  Loader2,
  Trash2,
  Wallet,
  Building2,
  Search,
  Filter,
  Download,
  Calendar,
  Sparkles,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  Copy,
  Maximize2,
  Minimize2,
  Hash,
  ListFilter,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import { PdfToExcelModal } from './PdfToExcelModal';
import {
  bankSupabase as supabase,
  BANK_TABLE_SQL_SCRIPT,
  BANK_SQL_PERMISSIONS_ONLY,
  BANK_SQL_DISABLE_RLS,
} from '../lib/supabase';

export interface BankaHareketRow {
  id: number | string;
  verino: number | string;
  firma_sahis: string;
  adi: string;
  linki: string;
  bakiye: number;
  created_at?: string;
  updated_at?: string;
}

const SUPABASE_PROJECT_ID = 'mgtunrfpzbyfnmeloeeq';
const SUPABASE_DASHBOARD_URL =
  'https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/19860?schema=public/bank';

// Canlı Supabase public.bank tablosu (Örnek veriler silindi, canlı kayıtlar listelenir)
const LOCAL_STORAGE_KEY = 'ozka_banka_mgtunrfpzbyfnmeloeeq_bank_v2';

interface BankaHareketleriScreenProps {
  onBack: () => void;
  playClickSound?: () => void;
}

export const BankaHareketleriScreen: React.FC<BankaHareketleriScreenProps> = ({
  onBack,
  playClickSound = () => {},
}) => {
  // Örnek veriler silindi: Sadece Supabase veya kullanıcının girdiği gerçek veriler listelenir
  const [rows, setRows] = useState<BankaHareketRow[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFirma, setSelectedFirma] = useState<string>('all');
  const [selectedVerino, setSelectedVerino] = useState<string>('all');
  const [sortField, setSortField] = useState<'verino' | 'bakiye' | 'adi' | 'firma_sahis'>('verino');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tablo Genişletme Durumu (Varsayılan olarak Tam Genişlik / Genişletilmiş Görünüm)
  const [isFullWidth, setIsFullWidth] = useState(true);

  // Edit / Add Modal
  const [editingRow, setEditingRow] = useState<BankaHareketRow | null>(null);
  const [isNewRow, setIsNewRow] = useState(false);
  const [formData, setFormData] = useState<Partial<BankaHareketRow>>({
    verino: 1,
    firma_sahis: '',
    adi: '',
    linki: '',
    bakiye: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showPdfToExcelModal, setShowPdfToExcelModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [sqlTab, setSqlTab] = useState<'permissions' | 'all' | 'disable-rls'>('permissions');

  const getActiveSqlScript = () => {
    if (sqlTab === 'permissions') return BANK_SQL_PERMISSIONS_ONLY;
    if (sqlTab === 'disable-rls') return BANK_SQL_DISABLE_RLS;
    return BANK_TABLE_SQL_SCRIPT;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleCopySql = () => {
    playClickSound();
    navigator.clipboard.writeText(getActiveSqlScript());
    setSqlCopied(true);
    showToast('✓ Seçili SQL Kodu panoya kopyalandı.');
    setTimeout(() => setSqlCopied(false), 2500);
  };

  // Supabase 'bank' tablosunu doğrudan ve canlı olarak sorgula (Örnek veri yok, tabloda ne varsa o listelenir)
  const fetchTableData = async (showNotice = false) => {
    setLoading(true);
    setFetchError(null);
    try {
      // 1. Doğrudan 'bank' tablosunu sorgula (kolon varyasyonlarına ve büyük/küçük harflere dayanıklı)
      const { data, error } = await supabase
        .from('bank')
        .select('*');

      if (!error && Array.isArray(data)) {
        // Tabloda ne varsa onu maple (boşsa 0 kayıt olarak döner)
        const mapped: BankaHareketRow[] = data.map((r, idx) => ({
          id: r.id ?? idx + 1,
          verino: r.verino ?? r.veri_no ?? r.sira_no ?? idx + 1,
          firma_sahis: r.firma_sahis ?? r['firma-sahıs'] ?? r['firma-sahis'] ?? r.firma ?? '',
          adi: r.adi ?? r['adı'] ?? r.banka_adi ?? r.banka ?? r.buton_adi ?? '',
          linki: r.linki ?? r.baglanti_linki ?? r.link ?? '',
          bakiye:
            typeof r.bakiye === 'number'
              ? r.bakiye
              : typeof r['bakıye'] === 'number'
              ? r['bakıye']
              : parseFloat(String(r.bakiye ?? r['bakıye'] ?? 0)) || 0,
          created_at: r.created_at,
          updated_at: r.updated_at,
        }));

        // Sırala (verino'ya göre)
        mapped.sort((a, b) => Number(a.verino || 0) - Number(b.verino || 0));

        setRows(mapped);
        setHasFetchedOnce(true);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mapped));
        } catch {
          // ignore
        }

        if (showNotice) {
          if (mapped.length > 0) {
            showToast(`✓ Supabase 'bank' tablosundan ${mapped.length} kayıt canlı olarak yüklendi.`);
          } else {
            showToast(`✓ Supabase 'bank' tablosuna bağlanıldı. Tabloda henüz kayıt bulunmuyor (0 kayıt).`);
          }
        }
      } else if (error) {
        console.warn('Supabase bank table fetch error:', error);
        setFetchError(error.message);
        setHasFetchedOnce(true);
        if (showNotice) {
          if (error.message.includes('Could not find the table') || error.code === 'PGRST205') {
            showToast(`⚠️ 'bank' tablosu veritabanında henüz oluşturulmamış. 'SQL Kodu / İzinler' ile oluşturabilirsiniz.`);
          } else {
            showToast(`⚠️ Supabase bağlantı uyarısı: ${error.message}`);
          }
        }
      }
    } catch (err) {
      console.warn('Supabase bank query exception:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setFetchError(errMsg);
      setHasFetchedOnce(true);
      if (showNotice) {
        showToast('⚠️ Veriler yüklenirken bağlantı hatası oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Tablodaki tüm verileri veya yerel hafızadaki örnekleri temizleme
  const handleClearAllRows = async () => {
    playClickSound();
    if (!window.confirm('Tablodaki tüm kayıtları temizlemek istediğinize emin misiniz?')) return;
    
    setLoading(true);
    try {
      // Supabase'deki verileri de silmeyi dene
      await supabase.from('bank').delete().neq('id', 0);
    } catch (err) {
      console.warn('Clear all error:', err);
    }
    
    setRows([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem('ozka_banka_hareketleri_rows_v2');
    } catch {
      // ignore
    }
    setLoading(false);
    showToast('✓ Tüm kayıtlar temizlendi. Tablo sıfırlandı.');
  };

  // PDF'ten çıkarılan satırları tabloya içe aktarma
  const handleImportFromPdf = (importedRows: Partial<BankaHareketRow>[]) => {
    if (!importedRows || importedRows.length === 0) return;
    playClickSound();

    const maxVerino = rows.reduce((max, r) => {
      const n = typeof r.verino === 'number' ? r.verino : parseInt(String(r.verino), 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0);

    const newRows: BankaHareketRow[] = importedRows.map((r, idx) => ({
      id: Date.now() + idx,
      verino: r.verino ? r.verino : maxVerino + idx + 1,
      firma_sahis: r.firma_sahis || 'BAYBURT ÖZKA İNŞAAT',
      adi: r.adi || `Banka Hareketi #${idx + 1}`,
      linki: r.linki || '',
      bakiye: typeof r.bakiye === 'number' ? r.bakiye : 0,
      created_at: new Date().toISOString(),
    }));

    const combined = [...rows, ...newRows];
    setRows(combined);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(combined));
    } catch {
      // ignore
    }
    showToast(`✓ PDF dosyasından ${newRows.length} adet satır tabloya başarıyla aktarıldı.`);
  };

  useEffect(() => {
    fetchTableData(false);

    // Canlı Supabase Realtime Dinleyici (Dashboard'daki değişiklikler anında yansır)
    const channel = supabase
      .channel('bank_mgtunrfpzbyfnmeloeeq_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bank' },
        (payload) => {
          console.log('[Supabase Realtime] bank tablosu güncellendi:', payload);
          fetchTableData(false);
        }
      )
      .subscribe();

    // Sekmeye geri dönüldüğünde canlı verileri tazele
    const handleFocus = () => {
      fetchTableData(false);
    };
    window.addEventListener('focus', handleFocus);

    // 4 saniyede bir canlı arka plan kontrolü
    const interval = setInterval(() => {
      fetchTableData(false);
    }, 4000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  // Unique companies for filter
  const distinctFirmas = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.firma_sahis && r.firma_sahis.trim()) {
        set.add(r.firma_sahis.trim());
      }
    });
    return Array.from(set);
  }, [rows]);

  // KULLANICI TALEBİ: VERİ NO ALANINDAKİ VERİLER (MÜKERRER OLMASIN - BİR VERİDEN BİR TANE)
  const distinctVerinolar = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const val = String(r.verino ?? '').trim();
      if (val !== '') {
        set.add(val);
      }
    });
    // Sayısal veya metin olarak sıralama
    return Array.from(set).sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, 'tr');
    });
  }, [rows]);

  // Her bir Veri No için kaç satır olduğunu say
  const verinoCounts = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const val = String(r.verino ?? '').trim();
      if (val !== '') {
        map.set(val, (map.get(val) || 0) + 1);
      }
    });
    return map;
  }, [rows]);

  // Filtered and Sorted rows (Veri No list box filtresi eklendi)
  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => {
        const matchesSearch =
          r.adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.firma_sahis.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(r.verino).includes(searchTerm);
        const matchesFirma = selectedFirma === 'all' || r.firma_sahis.trim() === selectedFirma;
        const matchesVerino =
          selectedVerino === 'all' || String(r.verino ?? '').trim() === selectedVerino;
        return matchesSearch && matchesFirma && matchesVerino;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === 'string') valA = (valA as string).toLowerCase();
        if (typeof valB === 'string') valB = (valB as string).toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [rows, searchTerm, selectedFirma, selectedVerino, sortField, sortOrder]);

  const totalBakiye = useMemo(() => {
    return filteredRows.reduce((acc, curr) => acc + (curr.bakiye || 0), 0);
  }, [filteredRows]);

  const handleOpenAdd = () => {
    playClickSound();
    setIsNewRow(true);

    const maxVerino = rows.reduce((max, r) => {
      const n = typeof r.verino === 'number' ? r.verino : parseInt(String(r.verino), 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    const nextVerino = maxVerino > 0 ? maxVerino + 1 : 1;
    const defaultFirma = rows[0]?.firma_sahis || 'BAYBURT ÖZKA İNŞAAT İTH. İHR.';

    const initialData: BankaHareketRow = {
      id: Date.now(),
      verino: nextVerino,
      firma_sahis: defaultFirma,
      adi: '',
      linki: '',
      bakiye: 0,
    };

    setFormData({ ...initialData });
    setEditingRow({ ...initialData });
  };

  const handleOpenEdit = (row: BankaHareketRow) => {
    playClickSound();
    setIsNewRow(false);
    setFormData({ ...row });
    setEditingRow(row);
  };

  const handleDeleteRow = async (id: number | string) => {
    playClickSound();
    if (!window.confirm('Bu banka hareket kaydını Supabase tablosundan kalıcı olarak silmek istediğinize emin misiniz?')) {
      return;
    }
    const targetRow = rows.find((r) => r.id === id);

    // 1. Supabase Silme (DELETE)
    try {
      const { error: delErr } = await supabase.from('bank').delete().eq('id', id);
      if (delErr && targetRow) {
        // ID eşleşmezse verino ile deneyelim
        await supabase.from('bank').delete().eq('verino', targetRow.verino);
      }
      // Canlı tablodan tekrar listele
      await fetchTableData(false);
      showToast('✓ Kayıt Supabase veritabanından silindi ve liste güncellendi.');
    } catch (err: any) {
      console.warn('Supabase delete error:', err);
      // İstemci tarafı fallback
      const updated = rows.filter((r) => r.id !== id);
      setRows(updated);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      showToast('Kayıt listeden kaldırıldı.');
    }
  };

  const handleSaveRow = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!formData.adi || !formData.adi.trim()) {
      showToast('Lütfen banka / hesap adı alanını doldurunuz.');
      return;
    }

    setIsSaving(true);
    const verinoNum = Number(formData.verino) || 1;
    const firmaClean = (formData.firma_sahis || '').trim();
    const adiClean = (formData.adi || '').trim();
    const linkiClean = (formData.linki || '').trim();
    const bakiyeNum = Number(formData.bakiye) || 0;

    const recordPayload = {
      verino: verinoNum,
      firma_sahis: firmaClean,
      adi: adiClean,
      linki: linkiClean,
      bakiye: bakiyeNum,
    };

    try {
      if (isNewRow) {
        // CANLI SUPABASE 'public.bank' TABLOSUNA EKLEME (INSERT)
        // https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/19860?schema=public/bank
        const { data: insData, error: insErr } = await supabase
          .from('bank')
          .insert(recordPayload)
          .select();

        if (insErr) {
          console.error('Supabase INSERT hatası:', insErr);
          // Kolon isim varyasyonu durumunda fallback denemesi
          const { data: fbData, error: fbErr } = await supabase
            .from('bank')
            .insert({
              verino: verinoNum,
              'firma-sahıs': firmaClean,
              'adı': adiClean,
              linki: linkiClean,
              'bakıye': bakiyeNum,
            })
            .select();

          if (fbErr) {
            showToast(`⚠️ Supabase kayıt hatası: ${insErr.message || fbErr.message}`);
          } else {
            await fetchTableData(false);
            showToast('✓ Yeni banka hareketi canlı Supabase (public.bank) tablosuna kaydedildi ve listelendi!');
            setIsSaving(false);
            setEditingRow(null);
            return;
          }
        } else {
          // Başarılı kayıt: Anında canlı veritabanını sorgulayıp tabloyu güncelle
          await fetchTableData(false);
          showToast('✓ Yeni banka hareketi canlı Supabase (public.bank) tablosuna kaydedildi ve listelendi!');
          setIsSaving(false);
          setEditingRow(null);
          return;
        }
      } else {
        // CANLI SUPABASE 'public.bank' TABLOSUNDA GÜNCELLEME (UPDATE)
        const targetId = editingRow!.id;
        const updPayload = {
          ...recordPayload,
          updated_at: new Date().toISOString(),
        };

        const { error: updErr } = await supabase
          .from('bank')
          .update(updPayload)
          .eq('id', targetId);

        if (updErr) {
          // verino üzerinden güncelleme denemesi
          await supabase.from('bank').update(updPayload).eq('verino', verinoNum);
        }

        await fetchTableData(false);
        showToast('✓ Banka hareketi güncellendi ve canlı tablodan listelendi.');
        setIsSaving(false);
        setEditingRow(null);
        return;
      }
    } catch (err: any) {
      console.error('Supabase işlem hatası:', err);
      showToast(`⚠️ Kayıt işlemi sırasında hata: ${err?.message || 'Bilinmeyen hata'}`);
    }

    setIsSaving(false);
    setEditingRow(null);
  };

  const toggleSort = (field: 'verino' | 'bakiye' | 'adi' | 'firma_sahis') => {
    playClickSound();
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const exportToCSV = () => {
    playClickSound();
    const headers = ['Veri No', 'Firma / Şahıs', 'Banka Adı', 'Bakiye (TL)', 'Link'];
    const csvRows = [headers.join(';')];

    filteredRows.forEach((r) => {
      csvRows.push(
        [
          r.verino,
          `"${r.firma_sahis}"`,
          `"${r.adi}"`,
          r.bakiye.toFixed(2),
          `"${r.linki}"`,
        ].join(';')
      );
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ozka_banka_hareketleri_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast('✓ Tablo Excel CSV formatında indirildi.');
  };

  return (
    <div className="min-h-screen bg-[#060912] text-slate-100 flex flex-col relative overflow-hidden font-sans">
      {/* AMBİYANS IŞIKLARI & KUZEY IŞIKLARI PARILTISI */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-12%] left-[10%] w-[580px] h-[580px] bg-orange-600/12 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute top-[30%] right-[-10%] w-[650px] h-[650px] bg-amber-500/10 rounded-full blur-[170px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* ÜST BİLGİ BAŞLIK VE GEZİNTİ ÇUBUĞU */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#090e1c]/90 border-b border-orange-500/30 px-3 sm:px-6 xl:px-8 py-3.5 shadow-2xl">
          <div className={`w-full ${isFullWidth ? 'max-w-[99vw]' : 'max-w-7xl'} mx-auto flex flex-wrap items-center justify-between gap-3 transition-all duration-300`}>
            {/* Geri Dön Butonu */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onBack();
              }}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 hover:border-orange-400/50 text-gray-200 hover:text-white transition-all shadow-md active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-orange-400 group-hover:-translate-x-1 transition-transform" />
              <div className="flex flex-col text-left">
                <span className="text-xs sm:text-sm font-bold">Geri Dön</span>
                <span className="text-[10px] text-gray-400 -mt-0.5 hidden sm:inline">Bankalar Ekranına</span>
              </div>
            </button>

            {/* Başlık ve Amblem */}
            <div className="flex items-center gap-3">
              <OzkaLogo size="sm" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                    <Landmark className="w-4.5 h-4.5 text-orange-400" />
                    <span>BANKA HAREKETLERİ TABLOSU</span>
                  </h1>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-mono font-bold hidden sm:inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
                    public.bank
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold hidden md:inline-flex items-center gap-1">
                    GENİŞLETİLMİŞ TABLO
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 hidden sm:block">
                  Bayburt Öz-Ka İnşaat • Canlı Hesap & Hareket Yönetim Dökümü
                </p>
              </div>
            </div>

            {/* Üst Sağ Aksiyon Butonları */}
            <div className="flex items-center flex-wrap gap-2">
              {/* PDF TO EXCEL BUTONU */}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowPdfToExcelModal(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/40 border border-emerald-400/50 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                title="PDF dosyasını yükle ve aynı sütunlarla Excel (.xlsx) tablosuna dönüştür"
              >
                <FileText className="w-4 h-4 text-emerald-200" />
                <span>PDF TO EXCEL</span>
                <FileSpreadsheet className="w-4 h-4 text-emerald-300 hidden sm:inline-block" />
              </button>

              {/* Tabloyu Genişlet / Standart Görünüm Butonu */}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsFullWidth((prev) => !prev);
                  showToast(
                    !isFullWidth
                      ? '✓ Tablo tam ekrana genişletildi.'
                      : '✓ Tablo standart genişliğe alındı.'
                  );
                }}
                title={isFullWidth ? 'Standart Genişliğe Dön' : 'Tabloyu Ekrana Genişlet'}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/35 hover:border-orange-400/60 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                {isFullWidth ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-orange-400" />
                    <span className="hidden md:inline">Standart Genişlik</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-orange-400" />
                    <span className="hidden md:inline">Tabloyu Genişlet</span>
                  </>
                )}
              </button>

              {/* Yenile */}
              <button
                type="button"
                onClick={() => fetchTableData(true)}
                disabled={loading}
                title="Tabloyu Yenile"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/15 text-orange-300 border border-white/10 hover:border-orange-400/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Yenile</span>
              </button>

              {/* Yeni Hareket Ekle */}
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/30 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Yeni Banka Hareketi Ekle</span>
              </button>
            </div>
          </div>
        </header>

        {/* ANA İÇERİK ALANI */}
        <main
          className={`w-full ${
            isFullWidth ? 'max-w-[99vw] px-2 sm:px-6 xl:px-8' : 'max-w-7xl px-4 sm:px-6 lg:px-8'
          } mx-auto py-6 sm:py-8 space-y-6 flex-1 transition-all duration-300`}
        >
          {/* Bildirim Toast */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3.5 rounded-2xl bg-orange-950/90 border border-orange-500/50 text-xs sm:text-sm text-orange-200 flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span>{toastMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FİLTRELEME & ARAMA ÇUBUĞU + KULLANICI TALEBİ: ARKA FON HEPSİ BEYAZ (VERİ NO LİSTBOKS, TÜM FİRMALAR LİSTBOKS, ARAMA YERİ) */}
          <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-white border-2 border-orange-500 shadow-2xl text-slate-800">
            {/* Üst Satır: Arama Yeri, Veri No List Boks Açılır Menü ve Tüm Firmalar List Boks */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* 1. ARAMA YERİ (ARKA FON BEYAZ): Banka Adı, Firma veya Veri No Ara */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-orange-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Banka adı, firma veya veri no ara..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border-2 border-orange-500 hover:border-orange-600 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-slate-900 font-semibold text-xs sm:text-sm placeholder:text-slate-400 shadow-sm transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 2. VERİ NO LİST BOKS (ARKA FON BEYAZ - MÜKERRER OLMAYAN DEĞERLER) */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 text-orange-700 border-2 border-orange-500 text-xs font-black whitespace-nowrap shadow-sm">
                  <Hash className="w-4 h-4 text-orange-600" />
                  <span>VERİ NO (LİST BOKS):</span>
                </div>
                <select
                  value={selectedVerino}
                  onChange={(e) => {
                    playClickSound();
                    setSelectedVerino(e.target.value);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-white border-2 border-orange-500 hover:border-orange-600 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-slate-900 text-xs sm:text-sm font-mono font-bold shadow-sm transition-all cursor-pointer"
                  title="Mükerrer olmayan Veri No seçimi ile tabloyu filtrele"
                >
                  <option value="all" className="bg-white text-slate-900 font-bold">
                    📋 TÜM VERİ NOLAR ({distinctVerinolar.length} Farklı No / {rows.length} Kayıt)
                  </option>
                  {distinctVerinolar.map((v) => (
                    <option key={v} value={v} className="bg-white text-slate-900 font-mono font-bold">
                      🔢 Veri No: {v} ({verinoCounts.get(v) || 0} Adet Kayıt)
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. TÜM FİRMALAR LİST BOKS (ARKA FON BEYAZ) */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 text-orange-700 border-2 border-orange-500 text-xs font-black whitespace-nowrap shadow-sm">
                  <Filter className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <span>FİRMALAR:</span>
                </div>
                <select
                  value={selectedFirma}
                  onChange={(e) => {
                    playClickSound();
                    setSelectedFirma(e.target.value);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-white border-2 border-orange-500 hover:border-orange-600 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-slate-900 text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  <option value="all" className="bg-white text-slate-900 font-bold">
                    🏢 Tüm Firmalar ({rows.length})
                  </option>
                  {distinctFirmas.map((f) => (
                    <option key={f} value={f} className="bg-white text-slate-900">
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* KULLANICI TALEBİ: VERİ NO LİST BOKS SEÇİM PANELİ (ARKA FON BEYAZ, MÜKERRER OLMADAN) */}
            <div className="pt-3 border-t-2 border-orange-200 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-orange-700">
                    <ListFilter className="w-4 h-4 text-orange-600" />
                    <span>VERİ NO LİST BOKS LİSTESİ:</span>
                  </span>
                  <span className="text-[11px] text-slate-600 font-mono font-semibold">
                    (Mükerrersiz: {distinctVerinolar.length} farklı Veri No)
                  </span>
                </div>

                {selectedVerino !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSelectedVerino('all');
                    }}
                    className="px-3 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-800 border-2 border-orange-400 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    <X className="w-3.5 h-3.5 text-orange-700" />
                    <span>Filtreyi Temizle (Tümünü Listele)</span>
                  </button>
                )}
              </div>

              {/* Yatay & Dikey List Boks Kutusu (Arka Fon Beyaz, Her Veri No'dan 1 Adet) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSelectedVerino('all');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer border-2 ${
                    selectedVerino === 'all'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-600 shadow-md shadow-orange-500/30 font-black'
                      : 'bg-white text-slate-800 border-orange-300 hover:border-orange-500 hover:bg-orange-50 shadow-sm'
                  }`}
                >
                  <span>TÜM VERİ NOLAR</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${selectedVerino === 'all' ? 'bg-black/30 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {rows.length}
                  </span>
                </button>

                {distinctVerinolar.map((v) => {
                  const count = verinoCounts.get(v) || 0;
                  const isSelected = selectedVerino === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setSelectedVerino(isSelected ? 'all' : v);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer font-mono border-2 ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white border-orange-600 ring-2 ring-orange-500 shadow-lg shadow-orange-500/40 font-black scale-105'
                          : 'bg-white text-slate-800 border-orange-300 hover:border-orange-500 hover:bg-orange-50 shadow-sm'
                      }`}
                      title={`Veri No: ${v} seç ve filtrele (${count} kayıt)`}
                    >
                      <Hash className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-orange-600'}`} />
                      <span>VERİ NO: {v}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isSelected ? 'bg-black/30 text-white' : 'bg-orange-100 text-orange-800 border border-orange-200'
                        }`}
                      >
                        {count} Adet
                      </span>
                    </button>
                  );
                })}

                {distinctVerinolar.length === 0 && (
                  <span className="text-xs text-slate-500 italic">
                    Henüz tabloda Veri No kaydı bulunmuyor.
                  </span>
                )}
              </div>

              {/* Seçim Aktifse Bilgilendirme Çubuğu */}
              {selectedVerino !== 'all' && (
                <div className="p-2.5 px-3 rounded-xl bg-orange-50 border-2 border-orange-400 text-orange-950 text-xs flex flex-wrap items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                    <span>
                      🎯 List Box Filtresi Aktif: <strong className="font-mono text-orange-800 text-sm">VERİ NO: {selectedVerino}</strong> seçildi. Tabloda yalnızca bu Veri No&apos;ya ait <strong className="text-orange-800 font-bold">{filteredRows.length}</strong> adet hareket gösteriliyor.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSelectedVerino('all');
                    }}
                    className="underline text-orange-700 hover:text-orange-950 font-bold text-xs"
                  >
                    Filtreyi Temizle (Tümünü Göster)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* KULLANICI TALEBİ: ARKA FON BEYAZ VE SÜTUNLARI TURUNCU ÇİZGİYLE AYRILMIŞ GENİŞLETİLMİŞ TABLO */}
          <div className="w-full rounded-2xl border-2 border-orange-500 bg-white shadow-2xl overflow-hidden text-slate-800">
            {/* Tablo Üst Başlık Şeridi */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 px-5 sm:px-6 py-3.5 text-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 font-black text-xs sm:text-base tracking-wider uppercase">
                <FileSpreadsheet className="w-5 h-5 text-white flex-shrink-0" />
                <span>BANKA HAREKETLERİ LİSTESİ (CANLI DÖKÜM)</span>
                <span className="hidden sm:inline-flex text-[11px] px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono font-bold">
                  {isFullWidth ? 'GENİŞLETİLMİŞ GÖRÜNÜM (TAM EKRAN)' : 'STANDART GÖRÜNÜM'}
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-2.5">
                {/* PDF TO EXCEL BUTONU (TABLO ÜZERİNDE) */}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setShowPdfToExcelModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-950 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 border-2 border-emerald-400 shadow-lg cursor-pointer"
                  title="PDF dosyasını yükle ve Excel'e dönüştür"
                >
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  <span className="tracking-wide">PDF TO EXCEL</span>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsFullWidth((prev) => !prev);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/35 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border border-white/20"
                  title={isFullWidth ? 'Tabloyu Daralt' : 'Tabloyu Genişlet'}
                >
                  {isFullWidth ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Daralt</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Genişlet</span>
                    </>
                  )}
                </button>
                <div className="text-xs sm:text-sm font-black text-orange-100 font-mono">
                  Toplam {filteredRows.length} Kayıt Gösteriliyor
                </div>
              </div>
            </div>

            {/* Tablo Konteyneri */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 border-orange-500">
                    {/* SÜTUN 1: VERİ NO (TURUNCU ÇİZGİLİ) */}
                    <th
                      scope="col"
                      onClick={() => toggleSort('verino')}
                      className={`px-4 py-4 border-r-2 border-orange-500 cursor-pointer hover:bg-orange-100 transition-colors select-none text-center w-32 ${
                        selectedVerino !== 'all' ? 'bg-orange-100/90 text-orange-950 font-black' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>VERİ NO</span>
                          <ArrowUpDown className="w-3.5 h-3.5 text-orange-600" />
                        </div>
                        {selectedVerino !== 'all' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-600 text-white font-mono font-bold leading-none shadow-sm">
                            Filtre: {selectedVerino}
                          </span>
                        )}
                      </div>
                    </th>

                    {/* SÜTUN 2: FİRMA / ŞAHIS (TURUNCU ÇİZGİLİ) */}
                    <th
                      scope="col"
                      onClick={() => toggleSort('firma_sahis')}
                      className="px-6 py-4 border-r-2 border-orange-500 cursor-pointer hover:bg-orange-100 transition-colors select-none min-w-[280px]"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        <span>FİRMA / ŞAHIS</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-orange-600" />
                      </div>
                    </th>

                    {/* SÜTUN 3: BANKA ADI (TURUNCU ÇİZGİLİ) */}
                    <th
                      scope="col"
                      onClick={() => toggleSort('adi')}
                      className="px-6 py-4 border-r-2 border-orange-500 cursor-pointer hover:bg-orange-100 transition-colors select-none min-w-[320px]"
                    >
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        <span>BANKA / HESAP ADI</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-orange-600" />
                      </div>
                    </th>

                    {/* SÜTUN 4: BAKİYE (TURUNCU ÇİZGİLİ) */}
                    <th
                      scope="col"
                      onClick={() => toggleSort('bakiye')}
                      className="px-6 py-4 border-r-2 border-orange-500 cursor-pointer hover:bg-orange-100 transition-colors select-none text-right min-w-[240px]"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>BAKİYE (₺)</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-orange-600" />
                      </div>
                    </th>

                    {/* SÜTUN 5: İNTERNET ŞUBESİ LİNKİ (TURUNCU ÇİZGİLİ) */}
                    <th
                      scope="col"
                      className="px-6 py-4 border-r-2 border-orange-500 text-center min-w-[260px]"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <Globe className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span>HESAP / GİRİŞ LİNKİ</span>
                      </div>
                    </th>

                    {/* SÜTUN 6: İŞLEMLER */}
                    <th scope="col" className="px-5 py-4 text-center w-36">
                      <span>İŞLEMLER</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-slate-500 bg-white">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto border border-orange-200 shadow-sm">
                            <Landmark className="w-8 h-8" />
                          </div>
                          <h4 className="font-bold text-slate-800 text-base">
                            {searchTerm || selectedFirma !== 'all'
                              ? 'Arama Kriterlerine Uygun Kayıt Bulunamadı'
                              : 'Tabloda Henüz Kayıt Bulunmuyor'}
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {searchTerm || selectedFirma !== 'all'
                              ? 'Farklı bir arama terimi deneyebilir veya filtreyi temizleyebilirsiniz.'
                              : 'Örnek veriler kaldırılmıştır. Doğrudan canlı Supabase bank tablonuzdaki veriler listelenir veya "Yeni Kayıt Ekle" butonu ile yeni hareket oluşturabilirsiniz.'}
                          </p>

                          {fetchError && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs text-left">
                              <p className="font-bold mb-1">⚠️ Supabase Bilgisi:</p>
                              <p>{fetchError}</p>
                              <p className="mt-1 text-[11px] text-amber-700">
                                Tablo henüz oluşturulmadıysa yukarıdaki <strong>&quot;SQL Kurulum&quot;</strong> butonuna basıp kodu Supabase SQL Editor&apos;da çalıştırabilirsiniz.
                              </p>
                            </div>
                          )}

                          <div className="pt-2 flex items-center justify-center gap-2.5 flex-wrap">
                            <button
                              type="button"
                              onClick={handleOpenAdd}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/30 transition-all flex items-center gap-1.5 active:scale-95"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Yeni Kayıt Ekle</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => fetchTableData(true)}
                              disabled={loading}
                              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all flex items-center gap-1.5"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                              <span>Tabloyu Yenile</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, index) => {
                      const isEven = index % 2 === 0;

                      return (
                        <tr
                          key={r.id}
                          className={`${
                            isEven ? 'bg-white' : 'bg-slate-50/70'
                          } hover:bg-orange-50/80 transition-colors duration-150 group`}
                        >
                          {/* 1. SÜTUN: VERİ NO (TURUNCU ÇİZGİ) */}
                          <td className="px-4 py-4 font-mono font-bold text-slate-900 border-r-2 border-orange-500 text-center">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 text-orange-800 border border-orange-300 font-black text-sm sm:text-base shadow-xs">
                              {r.verino}
                            </span>
                          </td>

                          {/* 2. SÜTUN: FİRMA / ŞAHIS (TURUNCU ÇİZGİ - RENKLİ ROZET) */}
                          <td className="px-6 py-4 border-r-2 border-orange-500 font-semibold text-slate-800">
                            <div className="flex items-center gap-3">
                              <span className="p-2 rounded-xl bg-blue-100 text-blue-700 flex-shrink-0">
                                <Building2 className="w-4 h-4" />
                              </span>
                              <span className="font-bold text-slate-900 text-sm sm:text-base">
                                {r.firma_sahis || (
                                  <span className="text-slate-400 italic font-normal">Belirtilmedi</span>
                                )}
                              </span>
                            </div>
                          </td>

                          {/* 3. SÜTUN: BANKA ADI (TURUNCU ÇİZGİ) */}
                          <td className="px-6 py-4 border-r-2 border-orange-500 font-bold text-slate-900">
                            <div className="flex items-center gap-3">
                              <span className="p-2 rounded-xl bg-orange-100 text-orange-700 group-hover:scale-110 transition-transform flex-shrink-0">
                                <Landmark className="w-4.5 h-4.5" />
                              </span>
                              <div>
                                <div className="text-slate-950 font-black text-sm sm:text-base">{r.adi}</div>
                                {r.created_at && (
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1 font-normal mt-0.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{new Date(r.created_at).toLocaleDateString('tr-TR')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 4. SÜTUN: BAKİYE (TURUNCU ÇİZGİ - YEŞİL YÜKSEK KONTRAST) */}
                          <td className="px-6 py-4 border-r-2 border-orange-500 text-right font-mono">
                            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-black text-base sm:text-lg shadow-xs">
                              <Wallet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <span>{formatCurrency(r.bakiye)}</span>
                            </div>
                          </td>

                          {/* 5. SÜTUN: LİNKİ (TURUNCU ÇİZGİ - TIKLANABİLİR LİNK) */}
                          <td className="px-6 py-4 border-r-2 border-orange-500 text-center">
                            {r.linki && r.linki.trim() ? (
                              <div className="inline-flex items-center gap-2 justify-center flex-wrap">
                                <a
                                  href={
                                    r.linki.startsWith('http') ? r.linki : `https://${r.linki}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md transition-all active:scale-95"
                                  title={r.linki}
                                >
                                  <span>
                                    {r.linki.includes('1drv.ms') || r.linki.includes('sharepoint') || r.linki.includes('excel') || r.linki.includes('sheet')
                                      ? 'Tabloyu / Excel Aç'
                                      : 'İnternet Şubesi'}
                                  </span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(r.linki);
                                    showToast('✓ Link panoya kopyalandı.');
                                  }}
                                  title="Linki Kopyala"
                                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Bağlantı Yok</span>
                            )}
                          </td>

                          {/* 6. SÜTUN: İŞLEMLER */}
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(r)}
                                title="Kaydı Düzenle"
                                className="p-2 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-100/70 border border-transparent hover:border-blue-200 transition-colors"
                              >
                                <Edit3 className="w-4.5 h-4.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(r.id)}
                                title="Kaydı Sil"
                                className="p-2 rounded-xl text-slate-600 hover:text-rose-700 hover:bg-rose-100/70 border border-transparent hover:border-rose-200 transition-colors"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* TABLO ALTI TOPLAM SATIRI */}
                <tfoot>
                  <tr className="bg-slate-100 text-slate-900 font-black text-xs sm:text-base border-t-2 border-orange-500">
                    <td colSpan={3} className="px-6 py-4.5 text-right border-r-2 border-orange-500 uppercase tracking-wider text-slate-800">
                      GENEL TOPLAM BAKİYE:
                    </td>
                    <td className="px-6 py-4.5 border-r-2 border-orange-500 text-right font-mono text-lg sm:text-xl font-black text-emerald-800 bg-emerald-50/70">
                      {formatCurrency(totalBakiye)}
                    </td>
                    <td colSpan={2} className="px-6 py-4.5 text-center text-xs sm:text-sm text-slate-600 italic">
                      {filteredRows.length} Adet Banka Hesabı Aktif
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </main>

        {/* ALT BİLGİ / FOOTER */}
        <footer className="mt-auto py-6 text-center text-xs text-gray-500 border-t border-white/5 bg-[#090e1c]/60 backdrop-blur-md">
          <p>
            © Bayburt Öz-Ka İnş.İth.İhr.Tic.Ltd.Şti •{' '}
            <span className="text-blue-400 font-medium">Yazılım ve Tasarım: EMİRHAN KALHAN</span>
          </p>
        </footer>
      </div>

      {/* DÜZENLEME & YENİ KAYIT MODALI */}
      <AnimatePresence>
        {editingRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingRow(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="relative z-10 w-full max-w-lg bg-[#0e1424] border border-orange-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-left"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {isNewRow ? 'Yeni Banka Hareketi Ekle' : 'Banka Hareketini Güncelle'}
                    </h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                      <span>Supabase</span>
                      <a
                        href={SUPABASE_DASHBOARD_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 font-mono font-bold hover:underline inline-flex items-center gap-1"
                        title="Supabase public.bank tablosunu aç"
                      >
                        <span>public.bank (mgtunrfpzbyfnmeloeeq)</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span>tablosuna kaydedilir</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRow} className="space-y-4 text-sm">
                {/* Veri No */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Veri Numarası (<span className="text-orange-400 font-mono">verino</span>)
                  </label>
                  <input
                    type="number"
                    value={formData.verino || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, verino: Number(e.target.value) })
                    }
                    placeholder="Örn: 1510138092"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-orange-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-slate-900 text-xs sm:text-sm font-mono font-bold transition-colors"
                    required
                  />
                </div>

                {/* Firma / Şahıs */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>Firma / Şahıs (<span className="text-orange-400 font-mono">firma_sahis</span>)</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-orange-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.firma_sahis || ''}
                      onChange={(e) => setFormData({ ...formData, firma_sahis: e.target.value })}
                      placeholder="Örn: BAYBURT ÖZKA İNŞAAT İTH. İHR."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-orange-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-slate-900 font-bold text-xs sm:text-sm transition-colors"
                    />
                  </div>
                </div>

                {/* Banka Adı */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Banka / Hesap Adı (<span className="text-orange-400 font-mono">adi</span>) <span className="text-orange-400">*</span>
                  </label>
                  <div className="relative">
                    <Landmark className="w-4 h-4 text-orange-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.adi || ''}
                      onChange={(e) => setFormData({ ...formData, adi: e.target.value })}
                      placeholder="Örn: DENİZBANK A.Ş."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-orange-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-slate-900 font-bold text-xs sm:text-sm transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Bakiye */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>Hesap Bakiyesi (<span className="text-emerald-400 font-mono">bakiye</span> ₺)</span>
                    <span className="text-xs text-emerald-400 font-mono font-bold">
                      {formatCurrency(Number(formData.bakiye) || 0)}
                    </span>
                  </label>
                  <div className="relative">
                    <Wallet className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      value={formData.bakiye ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bakiye: e.target.value === '' ? 0 : Number(e.target.value),
                        })
                      }
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-emerald-500 focus:border-emerald-600 focus:outline-none text-emerald-700 font-mono font-bold text-xs sm:text-sm transition-colors"
                    />
                  </div>
                </div>

                {/* Linki */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    İnternet Şubesi Linki / Excel (<span className="text-orange-400 font-mono">linki</span>)
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.linki || ''}
                      onChange={(e) => setFormData({ ...formData, linki: e.target.value })}
                      placeholder="https://1drv.ms/x/... veya https://ebanka.denizbank.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-orange-500 focus:border-orange-600 focus:outline-none text-slate-900 text-xs sm:text-sm transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingRow(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    İptal
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/30 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Supabase'e Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{isNewRow ? 'KAYDET VE LİSTELE' : 'GÜNCELLE VE LİSTELE'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUPABASE 'bank' TABLOSU SQL KURULUM MODALI */}
      <AnimatePresence>
        {showSqlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSqlModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="relative z-10 w-full max-w-2xl bg-[#0a0f1d] border border-orange-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/40">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Supabase &apos;bank&apos; Tablosu Kurulumu</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                        public.bank
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400">
                      Proje ID: <span className="font-mono text-orange-400 font-bold">{SUPABASE_PROJECT_ID}</span> • Tablo: <span className="font-mono text-white font-bold">bank</span>
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

              {/* TABLO SÜTUNLARI ÖZETİ */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-orange-300 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  <span>Kullanıcı Talebine Uygun Sütun Şeması:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <span className="font-mono text-orange-300 font-bold">verino</span>
                    <span className="text-gray-400 text-[11px]">INTEGER (Sıra / Kod No)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <span className="font-mono text-orange-300 font-bold">firma_sahis</span>
                    <span className="text-gray-400 text-[11px]">TEXT (Firma / Şahıs Adı)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <span className="font-mono text-orange-300 font-bold">adi</span>
                    <span className="text-gray-400 text-[11px]">TEXT (Banka Adı)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <span className="font-mono text-orange-300 font-bold">linki</span>
                    <span className="text-gray-400 text-[11px]">TEXT (İnternet Şubesi URL)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between sm:col-span-2">
                    <span className="font-mono text-emerald-300 font-bold">bakiye</span>
                    <span className="text-gray-400 text-[11px]">NUMERIC(15,2) (Hesap Bakiyesi ₺)</span>
                  </div>
                </div>
              </div>

              {/* İZİN SEÇİM SEKMELERİ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold text-gray-300">
                    Kopyalamak İstediğiniz İzin Scriptini Seçiniz:
                  </span>
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setSqlTab('permissions')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        sqlTab === 'permissions'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      🛡️ 4 İzin (Okuma/Ekleme/Güncelleme/Silme)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlTab('disable-rls')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        sqlTab === 'disable-rls'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      ⚡ Hızlı Çözüm (RLS Kapat)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlTab('all')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        sqlTab === 'all'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      📦 Tam Kurulum + 12 Slot
                    </button>
                  </div>
                </div>

                {/* 4 İZİN AÇIKLAMA ROZETLERİ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                    <div className="font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>OKUMA (SELECT)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">Listeleme & Arama</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300">
                    <div className="font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>EKLEME (INSERT)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">Yeni Banka/Hareket</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    <div className="font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>GÜNCELLEME (UPDATE)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">Bakiye/Bilgi Düzenleme</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                    <div className="font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>SİLME (DELETE)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">Kayıt Kaldırma</p>
                  </div>
                </div>

                {/* SQL KOD KUTUSU */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-300">
                      {sqlTab === 'permissions' && 'Okuma, Ekleme, Güncelleme ve Silme İzinleri (RLS & GRANT):'}
                      {sqlTab === 'disable-rls' && 'En Hızlı Çözüm: RLS Devre Dışı Bırakma Kodu:'}
                      {sqlTab === 'all' && 'Tam Tablo Kurulumu, İzinler ve Örnek Veri Kodu:'}
                    </label>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-orange-600/30 active:scale-95"
                    >
                      {sqlCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-white" />
                          <span>Seçili Kodu Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-4 rounded-2xl bg-black/60 border border-white/10 text-[11px] font-mono text-orange-200 overflow-x-auto max-h-60 leading-relaxed select-all">
                    {getActiveSqlScript()}
                  </pre>
                </div>
              </div>

              {/* ADIMLAR */}
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-blue-300">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Supabase Kurulum Adımları:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-gray-300 pl-1">
                  <li>Yukarıdaki &quot;Kodu Kopyala&quot; butonuna basınız.</li>
                  <li>Aşağıdaki &quot;Supabase SQL Editor&apos;ı Aç&quot; butonuna tıklayınız.</li>
                  <li>Kodu yapıştırıp &quot;Run&quot; (Çalıştır) butonuna basınız. Tablo ve erişim izinleri anında aktif olacaktır.</li>
                </ol>
              </div>

              {/* AKSİYON BUTONLARI */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <a
                    href="https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/30 transition-all flex items-center gap-1.5"
                  >
                    <span>Supabase SQL Editor&apos;ı Aç ↗</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={SUPABASE_DASHBOARD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/15 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tablo Editörü ↗</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF TO EXCEL DÖNÜŞTÜRÜCÜ MODALI */}
      <PdfToExcelModal
        isOpen={showPdfToExcelModal}
        onClose={() => setShowPdfToExcelModal(false)}
        onImportRows={handleImportFromPdf}
        playClickSound={playClickSound}
      />
    </div>
  );
};
