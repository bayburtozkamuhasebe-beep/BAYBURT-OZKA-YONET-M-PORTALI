import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Copy,
  Check,
  Printer,
  Download,
  Trash2,
  ExternalLink,
  Users,
  Wallet,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Sparkles,
  RefreshCw,
  Edit3,
  DollarSign,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Database,
  Code2,
} from 'lucide-react';
import { OzkaLogo } from './OzkaLogo';
import { supabase, bankSupabase, PERSONEL_AVANS_TABLES_SQL_SCRIPT } from '../lib/supabase';

export type AvansDurumu = 'Onay Bekliyor' | 'Onaylandı' | 'Ödendi' | 'Reddedildi';
export type AvansTuru = 'Maaş Avansı' | 'Şantiye Gider Avansı' | 'Yol & Harcırah' | 'Acil İhtiyaç' | 'Diğer';

export interface PersonelAvansKaydi {
  id: string;
  talepNo: string;
  personelAdSoyad: string;
  tcKimlikNo?: string;
  unvan?: string;
  santiye: string;
  tutar: number;
  iban: string;
  bankaAdi?: string;
  avansTuru: AvansTuru;
  talepTarihi: string;
  istenenOdemeTarihi: string;
  aciklama: string;
  durum: AvansDurumu;
  onaylayan?: string;
  odemeTarihi?: string;
  dekontNo?: string;
}

const STORAGE_KEY = 'ozka_personel_avans_talepleri_v2';
const CUSTOM_URL_STORAGE_KEY = 'ozka_personel_avans_custom_url_v1';

export const PERSONEL_AVANS_TABLE_ONLY_SQL = `-- ============================================================================
-- 1. TABLO: personelavans (Personele Ödenen Avanslar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.personelavans (
    id BIGSERIAL PRIMARY KEY,
    tcno VARCHAR(11) NOT NULL,
    adisoyadi VARCHAR(255) NOT NULL,
    santiyesi VARCHAR(255) NOT NULL,
    odenen NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tarih DATE DEFAULT CURRENT_DATE,
    aciklama TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Hızlı Sorgulama İndeksleri
CREATE INDEX IF NOT EXISTS idx_personelavans_tcno ON public.personelavans (tcno);
CREATE INDEX IF NOT EXISTS idx_personelavans_adisoyadi ON public.personelavans (adisoyadi);
CREATE INDEX IF NOT EXISTS idx_personelavans_santiyesi ON public.personelavans (santiyesi);
CREATE INDEX IF NOT EXISTS idx_personelavans_tarih ON public.personelavans (tarih);

-- RLS Yetkileri
ALTER TABLE public.personelavans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "personelavans_full_access" ON public.personelavans;
CREATE POLICY "personelavans_full_access" ON public.personelavans FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.personelavans TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;`;

export const PERSONEL_AVANS_KESILEN_ONLY_SQL = `-- ============================================================================
-- 2. TABLO: personelavanskesilen (Personelden Kesilen / Mahsup Edilen Avanslar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.personelavanskesilen (
    id BIGSERIAL PRIMARY KEY,
    tcno VARCHAR(11) NOT NULL,
    adisoyadi VARCHAR(255) NOT NULL,
    santiyesi VARCHAR(255) NOT NULL,
    kesilen NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tarih DATE DEFAULT CURRENT_DATE,
    bordro_donemi VARCHAR(20),
    aciklama TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Hızlı Sorgulama İndeksleri
CREATE INDEX IF NOT EXISTS idx_personelavanskesilen_tcno ON public.personelavanskesilen (tcno);
CREATE INDEX IF NOT EXISTS idx_personelavanskesilen_adisoyadi ON public.personelavanskesilen (adisoyadi);
CREATE INDEX IF NOT EXISTS idx_personelavanskesilen_santiyesi ON public.personelavanskesilen (santiyesi);
CREATE INDEX IF NOT EXISTS idx_personelavanskesilen_tarih ON public.personelavanskesilen (tarih);

-- RLS Yetkileri
ALTER TABLE public.personelavanskesilen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "personelavanskesilen_full_access" ON public.personelavanskesilen;
CREATE POLICY "personelavanskesilen_full_access" ON public.personelavanskesilen FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.personelavanskesilen TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;`;

