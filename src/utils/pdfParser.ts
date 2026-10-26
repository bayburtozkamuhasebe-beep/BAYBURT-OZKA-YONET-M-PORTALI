import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
// Vite URL import for worker
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Worker yapılandırması
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } catch (e) {
    console.warn('pdfjs worker init warning:', e);
  }
}

export interface ExtractedTableData {
  title: string;
  sheetName: string;
  headers: string[];
  rows: (string | number)[][];
  pageCount?: number;
}

/**
 * PDF dosyasını tarayıcıda doğrudan (yerel olarak) okur ve tablo yapısını çıkarır.
 */
export async function parsePdfLocally(file: File): Promise<ExtractedTableData> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  interface TextItemWithPos {
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }

  const allPageLines: string[][][] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items: TextItemWithPos[] = [];

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim().length > 0) {
        items.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
          height: item.height || 0,
        });
      }
    }

    if (items.length === 0) continue;

    // Satırları Y koordinatına göre grupla (ters sıra çünkü PDF'te 0,0 sol alttır)
    // Y farkı 3.5'ten küçük olanları aynı satır kabul et
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    const rowsGrouped: TextItemWithPos[][] = [];
    let currentRow: TextItemWithPos[] = [];
    let currentY: number | null = null;

    for (const it of items) {
      if (currentY === null || Math.abs(it.y - currentY) <= 3.5) {
        currentRow.push(it);
        currentY = it.y;
      } else {
        if (currentRow.length > 0) {
          currentRow.sort((a, b) => a.x - b.x);
          rowsGrouped.push(currentRow);
        }
        currentRow = [it];
        currentY = it.y;
      }
    }
    if (currentRow.length > 0) {
      currentRow.sort((a, b) => a.x - b.x);
      rowsGrouped.push(currentRow);
    }

    // Her satırdaki hücreleri çıkar
    const pageRows: string[][] = rowsGrouped.map((rowItems) => {
      // Birbirine çok yakın metin parçalarını birleştir, boşluklu olanları ayrı sütun yap
      const cells: string[] = [];
      let currentCellStr = '';
      let prevRight = -1;

      for (const item of rowItems) {
        if (prevRight === -1) {
          currentCellStr = item.str;
        } else {
          const gap = item.x - prevRight;
          // Eğer aradaki boşluk 12pt'den büyükse yeni sütun/hücre kabul et
          if (gap > 12) {
            cells.push(currentCellStr.trim());
            currentCellStr = item.str;
          } else {
            // Küçük boşluk varsa aynı hücrede devam et
            currentCellStr += (gap > 2 ? ' ' : '') + item.str;
          }
        }
        prevRight = item.x + item.width;
      }
      if (currentCellStr.trim().length > 0) {
        cells.push(currentCellStr.trim());
      }
      return cells;
    });

    allPageLines.push(pageRows.filter((r) => r.length > 0));
  }

  // Tüm sayfalardaki satırları birleştir
  const mergedRows: string[][] = [];
  for (const pageRows of allPageLines) {
    for (const r of pageRows) {
      mergedRows.push(r);
    }
  }

  if (mergedRows.length === 0) {
    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      sheetName: 'Tablo',
      headers: ['Sütun 1'],
      rows: [],
      pageCount: numPages,
    };
  }

  // En çok sütuna sahip satırları inceleyerek sütun sayısını belirle
  const maxCols = Math.max(...mergedRows.map((r) => r.length));

  // İlk 1-3 satırdan başlık adayı bul
  let headerIndex = 0;
  for (let i = 0; i < Math.min(5, mergedRows.length); i++) {
    if (mergedRows[i].length >= Math.max(2, maxCols - 2)) {
      headerIndex = i;
      break;
    }
  }

  const rawHeaders = mergedRows[headerIndex] || [];
  const normalizedHeaders: string[] = [];

  for (let c = 0; c < maxCols; c++) {
    const title = rawHeaders[c] ? rawHeaders[c].trim() : `Sütun ${c + 1}`;
    normalizedHeaders.push(title || `Sütun ${c + 1}`);
  }

  // Başlıktan sonraki satırları veri olarak al
  const dataRows: (string | number)[][] = [];
  for (let i = 0; i < mergedRows.length; i++) {
    if (i === headerIndex) continue;
    const r = mergedRows[i];
    // Satırı maxCols uzunluğuna tamamla
    const rowPadded: (string | number)[] = [];
    for (let c = 0; c < maxCols; c++) {
      const val = r[c] !== undefined ? r[c] : '';
      // Eğer sayı formatındaysa sayıya çevirmeyi dene (örn: 1.250,50 veya 1250.50)
      const cleaned = String(val).replace(/\s/g, '');
      const trNumMatch = cleaned.match(/^-?(\d{1,3}(\.\d{3})*|\d+)(,\d+)?$/);
      if (trNumMatch && cleaned.length > 0) {
        const standardNum = cleaned.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(standardNum);
        if (!isNaN(num) && cleaned.includes(',') && !cleaned.includes('/')) {
          rowPadded.push(num);
          continue;
        }
      }
      rowPadded.push(val);
    }
    dataRows.push(rowPadded);
  }

  return {
    title: file.name.replace(/\.[^/.]+$/, ''),
    sheetName: 'Banka Hareketleri',
    headers: normalizedHeaders,
    rows: dataRows,
    pageCount: numPages,
  };
}

