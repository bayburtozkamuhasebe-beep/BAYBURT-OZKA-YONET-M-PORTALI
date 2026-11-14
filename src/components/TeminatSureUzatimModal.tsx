import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar,
  Clock,
  Building2,
  FileText,
  Printer,
  Copy,
  Download,
  Check,
  Sparkles,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  FileCheck2,
  Share2,
  RefreshCw,
  FileDown,
  Loader2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { FirmaTeminatRecord } from '../lib/supabase';
import { OzkaLogo } from './OzkaLogo';

// 1. Çok satırlı sola yaslı metin sarma (Canvas)
function wrapCanvasTextLeft(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line ? `${line} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.textAlign = 'left';
      ctx.fillText(line.trim(), x, currentY);
      line = words[n];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.textAlign = 'left';
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

// 2. Çok satırlı ortalanmış metin sarma (İmza / Muhatap kutusu vb. için - Asla taşmaz)
function wrapCanvasTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;
  const lines: string[] = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line ? `${line} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line);
      line = words[n];
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);

  ctx.textAlign = 'center';
  for (const l of lines) {
    ctx.fillText(l.trim(), centerX, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

// 3. İki yana yaslı satır çizimi
function renderJustifiedLine(
  ctx: CanvasRenderingContext2D,
  words: string[],
  x: number,
  y: number,
  targetWidth: number
) {
  if (words.length <= 1) {
    ctx.textAlign = 'left';
    ctx.fillText(words[0] || '', x, y);
    return;
  }

  let totalWordsWidth = 0;
  for (const w of words) {
    totalWordsWidth += ctx.measureText(w).width;
  }

  const spaceRemaining = targetWidth - totalWordsWidth;
  const spacePerGap = Math.max(0, spaceRemaining / (words.length - 1));

  ctx.textAlign = 'left';
  let curX = x;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    ctx.fillText(w, curX, y);
    curX += ctx.measureText(w).width + spacePerGap;
  }
}

// 4. İki yana yaslı paragraf sarma ("SAYFAYA YASIN" - Justified Canvas Text)
function wrapCanvasJustifiedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  indent: number = 0
): number {
  const rawWords = text.trim().split(/\s+/);
  let currentY = y;
  let lineWords: string[] = [];
  let isFirstLine = true;

  for (let i = 0; i < rawWords.length; i++) {
    const word = rawWords[i];
    const testWords = [...lineWords, word];
    const testLine = testWords.join(' ');
    const lineIndent = isFirstLine ? indent : 0;
    const availableWidth = maxWidth - lineIndent;

    if (ctx.measureText(testLine).width > availableWidth && lineWords.length > 0) {
      renderJustifiedLine(ctx, lineWords, x + lineIndent, currentY, availableWidth);
      lineWords = [word];
      currentY += lineHeight;
      isFirstLine = false;
    } else {
      lineWords.push(word);
    }
  }

  // Son satır sola yaslı olarak çizilir
  if (lineWords.length > 0) {
    const lineIndent = isFirstLine ? indent : 0;
    ctx.textAlign = 'left';
    ctx.fillText(lineWords.join(' '), x + lineIndent, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

// Dilekçeyi HTML5 2D Canvas üzerinde tam A4 sayfa oranında çizer (100% Türkçe karakter destekli)
function renderDilekceToCanvas(
  teminat: FirmaTeminatRecord,
  params: {
    firmaUnvani: string;
    dilekceTarihi: string;
    sayiNo: string;
    bankaSube: string;
    hesapNo: string;
    yeniVadeTarihi: string;
    finalGerekce: string;
    yetkiliAdSoyad: string;
    yetkiliUnvan: string;
    formatTRY: (amount?: number | null) => string;
    formatDateTR: (dateStr?: string | null) => string;
  }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  // Standart A4 300 DPI Oranı: 1600 x 2262 (Kusursuz A4 en/boy oranı: 1 : 1.41375)
  canvas.width = 1600;
  canvas.height = 2262;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Zemin: Saf Beyaz A4 Sayfa
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const paddingX = 135;
  const contentWidth = canvas.width - paddingX * 2; // 1330 px
  const topY = 130;

  // 2. ÜST BÖLÜM: TARİH & SAYI BÖLÜMÜ YAZI ALTINDA KALMASIN!
  // Sağ tarafta net Tarih & Sayı bloğu (ayrılmış genişlik: 420px, sağa dayalı)
  const dateColWidth = 420;
  const firmaColWidth = contentWidth - dateColWidth - 40; // ~870 px

  // Firma Ünvanı ve Faaliyet Alanı (Sol Taraf)
  // ÜNVAN KISMI SAYFA DIŞINA TAŞMASIN ALTA KAYDIRSIN!
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px "Plus Jakarta Sans", Arial, sans-serif';
  const firmaEndY = wrapCanvasTextLeft(
    ctx,
    params.firmaUnvani.toUpperCase(),
    paddingX,
    topY,
    firmaColWidth,
    34
  );

  ctx.fillStyle = '#64748b';
  ctx.font = '16px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('İnşaat, Taahhüt, Proje Yönetimi ve Finansman', paddingX, firmaEndY + 6);
  const leftBlockBottom = firmaEndY + 30;

  // Tarih ve Sayı (Sağ Taraf - Kesinlikle Ünvanın veya Metnin Altında Kalmaz)
  const rightX = canvas.width - paddingX;
  ctx.textAlign = 'right';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`Tarih: ${params.formatDateTR(params.dilekceTarihi)}`, rightX, topY);

  ctx.font = '17px Arial, monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText(`Sayı: ${params.sayiNo}`, rightX, topY + 30);
  const rightBlockBottom = topY + 52;

  // Ayırıcı Çizgi: Her iki tarafın en alt noktasından sonra çizilir
  let curY = Math.max(leftBlockBottom, rightBlockBottom) + 24;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(paddingX, curY);
  ctx.lineTo(canvas.width - paddingX, curY);
  ctx.stroke();

  // 3. Banka Muhatap Başlığı (T.C. & Banka Şubesi)
  curY += 55;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('T.C.', canvas.width / 2, curY);

  curY += 34;
  ctx.font = 'bold 25px Arial, sans-serif';
  // Banka Şubesi uzunsa alta kaydırsın
  curY = wrapCanvasTextCentered(
    ctx,
    params.bankaSube.toUpperCase(),
    canvas.width / 2,
    curY,
    contentWidth - 60,
    34
  );

  // 4. Konu Kutusu
  curY += 28;
  const konuTitle = `KONU: ${teminat.mektupno || '-'} No'lu Teminat Mektubumuzun Vade Süresinin Uzatılması (Vade Temdidi) Hk.`;
  ctx.font = 'bold 18px Arial, sans-serif';

  // Konu uzunluğuna göre kutu yüksekliğini otomatik hesapla
  const konuWords = konuTitle.split(/\s+/);
  let konuLine = '';
  const konuLines: string[] = [];
  for (const w of konuWords) {
    const t = konuLine ? `${konuLine} ${w}` : w;
    if (ctx.measureText(t).width > contentWidth - 48 && konuLine) {
      konuLines.push(konuLine);
      konuLine = w;
    } else {
      konuLine = t;
    }
  }
  if (konuLine) konuLines.push(konuLine);

  const konuBoxHeight = Math.max(54, konuLines.length * 28 + 24);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(paddingX, curY, contentWidth, konuBoxHeight);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(paddingX, curY, contentWidth, konuBoxHeight);

  // Sol koyu şerit
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(paddingX, curY, 6, konuBoxHeight);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  let konuY = curY + (konuLines.length === 1 ? 34 : 26);
  for (const kl of konuLines) {
    ctx.fillText(kl, paddingX + 22, konuY);
    konuY += 26;
  }
  curY += konuBoxHeight + 35;

  // 5. Giriş Paragrafı (SAYFAYA YASLANMIŞ / JUSTIFIED)
  ctx.font = '20px "Times New Roman", Times, serif';
  ctx.fillStyle = '#1e293b';
  const girisMetni = `Bankanız nezdindeki ${params.hesapNo ? `${params.hesapNo} numaralı müşteri hesabımız ve ` : ''}Genel Kredi Sözleşmemiz kapsamında, ${teminat.firmadi || 'Muhatap Kurum'} lehine tanzim edilmiş olan ve aşağıda detay dökümü yer alan teminat mektubumuzun süre uzatımı hususunu bilgilerinize arz ederiz.`;
  curY = wrapCanvasJustifiedText(ctx, girisMetni, paddingX, curY, contentWidth, 32, 45);

  // 6. Detay Tablosu (Sayfaya dengeli & ayarlanmış)
  curY += 20;
  const tableRows = [
    { label: 'Muhatap Kurum / İdare', val: teminat.firmadi || '-' },
    { label: 'Teminat Mektubu No', val: teminat.mektupno || '-' },
    { label: 'Teminat Tutarı', val: params.formatTRY(teminat.tutar) },
    { label: 'İlk Düzenlenme Tarihi', val: params.formatDateTR(teminat.tarih) },
    { label: 'Mevcut Vade Bitiş Tarihi', val: params.formatDateTR(teminat.vadetarihi), isAlert: true },
    { label: 'Talep Edilen Yeni Vade Tarihi', val: params.formatDateTR(params.yeniVadeTarihi), isHighlight: true },
  ];
  if (teminat.isinadi) {
    tableRows.push({ label: 'İşin / Sözleşmenin Adı', val: teminat.isinadi });
  }

  const rowHeight = 48;
  const col1Width = 440;

  tableRows.forEach((row, i) => {
    const rowY = curY + i * rowHeight;
    // Arka plan
    if (row.isHighlight) {
      ctx.fillStyle = '#fef3c7';
    } else if (row.isAlert) {
      ctx.fillStyle = '#fff1f2';
    } else {
      ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#ffffff';
    }
    ctx.fillRect(paddingX, rowY, contentWidth, rowHeight);

    // Çerçeve
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(paddingX, rowY, contentWidth, rowHeight);
    ctx.strokeRect(paddingX, rowY, col1Width, rowHeight);

    // Label
    ctx.fillStyle = '#1e293b';
    ctx.font = row.isHighlight ? 'bold 18px Arial, sans-serif' : 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(row.label, paddingX + 18, rowY + 31);

    // Değer (Taşmaması için sınırlandırılmış)
    ctx.font = row.isHighlight
      ? 'bold 20px Arial, sans-serif'
      : row.isAlert
      ? 'bold 18px Arial, sans-serif'
      : '17px Arial, sans-serif';
    ctx.fillStyle = row.isHighlight ? '#065f46' : row.isAlert ? '#b91c1c' : '#0f172a';
    ctx.fillText(row.val, paddingX + col1Width + 18, rowY + 31);
  });

  curY += tableRows.length * rowHeight + 35;

  // 7. Talep ve Taahhüt Paragrafları (SAYFAYA YASLANMIŞ / JUSTIFIED)
  ctx.font = '20px "Times New Roman", Times, serif';
  ctx.fillStyle = '#1e293b';
  const talepMetni = `Yürütmekte olduğumuz yukarıda bahsi geçen sözleşme ve iş kapsamında; ${params.finalGerekce} nedeniyle, mevcut teminat mektubumuzun geçerlilik süresinin ${params.formatDateTR(params.yeniVadeTarihi)} tarihine kadar uzatılmasını (vadesinin temdidini) ve düzenlenecek olan zeyilnamenin tarafımıza / muhatap idareye teslim edilmesini talep ederiz.`;
  curY = wrapCanvasJustifiedText(ctx, talepMetni, paddingX, curY, contentWidth, 32, 45);

  curY += 15;
  const taahhutMetni = `Söz konusu süre uzatımı işleminden doğacak olan her türlü banka komisyonu, masraf, BSMV ve yasal giderlerin şirketimizin vadesiz mevduat hesabından tahsil edilmesini gayrikabili rücu kabul ve taahhüt ederiz.`;
  curY = wrapCanvasJustifiedText(ctx, taahhutMetni, paddingX, curY, contentWidth, 32, 45);

  curY += 28;
  ctx.textAlign = 'right';
  ctx.font = 'bold 19px "Times New Roman", Times, serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Gereğinin yapılmasını saygılarımızla arz ederiz.', canvas.width - paddingX, curY);

  // 8. İmza ve Kaşe Kutusu (Sağ Alt)
  // ÜNVAN KISMI SAYFA DIŞINA TAŞMASIN ALTA KAYDIRSIN!
  curY += 55;
  const imzaBoxWidth = 440;
  const imzaBoxX = canvas.width - paddingX - imzaBoxWidth;
  const imzaCenter = imzaBoxX + imzaBoxWidth / 2;

  // Firma Ünvanı (İmza kutusu genişliğinde sarılır, asla sayfa dışına taşmaz)
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillStyle = '#0f172a';
  curY = wrapCanvasTextCentered(
    ctx,
    params.firmaUnvani.toUpperCase(),
    imzaCenter,
    curY,
    imzaBoxWidth - 20,
    24
  );

  curY += 6;
  ctx.font = '16px Arial, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'center';
  ctx.fillText('Yetkili İmzalar / Şirket Kaşesi', imzaCenter, curY);

  // Kesikli çizgi (İmza/Kaşe alanı)
  curY += 18;
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(imzaBoxX, curY, imzaBoxWidth, 90);
  ctx.setLineDash([]);

  ctx.font = 'italic 15px Arial, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('(Yetkili İmza / Kaşe)', imzaCenter, curY + 52);

  curY += 115;
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(params.yetkiliAdSoyad, imzaCenter, curY);

  curY += 22;
  ctx.font = '15px Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  // Yetkili ünvanı uzunsa sar
  wrapCanvasTextCentered(ctx, params.yetkiliUnvan, imzaCenter, curY, imzaBoxWidth - 20, 20);

  return canvas;
}

interface TeminatSureUzatimModalProps {
  isOpen: boolean;
  onClose: () => void;
  teminat: FirmaTeminatRecord | null;
  darkMode?: boolean;
}

export const TeminatSureUzatimModal: React.FC<TeminatSureUzatimModalProps> = ({
  isOpen,
  onClose,
  teminat,
  darkMode = true,
}) => {
  // Aktif Adım: 'select-date' (Tarih ve Parametreler) | 'preview-dilekce' (Dilekçe Önizleme & Yazdır)
  const [activeStep, setActiveStep] = useState<'select-date' | 'preview-dilekce'>('select-date');

  // Form Değerleri
  const [yeniVadeTarihi, setYeniVadeTarihi] = useState<string>('');
  const [bankaSube, setBankaSube] = useState<string>('');
  const [firmaUnvani, setFirmaUnvani] = useState<string>('BAYBURT ÖZKA İNŞAAT A.Ş.');
  const [talepNedeni, setTalepNedeni] = useState<string>(
    'Sözleşme süresinin uzatılması ve iş programı revizyonu nedeniyle'
  );
  const [ozelTalepNedeni, setOzelTalepNedeni] = useState<string>('');
  const [dilekceTarihi, setDilekceTarihi] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [sayiNo, setSayiNo] = useState<string>('');
  const [yetkiliAdSoyad, setYetkiliAdSoyad] = useState<string>('Şirket Yetkilisi');
  const [yetkiliUnvan, setYetkiliUnvan] = useState<string>('Yönetim Kurulu / Genel Müdür');
  const [hesapNo, setHesapNo] = useState<string>('');

  // Kopyalama, PDF, Word & Yazdırma Geri Bildirimleri
  const [copied, setCopied] = useState<boolean>(false);
  const [htmlCopied, setHtmlCopied] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isDownloadingWord, setIsDownloadingWord] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [wordBlobUrl, setWordBlobUrl] = useState<string | null>(null);
  const [wordFileName, setWordFileName] = useState<string>('');

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Tarihleri ve varsayılan alanları ayarla
  useEffect(() => {
    if (!teminat) return;

    // Varsayılan banka şubesi
    const bankaName = teminat.banka || 'İlgili Banka';
    setBankaSube(
      bankaName.toLowerCase().includes('şube') || bankaName.toLowerCase().includes('müdür')
        ? bankaName
        : `${bankaName} Şubesi Müdürlüğü'ne`
    );

    // Otomatik Sayı No
    setSayiNo(
      `ÖZKA-TM-${(teminat.mektupno || '000').replace(/[^a-zA-Z0-9-]/g, '')}-UZT`
    );

    // Mevcut vade tarihinden 90 gün sonrasını varsayılan olarak öner
    if (teminat.vadetarihi) {
      try {
        const cleanVade = teminat.vadetarihi.split('T')[0];
        const baseDate = new Date(cleanVade);
        if (!isNaN(baseDate.getTime())) {
          baseDate.setDate(baseDate.getDate() + 90);
          setYeniVadeTarihi(baseDate.toISOString().slice(0, 10));
        } else {
          const fallback = new Date();
          fallback.setDate(fallback.getDate() + 90);
          setYeniVadeTarihi(fallback.toISOString().slice(0, 10));
        }
      } catch {
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 90);
        setYeniVadeTarihi(fallback.toISOString().slice(0, 10));
      }
    } else {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 90);
      setYeniVadeTarihi(fallback.toISOString().slice(0, 10));
    }

    setActiveStep('select-date');
  }, [teminat]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Format currency
  const formatTRY = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '0,00 ₺';
    return (
      new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ' ₺'
    );
  };

  // Format date to DD.MM.YYYY
  const formatDateTR = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const clean = dateStr.split('T')[0];
      const p = clean.split('-');
      if (p.length === 3) {
        return `${p[2]}.${p[1]}.${p[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Hızlı Süre Ekleme Fonksiyonu
  const applyQuickDatePreset = (daysToAdd: number) => {
    if (!teminat) return;
    try {
      const baseStr = teminat.vadetarihi ? teminat.vadetarihi.split('T')[0] : '';
      let baseDate = baseStr ? new Date(baseStr) : new Date();
      if (isNaN(baseDate.getTime())) baseDate = new Date();

      baseDate.setDate(baseDate.getDate() + daysToAdd);
      setYeniVadeTarihi(baseDate.toISOString().slice(0, 10));
      showToast(`Yeni vade tarihi: +${daysToAdd} gün olarak ayarlandı (${formatDateTR(baseDate.toISOString().slice(0, 10))})`);
    } catch {
      // ignore
    }
  };

  // Yıl sonu (31 Aralık) seçeneği
  const applyYearEndPreset = () => {
    const currentYear = new Date().getFullYear();
    const yearEnd = `${currentYear}-12-31`;
    setYeniVadeTarihi(yearEnd);
    showToast(`Yeni vade: 31 Aralık ${currentYear} olarak ayarlandı.`);
  };

  // Vade Gün Farkı Hesaplama
  const dateDiffStats = useMemo(() => {
    if (!teminat || !yeniVadeTarihi) return null;
    try {
      const targetDate = new Date(yeniVadeTarihi);
      targetDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const daysFromToday = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let daysFromCurrentVade: number | null = null;
      if (teminat.vadetarihi) {
        const cur = new Date(teminat.vadetarihi.split('T')[0]);
        cur.setHours(0, 0, 0, 0);
        daysFromCurrentVade = Math.round((targetDate.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        daysFromToday,
        daysFromCurrentVade,
        isValid: daysFromToday > 0,
      };
    } catch {
      return null;
    }
  }, [teminat, yeniVadeTarihi]);

  // Nihai gerekçe metni
  const finalGerekce = talepNedeni === 'Özel Açıklama' ? ozelTalepNedeni || 'Süre uzatımı gerekçesiyle' : talepNedeni;

  // Dilekçe Metni (Düz Metin)
  const generateDilekceText = () => {
    if (!teminat) return '';
    return `Tarih: ${formatDateTR(dilekceTarihi)}
Sayı: ${sayiNo}

T.C.
${bankaSube.toUpperCase()}

Konu: ${teminat.mektupno || '-'} No'lu Teminat Mektubumuzun Vade Süresinin Uzatılması (Vade Temdidi) Talebi Hk.

Bankanız nezdindeki ${hesapNo ? `${hesapNo} numaralı hesabımız ve ` : ''}Genel Kredi Sözleşmemiz kapsamında, ${teminat.firmadi || 'Muhatap Kurum'} lehine tanzim edilmiş olan aşağıda dökümü yer alan teminat mektubunun süresinin uzatılması hususunu arz ederiz.

TEMİNAT MEKTUBU BİLGİLERİ:
• Muhatap Kurum / İdare : ${teminat.firmadi || '-'}
• Teminat Mektubu No   : ${teminat.mektupno || '-'}
• İlk Veriliş Tarihi   : ${formatDateTR(teminat.tarih)}
• Teminat Tutarı       : ${formatTRY(teminat.tutar)}
• Mevcut Vade Tarihi   : ${formatDateTR(teminat.vadetarihi)}
• Talep Edilen Yeni Vade: ${formatDateTR(yeniVadeTarihi)}
• İlgili İşin / Sözleşmenin Adı: ${teminat.isinadi || '-'}

Yürütmekte olduğumuz yukarıda adı geçen iş kapsamında; ${finalGerekce} nedeniyle, mevcut teminat mektubumuzun geçerlilik süresinin ${formatDateTR(yeniVadeTarihi)} tarihine kadar uzatılmasını (vadesinin temdidini) ve tanzim edilecek zeyilnamenin / teminat mektubu metninin tarafımıza iletilmesini arz ve talep ederiz.

Söz konusu süre uzatımı (vade temdidi) işleminden doğacak olan banka komisyon, masraf, BSMV ve yasal giderlerin şirketimizin vadesiz mevduat hesabından tahsil edilmesini gayrikabili rücu kabul ve beyan ederiz.

Gereğini saygılarımızla arz ederiz.


FİRMA KAŞESİ VE YETKİLİ İMZALAR
${firmaUnvani}
Yetkili: ${yetkiliAdSoyad} (${yetkiliUnvan})
İmza: __________________________
`;
  };

  // Panoya Kopyalama
  const handleCopyText = async () => {
    try {
      const text = generateDilekceText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('Banka süre uzatım dilekçesi panoya kopyalandı.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Kopyalama başarısız oldu.');
    }
  };

  // Yazdır / PDF Olarak Kaydet (Print)
  const handlePrint = () => {
    window.print();
  };

  // Dilekçeyi Doğrudan PDF Dosyası Olarak İndir (Native Canvas 2D + jsPDF)
  const handleDownloadPDF = async () => {
    if (!teminat) return;
    setIsGeneratingPdf(true);
    showToast('Dilekçe PDF dosyası hazırlanıyor, lütfen bekleyiniz...');

    try {
      // 1. Off-screen 2D Canvas ile yüksek kaliteli (300 DPI) dilekçe çiz
      const canvas = renderDilekceToCanvas(teminat, {
        firmaUnvani,
        dilekceTarihi,
        sayiNo,
        bankaSube,
        hesapNo,
        yeniVadeTarihi,
        finalGerekce,
        yetkiliAdSoyad,
        yetkiliUnvan,
        formatTRY,
        formatDateTR,
      });

      // 2. Yüksek kaliteli JPEG data URL al
      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      // 3. Standart A4 (210mm x 297mm) jsPDF dokümanı hazırla
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);

      const cleanMektupNo = (teminat.mektupno || 'Teminat').replace(/[^a-zA-Z0-9-]/g, '_');
      const targetFileName = `Banka_Sure_Uzatim_Dilekcesi_${cleanMektupNo}.pdf`;
      setPdfFileName(targetFileName);

      // 4. Blob ve Object URL oluştur (İframe kısıtlamalarına karşı direct link)
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfBlobUrl(blobUrl);

      // 5. Otomatik indirme tetikle (HTML5 anchor click)
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = targetFileName;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      setTimeout(() => {
        if (document.body.contains(downloadLink)) {
          document.body.removeChild(downloadLink);
        }
      }, 2000);

      // 6. jsPDF yerel save desteği ile de destekle
      try {
        pdf.save(targetFileName);
      } catch {
        // tarayıcı bazlı kısıtlamada blob URL devrede
      }

      showToast('Banka Süre Uzatım Dilekçesi PDF olarak başarıyla indirildi.');
    } catch (err) {
      console.error('PDF oluşturma hatası:', err);
      showToast('PDF oluşturulamadı, alternatif olarak yazıcı penceresi açılıyor...');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Word HTML Şablon Üretici (Tam A4 standartlarında ve iki yana yaslı)
  const generateDilekceHtml = () => {
    if (!teminat) return '';
    return `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Sure_Uzatim_Dilekcesi_${(teminat.mektupno || 'Teminat').replace(/[^a-zA-Z0-9-]/g, '_')}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 25mm 20mm 20mm 25mm;
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-paper-source: 0;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000000;
          }
          .header-table { width: 100%; border: none; margin-bottom: 20px; }
          .header-table td { border: none; padding: 0; vertical-align: top; }
          .title { text-align: center; font-weight: bold; font-size: 14pt; margin: 25px 0 15px 0; font-family: Arial, sans-serif; }
          .subject { font-weight: bold; margin-bottom: 20px; font-size: 11pt; font-family: Arial, sans-serif; }
          .info-table { width: 100%; border-collapse: collapse; margin: 15px 0 20px 0; font-family: Arial, sans-serif; }
          .info-table th, .info-table td { border: 1px solid #333333; padding: 7px 10px; font-size: 11pt; text-align: left; }
          .info-table th { background-color: #f2f2f2; width: 38%; font-weight: bold; }
          .content { text-align: justify; text-indent: 30px; margin-bottom: 14px; }
          .signatures { width: 100%; margin-top: 45px; border: none; }
          .signatures td { border: none; vertical-align: top; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 60%; font-size: 13pt; font-weight: bold; font-family: Arial, sans-serif;">
              ${firmaUnvani}<br/>
              <span style="font-size: 10pt; font-weight: normal; color: #555555;">İnşaat, Taahhüt, Proje Yönetimi ve Finansman</span>
            </td>
            <td style="width: 40%; text-align: right; font-size: 11pt; font-family: Arial, sans-serif;">
              <strong>Tarih:</strong> ${formatDateTR(dilekceTarihi)}<br/>
              <strong>Sayı:</strong> ${sayiNo}
            </td>
          </tr>
        </table>

        <div style="border-bottom: 2px solid #000000; margin-bottom: 25px;"></div>

        <div class="title">
          T.C.<br/>
          ${bankaSube.toUpperCase()}
        </div>

        <div class="subject">
          <strong>KONU:</strong> ${teminat.mektupno || '-'} No'lu Teminat Mektubumuzun Vade Süresinin Uzatılması (Vade Temdidi) Hk.
        </div>

        <p class="content">
          Bankanız nezdindeki ${hesapNo ? `${hesapNo} numaralı müşteri hesabımız ve ` : ''}Genel Kredi Sözleşmemiz kapsamında, <strong>${teminat.firmadi || 'Muhatap Kurum'}</strong> lehine tanzim edilmiş olan ve aşağıda detay dökümü yer alan teminat mektubumuzun süre uzatımı hususunu bilgilerinize arz ederiz.
        </p>

        <table class="info-table">
          <tr><th>Muhatap Kurum / İdare:</th><td>${teminat.firmadi || '-'}</td></tr>
          <tr><th>Teminat Mektubu No:</th><td>${teminat.mektupno || '-'}</td></tr>
          <tr><th>İlk Düzenlenme Tarihi:</th><td>${formatDateTR(teminat.tarih)}</td></tr>
          <tr><th>Teminat Tutarı:</th><td>${formatTRY(teminat.tutar)}</td></tr>
          <tr><th>Mevcut Vade Bitiş Tarihi:</th><td>${formatDateTR(teminat.vadetarihi)}</td></tr>
          <tr><th>Talep Edilen Yeni Vade Tarihi:</th><td><strong>${formatDateTR(yeniVadeTarihi)}</strong></td></tr>
          ${teminat.isinadi ? `<tr><th>İşin / Sözleşmenin Adı:</th><td>${teminat.isinadi}</td></tr>` : ''}
        </table>

        <p class="content">
          Yürütmekte olduğumuz yukarıda adı geçen iş kapsamında; <em>${finalGerekce}</em> nedeniyle, mevcut teminat mektubumuzun geçerlilik süresinin <strong>${formatDateTR(yeniVadeTarihi)}</strong> tarihine kadar uzatılmasını (vadesinin temdidini) ve tanzim edilecek zeyilnamenin tarafımıza / muhatap idareye iletilmesini talep ederiz.
        </p>

        <p class="content">
          Söz konusu süre uzatımı işleminden doğacak olan banka komisyon, masraf, BSMV ve yasal giderlerin şirketimizin vadesiz mevduat hesabından tahsil edilmesini kabul ve taahhüt ederiz.
        </p>

        <p style="text-align: right; font-weight: bold; margin: 30px 0;">
          Gereğinin yapılmasını saygılarımızla arz ederiz.
        </p>

        <table class="signatures">
          <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%; text-align: center; font-family: Arial, sans-serif;">
              <strong>${firmaUnvani}</strong><br/>
              <span style="font-size: 10pt; color: #555;">Yetkili İmzalar / Şirket Kaşesi</span><br/><br/>
              <div style="border: 1px dashed #999; height: 65px; line-height: 65px; font-size: 9pt; color: #888; margin: 10px 0;">
                (Yetkili İmza / Kaşe)
              </div>
              <strong>${yetkiliAdSoyad}</strong><br/>
              <span style="font-size: 10pt; color: #555;">${yetkiliUnvan}</span>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  };

  // Word İçin Zengin HTML Formatında Panoya Kopyalama (İndirme engellerine karşı %100 garantili çözüm)
  const handleCopyForWord = async () => {
    try {
      const dilekceHtml = generateDilekceHtml();
      const plainText = generateDilekceText();

      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([dilekceHtml], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      setHtmlCopied(true);
      showToast('Dilekçe Word biçimiyle panoya kopyalandı! Word programını açıp Ctrl+V ile yapıştırabilirsiniz.');
      setTimeout(() => setHtmlCopied(false), 3500);
    } catch {
      handleCopyText();
    }
  };

  // Word (.doc) Dosyası Olarak İndir (İframe kısıtlamalarına karşı çoklu yöntem)
  const handleDownloadWord = async () => {
    if (!teminat) return;
    setIsDownloadingWord(true);
    const dilekceHtml = generateDilekceHtml();
    const cleanMektupNo = (teminat.mektupno || 'Teminat').replace(/[^a-zA-Z0-9-]/g, '_');
    const targetFileName = `Banka_Sure_Uzatim_Dilekcesi_${cleanMektupNo}.doc`;

    setWordFileName(targetFileName);

    try {
      // 1. Sunucu API üzerinden doğrudan attachment indirme (Tarayıcının iframe sandbox blob engellerini aşar)
      try {
        const response = await fetch('/api/download-word', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            html: dilekceHtml,
            fileName: targetFileName,
          }),
        });

        if (response.ok) {
          const fileBlob = await response.blob();
          const serverUrl = URL.createObjectURL(fileBlob);
          setWordBlobUrl(serverUrl);

          const link = document.createElement('a');
          link.href = serverUrl;
          link.download = targetFileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (document.body.contains(link)) document.body.removeChild(link);
          }, 1500);
          showToast('Word belgesi indirildi.');
          setIsDownloadingWord(false);
          return;
        }
      } catch (apiErr) {
        console.warn('API indirme fallback:', apiErr);
      }

      // 2. Yedek: Doğrudan Client-side Blob URL (ASLA hemen iptal edilmez, 2 dakika açık tutulur)
      const blob = new Blob(['\uFEFF' + dilekceHtml], { type: 'application/msword;charset=utf-8' });
      const clientUrl = URL.createObjectURL(blob);
      setWordBlobUrl(clientUrl);

      const link = document.createElement('a');
      link.href = clientUrl;
      link.download = targetFileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 1500);

      showToast('Word (.doc) dilekçe dosyası hazırlandı.');
    } catch (err) {
      console.error('Word indirme hatası:', err);
      showToast('İndirme tarayıcınız tarafından engellendiyse ekrandaki indirme bağlantısını veya Word Kopyala butonunu kullanabilirsiniz.');
    } finally {
      setIsDownloadingWord(false);
    }
  };

  if (!isOpen || !teminat) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`w-full max-w-4xl max-h-[94vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
            darkMode
              ? 'bg-[#0d131f] border-amber-500/40 text-slate-100 shadow-amber-500/10'
              : 'bg-white border-amber-400 text-slate-900 shadow-xl'
          }`}
        >
          {/* ÜST BAŞLIK ŞERİDİ (MODAL HEADER) */}
          <div className="px-5 sm:px-7 py-4 border-b border-white/10 bg-gradient-to-r from-amber-600/20 via-orange-600/15 to-transparent flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30 shrink-0">
                <FileText className="w-5 h-5 text-slate-950" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black tracking-tight uppercase text-amber-300">
                    TEMİNAT MEKTUBU SÜRE UZATIM TALEBİ
                  </h2>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                    No: {teminat.mektupno || '-'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  Banka Vade Temdidi Talebi • İlgili Bankaya Otomatik Süre Uzatım Dilekçesi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Adım Değiştirme Butonu */}
              <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveStep('select-date')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeStep === 'select-date'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">1. Süre Seçimi</span>
                  <span className="sm:hidden">1. Süre</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep('preview-dilekce')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeStep === 'preview-dilekce'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">2. Dilekçe Önizleme</span>
                  <span className="sm:hidden">2. Dilekçe</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/40 transition-colors cursor-pointer"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TOAST BİLDİRİMİ */}
          <AnimatePresence>
            {toastMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mx-6 mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-200 flex items-center gap-2 shadow-lg backdrop-blur-md"
              >
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">{toastMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MODAL GÖVDE ALANI */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* ADIM 1: SÜRE UZATIMI TARİHİ VE PARAMETRELER */}
            {activeStep === 'select-date' && (
              <div className="space-y-6">
                {/* 1. KART: MEVCUT TEMİNAT MEKTUBU ÖZETİ */}
                <div className="rounded-2xl p-4 sm:p-5 border border-white/10 bg-white/[0.03] backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Seçilen Teminat Mektubu Bilgileri
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      {teminat.banka || 'Banka Belirtilmedi'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Mektup No</p>
                      <p className="text-sm font-mono font-black text-cyan-300 mt-0.5">
                        {teminat.mektupno || '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Muhatap Firma / Kurum</p>
                      <p className="text-xs font-bold text-white mt-0.5 truncate" title={teminat.firmadi || ''}>
                        {teminat.firmadi || '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Mevcut Vade Tarihi</p>
                      <p className="text-sm font-bold text-amber-300 mt-0.5">
                        {formatDateTR(teminat.vadetarihi)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Mektup Tutarı</p>
                      <p className="text-sm font-mono font-black text-emerald-400 mt-0.5">
                        {formatTRY(teminat.tutar)}
                      </p>
                    </div>
                  </div>

                  {teminat.isinadi && (
                    <div className="mt-3 pt-2.5 border-t border-white/5 text-xs flex items-start gap-1.5 text-slate-300">
                      <span className="text-slate-400 font-semibold shrink-0">İşin Adı:</span>
                      <span className="truncate" title={teminat.isinadi}>{teminat.isinadi}</span>
                    </div>
                  )}
                </div>

                {/* 2. KART: YENİ VADE VE SÜRE UZATIMI TARİHİ SEÇİMİ */}
                <div className="rounded-2xl p-5 border border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-orange-950/20 shadow-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        Süre Uzatımı Tarihi Seçin (Yeni Vade)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Mektubun uzatılacağı yeni vade bitiş tarihini belirleyin
                      </p>
                    </div>
                  </div>

                  {/* Hızlı Önayar Butonları (Chips) */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-2">
                      Hızlı Süre Seçenekleri:
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyQuickDatePreset(30)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer active:scale-95"
                      >
                        +30 Gün (1 Ay)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickDatePreset(60)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer active:scale-95"
                      >
                        +60 Gün (2 Ay)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickDatePreset(90)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm transition-all cursor-pointer active:scale-95"
                      >
                        ⚡ +90 Gün (3 Ay - Önerilen)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickDatePreset(180)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer active:scale-95"
                      >
                        +180 Gün (6 Ay)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickDatePreset(365)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer active:scale-95"
                      >
                        +1 Yıl (365 Gün)
                      </button>
                      <button
                        type="button"
                        onClick={applyYearEndPreset}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-300 border border-white/10 hover:border-cyan-400/40 transition-all cursor-pointer active:scale-95"
                      >
                        📅 Yıl Sonu (31 Aralık)
                      </button>
                    </div>
                  </div>

                  {/* Tarih Giriş Alanı & Hesaplama Bilgisi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-xs font-bold text-amber-300 mb-1.5">
                        Talep Edilen Yeni Vade Bitiş Tarihi: *
                      </label>
                      <input
                        type="date"
                        value={yeniVadeTarihi}
                        onChange={(e) => setYeniVadeTarihi(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-amber-500/50 text-white font-mono font-bold text-sm focus:border-amber-400 outline-none transition-colors shadow-inner"
                      />
                    </div>

                    {dateDiffStats && (
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Yeni Vade Tarihi:</span>
                          <span className="font-bold text-white font-mono">
                            {formatDateTR(yeniVadeTarihi)}
                          </span>
                        </div>
                        {dateDiffStats.daysFromCurrentVade !== null && (
                          <div className="flex items-center justify-between text-amber-300">
                            <span>Mevcut Vadeden Fark:</span>
                            <span className="font-bold font-mono">
                              {dateDiffStats.daysFromCurrentVade > 0 ? `+${dateDiffStats.daysFromCurrentVade} gün` : `${dateDiffStats.daysFromCurrentVade} gün`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-cyan-300">
                          <span>Bugünden İtibaren Kalan:</span>
                          <span className="font-bold font-mono">
                            {dateDiffStats.daysFromToday > 0 ? `${dateDiffStats.daysFromToday} gün` : 'Vade Geçmiş!'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. KART: DİLEKÇE METNİ VE FİRMA PARAMETRELERİ */}
                <div className="rounded-2xl p-5 border border-white/10 bg-white/[0.03] space-y-4">
                  <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    Banka Dilekçesi Özelleştirme Alanları
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                        Banka Şubesi Başlığı:
                      </label>
                      <input
                        type="text"
                        value={bankaSube}
                        onChange={(e) => setBankaSube(e.target.value)}
                        placeholder="Örn: Ziraat Bankası Bayburt Şubesi Müdürlüğü'ne"
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                        Talep Eden Firma Ünvanı:
                      </label>
                      <input
                        type="text"
                        value={firmaUnvani}
                        onChange={(e) => setFirmaUnvani(e.target.value)}
                        placeholder="BAYBURT ÖZKA İNŞAAT A.Ş."
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                        Süre Uzatım Nedeni / Gerekçesi:
                      </label>
                      <select
                        value={talepNedeni}
                        onChange={(e) => setTalepNedeni(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="Sözleşme süresinin uzatılması ve iş programı revizyonu nedeniyle">
                          Sözleşme süresinin uzatılması ve iş programı revizyonu nedeniyle
                        </option>
                        <option value="İdarenin ek süre onayı ve işin devamı nedeniyle">
                          İdarenin ek süre onayı ve işin devamı nedeniyle
                        </option>
                        <option value="Hakediş ve geçici kabul işlemlerinin devam etmesi nedeniyle">
                          Hakediş ve geçici kabul işlemlerinin devam etmesi nedeniyle
                        </option>
                        <option value="Kesin kabul ve teminat iade sürecinin tamamlanması amacıyla">
                          Kesin kabul ve teminat iade sürecinin tamamlanması amacıyla
                        </option>
                        <option value="Özel Açıklama">Özel Açıklama Gir</option>
                      </select>
                      {talepNedeni === 'Özel Açıklama' && (
                        <input
                          type="text"
                          value={ozelTalepNedeni}
                          onChange={(e) => setOzelTalepNedeni(e.target.value)}
                          placeholder="Özel süre uzatım gerekçesini yazınız..."
                          className="w-full mt-2 px-3 py-2 rounded-xl bg-black/40 border border-amber-500/40 text-white outline-none"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                        Dilekçe Tarihi & Sayı No:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={dilekceTarihi}
                          onChange={(e) => setDilekceTarihi(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none"
                        />
                        <input
                          type="text"
                          value={sayiNo}
                          onChange={(e) => setSayiNo(e.target.value)}
                          placeholder="Sayı No"
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* İLERLEME VE DİLEKÇE OLUŞTUR BUTONU */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                  >
                    Vazgeç
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStep('preview-dilekce')}
                    className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-xl shadow-amber-500/25 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Dilekçeyi Oluştur ve Önizle</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ADIM 2: DİLEKÇE ÖNİZLEME, YAZDIR VE İNDİR */}
            {activeStep === 'preview-dilekce' && (
              <div className="space-y-4">
                {/* Aksiyon Araç Çubuğu */}
                <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep('select-date')}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>← Tarih Değiştir</span>
                    </button>
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      Yeni Vade: <strong className="text-amber-300 font-mono">{formatDateTR(yeniVadeTarihi)}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCopyForWord}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      title="Dilekçeyi Word biçimlendirmesiyle panoya kopyalar (Word'de Ctrl+V ile doğrudan yapıştırabilirsiniz)"
                    >
                      {htmlCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                      <span>{htmlCopied ? 'Word Biçimi Kopyalandı!' : "Word'e Yapıştırmak İçin Kopyala"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadWord}
                      disabled={isDownloadingWord}
                      className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                      title="Süre uzatım dilekçesini Word belgesi (.doc) olarak indir"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isDownloadingWord ? 'İndiriliyor...' : 'Word Belgesi İndir (.doc)'}</span>
                    </button>
                  </div>
                </div>

                {/* İndirme Engellenirse Doğrudan İndirme Bağlantısı */}
                {wordBlobUrl && (
                  <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-xs text-blue-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-2.5">
                      <FileCheck2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-white">Word Belgesi Hazır!</p>
                        <p className="text-[11px] text-blue-300">Tarayıcınız otomatik indirmeyi engellediyse aşağıdaki butona tıklayarak hemen kaydedebilirsiniz:</p>
                      </div>
                    </div>
                    <a
                      href={wordBlobUrl}
                      download={wordFileName || 'Banka_Sure_Uzatim_Dilekcesi.doc'}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      <span>Dosyayı Kaydet ({wordFileName || 'Dilekce.doc'})</span>
                    </a>
                  </div>
                )}

                {/* RESMİ DİLEKÇE A4 ÖNİZLEME SAYFASI */}
                <div
                  ref={printAreaRef}
                  id="banka-dilekce-print-area"
                  className="bg-white text-slate-900 rounded-2xl p-6 sm:p-12 shadow-2xl border border-slate-300 text-xs sm:text-sm font-serif leading-relaxed max-w-3xl mx-auto selection:bg-amber-200"
                >
                  {/* Antet ve Tarih / Sayı (Tarih Yazı Altında Kalmasın, Ünvan Alta Kaydırsın) */}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b-2 border-slate-900 pb-4 mb-6">
                    <div className="flex-1 min-w-0 pr-2">
                      <h1 className="text-base sm:text-lg font-black tracking-wider text-slate-950 uppercase font-sans break-words leading-snug">
                        {firmaUnvani}
                      </h1>
                      <p className="text-[11px] text-slate-600 font-sans mt-0.5">
                        İnşaat, Taahhüt, Proje Yönetimi ve Finansman
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-left sm:text-right text-xs font-sans text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1 shadow-xs min-w-[170px]">
                      <p className="whitespace-nowrap font-medium"><strong>Tarih:</strong> {formatDateTR(dilekceTarihi)}</p>
                      <p className="whitespace-nowrap font-medium"><strong>Sayı:</strong> <span className="font-mono font-bold text-slate-900">{sayiNo}</span></p>
                    </div>
                  </div>

                  {/* Muhatap Başlık */}
                  <div className="text-center my-6 space-y-1">
                    <p className="font-bold tracking-widest text-xs uppercase font-sans">T.C.</p>
                    <h2 className="text-sm sm:text-base font-black uppercase text-slate-950 font-sans tracking-wide break-words max-w-xl mx-auto">
                      {bankaSube}
                    </h2>
                  </div>

                  {/* Konu Satırı */}
                  <div className="mb-6 p-2.5 rounded bg-slate-100 border-l-4 border-slate-900 font-sans text-xs break-words">
                    <strong>KONU:</strong> {teminat.mektupno || '-'} No'lu Teminat Mektubumuzun Vade Süresinin Uzatılması (Vade Temdidi) Talebi Hk.
                  </div>

                  {/* Giriş Paragrafı (Sayfaya Yaslanmış) */}
                  <p className="text-justify indent-8 mb-4 text-slate-800 leading-relaxed">
                    Bankanız nezdindeki {hesapNo ? `${hesapNo} numaralı müşteri hesabımız ve ` : ''}Genel Kredi Sözleşmemiz kapsamında, <strong>{teminat.firmadi || 'Muhatap Kurum'}</strong> lehine tanzim edilmiş olan ve aşağıda detay dökümü yer alan teminat mektubumuzun süre uzatımı hususunu bilgilerinize arz ederiz.
                  </p>

                  {/* Teminat Mektubu Detay Tablosu */}
                  <div className="my-5 overflow-hidden border border-slate-800 rounded-lg font-sans text-xs">
                    <table className="w-full border-collapse">
                      <tbody className="divide-y divide-slate-300">
                        <tr className="bg-slate-100">
                          <td className="py-2.5 px-3 font-bold text-slate-800 w-1/3 border-r border-slate-300">
                            Muhatap Kurum / İdare
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 break-words">
                            {teminat.firmadi || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-300">
                            Teminat Mektubu No
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-slate-950">
                            {teminat.mektupno || '-'}
                          </td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-300">
                            Teminat Tutarı
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-slate-950">
                            {formatTRY(teminat.tutar)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-300">
                            İlk Düzenlenme Tarihi
                          </td>
                          <td className="py-2.5 px-3 text-slate-900">
                            {formatDateTR(teminat.tarih)}
                          </td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-300">
                            Mevcut Vade Bitiş Tarihi
                          </td>
                          <td className="py-2.5 px-3 font-bold text-rose-700">
                            {formatDateTR(teminat.vadetarihi)}
                          </td>
                        </tr>
                        <tr className="bg-amber-100/70 border-t-2 border-slate-800">
                          <td className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-300">
                            Talep Edilen Yeni Vade Tarihi
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-emerald-800 text-sm">
                            {formatDateTR(yeniVadeTarihi)}
                          </td>
                        </tr>
                        {teminat.isinadi && (
                          <tr>
                            <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-300">
                              İşin / Sözleşmenin Adı
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 break-words">
                              {teminat.isinadi}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Talep ve Onay Paragrafı (Sayfaya Yaslanmış) */}
                  <p className="text-justify indent-8 mb-3 text-slate-800 leading-relaxed">
                    Yürütmekte olduğumuz yukarıda bahsi geçen sözleşme ve iş kapsamında; <em>{finalGerekce}</em> nedeniyle, mevcut teminat mektubumuzun geçerlilik süresinin <strong>{formatDateTR(yeniVadeTarihi)}</strong> tarihine kadar uzatılmasını (vadesinin temdidini) ve düzenlenecek olan zeyilnamenin tarafımıza / muhatap idareye teslim edilmesini talep ederiz.
                  </p>

                  <p className="text-justify indent-8 mb-8 text-slate-800 leading-relaxed">
                    Söz konusu süre uzatımı işleminden doğacak olan her türlü banka komisyonu, masraf, BSMV ve yasal giderlerin şirketimizin vadesiz mevduat hesabından tahsil edilmesini gayrikabili rücu kabul ve taahhüt ederiz.
                  </p>

                  <p className="text-right font-semibold text-slate-800 mb-10">
                    Gereğinin yapılmasını saygılarımızla arz ederiz.
                  </p>

                  {/* İmza ve Kaşe Alanı (Ünvan Sayfa Dışına Taşmasın Alta Kaydırsın) */}
                  <div className="flex justify-end pt-4">
                    <div className="text-center max-w-[340px] w-full font-sans">
                      <p className="font-black text-xs uppercase text-slate-950 mb-1 break-words leading-tight">
                        {firmaUnvani}
                      </p>
                      <p className="text-xs text-slate-700">Yetkili İmzalar / Şirket Kaşesi</p>
                      <div className="h-20 my-2.5 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-400 italic bg-slate-50/50">
                        (Yetkili İmza / Kaşe)
                      </div>
                      <p className="text-xs font-bold text-slate-900 break-words">{yetkiliAdSoyad}</p>
                      <p className="text-[11px] text-slate-600 break-words">{yetkiliUnvan}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ALT BAR (MODAL FOOTER) */}
          <div className="px-5 sm:px-7 py-3.5 border-t border-white/10 bg-black/40 flex items-center justify-between gap-3 text-xs">
            <div className="text-slate-400 text-[11px]">
              {activeStep === 'select-date' ? (
                <span>Tarihi seçip <strong>"Dilekçeyi Oluştur"</strong> butonuna basınız.</span>
              ) : (
                <span>Dilekçeyi <strong>Word Belgesi İndir</strong> butonuna tıklayarak doğrudan bilgisayarınıza indirebilirsiniz.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors cursor-pointer"
              >
                Kapat
              </button>

              {activeStep === 'select-date' ? (
                <button
                  type="button"
                  onClick={() => setActiveStep('preview-dilekce')}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Dilekçe Önizle</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadWord}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Word Belgesi İndir (.doc)</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
