import { jsPDF } from 'jspdf';
import { PersonelGorevRow } from '../lib/supabase';

export interface PersonelMaasPdfOptions {
  santiyeAdi: string;
  reportDate?: string;
  companyName?: string;
  autoDownload?: boolean;
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
 * Metni verilen genişliğe göre kırpar ve taşarsa üç nokta ekler
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
 * TL Para Birimi Formatlayıcı
 */
function formatTRY(amount?: number | null): string {
  const num = Number(amount) || 0;
  return (
    new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + ' ₺'
  );
}

// Görev grupları için renk paletleri (Rengarenk, şık ve canlı)
const GROUP_PALETTES = [
  {
    headerBg: '#4f46e5', // İndigo
    headerGrad: '#6366f1',
    lightBg: '#eef2ff',
    border: '#c7d2fe',
    badgeText: '#3730a3',
    textColor: '#1e1b4b',
  },
  {
    headerBg: '#059669', // Zümrüt Yeşil
    headerGrad: '#10b981',
    lightBg: '#ecfdf5',
    border: '#a7f3d0',
    badgeText: '#065f46',
    textColor: '#022c22',
  },
  {
    headerBg: '#d97706', // Kehribar / Altın
    headerGrad: '#f59e0b',
    lightBg: '#fffbeb',
    border: '#fde68a',
    badgeText: '#92400e',
    textColor: '#451a03',
  },
  {
    headerBg: '#7c3aed', // Mor
    headerGrad: '#8b5cf6',
    lightBg: '#f5f3ff',
    border: '#ddd6fe',
    badgeText: '#5b21b6',
    textColor: '#2e1065',
  },
  {
    headerBg: '#0284c7', // Gökyüzü Mavi
    headerGrad: '#0ea5e9',
    lightBg: '#f0f9ff',
    border: '#bae6fd',
    badgeText: '#075985',
    textColor: '#082f49',
  },
  {
    headerBg: '#db2777', // Pembe / Gül
    headerGrad: '#ec4899',
    lightBg: '#fdf2f8',
    border: '#fbcfe8',
    badgeText: '#9d174d',
    textColor: '#500724',
  },
  {
    headerBg: '#0d9488', // Turkuaz
    headerGrad: '#14b8a6',
    lightBg: '#f0fdfa',
    border: '#99f6e4',
    badgeText: '#115e59',
    textColor: '#042f2e',
  },
  {
    headerBg: '#ea580c', // Turuncu
    headerGrad: '#f97316',
    lightBg: '#fff7ed',
    border: '#fed7aa',
    badgeText: '#9a3412',
    textColor: '#431407',
  },
];

/**
 * Şantiyeye göre filtrelenmiş personelleri GÖREVİNE GÖRE GRUPLAYARAK,
 * Ara toplamlı ve Genel toplamlı, rengarenk ve şık bir A4 PDF belgesi üretir.
 */
export async function generateSantiyeMaasPdf(
  personeller: PersonelGorevRow[],
  options: PersonelMaasPdfOptions
): Promise<{ doc: jsPDF; fileName: string; totalSalary: number; totalCount: number }> {
  // Yazı tiplerini bekle
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // devam
    }
  }

  const santiyeAdi = (options.santiyeAdi || 'TÜM ŞANTİYELER').trim().toUpperCase();
  const companyName = options.companyName || 'BAYBURT ÖZ-KA İNŞ.İTH.İHR.TİC.LTD.ŞTİ';
  const autoDownload = options.autoDownload !== false;
  const now = new Date();
  const reportDateStr =
    options.reportDate ||
    now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' +
      now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  // 1. Göreve Göre Gruplandırma
  const groupsMap = new Map<string, PersonelGorevRow[]>();
  let grandTotalSalary = 0;

  personeller.forEach((p) => {
    const rawGorev = (p.gorevi || '').trim();
    const gorevKey = rawGorev || 'GÖREVİ BELİRTİLMEMİŞ PERSONEL';
    if (!groupsMap.has(gorevKey)) {
      groupsMap.set(gorevKey, []);
    }
    groupsMap.get(gorevKey)!.push(p);
    grandTotalSalary += Number(p.mevcut_maasi) || 0;
  });

  // Görev gruplarını alfabetik sırala
  const groupKeys = Array.from(groupsMap.keys()).sort((a, b) => a.localeCompare(b, 'tr'));

  // A4 Dikey Ölçüleri (2x Retina Kalitesi)
  // 210mm x 297mm -> En-Boy Oranı 1 : 1.4142
  const PAGE_WIDTH = 1240;
  const PAGE_HEIGHT = 1754;
  const MARGIN_X = 50;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2; // 1140 px
  const BOTTOM_LIMIT = PAGE_HEIGHT - 90;

  // Kolon Genişlikleri (Toplam: 1140 px)
  const COL_NO = 50;
  const COL_AD = 350;
  const COL_GOREV = 280;
  const COL_SANTIYE = 250;
  const COL_MAAS = 210;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  let pageNumber = 1;

  // Yeni Canvas oluşturucu
  const createCanvas = () => {
    const c = document.createElement('canvas');
    c.width = PAGE_WIDTH;
    c.height = PAGE_HEIGHT;
    const cx = c.getContext('2d')!;
    // Arka planı bembeyaz boya
    cx.fillStyle = '#ffffff';
    cx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    return { canvas: c, ctx: cx };
  };

  let { canvas, ctx } = createCanvas();
  let currentY = 50;

  // Sayfa Üst Başlığı (Tüm sayfalarda görünen üst bar)
  const drawPageHeader = (isFirstPage: boolean) => {
    if (isFirstPage) {
      // 1. ÜST GRADIENT ÇİZGİ
      const gradLine = ctx.createLinearGradient(MARGIN_X, 0, MARGIN_X + CONTENT_WIDTH, 0);
      gradLine.addColorStop(0, '#4f46e5');
      gradLine.addColorStop(0.3, '#06b6d4');
      gradLine.addColorStop(0.6, '#10b981');
      gradLine.addColorStop(1, '#f59e0b');
      ctx.fillStyle = gradLine;
      ctx.fillRect(MARGIN_X, currentY, CONTENT_WIDTH, 6);
      currentY += 16;

      // 2. ŞİRKET VE RAPOR BAŞLIK KARTI (Modern Bordo/Lacivert - Altın Şıklığı)
      const headerBoxHeight = 110;
      ctx.fillStyle = '#0f172a'; // Koyu şık lacivert
      drawRoundedRect(ctx, MARGIN_X, currentY, CONTENT_WIDTH, headerBoxHeight, 14, true, false);

      // Dekoratif ışıltı / desen
      const innerGrad = ctx.createLinearGradient(MARGIN_X, currentY, MARGIN_X + CONTENT_WIDTH, currentY + headerBoxHeight);
      innerGrad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
      innerGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.15)');
      innerGrad.addColorStop(1, 'rgba(245, 158, 11, 0.2)');
      ctx.fillStyle = innerGrad;
      drawRoundedRect(ctx, MARGIN_X, currentY, CONTENT_WIDTH, headerBoxHeight, 14, true, false);

      // Sol: Şirket Adı ve Logo
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(companyName, MARGIN_X + 24, currentY + 36);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('YÖNETİM & PERSONEL MAAŞ BORDRO İCMAL RAPORU', MARGIN_X + 24, currentY + 60);

      // Seçili Şantiye Rozeti
      const badgeY = currentY + 72;
      ctx.fillStyle = '#f59e0b';
      drawRoundedRect(ctx, MARGIN_X + 24, badgeY, 140, 24, 6, true, false);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('SEÇİLİ ŞANTİYE', MARGIN_X + 34, badgeY + 16);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      const santiyeText = truncateText(ctx, santiyeAdi, 460);
      ctx.fillText(santiyeText, MARGIN_X + 175, badgeY + 18);

      // Sağ: Tarih & Belge No
      ctx.textAlign = 'right';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Rapor Tarihi: ${reportDateStr}`, MARGIN_X + CONTENT_WIDTH - 24, currentY + 36);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'normal 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Toplam Personel: ${personeller.length} Kişi`, MARGIN_X + CONTENT_WIDTH - 24, currentY + 58);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Toplam Maaş: ${formatTRY(grandTotalSalary)}`, MARGIN_X + CONTENT_WIDTH - 24, currentY + 84);
      ctx.textAlign = 'left';

      currentY += headerBoxHeight + 18;

      // 3. RENGARENK BİLGİ KARTLARI (Özet Bantı)
      const cardW = (CONTENT_WIDTH - 24) / 3;
      const cardH = 54;

      // Kart 1: Şantiye
      ctx.fillStyle = '#eff6ff';
      ctx.strokeStyle = '#bfdbfe';
      drawRoundedRect(ctx, MARGIN_X, currentY, cardW, cardH, 10, true, true);
      ctx.fillStyle = '#1e40af';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('ŞANTİYE GÖREV YERİ', MARGIN_X + 16, currentY + 20);
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText(truncateText(ctx, santiyeAdi, cardW - 32), MARGIN_X + 16, currentY + 40);

      // Kart 2: Görev Grubu Sayısı
      ctx.fillStyle = '#f5f3ff';
      ctx.strokeStyle = '#ddd6fe';
      drawRoundedRect(ctx, MARGIN_X + cardW + 12, currentY, cardW, cardH, 10, true, true);
      ctx.fillStyle = '#6b21a8';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('FARKLI GÖREV DAĞILIMI', MARGIN_X + cardW + 28, currentY + 20);
      ctx.fillStyle = '#581c87';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${groupKeys.length} Farklı Görev / Pozisyon`, MARGIN_X + cardW + 28, currentY + 40);

      // Kart 3: Genel Bordro Tutarı
      ctx.fillStyle = '#ecfdf5';
      ctx.strokeStyle = '#a7f3d0';
      drawRoundedRect(ctx, MARGIN_X + (cardW + 12) * 2, currentY, cardW, cardH, 10, true, true);
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('GENEL AYLIK MAAŞ BORDROSU', MARGIN_X + (cardW + 12) * 2 + 16, currentY + 20);
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(formatTRY(grandTotalSalary), MARGIN_X + (cardW + 12) * 2 + 16, currentY + 42);

      currentY += cardH + 22;
    } else {
      // Devam sayfaları için kompakt başlık
      ctx.fillStyle = '#0f172a';
      drawRoundedRect(ctx, MARGIN_X, currentY, CONTENT_WIDTH, 44, 8, true, false);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${companyName} • ${santiyeAdi} PERSONEL MAAŞ RAPORU (Devam)`, MARGIN_X + 18, currentY + 27);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'normal 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Sayfa ${pageNumber} • Tarih: ${reportDateStr}`, MARGIN_X + CONTENT_WIDTH - 18, currentY + 27);
      ctx.textAlign = 'left';

      currentY += 58;
    }
  };

  // Sayfa Altı (Footer)
  const drawPageFooter = (ctxToUse: CanvasRenderingContext2D, pNum: number) => {
    const footerY = PAGE_HEIGHT - 45;
    ctxToUse.strokeStyle = '#e2e8f0';
    ctxToUse.lineWidth = 1;
    ctxToUse.beginPath();
    ctxToUse.moveTo(MARGIN_X, footerY - 12);
    ctxToUse.lineTo(MARGIN_X + CONTENT_WIDTH, footerY - 12);
    ctxToUse.stroke();

    ctxToUse.fillStyle = '#64748b';
    ctxToUse.font = 'normal 11px system-ui, -apple-system, sans-serif';
    ctxToUse.fillText(
      `© Bayburt Öz-Ka İnş. Ltd. Şti. • Yazılım ve Tasarım: Emirhan Kalhan • Belge No: OZK-MAAS-${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}`,
      MARGIN_X,
      footerY + 6
    );

    ctxToUse.textAlign = 'right';
    ctxToUse.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctxToUse.fillText(`Sayfa ${pNum}`, MARGIN_X + CONTENT_WIDTH, footerY + 6);
    ctxToUse.textAlign = 'left';
  };

  // Yeni sayfaya geçiş fonksiyonu
  const pushCurrentPageAndCreateNew = () => {
    drawPageFooter(ctx, pageNumber);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (pageNumber > 1) {
      doc.addPage('a4', 'portrait');
    }
    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    pageNumber++;

    const newObj = createCanvas();
    canvas = newObj.canvas;
    ctx = newObj.ctx;
    currentY = 40;
    drawPageHeader(false);
  };

  // İlk sayfa başlığını çiz
  drawPageHeader(true);

  let globalPersonelIndex = 0;

  // 4. GÖREV GRUPLARINI AYRI AYRI RAPORA DÖK
  for (let gIdx = 0; gIdx < groupKeys.length; gIdx++) {
    const gorevAdi = groupKeys[gIdx];
    const groupItems = groupsMap.get(gorevAdi) || [];
    const palette = GROUP_PALETTES[gIdx % GROUP_PALETTES.length];

    // Grup toplam maaşı
    const groupTotalSalary = groupItems.reduce((acc, curr) => acc + (Number(curr.mevcut_maasi) || 0), 0);

    // Grup başlığı + en az 2 satır tablonun sığması için yer kontrolü (yaklaşık 140px)
    if (currentY + 140 > BOTTOM_LIMIT) {
      pushCurrentPageAndCreateNew();
    }

    // A. GRUP BAŞLIĞI BANNERI (Rengarenk Şık Kart)
    const groupHeaderH = 36;
    const gGrad = ctx.createLinearGradient(MARGIN_X, currentY, MARGIN_X + CONTENT_WIDTH, currentY);
    gGrad.addColorStop(0, palette.headerBg);
    gGrad.addColorStop(1, palette.headerGrad);
    ctx.fillStyle = gGrad;
    drawRoundedRect(ctx, MARGIN_X, currentY, CONTENT_WIDTH, groupHeaderH, 8, true, false);

    // Görev Adı Başlığı
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `GÖREV / POZİSYON: ${truncateText(ctx, gorevAdi, CONTENT_WIDTH - 260)}`,
      MARGIN_X + 16,
      currentY + 23
    );

    // Sağ: Grup Personel Sayısı ve Ara Toplam Rozeti
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#fef08a'; // Canlı altın sarısı
    ctx.fillText(
      `${groupItems.length} Kişi • Ara Toplam: ${formatTRY(groupTotalSalary)}`,
      MARGIN_X + CONTENT_WIDTH - 16,
      currentY + 23
    );
    ctx.textAlign = 'left';

    currentY += groupHeaderH + 4;

    // B. TABLO SÜTUN BAŞLIKLARI
    const tableHeaderH = 26;
    ctx.fillStyle = palette.lightBg;
    ctx.strokeStyle = palette.border;
    drawRoundedRect(ctx, MARGIN_X, currentY, CONTENT_WIDTH, tableHeaderH, 4, true, true);

    ctx.fillStyle = palette.textColor;
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';

    // # (Sıra)
    ctx.fillText('#', MARGIN_X + 14, currentY + 17);
    // ADI SOYADI
    ctx.fillText('ADI SOYADI', MARGIN_X + COL_NO + 10, currentY + 17);
    // GÖREVİ
    ctx.fillText('GÖREVİ', MARGIN_X + COL_NO + COL_AD + 10, currentY + 17);
    // ŞANTİYESİ
    ctx.fillText('ŞANTİYESİ', MARGIN_X + COL_NO + COL_AD + COL_GOREV + 10, currentY + 17);
    // MAAŞI
    ctx.textAlign = 'right';
    ctx.fillText('MAAŞI (TL)', MARGIN_X + CONTENT_WIDTH - 16, currentY + 17);
    ctx.textAlign = 'left';

    currentY += tableHeaderH + 2;

    // C. GRUBA AİT PERSONEL SATIRLARI
    for (let rowIdx = 0; rowIdx < groupItems.length; rowIdx++) {
      globalPersonelIndex++;
      const p = groupItems[rowIdx];
      const rowH = 28;

      // Sayfa taşma kontrolü
      if (currentY + rowH + 40 > BOTTOM_LIMIT) {
        pushCurrentPageAndCreateNew();

        // Yeni sayfada grup tablosu başlığını tekrar çiz
        ctx.fillStyle = palette.lightBg;
        ctx.strokeStyle = palette.border;
        drawRoundedRect(ctx, MARGIN_X, currentY, CONTENT_WIDTH, tableHeaderH, 4, true, true);
        ctx.fillStyle = palette.textColor;
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillText('#', MARGIN_X + 14, currentY + 17);
        ctx.fillText('ADI SOYADI', MARGIN_X + COL_NO + 10, currentY + 17);
        ctx.fillText(`GÖREVİ (${gorevAdi} - Devam)`, MARGIN_X + COL_NO + COL_AD + 10, currentY + 17);
        ctx.fillText('ŞANTİYESİ', MARGIN_X + COL_NO + COL_AD + COL_GOREV + 10, currentY + 17);
        ctx.textAlign = 'right';
        ctx.fillText('MAAŞI (TL)', MARGIN_X + CONTENT_WIDTH - 16, currentY + 17);
        ctx.textAlign = 'left';
        currentY += tableHeaderH + 2;
      }

      // Zebra şerit arka plan
      if (rowIdx % 2 === 0) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#f8fafc';
      }
      ctx.fillRect(MARGIN_X, currentY, CONTENT_WIDTH, rowH);

      // İnce alt çizgi
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, currentY + rowH);
      ctx.lineTo(MARGIN_X + CONTENT_WIDTH, currentY + rowH);
      ctx.stroke();

      // Satır Değerleri
      // 1. Sıra No
      ctx.fillStyle = '#64748b';
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(String(globalPersonelIndex), MARGIN_X + 14, currentY + 18);

      // 2. ADI SOYADI
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(truncateText(ctx, p.personel_adi || '-', COL_AD - 18), MARGIN_X + COL_NO + 10, currentY + 18);

      // 3. GÖREVİ
      ctx.fillStyle = '#334155';
      ctx.font = 'normal 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(truncateText(ctx, p.gorevi || gorevAdi, COL_GOREV - 18), MARGIN_X + COL_NO + COL_AD + 10, currentY + 18);

      // 4. ŞANTİYESİ
      const rawSantiye = (p.santiye || p.santiyesi || '').trim();
      const sText = rawSantiye || (santiyeAdi !== 'TÜM ŞANTİYELER GENEL İCMALİ' && santiyeAdi !== 'TÜM ŞANTİYELER' ? santiyeAdi : '');
      if (sText) {
        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#fde68a';
        drawRoundedRect(ctx, MARGIN_X + COL_NO + COL_AD + COL_GOREV + 4, currentY + 4, COL_SANTIYE - 14, 20, 5, true, true);
        ctx.fillStyle = '#92400e';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.fillText(truncateText(ctx, sText, COL_SANTIYE - 24), MARGIN_X + COL_NO + COL_AD + COL_GOREV + 10, currentY + 18);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'italic 10px system-ui, -apple-system, sans-serif';
        ctx.fillText('Belirtilmemiş', MARGIN_X + COL_NO + COL_AD + COL_GOREV + 8, currentY + 18);
      }

      // 5. MAAŞI
      ctx.textAlign = 'right';
      ctx.fillStyle = '#047857'; // Koyu yeşil
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(formatTRY(p.mevcut_maasi), MARGIN_X + CONTENT_WIDTH - 16, currentY + 18);
      ctx.textAlign = 'left';

      currentY += rowH;
    }

    // D. GRUP ARA TOPLAMI SATIRI
    const subtotalH = 30;
    ctx.fillStyle = palette.lightBg;
    ctx.strokeStyle = palette.border;
    drawRoundedRect(ctx, MARGIN_X, currentY, CONTENT_WIDTH, subtotalH, 4, true, true);

    ctx.fillStyle = palette.badgeText;
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `↳ ${truncateText(ctx, gorevAdi, 450)} ARA TOPLAMI (${groupItems.length} Personel):`,
      MARGIN_X + 24,
      currentY + 19
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = palette.textColor;
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(formatTRY(groupTotalSalary), MARGIN_X + CONTENT_WIDTH - 16, currentY + 19);
    ctx.textAlign = 'left';

    currentY += subtotalH + 18;
  }

  // 5. GENEL ALT TOPLAM VE İMZA ONAY KUTUSU
  const grandTotalBoxH = 130;
  if (currentY + grandTotalBoxH > BOTTOM_LIMIT) {
    pushCurrentPageAndCreateNew();
  }

  // GENEL MAAŞ BORDROSU TOPLAM KARTI
  ctx.fillStyle = '#0f172a';
  drawRoundedRect(ctx, MARGIN_X, currentY, CONTENT_WIDTH, 56, 10, true, false);

  const grandGrad = ctx.createLinearGradient(MARGIN_X, currentY, MARGIN_X + CONTENT_WIDTH, currentY + 56);
  grandGrad.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
  grandGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.25)');
  grandGrad.addColorStop(1, 'rgba(245, 158, 11, 0.35)');
  ctx.fillStyle = grandGrad;
  drawRoundedRect(ctx, MARGIN_X, currentY, CONTENT_WIDTH, 56, 10, true, false);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    `GENEL TOPLAM (${santiyeAdi} • TOPLAM ${personeller.length} PERSONEL):`,
    MARGIN_X + 24,
    currentY + 34
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#34d399'; // Canlı yeşil
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(formatTRY(grandTotalSalary), MARGIN_X + CONTENT_WIDTH - 24, currentY + 36);
  ctx.textAlign = 'left';

  currentY += 72;

  // İMZA VE ONAY ALANLARI
  const signColW = (CONTENT_WIDTH - 36) / 3;
  const signH = 64;

  const signTitles = [
    { role: 'HAZIRLAYAN', desc: 'İnsan Kaynakları / Bordro' },
    { role: 'KONTROL EDEN', desc: 'Muhasebe & Mali İşler' },
    { role: 'ONAYLAYAN', desc: 'Genel Müdürlük / Şirket Müdürü' },
  ];

  for (let sIdx = 0; sIdx < 3; sIdx++) {
    const sX = MARGIN_X + sIdx * (signColW + 18);
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    drawRoundedRect(ctx, sX, currentY, signColW, signH, 8, true, true);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    ctx.fillText(signTitles[sIdx].role, sX + 14, currentY + 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'normal 9px system-ui, -apple-system, sans-serif';
    ctx.fillText(signTitles[sIdx].desc, sX + 14, currentY + 34);

    // İmza çizgisi
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(sX + 14, currentY + 52);
    ctx.lineTo(sX + signColW - 14, currentY + 52);
    ctx.stroke();
  }

  // Son sayfa alt bilgisini çiz
  drawPageFooter(ctx, pageNumber);

  // Son sayfayı jsPDF'e aktar
  const lastImg = canvas.toDataURL('image/jpeg', 0.95);
  if (pageNumber > 1) {
    doc.addPage('a4', 'portrait');
  }
  doc.addImage(lastImg, 'JPEG', 0, 0, 210, 297);

  // Dosya adı üret
  const cleanSantiye = santiyeAdi
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  const fileName = `ozka_${cleanSantiye || 'personel'}_maas_raporu_${now.toISOString().slice(0, 10)}.pdf`;

  if (autoDownload) {
    doc.save(fileName);
  }

  return {
    doc,
    fileName,
    totalSalary: grandTotalSalary,
    totalCount: personeller.length,
  };
}
