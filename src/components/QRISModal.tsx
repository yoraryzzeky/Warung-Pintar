import React from 'react';
import { X, CheckCircle, Store, ShieldCheck } from 'lucide-react';
import { formatRp } from '../utils/storeLogic';

interface QRISModalProps {
  amount: number;
  profile: any;
  onClose: () => void;
  onConfirmPaid?: () => void;
}

export const QRISModal: React.FC<QRISModalProps> = ({
  amount,
  profile,
  onClose,
  onConfirmPaid,
}) => {
  const storeName = profile?.ownerName || 'Warung Pintar Mandiri';
  const qrisImage = profile?.qrisImage;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2.5 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm phone-landscape:max-w-lg max-h-[90dvh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col custom-scrollbar">
        {/* QRIS Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-3 sm:p-4 phone-landscape:py-2.5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="bg-white px-2 py-0.5 rounded font-black text-xs text-red-600 tracking-wider">
              QRIS
            </div>
            <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-red-100">
              Standar Pembayaran Nasional
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal QRIS"
            className="p-1 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col phone-landscape:grid phone-landscape:grid-cols-2 phone-landscape:items-center">
          {/* Store & Amount Info */}
          <div className="p-3 sm:p-4 text-center space-y-2 bg-slate-50 border-b phone-landscape:border-b-0 phone-landscape:border-r border-gray-100 phone-landscape:h-full phone-landscape:flex phone-landscape:flex-col phone-landscape:justify-center">
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Merchant / Toko:</span>
              <h3 className="text-sm sm:text-base font-black text-gray-800 uppercase flex items-center justify-center gap-1.5">
                <Store size={15} className="text-blue-600" />
                {storeName}
              </h3>
              <p className="text-[9.5px] sm:text-[10px] text-gray-500 font-medium">NMID: ID1020261111987 • A.N. {storeName}</p>
            </div>

            <div className="bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm inline-block w-full">
              <span className="text-[9px] font-black text-gray-400 uppercase block">Total Pembayaran</span>
              <span className="text-xl sm:text-2xl font-black text-blue-600 tracking-tight tabular-nums">
                {formatRp(amount)}
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="p-3.5 sm:p-5 phone-landscape:p-3 flex flex-col items-center justify-center bg-white space-y-2.5 sm:space-y-3">
            <div className="p-2.5 sm:p-3 bg-white rounded-2xl border-2 border-dashed border-gray-300 shadow-inner flex flex-col items-center justify-center relative group w-full">
              {qrisImage ? (
                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  <img
                    src={qrisImage}
                    alt="Kode QRIS Toko"
                    className="w-40 h-40 sm:w-56 sm:h-56 phone-landscape:w-32 phone-landscape:h-32 object-contain rounded-xl bg-white border border-gray-100"
                  />
                  <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck size={12} /> Silakan Pindai QRIS Toko
                  </span>
                </div>
              ) : (
                /* High-fidelity Generated Static QRIS Graphic */
                <div className="w-40 h-40 sm:w-56 sm:h-56 phone-landscape:w-32 phone-landscape:h-32 bg-white p-2 sm:p-3 rounded-xl border border-gray-200 flex flex-col items-center justify-between">
                  <div className="flex items-center justify-between w-full px-1 border-b border-gray-100 pb-1">
                    <span className="text-[9px] font-black tracking-widest text-red-600">QRIS</span>
                    <span className="text-[8px] font-bold text-gray-400">GPN</span>
                  </div>
                  {/* Visual QR Matrix representation */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5 p-1.5 sm:p-2 bg-slate-50 rounded-lg scale-90 sm:scale-100 phone-landscape:scale-75">
                    {/* Top-left position marker */}
                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-black bg-white flex items-center justify-center rounded-sm">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-black" />
                    </div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-black" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-black" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black" /></div>
                    {/* Top-right position marker */}
                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-black bg-white flex items-center justify-center rounded-sm">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-black" />
                    </div>

                    {/* Middle rows */}
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-2 h-2 bg-black" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-black" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-red-600 text-white rounded font-black text-[7px] flex items-center justify-center">WP</div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-2 h-2 bg-black" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-black" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-2 h-2 bg-black" /></div>

                    {/* Bottom row position marker */}
                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-black bg-white flex items-center justify-center rounded-sm">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-black" />
                    </div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-2 h-2 bg-black" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-black" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-2 h-2 bg-black" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black" /></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-black" /></div>
                  </div>
                  <span className="text-[7.5px] sm:text-[8px] font-bold text-gray-500 uppercase tracking-wider text-center line-clamp-1">
                    BCA, Mandiri, BRI, GoPay, OVO, Dana
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[9.5px] sm:text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
              <span>Mendukung Semua Bank &amp; E-Wallet</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-gray-100 flex flex-col phone-landscape:flex-row gap-2">
          {onConfirmPaid && (
            <button
              type="button"
              onClick={onConfirmPaid}
              className="w-full py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <CheckCircle size={15} /> Konfirmasi QRIS Selesai
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full phone-landscape:w-auto phone-landscape:px-6 py-2.5 bg-white hover:bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase border border-gray-200 transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