export const PERSONEL_AVANS_VIEW_ONLY_SQL = `-- ============================================================================
-- 3. MUHASEBE BAKİYE GÖRÜNÜMÜ (VIEW): Kalan Avans Durumu
-- (Toplam Ödenen - Toplam Kesilen = Kalan Avans Borcu)
-- ============================================================================
CREATE OR REPLACE VIEW public.v_personel_avans_bakiye AS
SELECT 
    COALESCE(o.tcno, k.tcno) AS tcno,
    COALESCE(o.adisoyadi, k.adisoyadi) AS adisoyadi,
    COALESCE(o.santiyesi, k.santiyesi) AS santiyesi,
    COALESCE(o.toplam_odenen, 0.00) AS toplam_odenen,
    COALESCE(k.toplam_kesilen, 0.00) AS toplam_kesilen,
    (COALESCE(o.toplam_odenen, 0.00) - COALESCE(k.toplam_kesilen, 0.00)) AS kalan_avans_bakiyesi
FROM (
    SELECT tcno, MAX(adisoyadi) AS adisoyadi, MAX(santiyesi) AS santiyesi, SUM(odenen) AS toplam_odenen
    FROM public.personelavans GROUP BY tcno
) o
FULL OUTER JOIN (
    SELECT tcno, MAX(adisoyadi) AS adisoyadi, MAX(santiyesi) AS santiyesi, SUM(kesilen) AS toplam_kesilen
    FROM public.personelavanskesilen GROUP BY tcno
) k ON o.tcno = k.tcno;

GRANT SELECT ON public.v_personel_avans_bakiye TO anon, authenticated, service_role;`;

const DEFAULT_SANTIYELER = [
  'Merkez Yönetim Ofisi',
  'Bayburt Merkez Şantiye',
  'Trabzon Sahil Yolu Projesi',
  'Gümüşhane Tünel İnşaatı',
  'Erzurum Bölge Şantiye',
  'Ankara Lojistik & Depo',
  'Genel Şantiye & Saha',
];

const INITIAL_SAMPLE_AVANSLAR: PersonelAvansKaydi[] = [
  {
    id: 'avs-001',
    talepNo: 'AVS-2026-001',
    personelAdSoyad: 'Mehmet Yılmaz',
    tcKimlikNo: '28475910382',
    unvan: 'Kalıp Ustası',
    santiye: 'Bayburt Merkez Şantiye',
    tutar: 15000,
    iban: 'TR32 0001 0012 3456 7890 1234 56',
    bankaAdi: 'Ziraat Bankası',
    avansTuru: 'Maaş Avansı',
    talepTarihi: '2026-10-20',
    istenenOdemeTarihi: '2026-10-24',
    aciklama: 'Kira ve ailevi zorunlu ihtiyaçlar nedeniyle maaş mahsubu avans talebi.',
    durum: 'Onay Bekliyor',
  },
  {
    id: 'avs-002',
    talepNo: 'AVS-2026-002',
    personelAdSoyad: 'Ali Kaya',
    tcKimlikNo: '19483029481',
    unvan: 'Şantiye Saha Mühendisi',
    santiye: 'Trabzon Sahil Yolu Projesi',
    tutar: 22500,
    iban: 'TR64 0006 2000 9876 5432 1098 76',
    bankaAdi: 'Garanti BBVA',
    avansTuru: 'Şantiye Gider Avansı',
    talepTarihi: '2026-10-18',
    istenenOdemeTarihi: '2026-10-21',
    aciklama: 'Şantiye acil hırdavat, akaryakıt ve malzeme tedarik harcamaları için iş avansı.',
    durum: 'Onaylandı',
    onaylayan: 'Proje Müdürü & Muhasebe',
  },
  {
    id: 'avs-003',
    talepNo: 'AVS-2026-003',
    personelAdSoyad: 'Hasan Demir',
    tcKimlikNo: '30294810293',
    unvan: 'Ekskavatör Operatörü',
    santiye: 'Gümüşhane Tünel İnşaatı',
    tutar: 10000,
    iban: 'TR11 0001 5001 5555 4444 3333 22',
    bankaAdi: 'VakıfBank',
    avansTuru: 'Maaş Avansı',
    talepTarihi: '2026-10-15',
    istenenOdemeTarihi: '2026-10-17',
    aciklama: 'Ay sonu maaşından kesilmek üzere acil nakit avans talebi.',
    durum: 'Ödendi',
    onaylayan: 'Muhasebe Müdürü',
    odemeTarihi: '2026-10-17',
    dekontNo: 'DKNT-884920',
  },
  {
    id: 'avs-004',
    talepNo: 'AVS-2026-004',
    personelAdSoyad: 'Serkan Öztürk',
    tcKimlikNo: '44930219482',
    unvan: 'Satın Alma Sorumlusu',
    santiye: 'Merkez Yönetim Ofisi',
    tutar: 18000,
    iban: 'TR45 0006 4000 1122 3344 5566 77',
    bankaAdi: 'İş Bankası',
    avansTuru: 'Yol & Harcırah',
    talepTarihi: '2026-10-22',
    istenenOdemeTarihi: '2026-10-25',
    aciklama: 'Şantiye malzeme denetimi ve tedarikçi görüşmeleri şehirlerarası seyahat harcırahı.',
    durum: 'Onay Bekliyor',
  },
];

interface PersonelAvansModalProps {
  isOpen: boolean;
  onClose: () => void;
  playClickSound?: () => void;
}

