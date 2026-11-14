import React, { useState, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  FileText,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Search,
  Sparkles,
  Zap,
  ArrowRight,
  Database,
} from 'lucide-react';
import {
  ExtractedTableData,
  parsePdfLocally,
  exportToExcel,
  copyTableToClipboard,
} from '../utils/pdfParser';
import { BankaHareketRow } from './BankaHareketleriScreen';

interface PdfToExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportRows?: (rows: Partial<BankaHareketRow>[]) => void;
  playClickSound?: () => void;
}

export const PdfToExcelModal: React.FC<PdfToExcelModalProps> = ({
  isOpen,
  onClose,
  onImportRows,
  playClickSound = () => {},
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [extractionMode, setExtractionMode] = useState<'ai' | 'local'>('ai');
  const [extractedData, setExtractedData] = useState<ExtractedTableData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  if (!isOpen) return null;

  // Dosya seçildiğinde otomatik işlemi başlat
  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Lütfen geçerli bir .pdf dosyası seçiniz.');
      return;
    }
    setSelectedFile(file);
    setErrorMessage(null);
    setExtractedData(null);
    setDownloadSuccess(false);
    setImportSuccess(false);
    processPdf(file, extractionMode);
  };

  const processPdf = async (file: File, mode: 'ai' | 'local') => {
    playClickSound();
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStep('PDF belgesi yükleniyor ve okunuyor...');

    try {
      if (mode === 'ai') {
        setProcessingStep('PDF yapay zeka ile taranıyor, sütunlar ve satırlar tespit ediliyor...');
        
        // PDF dosyasını base64'e dönüştür
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            resolve(res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Sunucudaki /api/pdf-to-excel/extract endpoint'ini çağır
        const res = await fetch('/api/pdf-to-excel/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdfBase64: base64,
            fileName: file.name,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Sunucu hatası (${res.status})`);
        }

        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error(json.error || 'Tablo verisi çıkarılamadı.');
        }

        const data = json.data;
        const headers: string[] = Array.isArray(data.headers) ? data.headers : [];
        const rows: (string | number)[][] = Array.isArray(data.rows) ? data.rows : [];

        if (headers.length === 0 && rows.length === 0) {
          throw new Error('PDF dosyasında okunabilir tablo bulunamadı.');
        }

        setExtractedData({
          title: data.title || file.name.replace(/\.[^/.]+$/, ''),
          sheetName: data.sheetName || 'Banka Hareketleri',
          headers: headers.length > 0 ? headers : rows[0]?.map((_, idx) => `Sütun ${idx + 1}`) || ['Sütun 1'],
          rows: rows,
          pageCount: data.summary?.pageCount || 1,
        });
      } else {
        // Yerel İstemci Modu (pdfjs-dist)
        setProcessingStep('Yerel ayrıştırıcı ile PDF sayfaları ve koordinatları taranıyor...');
        const localResult = await parsePdfLocally(file);
        if (localResult.headers.length === 0 && localResult.rows.length === 0) {
          throw new Error('PDF dosyasında metin veya tablo verisi bulunamadı.');
        }
        setExtractedData(localResult);
      }
    } catch (err: unknown) {
      console.error('PDF parsing error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      
      // Eğer AI modunda hata olduysa ve yerel mod denenmediyse, yerel moda yedekle
      if (mode === 'ai') {
        try {
          setProcessingStep('AI servisine ulaşılamadı, yerel ayrıştırıcıya geçiliyor...');
          const fallback = await parsePdfLocally(file);
          setExtractedData(fallback);
          setErrorMessage('Not: AI servisi yanıt vermediği için yerel ayrıştırıcı kullanıldı.');
        } catch (fbErr) {
          setErrorMessage(`Dönüştürme başarısız oldu: ${msg}`);
        }
      } else {
        setErrorMessage(`PDF ayrıştırma hatası: ${msg}`);
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleDownloadExcel = () => {
    if (!extractedData) return;
    playClickSound();

    const baseName = selectedFile?.name.replace(/\.[^/.]+$/, '') || 'banka_hareketleri';
    const excelFileName = `${baseName}_excel.xlsx`;

    exportToExcel(
      excelFileName,
      extractedData.headers,
      extractedData.rows,
      extractedData.sheetName || 'Banka Hareketleri'
    );

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3500);
  };

  const handleCopyClipboard = () => {
    if (!extractedData) return;
    playClickSound();
    const ok = copyTableToClipboard(extractedData.headers, extractedData.rows);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleImportToTable = () => {
    if (!extractedData || !onImportRows) return;
    playClickSound();

    // Çıkarılan tablodan BankaHareketRow formatına dönüştürmeyi dene
    const h = extractedData.headers.map((x) => x.toLowerCase().trim());
    const verinoIdx = h.findIndex((x) => x.includes('veri') || x.includes('no') || x.includes('sıra'));
    const firmaIdx = h.findIndex((x) => x.includes('firma') || x.includes('şahıs') || x.includes('sahis') || x.includes('hesap'));
    const adiIdx = h.findIndex((x) => x.includes('banka') || x.includes('adı') || x.includes('açıklama') || x.includes('adi'));
    const bakiyeIdx = h.findIndex((x) => x.includes('bakiye') || x.includes('tutar') || x.includes('alacak') || x.includes('borç'));
    const linkIdx = h.findIndex((x) => x.includes('link') || x.includes('şube') || x.includes('dekont'));

    const mappedRows: Partial<BankaHareketRow>[] = extractedData.rows.map((row, idx) => {
      let bakiyeNum = 0;
      if (bakiyeIdx !== -1 && row[bakiyeIdx] !== undefined) {
        const raw = String(row[bakiyeIdx]).replace(/\./g, '').replace(',', '.');
        bakiyeNum = parseFloat(raw) || 0;
      }

      return {
        verino: verinoIdx !== -1 && row[verinoIdx] ? String(row[verinoIdx]) : idx + 1,
        firma_sahis: firmaIdx !== -1 && row[firmaIdx] ? String(row[firmaIdx]) : 'PDF Aktarımı',
        adi: adiIdx !== -1 && row[adiIdx] ? String(row[adiIdx]) : `İşlem #${idx + 1}`,
        bakiye: bakiyeNum,
        linki: linkIdx !== -1 && row[linkIdx] ? String(row[linkIdx]) : '',
      };
    });

    onImportRows(mappedRows);
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 3000);
  };

  // Önizleme satırlarını arama filtresine göre filtrele
  const filteredPreviewRows = extractedData
    ? extractedData.rows.filter((row) => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return row.some((cell) => String(cell).toLowerCase().includes(q));
      })
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      {/* Karartma Arka Planı */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Modal Kutusu */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        className="relative z-10 w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#0d1322] border-2 border-emerald-500/50 rounded-3xl shadow-2xl shadow-emerald-950/60 overflow-hidden text-slate-100"
      >
        {/* Üst Başlık Şeridi */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 px-5 sm:px-8 py-4 border-b border-emerald-500/40 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-white/10 text-white border border-white/20 shadow-md">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-xs font-mono font-bold">PDF</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                  <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-xs font-mono font-bold">EXCEL</span>
                  <span>PDF TO EXCEL DÖNÜŞTÜRÜCÜ</span>
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 font-bold hidden sm:inline-block">
                  Sütun & Satır Koruma
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 -mt-0.5">
                Yüklenen PDF dosyasındaki verileri aynı şekilde ve aynı sütunlarla Microsoft Excel (.xlsx) formatına çevirir.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Gövdesi */}
        <div className="p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
          {/* Dönüştürme Modu ve Yükleme Kartı */}
          {!extractedData && (
            <div className="space-y-5">
              {/* Mod Seçimi */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#141d33] border border-white/10 text-xs">
                <span className="text-gray-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Dönüştürme Yöntemi:</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setExtractionMode('ai');
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      extractionMode === 'ai'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/40 border border-emerald-400'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Akıllı Analiz (Önerilen - Ekstre & Tablo)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setExtractionMode('local');
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      extractionMode === 'local'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/40 border border-emerald-400'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-blue-300" />
                    <span>Hızlı Yerel Ayrıştırıcı (İstemci)</span>
                  </button>
                </div>
              </div>

              {/* Sürükle & Bırak Yükleme Alanı */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    handleFileChange(files[0]);
                  }
                }}
                className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-950/30 scale-[1.01]'
                    : 'border-white/20 hover:border-emerald-500/60 bg-[#12192c]/70 hover:bg-[#12192c]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      handleFileChange(files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl group-hover:scale-110 transition-transform">
                    {isProcessing ? (
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                    ) : (
                      <Upload className="w-8 h-8 text-emerald-400" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {isProcessing ? processingStep : 'PDF Dosyasını Buraya Sürükleyin veya Seçin'}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
                      Banka hesap ekstresi, hareket dökümü veya tablo içeren PDF dosyanızı yükleyin; tüm sütun ve satırlar birebir Excel tablosuna aktarılacaktır.
                    </p>
                  </div>

                  {!isProcessing && (
                    <label
                      htmlFor={fileInputId}
                      onClick={() => playClickSound()}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-900/40 border border-emerald-400/40 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>PDF Dosyası Seç</span>
                    </label>
                  )}

                  {isProcessing && (
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 bg-emerald-950/60 px-4 py-2 rounded-full border border-emerald-500/40">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>İşleniyor, lütfen bekleyin...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bilgilendirme Notu */}
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/25 flex items-start gap-3 text-xs text-emerald-200">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-bold text-white">Sütunlar ve Veriler Aynı Şekilde Korunur:</p>
                  <p className="text-emerald-200/90">
                    PDF içerisindeki başlık sütunları (Tarih, Açıklama, Dekont No, Tutar, Borç, Alacak, Bakiye, Firma vb.) otomatik hizalanarak gerçek Microsoft Excel (<strong className="text-white font-mono">.xlsx</strong>) hücrelerine tam eşleşme ile dönüştürülür.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Hata Bildirimi */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-xs sm:text-sm text-rose-200 flex items-start justify-between gap-3 shadow-lg">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4.5 h-4.5 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ÇIKARILAN TABLO VE ÖNİZLEME ALANI */}
          {extractedData && (
            <div className="space-y-5">
              {/* Üst İşlem ve İndirme Çubuğu */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border-2 border-emerald-600 shadow-xl text-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                      <span>{extractedData.title || selectedFile?.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold">
                        {extractedData.rows.length} Satır • {extractedData.headers.length} Sütun
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Veriler başarıyla ayıklandı. Excel (.xlsx) olarak indirebilir veya kopyalayabilirsiniz.
                    </p>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  {/* Başka PDF Yükle */}
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setExtractedData(null);
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Farklı PDF Yükle</span>
                  </button>

                  {/* Panoya Kopyala */}
                  <button
                    type="button"
                    onClick={handleCopyClipboard}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    title="Excel veya e-tabloya yapıştırmak için panoya kopyala"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-blue-800" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Kopyalandı!' : 'Panoya Kopyala'}</span>
                  </button>

                  {/* Banka Hareketleri Tablosuna Aktar (Eğer handler varsa) */}
                  {onImportRows && (
                    <button
                      type="button"
                      onClick={handleImportToTable}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      title="Bu satırları Banka Hareketleri tablosuna aktar"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>{importSuccess ? 'Aktarıldı!' : 'Tabloya Aktar'}</span>
                    </button>
                  )}

                  {/* ANA BUTON: EXCEL (.XLSX) İNDİR */}
                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>{downloadSuccess ? '✓ İndirildi!' : 'EXCEL (.XLSX) İNDİR'}</span>
                  </button>
                </div>
              </div>

              {/* Arama Filtresi */}
              <div className="flex items-center justify-between gap-3 bg-[#141d33] p-3 rounded-xl border border-white/10">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Çıkarılan tablodaki verileri filtrele..."
                    className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs font-mono text-emerald-400">
                  {filteredPreviewRows.length} / {extractedData.rows.length} Satır Gösteriliyor
                </div>
              </div>

              {/* CANLI TABLO ÖNİZLEME KUTUSU (ARKA FON BEYAZ, SÜTUN VE SATIRLAR KORUNMUŞ) */}
              <div className="rounded-2xl border-2 border-emerald-600 bg-white shadow-2xl overflow-hidden text-slate-800">
                <div className="max-h-[50vh] overflow-auto">
                  <table className="w-full text-left border-collapse bg-white text-xs">
                    <thead className="sticky top-0 z-20 bg-emerald-700 text-white shadow-md">
                      <tr>
                        <th className="px-3 py-3 w-12 text-center font-mono font-bold border-r border-emerald-600 text-emerald-200">
                          #
                        </th>
                        {extractedData.headers.map((hdr, hIdx) => (
                          <th
                            key={hIdx}
                            className="px-4 py-3 font-black uppercase tracking-wider border-r border-emerald-600 whitespace-nowrap"
                          >
                            {hdr || `Sütun ${hIdx + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredPreviewRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={extractedData.headers.length + 1}
                            className="px-6 py-8 text-center text-slate-500 italic"
                          >
                            Eşleşen satır bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewRows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="hover:bg-emerald-50/60 transition-colors odd:bg-white even:bg-slate-50"
                          >
                            <td className="px-3 py-2.5 text-center font-mono text-[11px] font-bold text-slate-600 border-r border-slate-200 bg-slate-100">
                              {rIdx + 1}
                            </td>
                            {extractedData.headers.map((_, cIdx) => {
                              const cell = row[cIdx];
                              const isNum = typeof cell === 'number';
                              return (
                                <td
                                  key={cIdx}
                                  className={`px-4 py-2.5 border-r border-slate-200 text-slate-800 font-medium ${
                                    isNum ? 'text-right font-mono font-semibold text-emerald-800' : 'text-left'
                                  }`}
                                >
                                  {cell !== undefined && cell !== null && cell !== '' ? (
                                    isNum ? (
                                      cell.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
                                    ) : (
                                      String(cell)
                                    )
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Alt Çubuğu */}
        <div className="bg-[#090e1c] px-6 py-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Microsoft Excel (.xlsx) Tam Uyumlu Çıktı</span>
          </div>

          <div className="flex items-center gap-3">
            {extractedData && (
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="px-4 py-1.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel İndir</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
