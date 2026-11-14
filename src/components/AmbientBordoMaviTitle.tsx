import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface AmbientBordoMaviTitleProps {
  variant?: 'hero' | 'header';
  darkMode?: boolean;
  className?: string;
  showSubtitle?: boolean;
}

export const AmbientBordoMaviTitle: React.FC<AmbientBordoMaviTitleProps> = ({
  variant = 'hero',
  darkMode = true,
  className = '',
  showSubtitle = true,
}) => {
  if (variant === 'header') {
    return (
      <div className={`relative inline-flex items-center group select-none ${className}`}>
        {/* Başlık Arkası İnce Bordo & Mavi Işık Halesi */}
        <div
          className="absolute -inset-1 rounded-lg bg-gradient-to-r from-[#be123c]/25 via-transparent to-[#2563eb]/25 blur-xs pointer-events-none -z-10 animate-dual-pulse"
        />

        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />
          <h1
            className="bordo-mavi-glow-text text-xs sm:text-sm font-black tracking-tight uppercase drop-shadow-[0_0_10px_rgba(225,29,72,0.4)] transition-all"
            title="Bayburt Öz-Ka Yönetim Portalı"
          >
            BAYBURT ÖZ-KA YÖNETİM PORTALI
          </h1>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
        </div>
      </div>
    );
  }

  // HERO (ANA PORTAL EKRANI GÖZ ALICI HAREKETLİ AMBİYANSLI BORDO & MAVİ BAŞLIK)
  return (
    <div className={`relative flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* 1. SOL VE SAĞ KANAT DİNAMİK BORDO & MAVİ IŞIK HALESİ (NEON AMBİYANS) */}
      {/* Sol Bordo Işık Aurası */}
      <div
        className="absolute -left-6 sm:-left-12 top-1/2 -translate-y-1/2 w-28 sm:w-44 h-16 sm:h-20 rounded-full blur-2xl pointer-events-none -z-10 transition-all duration-700 animate-dual-pulse bg-gradient-to-r from-[#be123c]/50 via-[#f43f5e]/30 to-transparent"
        style={{ animationDuration: '4s' }}
      />

      {/* Sağ Mavi Işık Aurası */}
      <div
        className="absolute -right-6 sm:-right-12 top-1/2 -translate-y-1/2 w-28 sm:w-44 h-16 sm:h-20 rounded-full blur-2xl pointer-events-none -z-10 transition-all duration-700 animate-dual-pulse bg-gradient-to-l from-[#2563eb]/50 via-[#06b6d4]/30 to-transparent"
        style={{ animationDuration: '4s', animationDelay: '1s' }}
      />

      {/* Merkez Birleşim Parıltısı */}
      <div
        className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-10 rounded-full blur-xl pointer-events-none -z-10 bg-gradient-to-r from-[#be123c]/20 via-[#a855f7]/20 to-[#2563eb]/20 animate-pulse"
        style={{ animationDuration: '5s' }}
      />

      {/* 2. ANA HAREKETLİ BORDO & MAVİ BAŞLIK YAZISI */}
      <div className="relative inline-flex items-center gap-1.5 sm:gap-2.5 px-2 py-0.5">
        {/* Sol Bordo Işıltı Yıldızı */}
        <motion.div
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 drop-shadow-[0_0_8px_#f43f5e]" />
        </motion.div>

        {/* Canlı Bordo & Mavi Akan Yazı */}
        <h1
          className="bordo-mavi-glow-text text-sm sm:text-base md:text-lg lg:text-xl font-black tracking-tight uppercase drop-shadow-[0_0_14px_rgba(225,29,72,0.45)] transition-all relative z-10"
          style={{ letterSpacing: '0.02em' }}
        >
          BAYBURT ÖZ-KA YÖNETİM PORTALI
        </h1>

        {/* Sağ Mavi Işıltı Yıldızı */}
        <motion.div
          animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]" />
        </motion.div>
      </div>

      {/* 3. BORDO & MAVİ NEON İKİLİ ÇİZGİ VURGUSU */}
      <div className="relative w-full max-w-[280px] sm:max-w-[360px] h-[2px] mt-0.5 mb-1 flex items-center justify-center">
        {/* Sol Bordo Çizgi */}
        <div className="flex-1 h-full bg-gradient-to-r from-transparent via-[#be123c] to-[#f43f5e] shadow-[0_0_10px_#f43f5e]" />

        {/* Merkez Işıklı Bağlantı Noktası */}
        <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#ffffff] mx-1 z-10 animate-pulse" />

        {/* Sağ Mavi Çizgi */}
        <div className="flex-1 h-full bg-gradient-to-l from-transparent via-[#2563eb] to-[#06b6d4] shadow-[0_0_10px_#06b6d4]" />
      </div>

      {/* 4. ALT BAŞLIK: SİSTEM GİRİŞ PANELİ */}
      {showSubtitle && (
        <p
          className={`text-[9px] sm:text-[10px] tracking-[0.25em] uppercase font-extrabold transition-colors ${
            darkMode ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          SİSTEM GİRİŞ PANELİ
        </p>
      )}
    </div>
  );
};