/**
 * Verilen tablo verisini gerçek Microsoft Excel (.xlsx) dosyasına dönüştürüp indirir.
 */
export function exportToExcel(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  sheetName: string = 'Banka Hareketleri'
): void {
  const wb = XLSX.utils.book_new();

  // Excel matrisi oluştur: ilk satır başlıklar, sonra veri satırları
  const sheetData: (string | number)[][] = [headers, ...rows];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Otomatik sütun genişliklerini hesapla
  const colWidths = headers.map((colName, colIdx) => {
    let maxLen = (colName || '').toString().length;
    for (let r = 0; r < Math.min(rows.length, 500); r++) {
      const cellVal = rows[r]?.[colIdx];
      if (cellVal !== undefined && cellVal !== null) {
        const strVal = cellVal.toString();
        if (strVal.length > maxLen) {
          maxLen = strVal.length;
        }
      }
    }
    return { wch: Math.min(Math.max(maxLen + 4, 12), 60) };
  });

  ws['!cols'] = colWidths;

  // Güvenli sayfa adı (maks 31 karakter, geçersiz karakter yok)
  const safeSheetName = (sheetName || 'Banka_Hareketleri')
    .replace(/[:\\/?*[\]]/g, '')
    .slice(0, 31);

  XLSX.utils.book_append_sheet(wb, ws, safeSheetName || 'Sayfa1');

  // Güvenli dosya adı (.xlsx ile bittiğinden emin ol)
  let cleanFileName = filename || 'banka_hareketleri_tablosu.xlsx';
  if (!cleanFileName.toLowerCase().endsWith('.xlsx')) {
    cleanFileName = `${cleanFileName.replace(/\.[^/.]+$/, '')}.xlsx`;
  }

  // Excel dosyasını indir
  XLSX.writeFile(wb, cleanFileName, {
    bookType: 'xlsx',
    type: 'binary',
  });
}

/**
 * Tabloyu panoya kopyalamak için TSV / Excel formatına çevirir.
 */
export function copyTableToClipboard(headers: string[], rows: (string | number)[][]): boolean {
  try {
    const lines: string[] = [];
    lines.push(headers.join('\t'));
    for (const row of rows) {
      lines.push(row.map((c) => (c !== undefined && c !== null ? String(c) : '')).join('\t'));
    }
    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn('Clipboard copy error:', err);
    return false;
  }
}
