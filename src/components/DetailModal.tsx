import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { PortalButton } from '../types';
import { DynamicIcon } from './IconHelper';

interface DetailModalProps {
  button: PortalButton | null;
  onClose: () => void;
  onSaveUrl?: (buttonId: string, url: string) => void;
  playClickSound: () => void;
  onOpenScreen?: (button: PortalButton) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  button,
  onClose,
  playClickSound,
  onOpenScreen,
}) => {
  if (!button) return null;

  const [activeActionNotice, setActiveActionNotice] = useState<string | null>(
    null
  );

  const handleLaunch = () => {
    playClickSound();
    if (onOpenScreen) {
      onClose();
      onOpenScreen(button);
      return;
    }
    if (button.customUrl && button.customUrl.trim() !== '') {
      let finalUrl = button.customUrl.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    } else {
      setActiveActionNotice(
        `"${button.title}" modülü çalıştırıldı.`
      );
      setTimeout(() => setActiveActionNotice(null), 3000);
    }
  };

  return (
    <AnimatePresence>
      <div
        id="detail-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-[#0d0e12] border border-white/10 text-[#f8fafc] shadow-2xl"
        >
          {/* Top Gradient Banner */}
          <div
            className={`h-24 sm:h-28 bg-gradient-to-r ${button.gradient.from} ${button.gradient.to} relative overflow-hidden flex items-end p-6`}
          >
            <div className="absolute inset-0 bg-black/30" />
            <button
              id="detail-modal-close"
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors backdrop-blur-xs cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="relative text-xs font-bold uppercase tracking-widest text-white/90 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
              {button.groupId}. Grup
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Header with Floating Icon */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mt-14 sm:-mt-16">
              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center justify-center w-20 h-20 rounded-2xl shadow-xl ring-4 ring-[#0d0e12] ${button.gradient.iconBg}`}
                >
                  <DynamicIcon name={button.iconName} className="w-10 h-10" />
                </div>
                <div className="pt-8 sm:pt-4">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {button.title}
                  </h2>
                  <p className="text-sm text-gray-400 font-medium mt-0.5">
                    {button.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-gray-300 leading-relaxed">
              {button.description}
            </div>

            {/* Action Feedback Notice */}
            {activeActionNotice && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs sm:text-sm font-semibold flex items-center gap-2.5"
              >
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>{activeActionNotice}</span>
              </motion.div>
            )}

            {/* Direct Launch Button */}
            <div className="pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={handleLaunch}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-white shadow-lg transition-all transform active:scale-98 bg-gradient-to-r ${button.gradient.from} ${button.gradient.to} hover:opacity-95 cursor-pointer`}
              >
                <span>{button.title} Modülüne Giriş Yap</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
