import { jsPDF } from 'jspdf';
import { MutabakatKaydi } from '../components/MutabakatPortaliScreen';

/**
 * Sayıyı Türkçe yazıya çevirir (Örn: 145850.50 -> # YALNIZ YÜZ KIRK BEŞ BİN SEKİZ YÜZ ELLİ TÜRK LİRASI ELLİ KURUŞ #)
 */
export function sayiyiYaziyaCevir(tutar: number): string {
  if (isNaN(tutar) || tutar === null || tutar === undefined) return '';

  const birler = ['', 'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ'];
  const onlar = ['', 'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN'];
  const basamaklar = ['', 'BİN', 'MİLYON', 'MİLYAR', 'TRİLYON'];

  const mutlakTutar = Math.abs(tutar);
  const tamKisim = Math.floor(mutlakTutar);
  const kurus = Math.round((mutlakTutar - tamKisim) * 100);

  function ucluGrubuCevir(sayi: number): string {
    const yuzler = Math.floor(sayi / 100);
    const kalan = sayi % 100;
    const onluk = Math.floor(kalan / 10);
    const birlik = kalan % 10;

    let sonuc = '';
    if (yuzler > 0) {
      if (yuzler === 1) {
        sonuc += 'YÜZ ';
      } else {
        sonuc += birler[yuzler] + ' YÜZ ';
      }
    }
    if (onluk > 0) {
      sonuc += onlar[onluk] + ' ';
    }
    if (birlik > 0) {
      sonuc += birler[birlik] + ' ';
    }
    return sonuc.trim();
  }

  if (tamKisim === 0 && kurus === 0) {
    return '# YALNIZ SIFIR TÜRK LİRASI #';
  }

  let tamMetin = '';
  if (tamKisim === 0) {
    tamMetin = 'SIFIR';
  } else {
    let sayi = tamKisim;
    let basamakIndex = 0;
    const gruplar: string[] = [];

    while (sayi > 0) {
      const uclu = sayi % 1000;
      if (uclu > 0) {
        let grupMetni = ucluGrubuCevir(uclu);
        // Türkçe dil kuralı: 1000 için "Bir Bin" denmez, sadece "Bin" denir
        if (basamakIndex === 1 && uclu === 1) {
          grupMetni = '';
        }
        const basamakIsmi = basamaklar[basamakIndex];
        const tamGrup = (grupMetni ? grupMetni + ' ' : '') + basamakIsmi;
        gruplar.unshift(tamGrup.trim());
      }
      sayi = Math.floor(sayi / 1000);
      basamakIndex++;
    }
    tamMetin = gruplar.join(' ');
  }

  let sonuc = `# YALNIZ ${tamMetin} TÜRK LİRASI`;
  if (kurus > 0) {
    const kurusMetni = ucluGrubuCevir(kurus);
    sonuc += ` ${kurusMetni} KURUŞ`;
  }
  sonuc += ' #';

  return sonuc.trim();
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
 * Metni verilen genişliğe göre kırar ve kutu dışına taşmasını engeller
 */
function wrapAndDrawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 10,
  align: 'left' | 'center' | 'right' = 'left'
): number {
  if (!text) return y;
  const words = text.split(' ');
  let currentLine = '';
  let lineCount = 0;
  let currentY = y;

  const previousAlign = ctx.textAlign;
  ctx.textAlign = align;

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      ctx.fillText(currentLine, x, currentY);
      currentLine = words[i];
      currentY += lineHeight;
      lineCount++;

      if (lineCount >= maxLines - 1 && i < words.length - 1) {
        // Son satırda taşma olursa 3 nokta ekle
        currentLine = `${currentLine}...`;
        break;
      }
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    ctx.fillText(currentLine, x, currentY);
    currentY += lineHeight;
  }

  ctx.textAlign = previousAlign;
  return currentY;
}

export interface MutabakatPdfResult {
  doc: jsPDF;
  blob: Blob;
  file: File | null;
  fileName: string;
}

/**
 * 100% Türkçe Karakter Uyumlu, Sayfa ve Kutu Dışına Taşmayan Resmi Mutabakat Mektubu PDF'i Üretir
 */
