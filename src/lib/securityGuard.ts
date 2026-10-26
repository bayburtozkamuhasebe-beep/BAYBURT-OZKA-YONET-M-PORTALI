/**
 * Güvenlik ve Kaynak Koruma Modülü (Anti-Inspection & Anti-Tamper)
 * - F12, Sağ Tık, Ctrl+U (Kaynak Kodu İnceleme), Ctrl+Shift+I/J/C engellemeleri
 * - Geliştirici Konsolu temizleme ve devre dışı bırakma
 * - Kod indirme ve kopyalama koruması
 */

export function initSecurityGuard() {
  if (typeof window === 'undefined') return;

  // 1. SAĞ TIK (Context Menu) ENGELLEMESİ
  document.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    { capture: true }
  );

  // 2. KLAVYE KISAYOLLARI ENGELLEMESİ (F12, Ctrl+U, Ctrl+Shift+I/J/C, Ctrl+S, Ctrl+P)
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      // F12 tuşu
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Ctrl + U / Cmd + U (Sayfa Kaynağını Görüntüle)
      if (isCtrlOrMeta && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + Shift + I (Geliştirici Araçları / İncele)
      // Ctrl + Shift + J (Geliştirici Konsolu)
      // Ctrl + Shift + C (Eleman Seçici)
      if (
        isCtrlOrMeta &&
        e.shiftKey &&
        (e.key === 'I' ||
          e.key === 'i' ||
          e.key === 'J' ||
          e.key === 'j' ||
          e.key === 'C' ||
          e.key === 'c' ||
          e.keyCode === 73 ||
          e.keyCode === 74 ||
          e.keyCode === 67)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + S / Cmd + S (Sayfayı veya İndeksi Kaydet)
      if (isCtrlOrMeta && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + P / Cmd + P (Yazdır / PDF Kaydet)
      if (isCtrlOrMeta && (e.key === 'p' || e.key === 'P' || e.keyCode === 80)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    { capture: true }
  );

  // 3. SÜRÜKLE - BIRAK VE METİN SEÇİMİ ENGELLEMESİ
  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
  });

  // 4. KONSOL LOGLARINI GÜVENLİK İÇİN SESSİZE ALMA
  try {
    const noop = () => {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    win.console = win.console || {};
    win.console.log = noop;
    win.console.info = noop;
    win.console.debug = noop;
    win.console.dir = noop;
    win.console.table = noop;
  } catch {
    // Konsol koruması sessizce devam eder
  }

  // 5. DEVTOOLS AÇILMA TESPİTİ VE DEBUGGER TUZAĞI (Anti-Debugging)
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
      try {
        const trap = new Function('debugger');
        trap();
      } catch {
        // yoksay
      }
    }, 1500);
  }
}
