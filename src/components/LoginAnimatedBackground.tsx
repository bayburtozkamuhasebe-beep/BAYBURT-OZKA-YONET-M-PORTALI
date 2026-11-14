import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Waves, Compass, Moon } from 'lucide-react';

export type AmbianceTheme = 'aurora' | 'topography' | 'starlight';

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  phase: number;
}

interface SoftPulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface LoginAnimatedBackgroundProps {
  initialTheme?: AmbianceTheme;
  theme?: AmbianceTheme;
  onThemeChange?: (theme: AmbianceTheme) => void;
  interactive?: boolean;
  showControls?: boolean;
  opacityClass?: string;
  isLightMode?: boolean;
}

export const LoginAnimatedBackground: React.FC<LoginAnimatedBackgroundProps> = ({
  initialTheme = 'aurora',
  theme: controlledTheme,
  onThemeChange,
  interactive = true,
  showControls = true,
  opacityClass = 'opacity-100',
  isLightMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [internalTheme, setInternalTheme] = useState<AmbianceTheme>(() => {
    try {
      const saved = localStorage.getItem('ozka_ambiance_theme');
      if (saved === 'aurora' || saved === 'topography' || saved === 'starlight') {
        return saved;
      }
    } catch {
      // ignore
    }
    return initialTheme;
  });

  const activeTheme = controlledTheme || internalTheme;

  const handleSelectTheme = (newTheme: AmbianceTheme) => {
    if (onThemeChange) {
      onThemeChange(newTheme);
    } else {
      setInternalTheme(newTheme);
    }
    try {
      localStorage.setItem('ozka_ambiance_theme', newTheme);
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
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracking with heavy damping for silky smooth motion
    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    const softPulses: SoftPulse[] = [];

    const handleClick = (e: MouseEvent) => {
      if (!interactive) return;
      if (softPulses.length < 3) {
        softPulses.push({
          x: e.clientX,
          y: e.clientY,
          radius: 12,
          maxRadius: Math.min(width, height) * 0.35,
          alpha: 0.45,
        });
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);

    // 28 sakin, göz yormayan ışık tozu
    const motes: Mote[] = [];
    const moteCount = 28;
    for (let i = 0; i < moteCount; i++) {
      motes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -Math.random() * 0.35 - 0.1,
        size: Math.random() * 1.8 + 0.8,
        baseAlpha: Math.random() * 0.35 + 0.15,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    // RENDER DÖNGÜSÜ
    const render = () => {
      time += 0.006; // Çok yavaş ve sakin akış

      // İpeksi yumuşak fare takibi
      mouse.x += (mouse.targetX - mouse.x) * 0.035;
      mouse.y += (mouse.targetY - mouse.y) * 0.035;

      ctx.clearRect(0, 0, width, height);

      // Temaya Göre Renk Paletleri
      let bgGradientColors = isLightMode
        ? ['#f8fafc', '#f1f5f9', '#e2e8f0']
        : ['#020617', '#060d1f', '#030816'];
      let wavePalettes: Array<{
        colorTop: string;
        colorBottom: string;
        lineColor: string;
        glow: string;
      }> = [];

      if (activeTheme === 'aurora') {
        // Kuzey Işıkları: Gece safiri, derin zümrüt ve hafif akuamarin
        bgGradientColors = isLightMode
          ? ['#f0fdf4', '#f1f5f9', '#e0f2fe']
          : ['#020713', '#051126', '#030918'];
        wavePalettes = [
          {
            colorTop: isLightMode ? 'rgba(16, 185, 129, 0.12)' : 'rgba(6, 78, 59, 0.18)',
            colorBottom: 'rgba(2, 6, 23, 0.0)',
            lineColor: isLightMode ? 'rgba(5, 150, 105, 0.45)' : 'rgba(52, 211, 153, 0.35)',
            glow: 'rgba(16, 185, 129, 0.25)',
          },
          {
            colorTop: isLightMode ? 'rgba(6, 182, 212, 0.10)' : 'rgba(14, 116, 144, 0.16)',
            colorBottom: 'rgba(2, 6, 23, 0.0)',
            lineColor: isLightMode ? 'rgba(8, 145, 178, 0.40)' : 'rgba(56, 189, 248, 0.30)',
            glow: 'rgba(6, 182, 212, 0.20)',
          },
          {
            colorTop: isLightMode ? 'rgba(59, 130, 246, 0.10)' : 'rgba(30, 58, 138, 0.15)',
            colorBottom: 'rgba(2, 6, 23, 0.0)',
            lineColor: isLightMode ? 'rgba(37, 99, 235, 0.40)' : 'rgba(96, 165, 250, 0.28)',
            glow: 'rgba(59, 130, 246, 0.18)',
          },
          {
            colorTop: isLightMode ? 'rgba(99, 102, 241, 0.08)' : 'rgba(67, 56, 202, 0.12)',
            colorBottom: 'rgba(2, 6, 23, 0.0)',
            lineColor: isLightMode ? 'rgba(79, 70, 229, 0.35)' : 'rgba(129, 140, 248, 0.22)',
            glow: 'rgba(99, 102, 241, 0.15)',
          },
        ];
      } else if (activeTheme === 'topography') {
        // Mimari Ufuk: Sıcak altın-kehribar esintisi, platin ve lacivert topoğrafya
        bgGradientColors = isLightMode
          ? ['#fefce8', '#f8fafc', '#f1f5f9']
          : ['#040711', '#0b1120', '#060a16'];
        wavePalettes = [
          {
            colorTop: isLightMode ? 'rgba(217, 119, 6, 0.12)' : 'rgba(180, 83, 9, 0.14)',
            colorBottom: 'rgba(2, 6, 23, 0.0)',
            lineColor: isLightMode ? 'rgba(180, 83, 9, 0.45)' : 'rgba(251, 191, 36, 0.32)',
            glow: 'rgba(245, 158, 11, 0.22)',
          },
          {
            colorTop: isLightMode ? 'rgba(202, 138, 4, 0.10)' : 'rgba(161, 98, 7, 0.12)',
            colorBottom: 'rgba(2, 6, 23, 0.0)',
            lineColor: isLightMode ? 'rgba(161, 98, 7, 0.40)' : 'rgba(253, 230, 138, 0.26)',
            glow: 'rgba(217, 119, 6, 0.18)',
          },
          {
            colorTop: isLightMode ? 'rgba(100, 116, 139, 0.12)' : 'rgba(30, 41, 59, 0.18)',
            colorBottom: 'rgba(2, 6, 23, 0.0)',
            lineColor: isLightMode ? 'rgba(71, 85, 105, 0.40)' : 'rgba(148, 163, 184, 0.25)',
            glow: 'rgba(100, 116, 139, 0.15)',
          },
          {
            colorTop: isLightMode ? 'rgba(51, 65, 85, 0.08)' : 'rgba(15, 23, 42, 0.15)',
            colorBottom: 'rgba(2, 6, 23, 0.0)',
            lineColor: isLightMode ? 'rgba(30, 41, 59, 0.35)' : 'rgba(203, 213, 225, 0.20)',
            glow: 'rgba(148, 163, 184, 0.12)',
          },
        ];
      } else {
        // Gece Gökyüzü: Derin kozmik gece, ametist ve safir yıldız tozu
        bgGradientColors = isLightMode
          ? ['#faf5ff', '#f8fafc', '#f1f5f9']
          : ['#02040c', '#080d22', '#040714'];
        wavePalettes = [
          {
            colorTop: isLightMode ? 'rgba(147, 51, 234, 0.10)' : 'rgba(88, 28, 135, 0.15)',
            colorBottom: 'rgba(2, 6, 23, 0.0)',
            lineColor: isLightMode ? 'rgba(126, 34, 206, 0.40)' : 'rgba(192, 132, 252, 0.30)',
            glow: 'rgba(168, 85, 247, 0.20)',
          },
          {
            colorTop: isLightMode ? 'rgba(59, 130, 246, 0.10)' : 'rgba(30, 58, 138, 0.15)',
            colorBottom: 'rgba(2, 6, 23, 0.0)',
            lineColor: isLightMode ? 'rgba(37, 99, 235, 0.38)' : 'rgba(96, 165, 250, 0.28)',
            glow: 'rgba(59, 130, 246, 0.18)',
          },
          {
            colorTop: isLightMode ? 'rgba(15, 23, 42, 0.10)' : 'rgba(15, 23, 42, 0.18)',
            colorBottom: 'rgba(2, 6, 23, 0.0)',
            lineColor: isLightMode ? 'rgba(30, 41, 59, 0.35)' : 'rgba(147, 197, 253, 0.24)',
            glow: 'rgba(96, 165, 250, 0.14)',
          },
          {
            colorTop: isLightMode ? 'rgba(24, 24, 27, 0.08)' : 'rgba(24, 24, 27, 0.16)',
            colorBottom: 'rgba(2, 6, 23, 0.0)',
            lineColor: isLightMode ? 'rgba(51, 65, 85, 0.30)' : 'rgba(224, 231, 255, 0.18)',
            glow: 'rgba(199, 210, 254, 0.10)',
          },
        ];
      }

      // 1. ZEMİN ATMOSFERİK IŞIK KÜRESİ (Mouse Takip Eden Yumuşak Işıma)
      const ambientRadial = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        Math.max(width, height) * 0.45
      );
      if (activeTheme === 'aurora') {
        ambientRadial.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
        ambientRadial.addColorStop(0.5, 'rgba(6, 182, 212, 0.04)');
        ambientRadial.addColorStop(1, 'rgba(2, 6, 23, 0)');
      } else if (activeTheme === 'topography') {
        ambientRadial.addColorStop(0, 'rgba(245, 158, 11, 0.07)');
        ambientRadial.addColorStop(0.5, 'rgba(59, 130, 246, 0.03)');
        ambientRadial.addColorStop(1, 'rgba(2, 6, 23, 0)');
      } else {
        ambientRadial.addColorStop(0, 'rgba(168, 85, 247, 0.07)');
        ambientRadial.addColorStop(0.5, 'rgba(59, 130, 246, 0.03)');
        ambientRadial.addColorStop(1, 'rgba(2, 6, 23, 0)');
      }
      ctx.fillStyle = ambientRadial;
      ctx.fillRect(0, 0, width, height);

      // 2. YUMUŞAK AKICI İPEK VE DALGA KATMANLARI
      const waveCount = wavePalettes.length;
      for (let i = 0; i < waveCount; i++) {
        const palette = wavePalettes[i];
        const baseY = height * (0.68 + i * 0.08);
        const amplitude = 32 + i * 8;
        const frequency = 0.0018 + i * 0.0006;
        const speed = (0.7 + i * 0.3) * (i % 2 === 0 ? 1 : -0.85);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, height);

        const step = 14;
        const wavePoints: { x: number; y: number }[] = [];

        for (let x = 0; x <= width + step; x += step) {
          const distToMouse = Math.abs(x - mouse.x);
          const mouseLift = Math.exp(-(distToMouse * distToMouse) / 60000) * (mouse.y - baseY) * 0.18;

          const harmonic =
            Math.sin(x * frequency + time * speed + i * 1.5) * amplitude +
            Math.cos(x * frequency * 0.5 - time * 0.4) * (amplitude * 0.45) +
            mouseLift;

          const y = baseY + harmonic;
          wavePoints.push({ x, y });

          if (x === 0) {
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        const fillGrad = ctx.createLinearGradient(0, baseY - amplitude, 0, height);
        fillGrad.addColorStop(0, palette.colorTop);
        fillGrad.addColorStop(1, palette.colorBottom);
        ctx.fillStyle = fillGrad;
        ctx.fill();

        ctx.beginPath();
        for (let p = 0; p < wavePoints.length; p++) {
          const pt = wavePoints[p];
          if (p === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = palette.lineColor;
        ctx.lineWidth = 1.3;
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = 8;
        ctx.stroke();

        ctx.restore();
      }

      // 3. TIKLAMA İLE YAYILAN NAZİK HALKA (Sakin Su Dalgası)
      for (let p = softPulses.length - 1; p >= 0; p--) {
        const pulse = softPulses[p];
        pulse.radius += 2.2;
        pulse.alpha *= 0.965;

        if (pulse.alpha > 0.01 && pulse.radius < pulse.maxRadius) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
          ctx.strokeStyle =
            activeTheme === 'aurora'
              ? `rgba(52, 211, 153, ${pulse.alpha})`
              : activeTheme === 'topography'
              ? `rgba(251, 191, 36, ${pulse.alpha})`
              : `rgba(147, 197, 253, ${pulse.alpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();
        } else {
          softPulses.splice(p, 1);
        }
      }

      // 4. SAKİN VE DİNLENDİRİCİ IŞIK TOZLARI & NAZİK TAKIMYILDIZ BAĞLANTILARI
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.x += m.vx;
        m.y += m.vy;

        if (m.y < -20) {
          m.y = height + 20;
          m.x = Math.random() * width;
        }
        if (m.x < -20) m.x = width + 20;
        if (m.x > width + 20) m.x = -20;

        const currentAlpha = m.baseAlpha + Math.sin(time * 2 + m.phase) * 0.12;
        const finalAlpha = Math.max(0.04, Math.min(0.5, currentAlpha));

        ctx.save();
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);

        if (activeTheme === 'aurora') {
          ctx.fillStyle = isLightMode
            ? `rgba(5, 150, 105, ${finalAlpha})`
            : `rgba(167, 243, 208, ${finalAlpha})`;
          ctx.shadowColor = '#34d399';
        } else if (activeTheme === 'topography') {
          ctx.fillStyle = isLightMode
            ? `rgba(180, 83, 9, ${finalAlpha})`
            : `rgba(254, 243, 199, ${finalAlpha})`;
          ctx.shadowColor = '#fbbf24';
        } else {
          ctx.fillStyle = isLightMode
            ? `rgba(109, 40, 217, ${finalAlpha})`
            : `rgba(224, 231, 255, ${finalAlpha})`;
          ctx.shadowColor = '#a78bfa';
        }

        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();

        for (let j = i + 1; j < motes.length; j++) {
          const m2 = motes[j];
          const dx = m.x - m2.x;
          const dy = m.y - m2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            const lineAlpha = (1 - dist / 110) * 0.12;
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(m2.x, m2.y);
            ctx.strokeStyle =
              activeTheme === 'aurora'
                ? `rgba(52, 211, 153, ${lineAlpha})`
                : activeTheme === 'topography'
                ? `rgba(251, 191, 36, ${lineAlpha})`
                : `rgba(167, 139, 250, ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTheme, interactive, isLightMode]);

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden select-none z-0 transition-opacity duration-700 ${opacityClass}`}>
      {/* 1. Statik Zemin Derinlik Gradyanı */}
      <div
        className={`absolute inset-0 transition-colors duration-1000 ${
          isLightMode
            ? activeTheme === 'aurora'
              ? 'bg-gradient-to-b from-[#f0fdf4] via-[#f8fafc] to-[#e2e8f0]'
              : activeTheme === 'topography'
              ? 'bg-gradient-to-b from-[#fefce8] via-[#f8fafc] to-[#e2e8f0]'
              : 'bg-gradient-to-b from-[#faf5ff] via-[#f8fafc] to-[#e2e8f0]'
            : activeTheme === 'aurora'
            ? 'bg-gradient-to-b from-[#020713] via-[#041021] to-[#01040a]'
            : activeTheme === 'topography'
            ? 'bg-gradient-to-b from-[#030611] via-[#090e1d] to-[#020409]'
            : 'bg-gradient-to-b from-[#010309] via-[#060a1c] to-[#010207]'
        }`}
      />

      {/* 2. Yumuşak Atmosferik Işık Havuzu (Göz Dinlendirici Ethereal Blur) */}
      <div className="absolute inset-0 opacity-45 pointer-events-none">
        <div
          className={`absolute top-[-15%] left-[20%] w-[600px] h-[600px] rounded-full blur-[140px] transition-all duration-1000 ${
            activeTheme === 'aurora'
              ? 'bg-emerald-600/15'
              : activeTheme === 'topography'
              ? 'bg-amber-600/12'
              : 'bg-indigo-600/15'
          }`}
        />
        <div
          className={`absolute bottom-[-10%] right-[15%] w-[550px] h-[550px] rounded-full blur-[150px] transition-all duration-1000 ${
            activeTheme === 'aurora'
              ? 'bg-blue-600/15'
              : activeTheme === 'topography'
              ? 'bg-blue-700/10'
              : 'bg-purple-600/12'
          }`}
        />
      </div>

      {/* 3. İnce Mimari Izgara Dokusu */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* 4. Sanatsal Tuval (Canvas) */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 block w-full h-full ${
          interactive ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      />

      {/* 5. Zarif & Sade Ambiyans Seçici (SOL ÜSTE TAM HİZALI & EKRANA SIĞACAK DERLİ TOPLU) */}
      {showControls && (
        <div className="absolute top-2.5 sm:top-3.5 left-2.5 sm:left-4 pointer-events-auto z-40">
          <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-lg shadow-black/20 text-slate-800 backdrop-blur-md transition-all duration-300">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectTheme('aurora');
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-300 ${
                activeTheme === 'aurora'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-500 scale-102'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Kuzey Işıkları (Sakin Gece Mavisi & Zümrüt)"
            >
              <Waves className={`w-3.5 h-3.5 ${activeTheme === 'aurora' ? 'text-white' : 'text-emerald-500'}`} />
              <span className="hidden md:inline">Kuzey Işıkları</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectTheme('topography');
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-300 ${
                activeTheme === 'topography'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-1 ring-amber-500 scale-102'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Mimari Ufuk (Sakin Kehribar & Proje Konturları)"
            >
              <Compass className={`w-3.5 h-3.5 ${activeTheme === 'topography' ? 'text-white' : 'text-amber-500'}`} />
              <span className="hidden md:inline">Mimari Ufuk</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectTheme('starlight');
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-300 ${
                activeTheme === 'starlight'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-500 scale-102'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Gece Gökyüzü (Kozmik Gece & Takımyıldız)"
            >
              <Moon className={`w-3.5 h-3.5 ${activeTheme === 'starlight' ? 'text-white' : 'text-indigo-500'}`} />
              <span className="hidden md:inline">Gece Gökyüzü</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
