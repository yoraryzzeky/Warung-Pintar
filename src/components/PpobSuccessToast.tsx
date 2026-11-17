import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, FileText, X } from 'lucide-react';
import type { DigitalTransaction } from '../utils/storeLogic';
import { buildPpobToastSummary, PPOB_TOAST_DURATION_MS } from '../utils/ppobToast';

interface PpobSuccessToastProps {
  tx: DigitalTransaction | null;
  onClose: () => void;
  onOpenReceipt?: () => void;
}

export const PpobSuccessToast: React.FC<PpobSuccessToastProps> = ({
  tx,
  onClose,
  onOpenReceipt,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const summary = tx ? buildPpobToastSummary(tx) : null;

  return (
    <div
      className="fixed top-3 right-3 left-3 sm:left-auto sm:top-5 sm:right-5 sm:w-[380px] z-[150] pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        {summary && (
          <motion.div
            key={summary.id}
            role="status"
            data-testid="ppob-success-toast"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -16, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -12, scale: 0.97 }
            }
            transition={{
              duration: prefersReducedMotion ? 0.12 : 0.24,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="pointer-events-auto relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md border border-emerald-200 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.22)] text-slate-900"
          >
            <div className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle size={20} aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 leading-snug">
                      {summary.title}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                      {summary.serviceLine}
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono">{summary.id}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Tutup notifikasi transaksi PPOB"
                    className="-mt-1.5 -mr-1.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500 font-semibold shrink-0">
                      Nomor Tujuan
                    </span>
                    <span
                      data-testid="ppob-toast-target"
                      className="font-mono font-bold text-slate-900 tabular-nums truncate text-right"
                    >
                      {summary.targetNumber}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500 font-semibold shrink-0">
                      Total Pembayaran
                    </span>
                    <span
                      data-testid="ppob-toast-total"
                      className="font-black text-emerald-700 tabular-nums whitespace-nowrap"
                    >
                      {summary.totalFormatted}
                    </span>
                  </div>

                  {summary.customerNote && (
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="text-slate-500 font-medium shrink-0">
                        Catatan
                      </span>
                      <span className="font-semibold text-slate-700 truncate text-right">
                        {summary.customerNote}
                      </span>
                    </div>
                  )}
                </div>

                {onOpenReceipt && (
                  <div className="mt-2.5 flex justify-end">
                    <button
                      type="button"
                      onClick={onOpenReceipt}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition-colors whitespace-nowrap"
                    >
                      <FileText size={13} aria-hidden="true" />
                      Lihat Struk
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!prefersReducedMotion && (
              <motion.div
                key={`progress-${summary.id}`}
                aria-hidden="true"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{
                  duration: PPOB_TOAST_DURATION_MS / 1000,
                  ease: 'linear',
                }}
                style={{ transformOrigin: 'left center' }}
                className="h-1 w-full bg-emerald-500/80"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
