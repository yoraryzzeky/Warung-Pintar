import React from 'react';
import { Check, Palette, Play, X } from 'lucide-react';
import { THEME_PRESETS, type ThemeId } from '../utils/themeSettings';

interface ThemePickerModalProps {
  activeTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  onReplayOpening: () => void;
  onClose: () => void;
}

export const ThemePickerModal: React.FC<ThemePickerModalProps> = ({
  activeTheme,
  onSelectTheme,
  onReplayOpening,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-[130] flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Pilih Warna Tema Aplikasi"
    >
      <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-md phone-landscape:max-w-xl p-4 sm:p-6 space-y-3.5 sm:space-y-5 shadow-2xl border border-slate-100 max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <div className="flex items-start justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Palette size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                Warna Tema Aplikasi
              </h3>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-0.5">
                Pilih nuansa warna favorit untuk tampilan kasir &amp; toko Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pemilih tema"
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 phone-landscape:grid-cols-2 gap-2 sm:gap-2.5" role="radiogroup" aria-label="Daftar pilihan tema warna">
          {THEME_PRESETS.map((preset) => {
            const isSelected = activeTheme === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectTheme(preset.id)}
                className={`w-full p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left flex items-center justify-between gap-2.5 sm:gap-3 transition-all ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl shrink-0 border border-black/10 shadow-sm flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${preset.primaryHex} 0%, ${preset.secondaryHex} 100%)`,
                    }}
                  >
                    {isSelected && <Check size={16} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-black text-slate-900 uppercase">{preset.name}</p>
                    <p className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 truncate mt-0.5">
                      {preset.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
                  <span
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: preset.canvasHex }}
                  />
                  <span
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: preset.primaryHex }}
                  />
                  <span
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: preset.secondaryHex }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onReplayOpening();
            }}
            className="flex-1 py-2.5 sm:py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[11px] uppercase flex items-center justify-center gap-1.5 transition-all"
          >
            <Play size={14} />
            <span>Putar Opening Animation</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 sm:py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[11px] uppercase shadow-sm transition-all"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
