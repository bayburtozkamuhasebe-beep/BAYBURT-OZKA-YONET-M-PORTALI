import { jsPDF } from 'jspdf';
import { MutabakatKaydi } from '../components/MutabakatPortaliScreen';

export interface MutabakatReportResult {
  doc: jsPDF;
  blob: Blob;
  fileName: string;
  totalRecords: number;
  totalGroups: number;
}

/**
 * Yuvarlatılmış dikdörtgen çizer
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill = true,
  stroke = true
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * Metni verilen genişliğe göre kırar veya tek satıra sığdırır (taşarsa üç nokta koyar)
 */
function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated ? truncated + '...' : '';
}

/**
 * Tablodaki verileri VKN/Vergi No'ya göre gruplandırarak
 * Rengarenk, Yatay (Landscape A4), 100% Türkçe ve TL uyumlu PDF Raporu üretir.
 */
export async function generateMutabakatGroupReportPdf(
  kayitlar: MutabakatKaydi[],
  options?: {
    reportTitle?: string;
    filterVergiNo?: string;
    autoDownload?: boolean;
    anaFirmaAdi?: string;
  }
): Promise<MutabakatReportResult> {
  const autoDownload = options?.autoDownload !== false;
  const reportTitle = options?.reportTitle || 'CARİ MUTABAKAT VE BAKİYE DETAY RAPORU';
  const anaFirma = (options?.anaFirmaAdi || 'ÖZKA İNŞAAT A.Ş.').trim().toUpperCase();

  // Yazı tiplerinin hazır olmasını bekle
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // devam et
    }
  }

  // 1. Vergi No'ya Göre Gruplandırma
  const groupsMap = new Map<string, MutabakatKaydi[]>();
  kayitlar.forEach((item) => {
    const rawVkn = (item.vergiNo || item.vergino || '').trim();
    const vknKey = rawVkn ? rawVkn : 'BELİRTİLMEMİŞ (VKN YOK)';
    if (!groupsMap.has(vknKey)) {
      groupsMap.set(vknKey, []);
    }
    groupsMap.get(vknKey)!.push(item);
  });

  const groupKeys = Array.from(groupsMap.keys());

  // Genel Toplamlar
  let genelToplamBorc = 0;
  let genelToplamAlacak = 0;
  kayitlar.forEach((k) => {
    const tutar = Number(k.tutar) || 0;
    if (k.borcAlacakTipi === 'ALACAK') {
      genelToplamAlacak += tutar;
    } else {
      genelToplamBorc += tutar;
    }
  });
  const genelNet = genelToplamBorc - genelToplamAlacak;

  // A4 Yatay Boyutları: 297mm x 210mm
  // 200 DPI Çözünürlük: Genişlik 2339 px, Yükseklik 1654 px
  const CANVAS_WIDTH = 2339;
  const CANVAS_HEIGHT = 1654;
  const LEFT_MARGIN = 80;
  const RIGHT_MARGIN = CANVAS_WIDTH - 80;
  const CONTENT_WIDTH = RIGHT_MARGIN - LEFT_MARGIN; // 2179 px
  const MAX_PAGE_Y = 1500;

  // Sütun Genişlikleri (Toplam = 2179 px)
  // Kullanıcı Talebi: Tür sütununu daralt, E-Posta alanını gizle, diğer verileri büyüt net görünsün
  const COL_WIDTHS = {
    no: 54,
    anafirma: 280,
    vkn: 190,
    firma: 560,
    tip: 75,
    tutar: 290,
    aciklama: 390,
    durum: 180,
    tarih: 160,
  };

  const pagesCanvases: HTMLCanvasElement[] = [];

  const createNewPageCanvas = (): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
    const c = document.createElement('canvas');
    c.width = CANVAS_WIDTH;
    c.height = CANVAS_HEIGHT;
    const cx = c.getContext('2d')!;
    // Arka planı beyaz yap
    cx.fillStyle = '#FFFFFF';
    cx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    pagesCanvases.push(c);
    return { canvas: c, ctx: cx };
  };

  let { ctx: currentCtx } = createNewPageCanvas();
  let currentY = 0;

  // Üst renkli dekoratif şerit çiz
  const drawTopStrip = (cx: CanvasRenderingContext2D) => {
    const grad = cx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
    grad.addColorStop(0, '#6366F1'); // Indigo
    grad.addColorStop(0.35, '#0D9488'); // Teal
    grad.addColorStop(0.7, '#10B981'); // Emerald
    grad.addColorStop(1, '#0284C7'); // Sky
    cx.fillStyle = grad;
    cx.fillRect(0, 0, CANVAS_WIDTH, 14);
  };

  // Sayfa 1 Üst Antet ve Yönetici Özet Kartları
  const drawPage1Header = (cx: CanvasRenderingContext2D) => {
    drawTopStrip(cx);

    // Sol Taraf: Firma & Rapor Başlığı
    cx.fillStyle = '#0F172A';
    cx.font = 'bold 32px Arial, "Segoe UI", sans-serif';
    cx.textAlign = 'left';
    cx.fillText(anaFirma, LEFT_MARGIN, 62);

    cx.fillStyle = '#4F46E5'; // Indigo
    cx.font = 'bold 22px Arial, "Segoe UI", sans-serif';
    cx.fillText(reportTitle, LEFT_MARGIN, 96);

    cx.fillStyle = '#64748B';
    cx.font = 'normal 14px Arial, "Segoe UI", sans-serif';
    const subDesc = options?.filterVergiNo
      ? `Filtrelenen Vergi No: ${options.filterVergiNo} | VKN/TCKN Bazında Gruplandırılmış Renkli Resmi Rapor`
      : 'Tüm Kayıtlar | Vergi Kimlik Numarasına (VKN / TCKN) Göre Gruplandırılmış Resmi Cari Liste';
    cx.fillText(subDesc, LEFT_MARGIN, 122);

    // Sağ Taraf: Rapor Tarihi ve Rozetler
    const now = new Date();
    const tarihStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const saatStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    cx.textAlign = 'right';
    cx.fillStyle = '#0F172A';
    cx.font = 'bold 16px Arial, "Segoe UI", sans-serif';
    cx.fillText(`Rapor Tarihi: ${tarihStr} - ${saatStr}`, RIGHT_MARGIN, 62);

    cx.fillStyle = '#0D9488';
    cx.font = 'bold 13px Arial, "Segoe UI", sans-serif';
    cx.fillText(`Özelleştirilmiş Yatay (Landscape) Format`, RIGHT_MARGIN, 86);

    cx.fillStyle = '#64748B';
    cx.font = 'normal 12px Arial, "Segoe UI", sans-serif';
    cx.fillText(`ÖZKA Muhasebe & Mutabakat Portalı Sistemi`, RIGHT_MARGIN, 108);

    // =========================================================================
    // RENGARENK 5 ADET ÖZET KART (KPIS)
    // =========================================================================
    const cardY = 142;
    const cardHeight = 84;
    const cardGap = 18;
    const cardCount = 5;
    const cardWidth = (CONTENT_WIDTH - cardGap * (cardCount - 1)) / cardCount;

    const cardsData = [
      {
        label: 'VKN / FİRMA GRUBU',
        value: `${groupKeys.length} Grup`,
        sub: 'Ayrı Cari Tablo',
        bg: '#F5F3FF',
        border: '#C4B5FD',
        accent: '#7C3AED',
      },
      {
        label: 'TOPLAM KAYIT',
        value: `${kayitlar.length} Adet`,
        sub: 'Listelenen Mutabakat',
        bg: '#F0F9FF',
        border: '#BAE6FD',
        accent: '#0284C7',
      },
      {
        label: 'TOPLAM BORÇ',
        value: `${genelToplamBorc.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`,
        sub: 'Borç Bakiyesi',
        bg: '#FFF1F2',
        border: '#FECDD3',
        accent: '#E11D48',
      },
      {
        label: 'TOPLAM ALACAK',
        value: `${genelToplamAlacak.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`,
        sub: 'Alacak Bakiyesi',
        bg: '#F0FDF4',
        border: '#BBF7D0',
        accent: '#16A34A',
      },
      {
        label: 'GENEL NET BAKİYE',
        value: `${Math.abs(genelNet).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`,
        sub: genelNet >= 0 ? '(ÖZKA LEHİNE BORÇ)' : '(ALACAK BAKİYESİ)',
        bg: '#F0FDFA',
        border: '#99F6E4',
        accent: '#0D9488',
      },
    ];

    cardsData.forEach((card, idx) => {
      const cxPos = LEFT_MARGIN + idx * (cardWidth + cardGap);
      cx.fillStyle = card.bg;
      cx.strokeStyle = card.border;
      cx.lineWidth = 1.5;
      drawRoundedRect(cx, cxPos, cardY, cardWidth, cardHeight, 10, true, true);

      // Sol vurgulayıcı dikey çizgi
      cx.fillStyle = card.accent;
      cx.fillRect(cxPos, cardY + 8, 4, cardHeight - 16);

      // Kart Etiketi
      cx.fillStyle = '#64748B';
      cx.font = 'bold 11px Arial, "Segoe UI", sans-serif';
      cx.textAlign = 'left';
      cx.fillText(card.label, cxPos + 16, cardY + 24);

      // Kart Değeri
      cx.fillStyle = card.accent;
      cx.font = 'black 20px Arial, "Segoe UI", sans-serif';
      cx.fillText(card.value, cxPos + 16, cardY + 52);

      // Alt Açıklama
      cx.fillStyle = '#94A3B8';
      cx.font = 'normal 11px Arial, "Segoe UI", sans-serif';
      cx.fillText(card.sub, cxPos + 16, cardY + 72);
    });

    return cardY + cardHeight + 28;
  };

  // Sonraki Sayfalar için Başlık
  const drawSubsequentPageHeader = (cx: CanvasRenderingContext2D, pageNum: number) => {
    drawTopStrip(cx);

    cx.fillStyle = '#0F172A';
    cx.font = 'bold 18px Arial, "Segoe UI", sans-serif';
    cx.textAlign = 'left';
    cx.fillText(`${anaFirma} - ${reportTitle}`, LEFT_MARGIN, 46);

    cx.fillStyle = '#64748B';
    cx.font = 'normal 12px Arial, "Segoe UI", sans-serif';
    cx.fillText(`Vergi Kimlik Numarasına (VKN / TCKN) Göre Gruplandırılmış Cari Tablolar`, LEFT_MARGIN, 66);

    cx.textAlign = 'right';
    cx.fillStyle = '#4F46E5';
    cx.font = 'bold 14px Arial, "Segoe UI", sans-serif';
    cx.fillText(`Sayfa ${pageNum}`, RIGHT_MARGIN, 46);

    // İnce ayırıcı çizgi
    cx.strokeStyle = '#E2E8F0';
    cx.lineWidth = 1;
    cx.beginPath();
    cx.moveTo(LEFT_MARGIN, 76);
    cx.lineTo(RIGHT_MARGIN, 76);
    cx.stroke();

    return 96;
  };

  currentY = drawPage1Header(currentCtx);

  // Renk Paleti (Farklı Vergi No Grupları İçin Rengarenk Banner Başlıkları)
  const groupGradients = [
    { start: '#0F766E', end: '#14B8A6', accent: '#2DD4BF', badgeBg: '#CCFBF1', badgeText: '#115E59' }, // Teal
    { start: '#4338CA', end: '#6366F1', accent: '#A5B4FC', badgeBg: '#EEF2FF', badgeText: '#3730A3' }, // Indigo
    { start: '#0369A1', end: '#0284C7', accent: '#7DD3FC', badgeBg: '#E0F2FE', badgeText: '#075985' }, // Sky
    { start: '#BE185D', end: '#EC4899', accent: '#F472B6', badgeBg: '#FCE7F3', badgeText: '#9D174D' }, // Pink
    { start: '#15803D', end: '#22C55E', accent: '#86EFAC', badgeBg: '#DCFCE7', badgeText: '#166534' }, // Emerald
    { start: '#B45309', end: '#F59E0B', accent: '#FDE68A', badgeBg: '#FEF3C7', badgeText: '#92400E' }, // Amber
  ];

  // ===========================================================================
  // HER VERGİ NO GRUBU İÇİN AYRI RENKLİ TABLO OLUŞTURMA
  // ===========================================================================
  groupKeys.forEach((vknKey, groupIndex) => {
    const itemsInGroup = groupsMap.get(vknKey)!;
    const pal = groupGradients[groupIndex % groupGradients.length];

    // Grup Toplamları
    let grupBorc = 0;
    let grupAlacak = 0;
    itemsInGroup.forEach((it) => {
      const tutar = Number(it.tutar) || 0;
      if (it.borcAlacakTipi === 'ALACAK') {
        grupAlacak += tutar;
      } else {
        grupBorc += tutar;
      }
    });
    const grupNet = grupBorc - grupAlacak;

    // Temsili Firma Adı
    const sampleFirma = itemsInGroup[0]?.firmaUnvani || 'FİRMA ÜNVANI';
    const sampleAnaFirma = itemsInGroup[0]?.anafirma || anaFirma;

    // Grup Başlığı ve Tablo için yer kontrolü (Grup başlığı + tablo başlığı + en az 1 satır + özet satırı = ~180px)
    if (currentY + 180 > MAX_PAGE_Y) {
      const newPage = createNewPageCanvas();
      currentCtx = newPage.ctx;
      currentY = drawSubsequentPageHeader(currentCtx, pagesCanvases.length);
    }

    // 1. GRUP BAŞLIĞI BANNER'I (Rengarenk ve Çok Şık)
    const groupHeaderHeight = 48;
    const bannerGrad = currentCtx.createLinearGradient(LEFT_MARGIN, 0, RIGHT_MARGIN, 0);
    bannerGrad.addColorStop(0, pal.start);
    bannerGrad.addColorStop(1, pal.end);
    currentCtx.fillStyle = bannerGrad;
    drawRoundedRect(currentCtx, LEFT_MARGIN, currentY, CONTENT_WIDTH, groupHeaderHeight, 8, true, false);

    // Sol Taraf: VKN & Firma Bilgisi
    currentCtx.fillStyle = '#FFFFFF';
    currentCtx.font = 'bold 18px Arial, "Segoe UI", sans-serif';
    currentCtx.textAlign = 'left';
    const groupTitleText = `🏢 VKN / TCKN: ${vknKey}  —  ${truncateText(currentCtx, sampleFirma, 1100)}`;
    currentCtx.fillText(groupTitleText, LEFT_MARGIN + 18, currentY + 30);

    // Sağ Taraf: Grup İçi Özet Bilgiler (Adet, Borç, Alacak)
    currentCtx.textAlign = 'right';
    currentCtx.font = 'bold 14px Arial, "Segoe UI", sans-serif';
    currentCtx.fillStyle = pal.accent;
    const groupStats = `Kayıt: ${itemsInGroup.length} Adet  |  Borç: ${grupBorc.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺  |  Alacak: ${grupAlacak.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺  |  Net: ${Math.abs(grupNet).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`;
    currentCtx.fillText(groupStats, RIGHT_MARGIN - 18, currentY + 30);

    currentY += groupHeaderHeight + 6;

    // 2. TABLO BAŞLIĞI (TABLE HEADER - E-POSTA GİZLENDİ, TÜR DARALTILDI, VERİLER BÜYÜTÜLDÜ)
    const tableHeaderHeight = 38;
    currentCtx.fillStyle = '#0F172A'; // Koyu şık başlık
    drawRoundedRect(currentCtx, LEFT_MARGIN, currentY, CONTENT_WIDTH, tableHeaderHeight, 6, true, false);

    currentCtx.fillStyle = '#FFFFFF';
    currentCtx.font = 'bold 12px Arial, "Segoe UI", sans-serif';

    let colX = LEFT_MARGIN;

    // No
    currentCtx.textAlign = 'center';
    currentCtx.fillText('NO', colX + COL_WIDTHS.no / 2, currentY + 24);
    colX += COL_WIDTHS.no;

    // Ana Firma
    currentCtx.textAlign = 'left';
    currentCtx.fillText('ANA FİRMA', colX + 12, currentY + 24);
    colX += COL_WIDTHS.anafirma;

    // Cari VKN
    currentCtx.fillText('CARİ VKN', colX + 12, currentY + 24);
    colX += COL_WIDTHS.vkn;

    // Cari Firma Ünvanı
    currentCtx.fillText('CARİ FİRMA ÜNVANI', colX + 12, currentY + 24);
    colX += COL_WIDTHS.firma;

    // Tür (Daraltılmış)
    currentCtx.textAlign = 'center';
    currentCtx.fillText('TÜR', colX + COL_WIDTHS.tip / 2, currentY + 24);
    colX += COL_WIDTHS.tip;

    // Tutar
    currentCtx.textAlign = 'right';
    currentCtx.fillText('BAKİYE TUTARI (₺)', colX + COL_WIDTHS.tutar - 14, currentY + 24);
    colX += COL_WIDTHS.tutar;

    // Açıklama
    currentCtx.textAlign = 'left';
    currentCtx.fillText('AÇIKLAMA', colX + 12, currentY + 24);
    colX += COL_WIDTHS.aciklama;

    // Durum
    currentCtx.textAlign = 'center';
    currentCtx.fillText('DURUM', colX + COL_WIDTHS.durum / 2, currentY + 24);
    colX += COL_WIDTHS.durum;

    // Tarih
    currentCtx.textAlign = 'center';
    currentCtx.fillText('TARİH', colX + COL_WIDTHS.tarih / 2, currentY + 24);

    currentY += tableHeaderHeight;

    // 3. TABLO SATIRLARI (ROWS - BÜYÜTÜLMÜŞ, NET OKUNUR METİNLER)
    const rowHeight = 42;

    itemsInGroup.forEach((item, itemIdx) => {
      // Sayfa Taşma Kontrolü
      if (currentY + rowHeight + 46 > MAX_PAGE_Y) {
        const newPage = createNewPageCanvas();
        currentCtx = newPage.ctx;
        currentY = drawSubsequentPageHeader(currentCtx, pagesCanvases.length);

        // Devam eden tablo için mini başlık ekle
        currentCtx.fillStyle = pal.start;
        drawRoundedRect(currentCtx, LEFT_MARGIN, currentY, CONTENT_WIDTH, 30, 4, true, false);
        currentCtx.fillStyle = '#FFFFFF';
        currentCtx.font = 'bold 13px Arial, "Segoe UI", sans-serif';
        currentCtx.textAlign = 'left';
        currentCtx.fillText(`(Devam) VKN: ${vknKey} - ${truncateText(currentCtx, sampleFirma, 900)}`, LEFT_MARGIN + 14, currentY + 20);
        currentY += 36;

        // Tablo başlığını tekrar çiz
        currentCtx.fillStyle = '#0F172A';
        drawRoundedRect(currentCtx, LEFT_MARGIN, currentY, CONTENT_WIDTH, tableHeaderHeight, 6, true, false);
        currentCtx.fillStyle = '#FFFFFF';
        currentCtx.font = 'bold 12px Arial, "Segoe UI", sans-serif';
        let rcX = LEFT_MARGIN;
        currentCtx.textAlign = 'center'; currentCtx.fillText('NO', rcX + COL_WIDTHS.no / 2, currentY + 24); rcX += COL_WIDTHS.no;
        currentCtx.textAlign = 'left'; currentCtx.fillText('ANA FİRMA', rcX + 12, currentY + 24); rcX += COL_WIDTHS.anafirma;
        currentCtx.fillText('CARİ VKN', rcX + 12, currentY + 24); rcX += COL_WIDTHS.vkn;
        currentCtx.fillText('CARİ FİRMA ÜNVANI', rcX + 12, currentY + 24); rcX += COL_WIDTHS.firma;
        currentCtx.textAlign = 'center'; currentCtx.fillText('TÜR', rcX + COL_WIDTHS.tip / 2, currentY + 24); rcX += COL_WIDTHS.tip;
        currentCtx.textAlign = 'right'; currentCtx.fillText('BAKİYE TUTARI (₺)', rcX + COL_WIDTHS.tutar - 14, currentY + 24); rcX += COL_WIDTHS.tutar;
        currentCtx.textAlign = 'left'; currentCtx.fillText('AÇIKLAMA', rcX + 12, currentY + 24); rcX += COL_WIDTHS.aciklama;
        currentCtx.textAlign = 'center'; currentCtx.fillText('DURUM', rcX + COL_WIDTHS.durum / 2, currentY + 24); rcX += COL_WIDTHS.durum;
        currentCtx.textAlign = 'center'; currentCtx.fillText('TARİH', rcX + COL_WIDTHS.tarih / 2, currentY + 24);
        currentY += tableHeaderHeight;
      }

      // Zebra şerit arka plan
      const isEven = itemIdx % 2 === 0;
      currentCtx.fillStyle = isEven ? '#FFFFFF' : '#F8FAFC';
      currentCtx.fillRect(LEFT_MARGIN, currentY, CONTENT_WIDTH, rowHeight);

      // İnce alt sınır çizgisi
      currentCtx.strokeStyle = '#E2E8F0';
      currentCtx.lineWidth = 1;
      currentCtx.beginPath();
      currentCtx.moveTo(LEFT_MARGIN, currentY + rowHeight);
      currentCtx.lineTo(RIGHT_MARGIN, currentY + rowHeight);
      currentCtx.stroke();

      let cellX = LEFT_MARGIN;

      // 1. Sıra No (Büyütüldü)
      currentCtx.fillStyle = '#64748B';
      currentCtx.font = 'bold 13px Arial, "Segoe UI", sans-serif';
      currentCtx.textAlign = 'center';
      currentCtx.fillText(`${itemIdx + 1}`, cellX + COL_WIDTHS.no / 2, currentY + 26);
      cellX += COL_WIDTHS.no;

      // 2. Ana Firma (Büyütüldü)
      currentCtx.fillStyle = '#0F766E';
      currentCtx.font = 'bold 13px Arial, "Segoe UI", sans-serif';
      currentCtx.textAlign = 'left';
      currentCtx.fillText(truncateText(currentCtx, item.anafirma || sampleAnaFirma, COL_WIDTHS.anafirma - 20), cellX + 12, currentY + 26);
      cellX += COL_WIDTHS.anafirma;

      // 3. Cari VKN (Büyütüldü)
      currentCtx.fillStyle = '#1E293B';
      currentCtx.font = 'bold 14px "Courier New", monospace, sans-serif';
      currentCtx.fillText(item.vergiNo || item.vergino || '-', cellX + 12, currentY + 26);
      cellX += COL_WIDTHS.vkn;

      // 4. Cari Firma Ünvanı (Büyütüldü ve Belirginleştirildi)
      currentCtx.fillStyle = '#0F172A';
      currentCtx.font = 'bold 15px Arial, "Segoe UI", sans-serif';
      currentCtx.fillText(truncateText(currentCtx, item.firmaUnvani, COL_WIDTHS.firma - 20), cellX + 12, currentY + 26);
      cellX += COL_WIDTHS.firma;

      // 5. Tür Rozeti (Daraltılmış Kompakt Rozet)
      const tip = item.borcAlacakTipi === 'ALACAK' ? 'ALACAK' : 'BORÇ';
      const tipBg = tip === 'ALACAK' ? '#CCFBF1' : '#FFE4E6';
      const tipText = tip === 'ALACAK' ? '#0F766E' : '#BE123C';
      const badgeW = 62;
      const badgeH = 24;
      const badgeX = cellX + (COL_WIDTHS.tip - badgeW) / 2;
      const badgeY = currentY + (rowHeight - badgeH) / 2;
      currentCtx.fillStyle = tipBg;
      drawRoundedRect(currentCtx, badgeX, badgeY, badgeW, badgeH, 6, true, false);
      currentCtx.fillStyle = tipText;
      currentCtx.font = 'black 11px Arial, "Segoe UI", sans-serif';
      currentCtx.textAlign = 'center';
      currentCtx.fillText(tip, badgeX + badgeW / 2, badgeY + 16);
      cellX += COL_WIDTHS.tip;

      // 6. Bakiye Tutarı (Büyük, Net ve Vurgulu Finansal Yazı Tipi)
      const numTutar = Number(item.tutar) || 0;
      currentCtx.fillStyle = tip === 'ALACAK' ? '#0F766E' : '#BE123C';
      currentCtx.font = 'bold 16px "Courier New", monospace, sans-serif';
      currentCtx.textAlign = 'right';
      currentCtx.fillText(
        `${numTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`,
        cellX + COL_WIDTHS.tutar - 14,
        currentY + 26
      );
      cellX += COL_WIDTHS.tutar;

      // 7. Açıklama (E-Posta Gizlendi, Açıklama Büyütüldü)
      currentCtx.fillStyle = '#475569';
      currentCtx.font = 'normal 13px Arial, "Segoe UI", sans-serif';
      currentCtx.textAlign = 'left';
      currentCtx.fillText(truncateText(currentCtx, item.aciklama || '-', COL_WIDTHS.aciklama - 24), cellX + 12, currentY + 26);
      cellX += COL_WIDTHS.aciklama;

      // 8. Durum Rozeti (Büyütüldü ve Net Rozet)
      const durumStr = (item.durum || 'Bekliyor').trim();
      let dBg = '#FEF3C7';
      let dText = '#B45309';
      let dBorder = '#FDE68A';

      if (durumStr === 'Gönderildi') {
        dBg = '#E0F2FE';
        dText = '#0369A1';
        dBorder = '#7DD3FC';
      } else if (durumStr === 'Onaylandı' || durumStr === 'Mutabık') {
        dBg = '#DCFCE7';
        dText = '#15803D';
        dBorder = '#86EFAC';
      } else if (durumStr === 'Onaylanmadı' || durumStr === 'İhtilaflı') {
        dBg = '#FFE4E6';
        dText = '#BE123C';
        dBorder = '#FDA4AF';
      }

      const dBadgeW = 110;
      const dBadgeH = 26;
      const dBadgeX = cellX + (COL_WIDTHS.durum - dBadgeW) / 2;
      const dBadgeY = currentY + (rowHeight - dBadgeH) / 2;

      currentCtx.fillStyle = dBg;
      currentCtx.strokeStyle = dBorder;
      currentCtx.lineWidth = 1;
      drawRoundedRect(currentCtx, dBadgeX, dBadgeY, dBadgeW, dBadgeH, 8, true, true);

      currentCtx.fillStyle = dText;
      currentCtx.font = 'bold 12px Arial, "Segoe UI", sans-serif';
      currentCtx.textAlign = 'center';
      currentCtx.fillText(durumStr, dBadgeX + dBadgeW / 2, dBadgeY + 18);
      cellX += COL_WIDTHS.durum;

      // 9. Tarih (Büyütüldü)
      const tarihVal = item.tarih ? item.tarih : '-';
      currentCtx.fillStyle = '#334155';
      currentCtx.font = 'bold 13px Arial, "Segoe UI", sans-serif';
      currentCtx.textAlign = 'center';
      currentCtx.fillText(tarihVal, cellX + COL_WIDTHS.tarih / 2, currentY + 26);

      currentY += rowHeight;
    });

    // 4. GRUP TOPLAM SATIRI (SUBTOTAL - BÜYÜTÜLDÜ)
    const subtotalHeight = 36;
    currentCtx.fillStyle = pal.badgeBg;
    currentCtx.fillRect(LEFT_MARGIN, currentY, CONTENT_WIDTH, subtotalHeight);

    currentCtx.strokeStyle = pal.start;
    currentCtx.lineWidth = 1.5;
    currentCtx.beginPath();
    currentCtx.moveTo(LEFT_MARGIN, currentY);
    currentCtx.lineTo(RIGHT_MARGIN, currentY);
    currentCtx.moveTo(LEFT_MARGIN, currentY + subtotalHeight);
    currentCtx.lineTo(RIGHT_MARGIN, currentY + subtotalHeight);
    currentCtx.stroke();

    currentCtx.fillStyle = pal.badgeText;
    currentCtx.font = 'bold 14px Arial, "Segoe UI", sans-serif';
    currentCtx.textAlign = 'left';
    currentCtx.fillText(`∑ GRUP TOPLAMI (${vknKey}) — ${itemsInGroup.length} Adet Mutabakat`, LEFT_MARGIN + 18, currentY + 24);

    currentCtx.textAlign = 'right';
    const subtotalText = `Grup Borç: ${grupBorc.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺   |   Grup Alacak: ${grupAlacak.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺   |   Grup Net Bakiye: ${Math.abs(grupNet).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ ${grupNet >= 0 ? '(Borç)' : '(Alacak)'}`;
    currentCtx.fillText(subtotalText, RIGHT_MARGIN - 18, currentY + 24);

    currentY += subtotalHeight + 26; // Bir sonraki grup için boşluk
  });

  // ===========================================================================
  // TÜM SAYFALARIN ALTINA RESMİ VE RENKLİ FOOTER ÇİZ
  // ===========================================================================
  const totalPages = pagesCanvases.length;
  pagesCanvases.forEach((pCanvas, pIndex) => {
    const cx = pCanvas.getContext('2d')!;
    const footerY = 1590;

    // Alt renkli ince çizgi
    const grad = cx.createLinearGradient(LEFT_MARGIN, 0, RIGHT_MARGIN, 0);
    grad.addColorStop(0, '#6366F1');
    grad.addColorStop(0.5, '#0D9488');
    grad.addColorStop(1, '#0284C7');
    cx.fillStyle = grad;
    cx.fillRect(LEFT_MARGIN, footerY - 14, CONTENT_WIDTH, 2);

    // Sol Taraf: Açıklama
    cx.fillStyle = '#64748B';
    cx.font = 'normal 12px Arial, "Segoe UI", sans-serif';
    cx.textAlign = 'left';
    cx.fillText(
      `${anaFirma} | Muhasebe ve Finans Departmanı | Bu rapor elektronik ortamda oluşturulmuştur.`,
      LEFT_MARGIN,
      footerY + 12
    );

    // Orta Taraf: Güvenlik Notu
    cx.textAlign = 'center';
    cx.fillStyle = '#94A3B8';
    cx.font = 'italic 11px Arial, "Segoe UI", sans-serif';
    cx.fillText('Resmi Mutabakat Özeti - Gizli ve Şirkete Özeldir', CANVAS_WIDTH / 2, footerY + 12);

    // Sağ Taraf: Sayfa No
    cx.textAlign = 'right';
    cx.fillStyle = '#0F172A';
    cx.font = 'bold 13px Arial, "Segoe UI", sans-serif';
    cx.fillText(`Sayfa ${pIndex + 1} / ${totalPages}`, RIGHT_MARGIN, footerY + 12);
  });

  // ===========================================================================
  // CANVASLARDAN YATAY (LANDSCAPE) A4 PDF DOKÜMANI OLUŞTURMA
  // ===========================================================================
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4', // 297mm x 210mm
    compress: true,
  });

  pagesCanvases.forEach((pCanvas, index) => {
    if (index > 0) {
      doc.addPage('a4', 'landscape');
    }
    const imgData = pCanvas.toDataURL('image/jpeg', 0.92);
    // A4 Yatay tam sayfa (0, 0, 297mm, 210mm)
    doc.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
  });

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const fileName = `Mutabakat_Raporu_VKN_Gruplu_${dateStr}.pdf`;

  if (autoDownload) {
    doc.save(fileName);
  }

  const blob = doc.output('blob');

  return {
    doc,
    blob,
    fileName,
    totalRecords: kayitlar.length,
    totalGroups: groupKeys.length,
  };
}
