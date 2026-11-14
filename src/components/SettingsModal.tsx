import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Globe, Check, Trash2 } from 'lucide-react';
import { PortalButton } from '../types';

interface SettingsModalProps {
  button: PortalButton | null;
  onClose: () => void;
  onSaveUrl: (buttonId: string, url: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  button,
  onClose,
  onSaveUrl,
}) => {
  if (!button) return null;

  const [url, setUrl] = useState<string>(button.customUrl || '');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveUrl(button.id, url.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  };

  const handleClear = () => {
    setUrl('');
    onSaveUrl(button.id, '');
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-[#0d0e12] rounded-3xl p-6 border border-white/10 shadow-2xl relative text-[#f8fafc]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {button.title} Bağlantısı
                </h3>
                <p className="text-xs text-gray-400">
                  Hızlı giriş web adresini tanımlayın
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="module-url-field"
                className="block text-xs font-semibold text-gray-300 mb-1.5"
              >
                Yönlendirilecek Web Adresi (URL):
              </label>
              <input
                id="module-url-field"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono bg-white/5 border border-white/10 text-white placeholder:text-gray-500 outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                Örnek: Luca, Zirve, Mikro Web, Netsis, Logo, Google E-Tablolar veya şirket içi intranet linki.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {button.customUrl && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/15 border border-rose-500/20 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kaldır</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition-all"
              >
                {saved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Kaydedildi</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Kaydet</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