export const PersonelAvansModal: React.FC<PersonelAvansModalProps> = ({
  isOpen,
  onClose,
  playClickSound = () => {},
}) => {
  // Liste Durumu
  const [talepler, setTalepler] = useState<PersonelAvansKaydi[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SAMPLE_AVANSLAR;
  });

  // Harici Bağlantı (URL)
  const [customUrl, setCustomUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(CUSTOM_URL_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState(customUrl);

  // Form Açık/Kapalı
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Yeni Avans Form State
  const [formPersonel, setFormPersonel] = useState('');
  const [formTc, setFormTc] = useState('');
  const [formUnvan, setFormUnvan] = useState('');
  const [formSantiye, setFormSantiye] = useState(DEFAULT_SANTIYELER[0]);
  const [formTutar, setFormTutar] = useState('');
  const [formIban, setFormIban] = useState('');
  const [formBanka, setFormBanka] = useState('');
  const [formTur, setFormTur] = useState<AvansTuru>('Maaş Avansı');
  const [formTalepTarihi, setFormTalepTarihi] = useState(() => new Date().toISOString().slice(0, 10));
  const [formIstenenTarih, setFormIstenenTarih] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [formAciklama, setFormAciklama] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtreler & Arama
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSantiye, setSelectedSantiye] = useState('TÜMÜ');
  const [selectedDurum, setSelectedDurum] = useState('TÜMÜ');

  // Yazdırma / Makbuz Modalı
  const [printTalep, setPrintTalep] = useState<PersonelAvansKaydi | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Supabase SQL Kodu Modalı
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlTab, setSqlTab] = useState<'all' | 'odenen' | 'kesilen' | 'view'>('all');
  const [sqlCopied, setSqlCopied] = useState(false);

  const handleCopySql = () => {
    let textToCopy = PERSONEL_AVANS_TABLES_SQL_SCRIPT;
    if (sqlTab === 'odenen') {
      textToCopy = PERSONEL_AVANS_TABLE_ONLY_SQL;
    } else if (sqlTab === 'kesilen') {
      textToCopy = PERSONEL_AVANS_KESILEN_ONLY_SQL;
    } else if (sqlTab === 'view') {
      textToCopy = PERSONEL_AVANS_VIEW_ONLY_SQL;
    }
    navigator.clipboard.writeText(textToCopy);
    setSqlCopied(true);
    playClickSound();
    showToast('SQL kodu panoya kopyalandı! Supabase SQL Editor alanına yapıştırabilirsiniz.');
    setTimeout(() => setSqlCopied(false), 2500);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // LocalStorage senkronizasyonu
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(talepler));
    } catch {
      // ignore
    }
  }, [talepler]);

  // IBAN kopyalama
  const handleCopyIban = (iban: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      navigator.clipboard.writeText(iban.replace(/\s+/g, ''));
      setCopiedId(id);
      playClickSound();
      showToast(`IBAN kopyalandı: ${iban}`);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // ignore
    }
  };

  // Para Formatı (TRY)
  const formatTRY = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Tarih Formatı
  const formatDateTR = (dateStr?: string) => {
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

  // Durum Güncelleme
  const handleUpdateDurum = (id: string, yeniDurum: AvansDurumu) => {
    playClickSound();
    setTalepler((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated: PersonelAvansKaydi = {
            ...t,
            durum: yeniDurum,
          };
          if (yeniDurum === 'Onaylandı') {
            updated.onaylayan = 'Muhasebe / Yönetim Onayı';
          } else if (yeniDurum === 'Ödendi') {
            updated.odemeTarihi = new Date().toISOString().slice(0, 10);
            updated.dekontNo = `DKNT-${Math.floor(100000 + Math.random() * 900000)}`;
          }
          return updated;
        }
        return t;
      })
    );
    showToast(`Talep durumu "${yeniDurum}" olarak güncellendi.`);
  };

  // Talep Silme
  const handleDeleteTalep = (id: string, talepNo: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(`${talepNo} nolu avans talebini silmek istediğinize emin misiniz?`);
    if (!confirmed) return;
    playClickSound();
    setTalepler((prev) => prev.filter((t) => t.id !== id));
    showToast('Avans talebi listeden kaldırıldı.');
  };

  // Yeni Avans Ekle
  const handleAddAvans = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPersonel.trim()) {
      showToast('Lütfen personel adını ve soyadını giriniz.');
      return;
    }
    const parsedTutar = parseFloat(formTutar.replace(/\./g, '').replace(',', '.'));
    if (isNaN(parsedTutar) || parsedTutar <= 0) {
      showToast('Lütfen geçerli bir avans tutarı giriniz.');
      return;
    }

    setIsSubmitting(true);
    playClickSound();

    const newTalepNo = `AVS-2026-${String(talepler.length + 1).padStart(3, '0')}`;
    const newRecord: PersonelAvansKaydi = {
      id: `avs-${Date.now()}`,
      talepNo: newTalepNo,
      personelAdSoyad: formPersonel.trim(),
      tcKimlikNo: formTc.trim() || undefined,
      unvan: formUnvan.trim() || 'Şirket Personeli',
      santiye: formSantiye,
      tutar: parsedTutar,
      iban: formIban.trim() || 'Belirtilmedi',
      bankaAdi: formBanka.trim() || 'Banka',
      avansTuru: formTur,
      talepTarihi: formTalepTarihi,
      istenenOdemeTarihi: formIstenenTarih,
      aciklama: formAciklama.trim() || 'Personel avans talebi.',
      durum: 'Onay Bekliyor',
    };

    setTalepler((prev) => [newRecord, ...prev]);

    // Arka planda merkezi Supabase talepler tablosuna da kaydet (hata alsa bile UI kesintisiz çalışır)
    try {
      const konuMetni = `Personel Avans Talebi - ${newRecord.personelAdSoyad} (${formatTRY(newRecord.tutar)})`;
      const aciklamaMetni = `Şantiye: ${newRecord.santiye}\nTür: ${newRecord.avansTuru}\nTutar: ${formatTRY(newRecord.tutar)}\nIBAN: ${newRecord.iban} (${newRecord.bankaAdi || '-'})\nİstenen Tarih: ${formatDateTR(newRecord.istenenOdemeTarihi)}\nAçıklama: ${newRecord.aciklama}`;

      // Bank Supabase
      await bankSupabase
        .from('talepler')
        .insert([
          {
            talepeden: newRecord.personelAdSoyad,
            tür: 'Personel Avans',
            tur: 'Personel Avans',
            konu: konuMetni,
            acıklama: aciklamaMetni,
            aciklama: aciklamaMetni,
            durum: 'İnceleniyor',
            tarih: new Date().toISOString(),
          },
        ]);
    } catch {
      // ignore
    }

    // Formu temizle
    setFormPersonel('');
    setFormTc('');
    setFormUnvan('');
    setFormTutar('');
    setFormIban('');
    setFormBanka('');
    setFormAciklama('');
    setIsFormOpen(false);
    setIsSubmitting(false);

    showToast(`${newTalepNo} nolu Personel Avans Talebi başarıyla oluşturuldu.`);
  };

  // Harici Link Kaydet
  const handleSaveCustomUrl = () => {
    let clean = tempUrl.trim();
    if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    setCustomUrl(clean);
    try {
      localStorage.setItem(CUSTOM_URL_STORAGE_KEY, clean);
    } catch {
      // ignore
    }
    setIsEditingUrl(false);
    showToast('Harici bağlantı linki güncellendi.');
  };

  // İstatistikler
  const stats = useMemo(() => {
    const totalCount = talepler.length;
    const totalAmount = talepler.reduce((sum, t) => sum + (t.tutar || 0), 0);
    const bekleyenTalepler = talepler.filter((t) => t.durum === 'Onay Bekliyor');
    const bekleyenCount = bekleyenTalepler.length;
    const bekleyenAmount = bekleyenTalepler.reduce((sum, t) => sum + (t.tutar || 0), 0);
    const onaylananAmount = talepler
      .filter((t) => t.durum === 'Onaylandı')
      .reduce((sum, t) => sum + (t.tutar || 0), 0);
    const odenenAmount = talepler
      .filter((t) => t.durum === 'Ödendi')
      .reduce((sum, t) => sum + (t.tutar || 0), 0);

    return {
      totalCount,
      totalAmount,
      bekleyenCount,
      bekleyenAmount,
      onaylananAmount,
      odenenAmount,
    };
  }, [talepler]);

  // Filtrelenmiş Liste
  const filteredTalepler = useMemo(() => {
    return talepler.filter((t) => {
      // Arama
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          t.personelAdSoyad.toLowerCase().includes(q) ||
          (t.tcKimlikNo && t.tcKimlikNo.includes(q)) ||
          t.talepNo.toLowerCase().includes(q) ||
          t.santiye.toLowerCase().includes(q) ||
          t.aciklama.toLowerCase().includes(q) ||
          t.iban.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Şantiye
      if (selectedSantiye !== 'TÜMÜ' && t.santiye !== selectedSantiye) {
        return false;
      }

      // Durum
      if (selectedDurum !== 'TÜMÜ' && t.durum !== selectedDurum) {
        return false;
      }

      return true;
    });
  }, [talepler, searchQuery, selectedSantiye, selectedDurum]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22 }}
          className="relative w-full max-w-[1500px] max-h-[94vh] flex flex-col rounded-3xl bg-gradient-to-b from-slate-900 via-[#0d121f] to-slate-950 border border-indigo-500/30 shadow-[0_10px_60px_rgba(79,70,229,0.25)] text-slate-100 overflow-hidden"
        >
          {/* Üst Arka Plan Işık Halesi */}
          <div className="absolute top-0 left-1/4 w-96 h-40 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-96 h-40 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* MODAL HEADER */}
          <div className="relative z-10 px-5 sm:px-8 py-4 sm:py-5 border-b border-white/10 bg-white/[0.03] backdrop-blur-md flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 flex-shrink-0 border border-indigo-400/30">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black text-white tracking-wide flex items-center gap-2">
                    <span>PERSONEL AVANS TALEPLERİ</span>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      Ödeme Yönetimi
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  ÖZKA İnşaat şantiye ve merkez personeli maaş/harcırah avansları, IBAN ödemeleri ve muhasebe onay portalı
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">

              {customUrl && (
                <a
                  href={customUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Kayıtlı harici tabloyu veya bağlantıyı aç"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Harici Bağlantı</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setIsEditingUrl(!isEditingUrl)}
                className="p-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all cursor-pointer"
                title="Harici bağlantı linki ayarla"
              >
                <Edit3 className="w-4 h-4 text-slate-300" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Pencereyi Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* HARİCİ URL DÜZENLEME ÇUBUĞU */}
          {isEditingUrl && (
            <div className="px-5 sm:px-8 py-3 bg-indigo-950/40 border-b border-indigo-500/30 flex flex-col sm:flex-row items-center gap-2 text-xs">
              <span className="text-indigo-300 font-bold whitespace-nowrap">
                Harici Tablo / ERP Bağlantı Linki:
              </span>
              <input
                type="text"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="Örn: https://supabase.com/dashboard/project/.../editor/..."
                className="flex-1 w-full px-3 py-1.5 rounded-lg bg-black/50 border border-indigo-500/40 text-white placeholder-slate-500 outline-none focus:border-indigo-400"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleSaveCustomUrl}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors cursor-pointer"
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 transition-colors cursor-pointer"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          {/* TOAST MESAJI */}
          {toastMsg && (
            <div className="mx-5 sm:mx-8 mt-4 p-3 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>{toastMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMsg(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* İÇERİK ALANI */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 space-y-6">
            {/* İSTATİSTİK KARTLARI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* 1. Toplam Talep */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Toplam Talep</span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  {stats.totalCount} <span className="text-xs font-normal text-slate-400">Adet</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  {formatTRY(stats.totalAmount)}
                </div>
              </div>

              {/* 2. Bekleyen Avans */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-amber-300 mb-1 font-bold">
                  <span>Onay Bekleyen</span>
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-200 font-mono">
                  {stats.bekleyenCount} <span className="text-xs font-normal text-amber-300/80">Kayıt</span>
                </div>
                <div className="text-[11px] text-amber-300 font-bold mt-1 font-mono">
                  {formatTRY(stats.bekleyenAmount)}
                </div>
              </div>

              {/* 3. Onaylanan */}
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 backdrop-blur-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-indigo-300 mb-1 font-bold">
                  <span>Muhasebe Onaylı</span>
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-indigo-200 font-mono">
                  {formatTRY(stats.onaylananAmount)}
                </div>
                <div className="text-[11px] text-indigo-300/80 mt-1">
                  Ödeme talimatı hazırlanıyor
                </div>
              </div>

              {/* 4. Ödenen */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-emerald-300 mb-1 font-bold">
                  <span>Ödenen Avanslar</span>
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-200 font-mono">
                  {formatTRY(stats.odenenAmount)}
                </div>
                <div className="text-[11px] text-emerald-300/80 mt-1">
                  Hesaba aktarılan toplam
                </div>
              </div>
            </div>

            {/* BUTON: YENİ AVANS TALEBİ EKLE ACCORDION */}
            <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/40 to-blue-950/40 p-4 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Yeni Personel Avans Talebi Girişi</h3>
                    <p className="text-xs text-slate-400">
                      Şantiye veya merkez personeli için yeni avans formu doldurup onaya gönderin
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsFormOpen(!isFormOpen);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isFormOpen ? (
                    <>
                      <span>Formu Kapat</span>
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Avans Talep Formu Aç</span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* AÇILIR FORM GÖVDESİ */}
              <AnimatePresence>
                {isFormOpen && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleAddAvans}
                    className="mt-4 pt-4 border-t border-white/10 space-y-4 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      {/* Personel Ad Soyad */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Personel Adı Soyadı *</label>
                        <input
                          type="text"
                          required
                          value={formPersonel}
                          onChange={(e) => setFormPersonel(e.target.value)}
                          placeholder="Örn: Ahmet Yılmaz"
                          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white outline-none focus:border-indigo-400"
                        />
                      </div>

                      {/* TC Kimlik No */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">TC Kimlik No / Sicil</label>
                        <input
                          type="text"
                          maxLength={11}
                          value={formTc}
                          onChange={(e) => setFormTc(e.target.value.replace(/\D/g, ''))}
                          placeholder="11 haneli TC no"
                          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono outline-none focus:border-indigo-400"
                        />
                      </div>

                      {/* Görevi / Ünvanı */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Görevi / Ünvanı</label>
                        <input
                          type="text"
                          value={formUnvan}
                          onChange={(e) => setFormUnvan(e.target.value)}
                          placeholder="Örn: Demir Ustası, Formen..."
                          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white outline-none focus:border-indigo-400"
                        />
                      </div>

                      {/* Şantiye / Proje */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Şantiye / Birim *</label>
                        <select
                          value={formSantiye}
                          onChange={(e) => setFormSantiye(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/15 text-white outline-none focus:border-indigo-400"
                        >
                          {DEFAULT_SANTIYELER.map((s) => (
                            <option key={s} value={s} className="bg-slate-900 text-white">
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Talep Edilen Tutar */}
                      <div>
                        <label className="block text-amber-300 font-bold mb-1">Talep Edilen Tutar (₺) *</label>
                        <input
                          type="text"
                          required
                          value={formTutar}
                          onChange={(e) => setFormTutar(e.target.value)}
                          placeholder="Örn: 15.000"
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/40 text-amber-300 font-mono font-bold outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* IBAN Numarası */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">IBAN Numarası</label>
                        <input
                          type="text"
                          value={formIban}
                          onChange={(e) => setFormIban(e.target.value.toUpperCase())}
                          placeholder="TR00 0000 0000..."
                          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono outline-none focus:border-indigo-400"
                        />
                      </div>

                      {/* Banka Adı */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Banka Adı</label>
                        <input
                          type="text"
                          value={formBanka}
                          onChange={(e) => setFormBanka(e.target.value)}
                          placeholder="Örn: Ziraat Bankası"
                          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white outline-none focus:border-indigo-400"
                        />
                      </div>

                      {/* Avans Türü */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Avans Türü</label>
                        <select
                          value={formTur}
                          onChange={(e) => setFormTur(e.target.value as AvansTuru)}
                          className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/15 text-white outline-none focus:border-indigo-400"
                        >
                          <option value="Maaş Avansı" className="bg-slate-900 text-white">Maaş Avansı</option>
                          <option value="Şantiye Gider Avansı" className="bg-slate-900 text-white">Şantiye Gider Avansı</option>
                          <option value="Yol & Harcırah" className="bg-slate-900 text-white">Yol & Harcırah</option>
                          <option value="Acil İhtiyaç" className="bg-slate-900 text-white">Acil İhtiyaç</option>
                          <option value="Diğer" className="bg-slate-900 text-white">Diğer</option>
                        </select>
                      </div>

                      {/* Talep Tarihi */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Talep Tarihi</label>
                        <input
                          type="date"
                          value={formTalepTarihi}
                          onChange={(e) => setFormTalepTarihi(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white outline-none focus:border-indigo-400 font-mono"
                        />
                      </div>

                      {/* İstenen Ödeme Tarihi */}
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">İstenen Ödeme Tarihi</label>
                        <input
                          type="date"
                          value={formIstenenTarih}
                          onChange={(e) => setFormIstenenTarih(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white outline-none focus:border-indigo-400 font-mono"
                        />
                      </div>

                      {/* Açıklama / Gerekçe (2 Kolon) */}
                      <div className="sm:col-span-2">
                        <label className="block text-slate-300 font-bold mb-1">Talep Gerekçesi / Açıklama</label>
                        <input
                          type="text"
                          value={formAciklama}
                          onChange={(e) => setFormAciklama(e.target.value)}
                          placeholder="Avans talep sebebi, mahsup şekli veya şantiye notu..."
                          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSubmitting ? 'Kaydediliyor...' : 'Talebi Oluştur ve Gönder'}</span>
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* FİLTRE VE ARAMA ÇUBUĞU */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
              {/* Arama Inputu */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Personel adı, TC kimlik, talep no, şantiye veya IBAN ara..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 outline-none focus:border-indigo-400 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Şantiye Filtresi */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedSantiye}
                  onChange={(e) => setSelectedSantiye(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-slate-200 outline-none focus:border-indigo-400 cursor-pointer"
                >
                  <option value="TÜMÜ">Tüm Şantiyeler</option>
                  {DEFAULT_SANTIYELER.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {/* Durum Filtresi */}
                <select
                  value={selectedDurum}
                  onChange={(e) => setSelectedDurum(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-slate-200 outline-none focus:border-indigo-400 cursor-pointer"
                >
                  <option value="TÜMÜ">Tüm Durumlar</option>
                  <option value="Onay Bekliyor">Onay Bekliyor</option>
                  <option value="Onaylandı">Onaylandı</option>
                  <option value="Ödendi">Ödendi</option>
                  <option value="Reddedildi">Reddedildi</option>
                </select>
              </div>
            </div>

            {/* TABLO VEYA BOŞ BİLGİ */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                      <th className="py-3 px-4">Talep No</th>
                      <th className="py-3 px-4">Personel Bilgisi</th>
                      <th className="py-3 px-4">Şantiye / Görev</th>
                      <th className="py-3 px-4 text-right">Avans Tutarı</th>
                      <th className="py-3 px-4">IBAN / Banka</th>
                      <th className="py-3 px-4">İstenen Tarih</th>
                      <th className="py-3 px-4">Durum</th>
                      <th className="py-3 px-4 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans bg-white">
                    {filteredTalepler.length > 0 ? (
                      filteredTalepler.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 transition-colors group bg-white"
                        >
                          {/* Talep No */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {item.talepNo}
                          </td>

                          {/* Personel Bilgisi */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {item.personelAdSoyad}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {item.tcKimlikNo ? `TC: ${item.tcKimlikNo}` : item.avansTuru}
                            </div>
                          </td>

                          {/* Şantiye / Görev */}
                          <td className="py-3 px-4">
                            <div className="text-slate-800 font-medium">{item.santiye}</div>
                            <div className="text-[11px] text-slate-500">{item.unvan || '-'}</div>
                          </td>

                          {/* Avans Tutarı */}
                          <td className="py-3 px-4 text-right font-mono font-black text-amber-800 text-sm">
                            {formatTRY(item.tutar)}
                          </td>

                          {/* IBAN / Banka */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-slate-700 text-[11px]">
                                {item.iban}
                              </span>
                              {item.iban && item.iban !== 'Belirtilmedi' && (
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyIban(item.iban, item.id, e)}
                                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                  title="IBAN Kopyala"
                                >
                                  {copiedId === item.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">{item.bankaAdi || '-'}</div>
                          </td>

                          {/* İstenen Tarih */}
                          <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                            {formatDateTR(item.istenenOdemeTarihi)}
                          </td>

                          {/* Durum Rozeti */}
                          <td className="py-3 px-4">
                            {item.durum === 'Onay Bekliyor' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>Onay Bekliyor</span>
                              </span>
                            )}
                            {item.durum === 'Onaylandı' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                                <CheckCircle2 className="w-3 h-3 text-indigo-700" />
                                <span>Onaylandı</span>
                              </span>
                            )}
                            {item.durum === 'Ödendi' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <Check className="w-3 h-3 text-emerald-700" />
                                <span>Ödendi</span>
                              </span>
                            )}
                            {item.durum === 'Reddedildi' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                <XCircle className="w-3 h-3 text-rose-700" />
                                <span>Reddedildi</span>
                              </span>
                            )}
                          </td>

                          {/* İşlemler */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Durum Değiştirme Menü / Butonları */}
                              {item.durum === 'Onay Bekliyor' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDurum(item.id, 'Onaylandı')}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors cursor-pointer"
                                  title="Muhasebe Onayı Ver"
                                >
                                  Onayla
                                </button>
                              )}

                              {item.durum === 'Onaylandı' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDurum(item.id, 'Ödendi')}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                                  title="Ödeme Yapıldı Olarak İşaretle"
                                >
                                  Ödendi Yap
                                </button>
                              )}

                              {/* Makbuz / Fiş Yazdır */}
                              <button
                                type="button"
                                onClick={() => {
                                  playClickSound();
                                  setPrintTalep(item);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Avans Talep & Ödeme Fişi Yazdır"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Sil */}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteTalep(item.id, item.talepNo, e)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 transition-colors cursor-pointer"
                                title="Kaydı Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500 bg-white">
                          <Users className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                          <p className="font-semibold text-slate-800">
                            Filtrelere uygun personel avans talebi bulunamadı.
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Arama kriterlerinizi değiştirebilir veya yukarıdaki formdan yeni talep ekleyebilirsiniz.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ALT BAR (MODAL FOOTER) */}
          <div className="relative z-10 px-5 sm:px-8 py-3.5 border-t border-white/10 bg-black/40 flex items-center justify-between gap-3 text-xs">
            <div className="text-slate-400 text-[11px]">
              Toplam <strong>{filteredTalepler.length}</strong> avans talebi gösteriliyor.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </motion.div>

        {/* RESMİ AVANS MAKBUZU / FİŞİ YAZDIRMA PENCERESİ */}
        {printTalep && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto"
            onClick={() => setPrintTalep(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-white text-slate-900 rounded-2xl p-6 sm:p-10 shadow-2xl font-sans text-xs space-y-6"
            >
              {/* Başlık ve Antet */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h3 className="text-base font-black tracking-wider uppercase text-slate-950">
                    BAYBURT ÖZKA İNŞAAT A.Ş.
                  </h3>
                  <p className="text-[11px] text-slate-600">Personel Avans Talep & Ödeme Makbuzu</p>
                </div>
                <div className="text-right text-[11px] space-y-0.5">
                  <p><strong>Talep No:</strong> <span className="font-mono">{printTalep.talepNo}</span></p>
                  <p><strong>Tarih:</strong> {formatDateTR(printTalep.talepTarihi)}</p>
                </div>
              </div>

              {/* Bilgi Tablosu */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-700 w-1/3 border-r border-slate-200">
                        Personel Adı Soyadı
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {printTalep.personelAdSoyad}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold text-slate-700 border-r border-slate-200">
                        TC Kimlik No / Sicil
                      </td>
                      <td className="py-2 px-3 font-mono">{printTalep.tcKimlikNo || '-'}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-700 border-r border-slate-200">
                        Şantiye / Görevi
                      </td>
                      <td className="py-2 px-3">{printTalep.santiye} / {printTalep.unvan || '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold text-slate-700 border-r border-slate-200">
                        Avans Türü
                      </td>
                      <td className="py-2 px-3 font-semibold text-indigo-700">{printTalep.avansTuru}</td>
                    </tr>
                    <tr className="bg-amber-50">
                      <td className="py-2 px-3 font-black text-slate-900 border-r border-slate-200">
                        Talep Edilen Avans Tutarı
                      </td>
                      <td className="py-2 px-3 font-mono font-black text-slate-950 text-sm">
                        {formatTRY(printTalep.tutar)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold text-slate-700 border-r border-slate-200">
                        IBAN & Banka
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold">
                        {printTalep.iban} ({printTalep.bankaAdi || '-'})
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-700 border-r border-slate-200">
                        İstenen Ödeme Tarihi
                      </td>
                      <td className="py-2 px-3 font-mono">{formatDateTR(printTalep.istenenOdemeTarihi)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold text-slate-700 border-r border-slate-200">
                        Gerekçe / Açıklama
                      </td>
                      <td className="py-2 px-3 text-slate-800">{printTalep.aciklama}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* İmza Alanları */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-center text-[11px]">
                <div>
                  <p className="font-bold text-slate-800">Talep Eden Personel</p>
                  <p className="text-slate-500 mt-1">{printTalep.personelAdSoyad}</p>
                  <div className="h-12 border-b border-dashed border-slate-300 mt-2"></div>
                  <p className="text-[10px] text-slate-400 mt-1">(İmza)</p>
                </div>

                <div>
                  <p className="font-bold text-slate-800">Şantiye Şefi / Birim Amiri</p>
                  <p className="text-slate-500 mt-1">Onay & Kontrol</p>
                  <div className="h-12 border-b border-dashed border-slate-300 mt-2"></div>
                  <p className="text-[10px] text-slate-400 mt-1">(İmza)</p>
                </div>

                <div>
                  <p className="font-bold text-slate-800">Muhasebe & Finans Onayı</p>
                  <p className="text-slate-500 mt-1">Ödeme Talimatı</p>
                  <div className="h-12 border-b border-dashed border-slate-300 mt-2"></div>
                  <p className="text-[10px] text-slate-400 mt-1">(İmza / Kaşe)</p>
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 print:hidden">
                <button
                  type="button"
                  onClick={() => setPrintTalep(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Yazdır / PDF Kaydet</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* SUPABASE SQL KODU MODALI */}
        {showSqlModal && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md overflow-y-auto"
            onClick={() => setShowSqlModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-950 border border-amber-500/40 p-5 sm:p-7 shadow-2xl text-slate-100 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                    <Database className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>Supabase SQL Tablo Kurulum Kodu</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        2 Tablo + 1 Bakiye View
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      <code>public.personelavans</code> ve <code>public.personelavanskesilen</code> tabloları
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

              {/* Bilgilendirme Kutusu & Sekmeler */}
              <div className="pt-4 space-y-3">
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p>
                      <strong>Nasıl Kullanılır:</strong> Supabase Dashboard'da projenize gidin &gt; Sol menüden <strong>SQL Editor</strong>'ü açın &gt; Aşağıdaki kodu yapıştırıp sağ alttaki <strong>RUN</strong> butonuna basın.
                    </p>
                    <p className="text-[11px] text-amber-300/80">
                      Tüm birincil anahtarlar, RLS izinleri, indeksler ve Ödenen - Kesilen = Kalan Avans hesaplayan otomatik muhasebe görünümü hazırlandı.
                    </p>
                  </div>
                </div>

                {/* Sekmeler & Kopyala Butonu */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setSqlTab('all')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        sqlTab === 'all'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tümü (2 Tablo + View)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlTab('odenen')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        sqlTab === 'odenen'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      1. personelavans
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlTab('kesilen')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        sqlTab === 'kesilen'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      2. personelavanskesilen
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlTab('view')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        sqlTab === 'view'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      3. Bakiye View
                    </button>
                  </div>

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
              </div>

              {/* Kod Kutusu */}
              <div className="flex-1 overflow-y-auto mt-3 p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-amber-200/90 leading-relaxed select-all">
                <pre className="whitespace-pre-wrap">
                  {sqlTab === 'all' && PERSONEL_AVANS_TABLES_SQL_SCRIPT}
                  {sqlTab === 'odenen' && PERSONEL_AVANS_TABLE_ONLY_SQL}
                  {sqlTab === 'kesilen' && PERSONEL_AVANS_KESILEN_ONLY_SQL}
                  {sqlTab === 'view' && PERSONEL_AVANS_VIEW_ONLY_SQL}
                </pre>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 mt-3 border-t border-white/10 text-xs">
                <span className="text-slate-500">
                  Supabase PostgreSQL 15+ / PostgREST tam uyumludur.
                </span>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
