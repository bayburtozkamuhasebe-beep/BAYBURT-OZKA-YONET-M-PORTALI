import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Info } from 'lucide-react';
import { PortalButton } from '../types';
import { DynamicIcon } from './IconHelper';

interface PortalCardProps {
  button: PortalButton;
  onClick: (button: PortalButton) => void;
  onConfigureUrl?: (button: PortalButton, e: React.MouseEvent) => void;
  playClickSound: () => void;
  viewMode: 'grid' | 'compact';
}

export const PortalCard: React.FC<PortalCardProps> = ({
  button,
  onClick,
  playClickSound,
  viewMode,
}) => {
  const handleClick = () => {
    playClickSound();
    onClick(button);
  };

  const isGroup2 = button.groupId === 2;
  const isDigerIslemler = button.id === 'diger-islemler';
  const isPersonelDigerIslemler = button.id === 'personel-diger-islemler';
  const isMisafirIslemler = button.id === 'misafir-islemler';
  const isTalepler = button.id === 'talepler';
  const isPersonel = button.id === 'personel';
  const isBankalar = button.id === 'bankalar';
  const isFaturalar = button.id === 'faturalar';
  const isCekSenet = button.id === 'cek-senet-teminat';
  const isAracMakina = button.id === 'arac-makina-parki';
  const isRaporlar = button.id === 'raporlar';
  const isScreenAction = true;

  if (viewMode === 'compact') {
    return (
      <motion.div
        id={`portal-btn-${button.id}`}
        layout
        whileHover={{ scale: 1.015, y: -2 }}
        whileTap={{ scale: 0.985 }}
        onClick={handleClick}
        className={`group relative overflow-hidden rounded-xl border p-2.5 sm:p-3 transition-all duration-300 cursor-pointer backdrop-blur-md
          ${
            isDigerIslemler
              ? 'bg-gradient-to-r from-amber-500/[0.14] via-yellow-500/[0.09] to-orange-500/[0.14] hover:from-amber-500/[0.24] hover:to-orange-500/[0.24] border-amber-400/50 hover:border-amber-300 shadow-lg shadow-amber-950/40'
              : isPersonelDigerIslemler
              ? 'bg-gradient-to-r from-indigo-500/[0.16] via-purple-500/[0.10] to-indigo-500/[0.16] hover:from-indigo-500/[0.26] hover:to-purple-500/[0.26] border-indigo-400/50 hover:border-indigo-300 shadow-lg shadow-indigo-950/40'
              : isMisafirIslemler
              ? 'bg-gradient-to-r from-teal-500/[0.16] via-emerald-500/[0.10] to-teal-500/[0.16] hover:from-teal-500/[0.26] hover:to-emerald-500/[0.26] border-teal-400/50 hover:border-teal-300 shadow-lg shadow-teal-950/40'
              : isGroup2
              ? 'bg-emerald-600/[0.08] hover:bg-emerald-600/[0.15] border-emerald-500/25 hover:border-emerald-500/60 shadow-lg shadow-black/20'
              : 'bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.08] border-slate-200 dark:border-white/10 hover:border-blue-500/50 shadow-sm dark:shadow-lg dark:shadow-black/20'
          }`}
      >
        {/* Ambient background glow on hover */}
        <div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-xl"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${
              isDigerIslemler
                ? 'rgba(245, 158, 11, 0.4)'
                : isPersonelDigerIslemler
                ? 'rgba(99, 102, 241, 0.4)'
                : button.gradient.glow
            }, transparent 70%)`,
          }}
        />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Gradient Icon Badge */}
            <div
              className={`flex-shrink-0 flex items-center justify-center rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:rotate-1 ${
                isDigerIslemler
                  ? 'w-9 h-9 bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black border border-amber-300 shadow-amber-500/30'
                  : isPersonelDigerIslemler
                  ? 'w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 text-white font-black border border-indigo-300/50 shadow-indigo-500/30'
                  : isGroup2
                  ? 'w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  : 'w-9 h-9 bg-blue-500/20 border border-blue-500/30 text-blue-400'
              }`}
            >
              <DynamicIcon name={button.iconName} className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>

            <div className="min-w-0">
              <h3
                className={`font-extrabold text-sm sm:text-base tracking-tight truncate transition-colors ${
                  isDigerIslemler
                    ? 'text-black dark:text-amber-100 group-hover:text-amber-800 dark:group-hover:text-amber-300'
                    : isPersonelDigerIslemler
                    ? 'text-black dark:text-indigo-100 group-hover:text-indigo-800 dark:group-hover:text-indigo-300'
                    : isGroup2
                    ? 'text-black dark:text-emerald-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-300'
                    : 'text-black dark:text-white group-hover:text-blue-800 dark:group-hover:text-blue-500'
                }`}
              >
                {button.title}
              </h3>
              <p
                className={`text-[11px] truncate mt-0.5 font-medium ${
                  isDigerIslemler
                    ? 'text-amber-950/80 dark:text-amber-200/80'
                    : isPersonelDigerIslemler
                    ? 'text-indigo-950/80 dark:text-indigo-200/80'
                    : isGroup2 ? 'text-emerald-950/80 dark:text-emerald-400/80' : 'text-slate-700 dark:text-gray-400'
                }`}
              >
                {button.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick(button);
              }}
              title="Modül Bilgisi"
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full transition-all transform group-hover:translate-x-1 ${
                isDigerIslemler
                  ? 'bg-amber-500/20 text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 font-bold'
                  : isPersonelDigerIslemler
                  ? 'bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-500 group-hover:text-white font-bold'
                  : isGroup2
                  ? 'bg-emerald-500/20 text-emerald-300 group-hover:bg-emerald-500 group-hover:text-black'
                  : 'bg-white/10 text-gray-300 group-hover:bg-blue-500 group-hover:text-white'
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      id={`portal-btn-${button.id}`}
      layout
      whileHover={{ scale: 1.015, y: -3 }}
      whileTap={{ scale: 0.985 }}
      onClick={handleClick}
      className={`group relative flex flex-col justify-between overflow-hidden transition-all duration-300 cursor-pointer backdrop-blur-md ${
        isDigerIslemler
          ? 'p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-amber-500/[0.14] via-yellow-500/[0.08] to-orange-500/[0.04] hover:from-amber-500/[0.22] hover:to-orange-500/[0.12] border-2 border-amber-400/50 hover:border-amber-300 shadow-lg shadow-amber-950/40 hover:shadow-amber-500/25'
          : isPersonelDigerIslemler
          ? 'p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-indigo-500/[0.14] via-purple-500/[0.08] to-violet-500/[0.04] hover:from-indigo-500/[0.22] hover:to-violet-500/[0.12] border border-indigo-400/50 hover:border-indigo-300 shadow-md shadow-indigo-950/40 hover:shadow-indigo-500/25'
          : isMisafirIslemler
          ? 'p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-teal-500/[0.14] via-emerald-500/[0.08] to-teal-500/[0.04] hover:from-teal-500/[0.22] hover:to-emerald-500/[0.12] border border-teal-400/50 hover:border-teal-300 shadow-md shadow-teal-950/40 hover:shadow-teal-500/25'
          : isGroup2
          ? 'p-2 sm:p-2.5 rounded-xl bg-emerald-600/[0.08] hover:bg-emerald-600/[0.16] border border-emerald-500/25 hover:border-emerald-500/60 shadow-md shadow-black/30 hover:shadow-emerald-950/40'
          : 'p-2 sm:p-2.5 rounded-xl bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 hover:border-blue-500/50 shadow-xs dark:shadow-md dark:shadow-black/30 hover:shadow-blue-500/10'
      }`}
    >
      {/* Dynamic top gradient accent line */}
      <div
        className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${
          isDigerIslemler
            ? 'from-amber-400 via-yellow-300 to-amber-500'
            : isPersonelDigerIslemler
            ? 'from-indigo-400 via-purple-400 to-indigo-500'
            : isMisafirIslemler
            ? 'from-teal-400 via-emerald-400 to-teal-500'
            : isGroup2
            ? 'from-emerald-400 via-teal-400 to-emerald-500'
            : `${button.gradient.from} ${button.gradient.to}`
        } transition-all duration-300 group-hover:h-1.5`}
      />

      {/* Ambient background glow: Canlı ve nefes alan zemin ışıltısı */}
      <div
        className="pointer-events-none absolute -inset-px opacity-30 dark:opacity-40 transition-opacity duration-500 group-hover:opacity-100 rounded-xl"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${
            isDigerIslemler
              ? 'rgba(245, 158, 11, 0.45)'
              : isPersonelDigerIslemler
              ? 'rgba(99, 102, 241, 0.45)'
              : isMisafirIslemler
              ? 'rgba(20, 184, 166, 0.45)'
              : isGroup2
              ? 'rgba(16, 185, 129, 0.35)'
              : button.gradient.glow
          }, transparent 75%)`,
        }}
      />

      {/* Buton Altı Canlı Hareketli Ambiyans Işıltısı */}
      <div
        className={`pointer-events-none absolute -bottom-1 inset-x-3 h-2 rounded-full blur-md opacity-60 group-hover:opacity-100 transition-all duration-500 ${
          isDigerIslemler
            ? 'bg-amber-400/40 shadow-[0_0_14px_rgba(245,158,11,0.6)]'
            : isPersonelDigerIslemler
            ? 'bg-indigo-400/40 shadow-[0_0_14px_rgba(99,102,241,0.6)]'
            : isMisafirIslemler
            ? 'bg-teal-400/40 shadow-[0_0_14px_rgba(20,184,166,0.6)]'
            : isGroup2
            ? 'bg-emerald-400/40 shadow-[0_0_14px_rgba(16,185,129,0.6)]'
            : 'bg-cyan-400/35 shadow-[0_0_14px_rgba(6,182,212,0.5)]'
        }`}
      />

      {/* Light sheen animation across card on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

      {/* Card Header: Config & Direct Link Icons */}
      <div className="relative flex items-center justify-between mb-1.5">
        <div>
          {isDigerIslemler ? (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.25 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-xs"
            >
              <span>26 Buton Panel</span>
            </span>
          ) : isPersonelDigerIslemler ? (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.25 rounded-full bg-indigo-400/20 text-indigo-300 border border-indigo-400/40 shadow-xs"
            >
              <span>20 Buton Panel</span>
            </span>
          ) : isMisafirIslemler ? (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.25 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/40 shadow-xs"
            >
              <span>24 Buton Panel</span>
            </span>
          ) : isTalepler ? (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.25 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 shadow-xs"
            >
              <span>4 Butonlu Panel</span>
            </span>
          ) : isPersonel ? (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.25 rounded-full bg-blue-400/20 text-blue-300 border border-blue-400/40 shadow-xs"
            >
              <span>8 Butonlu Panel</span>
            </span>
          ) : isBankalar ? (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.25 rounded-full bg-sky-400/20 text-sky-300 border border-sky-400/40 shadow-xs"
            >
              <span>12 Butonlu Panel</span>
            </span>
          ) : isFaturalar ? (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.25 rounded-full bg-violet-400/20 text-violet-300 border border-violet-400/40 shadow-xs"
            >
              <span>8 Butonlu Panel</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick(button);
            }}
            title="Modül Bilgisi"
            className="p-0.5 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content: Icon & Title */}
      <div className="relative flex items-center gap-2.5 mb-1.5">
        {/* Sleek Elegant Dark Icon Container */}
        <div
          className={`flex-shrink-0 flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105 ${
            isDigerIslemler
              ? 'w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black border border-amber-300 shadow-amber-500/30'
              : isPersonelDigerIslemler
              ? 'w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 text-white font-black border border-indigo-300/50 shadow-indigo-500/30'
              : isGroup2
              ? 'w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-base font-black shadow-inner'
              : 'w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold'
          }`}
        >
          <DynamicIcon name={button.iconName} className={isGroup2 ? 'w-4.5 h-4.5' : 'w-4 h-4'} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h3
              className={`font-black text-xs sm:text-[13px] tracking-tight transition-colors leading-snug truncate ${
                isDigerIslemler
                  ? 'text-black dark:text-amber-100 group-hover:text-amber-800 dark:group-hover:text-amber-300'
                  : isPersonelDigerIslemler
                  ? 'text-black dark:text-indigo-100 group-hover:text-indigo-800 dark:group-hover:text-indigo-300'
                  : isGroup2
                  ? 'text-black dark:text-emerald-50 group-hover:text-emerald-800 dark:group-hover:text-emerald-300'
                  : 'text-black dark:text-[#f8fafc] group-hover:text-blue-800 dark:group-hover:text-blue-500'
              }`}
            >
              {button.title}
            </h3>
          </div>
          <p
            className={`text-[10px] sm:text-[11px] mt-0.25 line-clamp-1 leading-snug font-medium ${
              isDigerIslemler
                ? 'text-amber-950/80 dark:text-amber-200/80'
                : isPersonelDigerIslemler
                ? 'text-indigo-950/80 dark:text-indigo-200/80'
                : isGroup2 ? 'text-emerald-950/80 dark:text-emerald-400/80' : 'text-slate-700 dark:text-gray-400'
            }`}
          >
            {button.subtitle}
          </p>
        </div>
      </div>

      {/* Footer / Launch Button */}
      <div
        className={`relative pt-1.5 border-t flex items-center justify-between ${
          isDigerIslemler
            ? 'border-amber-500/30'
            : isPersonelDigerIslemler
            ? 'border-indigo-500/30'
            : isGroup2 ? 'border-emerald-500/20' : 'border-slate-200 dark:border-white/10'
        }`}
      >
        <div
          className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-bold transition-colors ${
            isDigerIslemler
              ? 'text-amber-800 dark:text-amber-400 group-hover:text-amber-900 dark:group-hover:text-amber-300'
              : isPersonelDigerIslemler
              ? 'text-indigo-800 dark:text-indigo-400 group-hover:text-indigo-900 dark:group-hover:text-indigo-300'
              : isGroup2
              ? 'text-emerald-800 dark:text-emerald-400 group-hover:text-emerald-900 dark:group-hover:text-emerald-300'
              : 'text-black dark:text-gray-400 group-hover:text-blue-800 dark:group-hover:text-blue-500'
          }`}
        >
          <span>Sayfayı Aç</span>
          <ChevronRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
        </div>

        <div
          className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-medium ${
            isDigerIslemler
              ? 'text-amber-300/90 font-bold'
              : isPersonelDigerIslemler
              ? 'text-indigo-300/90 font-bold'
              : isGroup2 ? 'text-emerald-500/70' : 'text-gray-500'
          }`}
        >
          <span>Modül Sayfası</span>
        </div>
      </div>
    </motion.div>
  );
};
