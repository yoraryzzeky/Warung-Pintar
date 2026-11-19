import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Store } from 'lucide-react';

interface OpeningAnimationProps {
  isVisible: boolean;
  storeName?: string;
  onComplete: () => void;
}

const OPENING_IMAGE_SRC = '/assets/aistudio/1000175651_4e7c195f.png';

export const OpeningAnimation: React.FC<OpeningAnimationProps> = ({
  isVisible,
  storeName,
  onComplete,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    const durationMs = prefersReducedMotion ? 500 : 2400;
    const timer = window.setTimeout(() => {
      onComplete();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [isVisible, prefersReducedMotion, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="region"
          aria-label="Animasi Pembuka Warung Pintar Pro"
          data-testid="opening-animation"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: prefersReducedMotion ? 1 : 1.03,
            transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
          }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white overflow-hidden select-none"
        >
          {/* Ambient soft radial aura behind the 3D illustration */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0.5, scale: 0.85 }}
            animate={
              prefersReducedMotion
                ? { opacity: 0.85, scale: 1 }
                : { opacity: [0.55, 0.95, 0.75], scale: [0.85, 1.08, 1] }
            }
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute w-[420px] h-[420px] sm:w-[560px] sm:h-[560px] rounded-full bg-[radial-gradient(circle,rgba(254,215,170,0.34)_0%,rgba(191,219,254,0.28)_45%,rgba(255,255,255,0)_72%)] blur-2xl"
          />

          {/* Smart signal expanding rings echoing the Warung Pintar Wi-Fi emblem */}
          {!prefersReducedMotion && (
            <>
              <motion.div
                aria-hidden="true"
                initial={{ opacity: 0.45, scale: 0.65 }}
                animate={{ opacity: 0, scale: 1.45 }}
                transition={{ duration: 1.9, repeat: Infinity, ease: 'easeOut' }}
                className="pointer-events-none absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-blue-400/25"
              />
              <motion.div
                aria-hidden="true"
                initial={{ opacity: 0.35, scale: 0.65 }}
                animate={{ opacity: 0, scale: 1.45 }}
                transition={{ duration: 1.9, delay: 0.65, repeat: Infinity, ease: 'easeOut' }}
                className="pointer-events-none absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-orange-400/25"
              />
            </>
          )}

          {/* Centered Opening Stage */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.78, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.2 : 0.72, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center justify-center px-4 py-4 sm:px-6 sm:py-8 phone-landscape:py-2 max-w-md w-full"
          >
            {/* Floating Hero Container tightly framed around the 3D Warung Pintar illustration */}
            <motion.div
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      y: [0, -7, 0],
                    }
              }
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative flex items-center justify-center"
            >
              {!imageError ? (
                <div className="w-[210px] h-[168px] sm:w-[340px] sm:h-[268px] md:w-[390px] md:h-[305px] phone-landscape:w-[145px] phone-landscape:h-[115px] flex items-center justify-center overflow-hidden">
                  <img
                    src={OPENING_IMAGE_SRC}
                    alt="Warung Pintar Pro"
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover object-[50%_47%] mix-blend-multiply drop-shadow-[0_18px_32px_rgba(30,64,175,0.14)]"
                  />
                </div>
              ) : (
                <div className="w-36 h-36 sm:w-48 sm:h-48 phone-landscape:w-28 phone-landscape:h-28 rounded-3xl bg-white border border-slate-200 shadow-xl flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
                    <Store size={28} />
                  </div>
                  <p className="font-black text-sm sm:text-lg text-slate-900 uppercase tracking-tight">
                    {storeName || 'Warung Pintar Pro'}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Title Reveal + Smooth Loading Progress */}
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.28, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-1.5 sm:mt-2 phone-landscape:mt-1 flex flex-col items-center gap-1 sm:gap-1.5 w-full max-w-xs text-center"
            >
              <h2 className="text-xs sm:text-base font-black tracking-tight text-slate-800 uppercase truncate max-w-full">
                {storeName || 'Warung Pintar Pro'}
              </h2>
              <p className="text-[9px] sm:text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                Kasir Pintar &amp; Manajemen Toko
              </p>

              {/* Progress Bar (GPU-composited scaleX animation) */}
              <div className="mt-1.5 sm:mt-2.5 phone-landscape:mt-1 w-40 sm:w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: prefersReducedMotion ? 0.3 : 2.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ transformOrigin: 'left center' }}
                  className="h-full w-full bg-gradient-to-r from-orange-500 via-amber-500 to-blue-600 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Accessible Skip Button */}
          <button
            type="button"
            onClick={onComplete}
            aria-label="Lewati animasi pembuka"
            className="absolute top-3 right-3 sm:top-6 sm:right-6 phone-landscape:top-2.5 phone-landscape:right-3 z-20 px-3 py-1.5 sm:px-4 sm:py-2 min-h-[34px] sm:min-h-[40px] rounded-xl bg-white/90 hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm text-[11px] sm:text-xs font-black uppercase tracking-wide transition-all backdrop-blur-sm"
          >
            Lewati
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
