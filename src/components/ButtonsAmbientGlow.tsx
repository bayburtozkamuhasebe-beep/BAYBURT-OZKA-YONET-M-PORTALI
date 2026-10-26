import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Waves, Sun, Flame, Droplets, Wine } from 'lucide-react';

export type AmbientMood = 'bordo' | 'aurora' | 'gold' | 'cosmic' | 'ocean';

interface ButtonsAmbientGlowProps {
  darkMode?: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  color: string;
  pulseSpeed: number;
  phase: number;
  rotation: number;
  rotSpeed: number;
}

export const ButtonsAmbientGlow: React.FC<ButtonsAmbientGlowProps> = ({
  darkMode = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // KULLANICI TALEBİ: Varsayılan mod "bordo" (Açık Bordo & Yanarlı Dönerli)
  const [activeMood, setActiveMood] = useState<AmbientMood>(() => {
    try {
      const saved = localStorage.getItem('ozka_buttons_ambient_mood');
      if (
        saved === 'bordo' ||
        saved === 'aurora' ||
        saved === 'gold' ||
        saved === 'cosmic' ||
        saved === 'ocean'
      ) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'bordo';
  });

  const handleSelectMood = (mood: AmbientMood) => {
    setActiveMood(mood);
    try {
      localStorage.setItem('ozka_buttons_ambient_mood', mood);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      const parent = containerRef.current || canvas.parentElement;
      if (!parent) return;
      width = canvas.width = parent.clientWidth;
      height = canvas.height = parent.clientHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    // Mouse tracking for interactive water/aurora ripple
    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      isHovered: false,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.isHovered = true;
    };

    const handleMouseLeave = () => {
      mouse.isHovered = false;
      mouse.targetX = width / 2;
      mouse.targetY = height / 2;
    };

    const parentEl = containerRef.current || canvas.parentElement;
    if (parentEl) {
      parentEl.addEventListener('mousemove', handleMouseMove as EventListener);
      parentEl.addEventListener('mouseleave', handleMouseLeave as EventListener);
    }

    // Color palettes per mood (Öncelikli: Açık Bordo & Yanarlı Dönerli Işıltı)
    const getMoodPalettes = (mood: AmbientMood, timeVal: number) => {
      switch (mood) {
        case 'bordo':
        default: {
          // Yanarlı dönerli dinamik renk geçişi (Açık bordo, yakut kırmızısı, altın ışıltı ve pembe fuşya)
          const shimmerShift = Math.sin(timeVal * 1.5) * 15;
          return {
            wave1: [
              `rgba(${225 + Math.floor(shimmerShift)}, 29, 72, 0.55)`,
              'rgba(251, 113, 133, 0.35)',
              'transparent',
            ],
            wave2: [
              'rgba(244, 63, 94, 0.45)',
              'rgba(251, 191, 36, 0.28)', // Yanarlı dönerli altın parıltı
              'transparent',
            ],
            wave3: [
              'rgba(190, 18, 60, 0.40)',
              'rgba(236, 72, 153, 0.25)', // Fuşya/yakut geçişi
              'transparent',
            ],
            particleColors: ['#fb7185', '#fda4af', '#f43f5e', '#fde047', '#fecdd3', '#f472b6'],
            glowRgb: '225, 29, 72',
          };
        }
        case 'gold':
          return {
            wave1: ['rgba(245, 158, 11, 0.40)', 'rgba(251, 191, 36, 0.25)', 'transparent'],
            wave2: ['rgba(234, 88, 12, 0.35)', 'rgba(245, 158, 11, 0.20)', 'transparent'],
            wave3: ['rgba(252, 211, 77, 0.30)', 'rgba(217, 119, 6, 0.15)', 'transparent'],
            particleColors: ['#fbbf24', '#f59e0b', '#fde047', '#f97316'],
            glowRgb: '245, 158, 11',
          };
        case 'cosmic':
          return {
            wave1: ['rgba(139, 92, 246, 0.45)', 'rgba(236, 72, 153, 0.25)', 'transparent'],
            wave2: ['rgba(192, 132, 252, 0.35)', 'rgba(99, 102, 241, 0.20)', 'transparent'],
            wave3: ['rgba(244, 114, 182, 0.30)', 'rgba(168, 85, 247, 0.15)', 'transparent'],
            particleColors: ['#c084fc', '#f472b6', '#a855f7', '#818cf8'],
            glowRgb: '168, 85, 247',
          };
        case 'ocean':
          return {
            wave1: ['rgba(6, 182, 212, 0.45)', 'rgba(14, 165, 233, 0.25)', 'transparent'],
            wave2: ['rgba(20, 184, 166, 0.35)', 'rgba(56, 189, 248, 0.20)', 'transparent'],
            wave3: ['rgba(45, 212, 191, 0.30)', 'rgba(2, 132, 199, 0.15)', 'transparent'],
            particleColors: ['#22d3ee', '#38bdf8', '#2dd4bf', '#67e8f9'],
            glowRgb: '6, 182, 212',
          };
        case 'aurora':
          return {
            wave1: ['rgba(16, 185, 129, 0.45)', 'rgba(6, 182, 212, 0.30)', 'transparent'],
            wave2: ['rgba(59, 130, 246, 0.40)', 'rgba(139, 92, 246, 0.22)', 'transparent'],
            wave3: ['rgba(45, 212, 191, 0.35)', 'rgba(245, 158, 11, 0.20)', 'transparent'],
            particleColors: ['#34d399', '#38bdf8', '#a78bfa', '#fcd34d'],
            glowRgb: '16, 185, 129',
          };
      }
    };

    // Particles: floating light motes with yanarlı dönerli shimmer
    const particles: Particle[] = [];
    const particleCount = 42;

    for (let i = 0; i < particleCount; i++) {
      const palette = getMoodPalettes(activeMood, 0);
      particles.push({
        x: Math.random() * (width || 800),
        y: Math.random() * (height || 300),
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.22 - Math.random() * 0.38,
        size: 1.2 + Math.random() * 2.4,
        baseAlpha: 0.3 + Math.random() * 0.6,
        alpha: 0.35,
        color: palette.particleColors[Math.floor(Math.random() * palette.particleColors.length)],
        pulseSpeed: 0.025 + Math.random() * 0.035,
        phase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
      });
    }

    let t = 0;

    const render = () => {
      t += 0.016;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const palette = getMoodPalettes(activeMood, t);
      const isDark = darkMode;

      // 1. ZEMİNDE HAREKET EDEN AÇIK BORDO & YANARLI DÖNERLİ AMBİYANS IŞIK HAVUZLARI
      const pool1X = width * 0.25 + Math.sin(t * 0.9) * (width * 0.14);
      const pool1Y = height * 0.65 + Math.cos(t * 0.7) * 20;
      const grad1 = ctx.createRadialGradient(pool1X, pool1Y, 5, pool1X, pool1Y, width * 0.38);
      grad1.addColorStop(0, palette.wave1[0]);
      grad1.addColorStop(0.5, palette.wave1[1]);
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const pool2X = width * 0.75 + Math.cos(t * 0.8) * (width * 0.14);
      const pool2Y = height * 0.7 + Math.sin(t * 0.6) * 22;
      const grad2 = ctx.createRadialGradient(pool2X, pool2Y, 5, pool2X, pool2Y, width * 0.4);
      grad2.addColorStop(0, palette.wave2[0]);
      grad2.addColorStop(0.5, palette.wave2[1]);
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Mouse interactive light spotlight
      if (mouse.isHovered) {
        const mouseGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 160);
        mouseGrad.addColorStop(0, `rgba(${palette.glowRgb}, ${isDark ? 0.40 : 0.25})`);
        mouseGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = mouseGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. YANARLI DÖNERLİ DALGA ŞERİTLERİ (Harmonik Sinüs & Altın/Yakut Işıltısı)
      const drawWave = (
        baseY: number,
        amplitude: number,
        freq: number,
        speed: number,
        colors: string[],
        lineWidth: number
      ) => {
        ctx.beginPath();
        ctx.moveTo(0, height);

        for (let x = 0; x <= width; x += 10) {
          const mouseDist = Math.abs(x - mouse.x);
          const mouseInfluence =
            mouse.isHovered && mouseDist < 160 ? (1 - mouseDist / 160) * 20 : 0;
          const y =
            baseY +
            Math.sin(x * freq + t * speed) * amplitude +
            Math.cos(x * freq * 0.5 + t * (speed * 0.7)) * (amplitude * 0.5) -
            mouseInfluence;

          if (x === 0) {
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        const waveGrad = ctx.createLinearGradient(0, baseY - amplitude, 0, height);
        waveGrad.addColorStop(0, colors[0]);
        waveGrad.addColorStop(0.5, colors[1]);
        waveGrad.addColorStop(1, colors[2]);

        ctx.fillStyle = waveGrad;
        ctx.fill();

        // Üst kenar parıltı çizgisi (yanarlı dönerli ışık hattı)
        ctx.beginPath();
        for (let x = 0; x <= width; x += 10) {
          const mouseDist = Math.abs(x - mouse.x);
          const mouseInfluence =
            mouse.isHovered && mouseDist < 160 ? (1 - mouseDist / 160) * 20 : 0;
          const y =
            baseY +
            Math.sin(x * freq + t * speed) * amplitude +
            Math.cos(x * freq * 0.5 + t * (speed * 0.7)) * (amplitude * 0.5) -
            mouseInfluence;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = colors[0];
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      };

      // Dalga 1: Derin Açık Bordo Zemin Dalgası
      drawWave(height * 0.66, 24, 0.0035, 1.2, palette.wave1, 1.4);

      // Dalga 2: Yanarlı Dönerli Altın-Pembe Karşıt Dalga
      drawWave(height * 0.74, 20, 0.005, -1.0, palette.wave2, 1.6);

      // Dalga 3: En Ön Parlak Yakut Ufuk Hattı
      drawWave(height * 0.83, 16, 0.007, 1.5, palette.wave3, 2.0);

      // 3. YUKARI SÜZÜLEN VE DÖNEN YANARLI DÖNERLİ PARÇACIKLAR
      particles.forEach((p) => {
        p.phase += p.pulseSpeed;
        p.rotation += p.rotSpeed;
        p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(p.phase));
        p.x += p.vx + Math.sin(p.phase * 0.5) * 0.25;
        p.y += p.vy;

        // Reset if off top or sides
        if (p.y < 0) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);

        // Parçacık Işıltı Aurası (Yanarlı dönerli parıltı)
        const pGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2.8);
        pGrad.addColorStop(0, p.color);
        pGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (isDark ? 0.95 : 0.75);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      if (parentEl) {
        parentEl.removeEventListener('mousemove', handleMouseMove as EventListener);
        parentEl.removeEventListener('mouseleave', handleMouseLeave as EventListener);
      }
    };
  }, [activeMood, darkMode]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none ${className}`}
    >
      {/* 1. DİNAMİK TUVAL: BUTONLARIN ALTINDA GERÇEK ZAMANLI AKAN HAREKETLİ AMBİYANS */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* 2. DİNAMİK YANSIMA IŞIK ÇİZGİSİ (AÇIK BORDO & YANARLI DÖNERLİ NEON AMBİYANS UFUK BANDI) */}
      <div
        className={`absolute bottom-0 inset-x-0 h-[2.5px] transition-all duration-700 pointer-events-none z-10 ${
          activeMood === 'bordo'
            ? 'bg-gradient-to-r from-rose-600/0 via-rose-400 via-amber-300 to-rose-600/0 shadow-[0_0_22px_rgba(244,63,94,0.95)]'
            : activeMood === 'aurora'
            ? 'bg-gradient-to-r from-emerald-500/0 via-cyan-400 to-emerald-500/0 shadow-[0_0_16px_rgba(6,182,212,0.8)]'
            : activeMood === 'gold'
            ? 'bg-gradient-to-r from-amber-500/0 via-yellow-400 to-amber-500/0 shadow-[0_0_16px_rgba(245,158,11,0.8)]'
            : activeMood === 'cosmic'
            ? 'bg-gradient-to-r from-purple-500/0 via-pink-400 to-purple-500/0 shadow-[0_0_16px_rgba(236,72,153,0.8)]'
            : 'bg-gradient-to-r from-cyan-500/0 via-blue-400 to-cyan-500/0 shadow-[0_0_16px_rgba(59,130,246,0.8)]'
        }`}
      />

      {/* 3. KULLANICI TALEBİ: AÇIK BORDO GÜZEL ANBİYANSLI YANARLI DÖNERLİ KONTROL ŞERİDİ */}
      <div className="relative group">
        {/* Yanarlı Dönerli Prizmatik Dış Parıltı Halesi */}
        {activeMood === 'bordo' && (
          <div className="absolute -inset-[1.5px] rounded-xl bg-gradient-to-r from-rose-600 via-amber-300 via-pink-500 to-rose-600 opacity-60 blur-xs transition-opacity pointer-events-none animate-pulse" />
        )}

        <div
          className={`relative z-20 flex items-center justify-between gap-2 px-3 py-1.5 mt-1 sm:mt-1.5 rounded-xl border backdrop-blur-md transition-all duration-500 shadow-xl overflow-hidden ${
            activeMood === 'bordo'
              ? darkMode
                ? 'bg-gradient-to-r from-[#260613]/92 via-[#3d0b1f]/92 to-[#260613]/92 border-rose-500/50 text-rose-100 shadow-[0_0_30px_rgba(225,29,72,0.38)]'
                : 'bg-gradient-to-r from-[#fff1f3]/95 via-[#ffe4e8]/95 to-[#fff1f3]/95 border-rose-300 text-rose-950 shadow-md'
              : darkMode
              ? 'bg-[#080d1a]/80 border-white/10 text-slate-200'
              : 'bg-white/90 border-slate-200 text-slate-800'
          }`}
        >
          {/* Yanarlı Dönerli Kayan Işık Efekti (Shimmer Highlight) */}
          <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-rose-300/25 via-amber-200/20 to-transparent group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

          {/* Sol Taraf: Canlı Açık Bordo Ambiyans Durum Rozeti */}
          <div className="flex items-center gap-2 text-xs">
            <div className="relative flex items-center justify-center">
              <span
                className={`animate-ping absolute inline-flex h-3 w-3 rounded-full opacity-75 ${
                  activeMood === 'bordo'
                    ? 'bg-rose-400'
                    : activeMood === 'aurora'
                    ? 'bg-emerald-400'
                    : activeMood === 'gold'
                    ? 'bg-amber-400'
                    : activeMood === 'cosmic'
                    ? 'bg-purple-400'
                    : 'bg-cyan-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  activeMood === 'bordo'
                    ? 'bg-rose-400 shadow-[0_0_10px_#fb7185]'
                    : activeMood === 'aurora'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : activeMood === 'gold'
                    ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                    : activeMood === 'cosmic'
                    ? 'bg-purple-400 shadow-[0_0_8px_#c084fc]'
                    : 'bg-cyan-400 shadow-[0_0_8px_#38bdf8]'
                }`}
              />
            </div>

            <span className="font-black tracking-wide uppercase text-[10px] sm:text-[11px] flex items-center gap-1.5">
              <Sparkles
                className={`w-3.5 h-3.5 animate-spin ${
                  activeMood === 'bordo' ? 'text-amber-300' : 'text-amber-400'
                }`}
                style={{ animationDuration: '6s' }}
              />
              <span
                className={
                  activeMood === 'bordo'
                    ? 'bg-gradient-to-r from-rose-300 via-amber-200 to-rose-200 bg-clip-text text-transparent font-black drop-shadow-xs'
                    : darkMode
                    ? 'text-white'
                    : 'text-slate-900'
                }
              >
                Canlı Buton Ambiyansı
              </span>
            </span>

            <span
              className={`hidden md:inline-block text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
                activeMood === 'bordo'
                  ? 'bg-rose-500/20 border-rose-400/40 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                  : 'bg-white/5 border-white/10 text-cyan-300'
              }`}
            >
              {activeMood === 'bordo'
                ? '🍷 Açık Bordo • Yanarlı Dönerli'
                : activeMood === 'aurora'
                ? '✨ Kuzey Işıkları Dalgası'
                : activeMood === 'gold'
                ? '👑 Asil Altın Kehribar'
                : activeMood === 'cosmic'
                ? '🌌 Kozmik Mor Parıltı'
                : '🌊 Derin Okyanus Turkuazı'}
            </span>
          </div>

          {/* Sağ Taraf: Ambiyans Mod Seçici Butonları (Açık Bordo En Başta) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSelectMood('bordo')}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-black transition-all cursor-pointer ${
                activeMood === 'bordo'
                  ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-rose-600/50 ring-1 ring-amber-300 scale-105'
                  : 'text-rose-300 hover:text-white hover:bg-rose-500/20'
              }`}
              title="Açık Bordo Ambiyansı (Yanarlı Dönerli Yakut & Şarap Işıltısı)"
            >
              <Wine className="w-3 h-3 text-rose-200" />
              <span>Açık Bordo</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMood('aurora')}
              className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                activeMood === 'aurora'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/40 ring-1 ring-emerald-400 scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="Kuzey Işıkları Ambiyansı (Zümrüt & Camgöbeği)"
            >
              <Waves className="w-3 h-3 text-emerald-300" />
              <span className="hidden sm:inline">Kuzey Işığı</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMood('gold')}
              className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                activeMood === 'gold'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md shadow-amber-500/40 ring-1 ring-amber-400 scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="Altın Kehribar Ambiyansı (Sıcak Güneş & Altın)"
            >
              <Sun className="w-3 h-3 text-amber-200" />
              <span className="hidden sm:inline">Altın</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMood('cosmic')}
              className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                activeMood === 'cosmic'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/40 ring-1 ring-purple-400 scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="Kozmik Mor Ambiyansı (Galaksi & Parıltı)"
            >
              <Flame className="w-3 h-3 text-pink-300" />
              <span className="hidden sm:inline">Kozmik</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMood('ocean')}
              className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                activeMood === 'ocean'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/40 ring-1 ring-cyan-400 scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="Okyanus Turkuazı Ambiyansı (Berrak Deniz & Mavi)"
            >
              <Droplets className="w-3 h-3 text-cyan-200" />
              <span className="hidden sm:inline">Okyanus</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
