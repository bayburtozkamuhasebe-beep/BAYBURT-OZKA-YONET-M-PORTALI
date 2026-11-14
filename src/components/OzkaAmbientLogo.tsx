import React from 'react';
import { motion } from 'motion/react';

interface OzkaAmbientLogoProps {
  glowColor?: 'mavi' | 'bordo' | 'sari';
  isDarkMode?: boolean;
  className?: string;
  onClick?: () => void;
}

export const OzkaAmbientLogo: React.FC<OzkaAmbientLogoProps> = ({
  glowColor = 'mavi',
  isDarkMode = true,
  className = '',
  onClick,
}) => {
  // Göz alıcı ve zengin ambiyans renk paletleri
  const palettes = {
    mavi: {
      primary: '#0ea5e9', // Sky Blue
      accent: '#22d3ee', // Cyan
      secondary: '#3b82f6', // Cobalt Blue
      glowWide: 'rgba(14, 165, 233, 0.35)',
      glowCore: 'rgba(34, 211, 238, 0.65)',
      rayGradient: 'from-cyan-400/25 via-blue-500/15 to-transparent',
      ringGradient: 'from-cyan-400/60 via-blue-500/20 to-transparent',
      badgeBg: 'bg-cyan-500/10 border-cyan-400/30 text-cyan-300',
      badgeDot: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
      particle: '#38bdf8',
    },
    bordo: {
      primary: '#e11d48', // Ruby Rose
      accent: '#f43f5e', // Bright Rose
      secondary: '#be123c', // Deep Bordo
      glowWide: 'rgba(225, 29, 72, 0.35)',
      glowCore: 'rgba(244, 63, 94, 0.65)',
      rayGradient: 'from-rose-500/25 via-[#be123c]/15 to-transparent',
      ringGradient: 'from-rose-400/60 via-[#be123c]/20 to-transparent',
      badgeBg: 'bg-rose-500/10 border-rose-400/30 text-rose-300',
      badgeDot: 'bg-rose-400 shadow-[0_0_8px_#f43f5e]',
      particle: '#fb7185',
    },
    sari: {
      primary: '#f59e0b', // Amber Gold
      accent: '#facc15', // Bright Yellow
      secondary: '#d97706', // Warm Bronze
      glowWide: 'rgba(245, 158, 11, 0.35)',
      glowCore: 'rgba(250, 204, 21, 0.65)',
      rayGradient: 'from-amber-400/25 via-yellow-500/15 to-transparent',
      ringGradient: 'from-yellow-400/60 via-amber-500/20 to-transparent',
      badgeBg: 'bg-amber-500/10 border-amber-400/30 text-amber-300',
      badgeDot: 'bg-amber-400 shadow-[0_0_8px_#facc15]',
      particle: '#fde047',
    },
  };

  const theme = palettes[glowColor] || palettes.mavi;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`relative flex flex-col items-center justify-center select-none cursor-pointer group py-2 sm:py-3 ${className}`}
      onClick={onClick}
    >
      {/* 1. YUKARI DOĞRU SÜZÜLEN IŞIK HUZMESİ (AURORA SPOTLIGHT) */}
      <motion.div
        animate={{
          opacity: [0.4, 0.75, 0.4],
          scaleY: [0.95, 1.15, 0.95],
        }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`absolute -top-10 sm:-top-14 w-40 sm:w-52 h-44 sm:h-52 bg-gradient-to-t ${theme.rayGradient} blur-2xl pointer-events-none -z-20`}
        style={{
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
        }}
      />

      {/* 2. GENİŞ ATMOSFERİK HALO (NEFES ALAN ARKA PLAN BULUTU) */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          opacity: isDarkMode ? [0.45, 0.75, 0.45] : [0.25, 0.45, 0.25],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full blur-3xl pointer-events-none -z-10"
        style={{
          background: `radial-gradient(circle, ${theme.glowCore} 0%, ${theme.glowWide} 45%, transparent 75%)`,
        }}
      />

      {/* 3. DÖNEN ÇİFT YÖRÜNGE HALKALARI (ZARİF GEOMETRİK AMBİYANS) */}
      {/* Dış Halka - Saat Yönünde Yavaş Dönüş */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full pointer-events-none -z-10"
        style={{
          border: '1.2px dashed',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.15)',
        }}
      >
        {/* Yörünge Yıldızı 1 */}
        <span
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full flex items-center justify-center"
        >
          <span
            className="w-2 h-2 rounded-full shadow-lg animate-ping absolute"
            style={{ backgroundColor: theme.accent }}
          />
          <span
            className="w-2 h-2 rounded-full shadow-lg relative"
            style={{
              backgroundColor: theme.accent,
              boxShadow: `0 0 12px ${theme.accent}, 0 0 4px #ffffff`,
            }}
          />
        </span>

        {/* Yörünge Yıldızı 2 */}
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: theme.primary,
            boxShadow: `0 0 8px ${theme.primary}`,
          }}
        />
      </motion.div>

      {/* İç Halka - Ters Yöne Dönüş (Optik Kozmik Derinlik) */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        className="absolute w-28 h-28 sm:w-34 sm:h-34 rounded-full pointer-events-none -z-10"
        style={{
          border: '1px solid',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.08)',
          boxShadow: `0 0 20px -5px ${theme.glowWide}`,
        }}
      >
        <span
          className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: theme.secondary,
            boxShadow: `0 0 8px ${theme.secondary}`,
          }}
        />
      </motion.div>

      {/* 4. HAVADA UÇUŞAN MİKRO PARILTI TOZLARI (SPARKLE PARTICLES) */}
      {[
        { x: -48, y: -24, delay: 0, dur: 3.2, size: 2.5 },
        { x: 50, y: -16, delay: 1, dur: 3.8, size: 2 },
        { x: -38, y: 32, delay: 1.8, dur: 4.1, size: 2 },
        { x: 44, y: 28, delay: 0.6, dur: 3.5, size: 2.5 },
      ].map((p, idx) => (
        <motion.span
          key={idx}
          animate={{
            y: [p.y, p.y - 14, p.y],
            opacity: [0.2, 0.9, 0.2],
            scale: [0.8, 1.3, 0.8],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute rounded-full pointer-events-none -z-5"
          style={{
            left: `calc(50% + ${p.x}px)`,
            top: `calc(50% + ${p.y}px)`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: theme.particle,
            boxShadow: `0 0 8px ${theme.particle}`,
          }}
        />
      ))}

      {/* 5. ANA SÜZÜLEN LOGO MADALYONU (LEVITATING EMBLEM) */}
      <motion.div
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 3.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        whileHover={{ scale: 1.08, y: -11 }}
        whileTap={{ scale: 0.96 }}
        className="relative flex flex-col items-center justify-center"
      >
        {/* Madalyon Arkası Işıklı Kristal Lens */}
        <div
          className="relative rounded-full p-2 transition-all duration-700"
          style={{
            background: isDarkMode
              ? 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.12) 0%, rgba(15,23,42,0.4) 60%, transparent 100%)'
              : 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.9) 0%, rgba(241,245,249,0.5) 60%, transparent 100%)',
            boxShadow: isDarkMode
              ? `0 16px 36px -8px rgba(0,0,0,0.8), 0 0 25px 2px ${theme.glowWide}`
              : `0 16px 32px -8px rgba(15,23,42,0.18), 0 0 25px 2px ${theme.glowWide}`,
          }}
        >
          {/* Logo Vektörü (Büyütülmüş, Son Derece Net ve Keskin) */}
          <div className="w-20 h-26 sm:w-24 sm:h-30 relative flex items-center justify-center">
            <svg
              viewBox="0 0 100 135"
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Daire Kırpma Alanı */}
                <clipPath id="ambientLogoClipV2">
                  <circle cx="50" cy="76" r="41" />
                </clipPath>

                {/* Gökdelen Kule Gradyanı (Derinlik ve Metalik Işıma) */}
                <linearGradient id="towerGradientV2" x1="36" y1="6" x2="64" y2="56" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#75aaff" />
                  <stop offset="45%" stopColor="#4c82f2" />
                  <stop offset="100%" stopColor="#2c5dc4" />
                </linearGradient>

                {/* Madalyon Taban Gece Gradyanı */}
                <linearGradient id="circleBgGradientV2" x1="50" y1="35" x2="50" y2="117" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#271f54" />
                  <stop offset="50%" stopColor="#1c1642" />
                  <stop offset="100%" stopColor="#120e2e" />
                </linearGradient>

                {/* Çatı Kemer Gradyanı */}
                <linearGradient id="archGradientV2" x1="50" y1="56" x2="50" y2="114" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#5588f5" />
                  <stop offset="100%" stopColor="#3b6fd8" />
                </linearGradient>
              </defs>

              {/* Koyu İndigo / Gece Mavisi Zemin Dairesi */}
              <circle cx="50" cy="76" r="41" fill="url(#circleBgGradientV2)" />

              {/* Daire Kenar İnce Işıltı Çerçevesi */}
              <circle
                cx="50"
                cy="76"
                r="40"
                stroke="rgba(255, 255, 255, 0.35)"
                strokeWidth="1.2"
                fill="none"
              />

              {/* Sol Gökdelen Kulesi */}
              <polygon
                points="36,25 47,19 47,56 36,56"
                fill="url(#towerGradientV2)"
                stroke="#ffffff"
                strokeWidth="1.9"
                strokeLinejoin="round"
              />

              {/* Sağ Gökdelen Kulesi (Daha Yüksek ve İhtişamlı) */}
              <polygon
                points="52.5,12 63.5,6 63.5,56 52.5,56"
                fill="url(#towerGradientV2)"
                stroke="#ffffff"
                strokeWidth="1.9"
                strokeLinejoin="round"
              />

              {/* Daire İçindeki Kemer, Şevron ve Kapı Yapısı */}
              <g clipPath="url(#ambientLogoClipV2)">
                {/* 1. Dış Beyaz Şevron Çerçevesi */}
                <path
                  d="M 17,105 L 17,70 L 50,49 L 83,70 L 83,105 L 75,105 L 75,74 L 50,58 L 25,74 L 25,105 Z"
                  fill="#ffffff"
                />

                {/* 2. Orta Mavi Şevron Bandı */}
                <path
                  d="M 23,108 L 23,73 L 50,56 L 77,73 L 77,108 L 69,108 L 69,77 L 50,65 L 31,77 L 31,108 Z"
                  fill="url(#archGradientV2)"
                />

                {/* 3. İç Beyaz Boşluk Hattı */}
                <path
                  d="M 31,110 L 31,77 L 50,65 L 69,77 L 69,110 L 61,110 L 61,81 L 50,74 L 39,81 L 39,110 Z"
                  fill="#ffffff"
                />

                {/* 4. İç Mavi Kemer / Portal Binası */}
                <path
                  d="M 39,114 L 39,81 L 50,73 L 61,81 L 61,114 L 54,114 L 54,85 L 50,82 L 46,85 L 46,114 Z"
                  fill="url(#archGradientV2)"
                />

                {/* 5. En İç Beyaz Kapı / Giriş Boşluğu */}
                <path
                  d="M 46,114 L 46,85 L 50,82 L 54,85 L 54,114 Z"
                  fill="#ffffff"
                />

                {/* Alt Kenar Mavi Yay Vurguları */}
                <path
                  d="M 19,98 C 22,108 30,115 40,117 L 38,111 C 30,109 23,103 21,96 Z"
                  fill="url(#archGradientV2)"
                />
                <path
                  d="M 81,98 C 78,108 70,115 60,117 L 62,111 C 70,109 77,103 79,96 Z"
                  fill="url(#archGradientV2)"
                />
              </g>

              {/* Çatı Tepe Birleşim Hattı Beyaz Vurgusu */}
              <polyline
                points="36,56 50,48 63.5,56"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
            </svg>

            {/* Hareketli Çapraz Işık Pırıltısı (Periodic Specular Sweep) */}
            <motion.div
              animate={{
                x: [-90, 90],
                opacity: [0, 0.7, 0],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                repeatDelay: 2.5,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 pointer-events-none overflow-hidden rounded-full"
            >
              <div className="w-8 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-30deg] blur-xs" />
            </motion.div>
          </div>
        </div>

        {/* 6. LOGO ALTI NEFES ALAN YUMUŞAK YANSIMA GÖLGESİ */}
        <motion.div
          animate={{
            scale: [0.85, 1.25, 0.85],
            opacity: [0.35, 0.7, 0.35],
          }}
          transition={{
            duration: 3.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-20 sm:w-26 h-2.5 rounded-full blur-md -mt-1 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${theme.glowCore} 0%, transparent 75%)`,
          }}
        />

        {/* 7. PRESTİJLİ MİNİ MARKA ŞERİDİ (ÖZKA İNŞAAT) */}
        <div
          className={`mt-2 px-3 py-0.5 rounded-full border text-[10px] font-black tracking-[0.25em] uppercase flex items-center gap-1.5 backdrop-blur-md transition-all duration-500 shadow-sm ${
            isDarkMode
              ? theme.badgeBg
              : 'bg-white/90 border-slate-300 text-slate-800 shadow-slate-200/60'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${theme.badgeDot} animate-pulse`} />
          <span>ÖZKA İNŞAAT</span>
        </div>
      </motion.div>
    </motion.div>
  );
};
