import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Sun, X, Check, Sparkles, Monitor } from 'lucide-react';

interface ThemeSelectionModalProps {
  isOpen: boolean;
  onSelectTheme: (theme: 'dark' | 'light') => void;
  onClose: () => void;
}

export const ThemeSelectionModal: React.FC<ThemeSelectionModalProps> = ({
  isOpen,
  onSelectTheme,
  onClose,
}) => {
  // ESC tuşuyla kapatıldığında varsayılan olarak gece modunda devam etsin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop (Tıklanınca gece modunda devam eder) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
          className="relative w-full max-w-lg bg-[#0e1017] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 z-10 overflow-hidden text-white"
        >
          {/* Ambient Glows */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl" />

          {/* Close Button (Kapatılırsa Gece Modunda devam eder) */}
          <button
            type="button"
            onClick={onClose}
            title="Kapat (Gece Modunda Devam Et)"
            className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Görsel Tema Tercihi</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
              Hangi Modda Çalışmak İstersiniz?
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-sm mx-auto leading-relaxed">
              Çalışma ortamınıza en uygun modu seçin. Dilediğiniz an üst menüden değiştirebilirsiniz.
            </p>
          </div>

          {/* Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 relative z-10">
            {/* Gece Modu (Karanlık) */}
            <button
              type="button"
              onClick={() => onSelectTheme('dark')}
              className="group relative flex flex-col items-center text-center p-5 rounded-2xl bg-white/[0.04] hover:bg-blue-600/[0.12] border-2 border-white/10 hover:border-blue-500 transition-all duration-200 active:scale-98 shadow-lg shadow-black/40 hover:shadow-blue-500/20"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                <Moon className="w-7 h-7" />
              </div>
              <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-1.5">
                <span>Varsayılan</span>
              </div>
              <h3 className="text-base font-extrabold text-white mb-1 group-hover:text-blue-300">
                Gece Modu
              </h3>
              <p className="text-[11px] text-gray-400 leading-snug">
                Göz yormayan koyu tema, loş ışık ve uzun saatler için optimize.
              </p>
              <div className="mt-3 text-xs font-bold text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Seç ve Başla</span>
                <span>→</span>
              </div>
            </button>

            {/* Gündüz Modu (Aydınlık) */}
            <button
              type="button"
              onClick={() => onSelectTheme('light')}
              className="group relative flex flex-col items-center text-center p-5 rounded-2xl bg-white/[0.04] hover:bg-amber-500/[0.12] border-2 border-white/10 hover:border-amber-400 transition-all duration-200 active:scale-98 shadow-lg shadow-black/40 hover:shadow-amber-500/20"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/30 border border-amber-400/30 flex items-center justify-center text-amber-300 mb-3 group-hover:scale-110 transition-transform">
                <Sun className="w-7 h-7" />
              </div>
              <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1.5">
                <span>Aydınlık & Net</span>
              </div>
              <h3 className="text-base font-extrabold text-white mb-1 group-hover:text-amber-300">
                Gündüz Modu
              </h3>
              <p className="text-[11px] text-gray-400 leading-snug">
                Aydınlık zemin, net siyah buton başlıkları ve yüksek kontrast.
              </p>
              <div className="mt-3 text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Seç ve Başla</span>
                <span>→</span>
              </div>
            </button>
          </div>

          {/* Footer Note */}
          <div className="text-center relative z-10 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-white transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-white"
            >
              Kapat (Gece modunda devam et)
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