export async function generateMutabakatPdf(
  item: MutabakatKaydi,
  autoDownload: boolean = true
): Promise<MutabakatPdfResult> {
  // Yazı tiplerinin hazır olmasını bekle
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Font yükleme hatası olursa devam et
    }
  }

  // A4 Boyutu (200 DPI Çözünürlük: 1654 x 2339 piksel)
  const canvas = document.createElement('canvas');
  canvas.width = 1654;
  canvas.height = 2339;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context oluşturulamadı');
  }

  // 1. ZEMİNİ TAM BEYAZ YAP
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. ÜST ZÜMRÜT ŞERİT
  ctx.fillStyle = '#10B981';
  ctx.fillRect(0, 0, canvas.width, 36);

  const leftMargin = 120;
  const rightMargin = 1654 - 120;
  const contentWidth = rightMargin - leftMargin; // 1414 px

  // 3. ÜST ANTET (ANA FİRMA)
  const anaFirmaMetni = (item.anafirma || 'ÖZKA İNŞAAT A.Ş.').trim().toUpperCase();
  ctx.fillStyle = '#0F172A'; // slate-900
  ctx.font = 'bold 28px Arial, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  // Çok uzun ana firma adı varsa satır kır
  wrapAndDrawText(ctx, anaFirmaMetni, leftMargin, 110, contentWidth - 450, 32, 2, 'left');

  ctx.fillStyle = '#64748B'; // slate-500
  ctx.font = 'normal 16px Arial, "Segoe UI", sans-serif';
  const subInfo = item.vergino
    ? `VKN / TCKN: ${item.vergino}  |  Muhasebe ve Finans Departmanı  |  Bayburt / Türkiye`
    : 'Muhasebe ve Finans Departmanı  |  Bayburt / Türkiye';
  ctx.fillText(subInfo, leftMargin, 150);

  // Tarih ve Referans No (Sağa Yaslı)
  const tarihMetni = item.tarih || new Date().toISOString().split('T')[0];
  const refNo = `MTB-${String(item.id).slice(-6).toUpperCase()}`;

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 17px Arial, "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Tarih: ${tarihMetni}`, rightMargin, 110);
  ctx.font = 'normal 15px Arial, "Segoe UI", sans-serif';
  ctx.fillText(`Ref No: ${refNo}`, rightMargin, 142);

  // Üst Ayırıcı Çizgi
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftMargin, 175);
  ctx.lineTo(rightMargin, 175);
  ctx.stroke();

  // 4. RESMİ BELGE BAŞLIĞI
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 24px Arial, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CARİ HESAP BAKİYE MUTABAKAT MEKTUBU', canvas.width / 2, 225);

  // 5. MUHATAP FİRMA BİLGİ KUTUSU
  const box1Y = 255;
  const box1Height = 155;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, leftMargin, box1Y, contentWidth, box1Height, 14, true, true);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 14px Arial, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SAYIN YETKİLİ,', leftMargin + 30, box1Y + 32);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px Arial, "Segoe UI", sans-serif';
  const cariUnvan = (item.firmaUnvani || 'FİRMA ÜNVANI').trim().toUpperCase();
  // Metin kutu dışına taşmaması için genişliği sınırla
  wrapAndDrawText(ctx, cariUnvan, leftMargin + 30, box1Y + 65, contentWidth - 60, 26, 2, 'left');

  ctx.fillStyle = '#475569';
  ctx.font = 'normal 16px Arial, "Segoe UI", sans-serif';
  ctx.fillText(`Vergi / TC Kimlik No: ${item.vergiNo || 'Belirtilmedi'}`, leftMargin + 30, box1Y + 130);

  if (item.eposta) {
    ctx.fillText(`E-Posta: ${item.eposta}`, leftMargin + 550, box1Y + 130);
  }

  // 6. GİRİŞ PARAGRAFI
  const textY1 = box1Y + box1Height + 40;
  ctx.fillStyle = '#1E293B';
  ctx.font = 'normal 18px Arial, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  const girisMetni = `Şirketimiz nezdindeki cari hesabınızın ${tarihMetni} tarihi itibarıyla yapılan incelemesi neticesinde, kayıtlarımızda:`;
  ctx.fillText(girisMetni, leftMargin, textY1);

  // 7. VURGULU BAKİYE KUTUSU (TL OLARAK VE ALTINDA YAZIYLA)
  const box2Y = textY1 + 22;
  const box2Height = 210;
  ctx.fillStyle = '#ECFDF5'; // emerald-50
  ctx.strokeStyle = '#10B981'; // emerald-500
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, leftMargin, box2Y, contentWidth, box2Height, 16, true, true);

  // Bakiye Başlığı
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 15px Arial, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MUTABAKATA KONU BAKİYE DURUMU', canvas.width / 2, box2Y + 36);

  // Rakamla Bakiye (TL Olarak)
  const formattedTutar = item.tutar.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  ctx.fillStyle = '#064E3B';
  ctx.font = 'bold 36px Arial, "Segoe UI", sans-serif';
  ctx.fillText(`${formattedTutar} TL (${item.borcAlacakTipi})`, canvas.width / 2, box2Y + 86);

  // ALTINDA YAZIYLA BELİRTİLEN KISIM (# YALNIZ YÜZ BİN TÜRK LİRASI #)
  const yaziylaMetin = sayiyiYaziyaCevir(item.tutar);
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 18px Arial, "Segoe UI", sans-serif';
  wrapAndDrawText(ctx, yaziylaMetin, canvas.width / 2, box2Y + 132, contentWidth - 80, 24, 2, 'center');

  // Açıklayıcı Dipnot
  ctx.fillStyle = '#059669';
  ctx.font = 'italic 15px Arial, "Segoe UI", sans-serif';
  ctx.fillText(
    `(${anaFirmaMetni} kayıtlarına göre ${formattedTutar} TL tutarında ${item.borcAlacakTipi} bakiyeniz bulunmaktadır)`,
    canvas.width / 2,
    box2Y + 180
  );

  let currentY = box2Y + box2Height + 35;

  // 8. VARSA AÇIKLAMA / NOT KUTUSU
  if (item.aciklama && item.aciklama.trim()) {
    const aciklamaBoxH = 80;
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, leftMargin, currentY, contentWidth, aciklamaBoxH, 12, true, true);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 14px Arial, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Açıklama / Fatura Referansı:', leftMargin + 25, currentY + 30);

    ctx.fillStyle = '#334155';
    ctx.font = 'normal 15px Arial, "Segoe UI", sans-serif';
    wrapAndDrawText(ctx, item.aciklama, leftMargin + 25, currentY + 56, contentWidth - 50, 22, 2, 'left');

    currentY += aciklamaBoxH + 30;
  }

  // 9. HUKUKİ / YASAL İTİRAZ METNİ (Kutu dışına ve kenarlara taşmaz)
  ctx.fillStyle = '#475569';
  ctx.font = 'normal 16px Arial, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  const yasalMetin =
    'Yukarıda kayıtlı bakiyenin şirketiniz muhasebe kayıtlarıyla mutabık olup olmadığını, mutabık değilseniz cari hesap ekstreniz ile birlikte en geç 7 (yedi) iş günü içerisinde kaşe/imzalı olarak veya e-posta yoluyla tarafımıza bildirmenizi rica ederiz.';
  currentY = wrapAndDrawText(ctx, yasalMetin, leftMargin, currentY + 10, contentWidth, 26, 4, 'left');

  // 10. KAŞE VE İMZA BÖLÜMLERİ (ARKA FONLAR BEYAZ, METİNLER TAŞMAZ, İKİ ADET KUTUCUK ONAY)
  // Sayfa dışına sarkmayacak ve ferah duracak şekilde yerleşim
  const sigBoxY = Math.max(currentY + 45, 1280);
  const sigBoxWidth = (contentWidth - 40) / 2; // ~687 px
  const sigBoxHeight = 400; // Geniş ve ferah imza alanı

  // -------------------------------------------------------------
  // KUTU 1 (SOL): ANA FİRMA KAŞE & İMZA (TAMAMEN BEYAZ ARKA FON)
  // -------------------------------------------------------------
  ctx.fillStyle = '#FFFFFF'; // Beyaz arka fon
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.8;
  drawRoundedRect(ctx, leftMargin, sigBoxY, sigBoxWidth, sigBoxHeight, 14, true, true);

  const solKutuX = leftMargin + sigBoxWidth / 2;

  // Ana Firma Üst Başlık
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px Arial, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  wrapAndDrawText(ctx, anaFirmaMetni, solKutuX, sigBoxY + 38, sigBoxWidth - 40, 24, 2, 'center');

  ctx.fillStyle = '#64748B';
  ctx.font = 'normal 14px Arial, "Segoe UI", sans-serif';
  if (item.vergino) {
    ctx.fillText(`VKN / TCKN: ${item.vergino}`, solKutuX, sigBoxY + 95);
  }
  ctx.fillText('Yetkili Kaşe & İmza', solKutuX, sigBoxY + (item.vergino ? 122 : 100));

  // Ana Firma İmza Alanı Çerçevesi (Beyaz zemin üzeri kesikli çerçeve)
  const imzaCerceveY = sigBoxY + 145;
  const imzaCerceveH = 225;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#CBD5E1';
  ctx.setLineDash([6, 4]);
  drawRoundedRect(ctx, leftMargin + 20, imzaCerceveY, sigBoxWidth - 40, imzaCerceveH, 10, true, true);
  ctx.setLineDash([]); // Reset line dash

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'italic 16px Arial, "Segoe UI", sans-serif';
  ctx.fillText('[ Şirket Kaşesi ve Yetkili İmza ]', solKutuX, imzaCerceveY + imzaCerceveH / 2 + 6);

  // -------------------------------------------------------------
  // KUTU 2 (SAĞ): CARİ FİRMA MUTABAKAT ONAY VE İMZA ALANI (TAMAMEN BEYAZ ARKA FON)
  // -------------------------------------------------------------
  const box2X = leftMargin + sigBoxWidth + 40;
  ctx.fillStyle = '#FFFFFF'; // Beyaz arka fon
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.8;
  drawRoundedRect(ctx, box2X, sigBoxY, sigBoxWidth, sigBoxHeight, 14, true, true);

  const sagKutuX = box2X + sigBoxWidth / 2;

  // İKİ ADET KUTUCUK: [  ] MUTABIKIZ   /   [  ] MUTABIK DEĞİLİZ
  const checkboxY = sigBoxY + 28;
  const cbSize = 24;

  // Kutucuk 1: MUTABIKIZ
  const cb1X = box2X + 45;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, cb1X, checkboxY, cbSize, cbSize, 5, true, true);

  ctx.fillStyle = '#047857';
  ctx.font = 'bold 16px Arial, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MUTABIKIZ', cb1X + cbSize + 12, checkboxY + 18);

  // Kutucuk 2: MUTABIK DEĞİLİZ
  const cb2X = box2X + 340;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, cb2X, checkboxY, cbSize, cbSize, 5, true, true);

  ctx.fillStyle = '#B91C1C';
  ctx.fillText('MUTABIK DEĞİLİZ', cb2X + cbSize + 12, checkboxY + 18);

  // Kutucukların altı ayırıcı ince çizgi
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(box2X + 25, sigBoxY + 68);
  ctx.lineTo(box2X + sigBoxWidth - 25, sigBoxY + 68);
  ctx.stroke();

  // Muhatap Firma Ünvanı (Taşma önleme ile merkezde)
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 17px Arial, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  wrapAndDrawText(ctx, cariUnvan, sagKutuX, sigBoxY + 96, sigBoxWidth - 40, 22, 2, 'center');

  ctx.fillStyle = '#64748B';
  ctx.font = 'normal 13px Arial, "Segoe UI", sans-serif';
  if (item.vergiNo) {
    ctx.fillText(`VKN / TCKN: ${item.vergiNo}`, sagKutuX, sigBoxY + 142);
  }
  ctx.fillText('Cevap Kaşe & Yetkili İmza', sagKutuX, sigBoxY + (item.vergiNo ? 162 : 145));

  // Sağ İmza Alanı Çerçevesi (Beyaz zemin üzeri kesikli çerçeve)
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#CBD5E1';
  ctx.setLineDash([6, 4]);
  drawRoundedRect(ctx, box2X + 20, imzaCerceveY + 20, sigBoxWidth - 40, imzaCerceveH - 20, 10, true, true);
  ctx.setLineDash([]);

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'italic 15px Arial, "Segoe UI", sans-serif';
  ctx.fillText('[ Kaşe, Yetkili İmza ve Tarih ]', sagKutuX, imzaCerceveY + imzaCerceveH / 2 + 10);

  // 11. ALT BİLGİ VE SAYFA KORUMASI (2339 piksel sınırından önce güvenli yerleşim)
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'normal 13px Arial, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Bu resmi cari hesap bakiye mutabakat mektubu ÖZKA İnşaat Yönetim Portalı üzerinden üretilmiştir.',
    canvas.width / 2,
    2260
  );

  // 12. JSPDF İÇİNE YÜKLE VE İNDİR
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgData = canvas.toDataURL('image/png', 1.0);
  doc.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');

  const sanitizedFirma = (item.firmaUnvani || 'Firma').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Mutabakat_Mektubu_${sanitizedFirma}_${tarihMetni}.pdf`;

  if (autoDownload) {
    doc.save(fileName);
  }

  const blob = doc.output('blob');
  let file: File | null = null;
  try {
    file = new File([blob], fileName, { type: 'application/pdf' });
  } catch (e) {
    console.warn('File constructor not supported, using blob only:', e);
  }

  return { doc, blob, file, fileName };
}
