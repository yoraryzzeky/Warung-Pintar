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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-sm max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col custom-scrollbar">
        {/* QRIS Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="bg-white px-2 py-0.5 rounded font-black text-xs text-red-600 tracking-wider">
              QRIS
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-100">
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

        {/* Store & Amount Info */}
        <div className="p-4 text-center space-y-2 bg-slate-50 border-b border-gray-100">
          <div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Merchant / Toko:</span>
            <h3 className="text-base font-black text-gray-800 uppercase flex items-center justify-center gap-1.5">
              <Store size={16} className="text-blue-600" />
              {storeName}
            </h3>
            <p className="text-[10px] text-gray-500 font-medium">NMID: ID1020261111987 • A.N. {storeName}</p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm inline-block w-full">
            <span className="text-[9px] font-black text-gray-400 uppercase block">Total Pembayaran</span>
            <span className="text-2xl font-black text-blue-600 tracking-tight tabular-nums">
              {formatRp(amount)}
            </span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-5 flex flex-col items-center justify-center bg-white space-y-3">
          <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-gray-300 shadow-inner flex flex-col items-center justify-center relative group w-full">
            {qrisImage ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={qrisImage}
                  alt="Kode QRIS Toko"
                  className="w-56 h-56 object-contain rounded-xl bg-white border border-gray-100"
                />
                <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck size={12} /> Silakan Pindai QRIS Toko
                </span>
              </div>
            ) : (
              /* High-fidelity Generated Static QRIS Graphic */
              <div className="w-56 h-56 bg-white p-3 rounded-xl border border-gray-200 flex flex-col items-center justify-between">
                <div className="flex items-center justify-between w-full px-1 border-b border-gray-100 pb-1">
                  <span className="text-[9px] font-black tracking-widest text-red-600">QRIS</span>
                  <span className="text-[8px] font-bold text-gray-400">GPN</span>
                </div>
                {/* Visual QR Matrix representation */}
                <div className="grid grid-cols-7 gap-1.5 p-2 bg-slate-50 rounded-lg">
                  {/* Top-left position marker */}
                  <div className="w-6 h-6 border-4 border-black bg-white flex items-center justify-center rounded-sm">
                    <div className="w-2.5 h-2.5 bg-black" />
                  </div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full" /></div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-3 h-3 bg-black" /></div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black" /></div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-2.5 h-2.5 bg-black" /></div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black" /></div>
                  {/* Top-right position marker */}
                  <div className="w-6 h-6 border-4 border-black bg-white flex items-center justify-center rounded-sm">
                    <div className="w-2.5 h-2.5 bg-black" />
                  </div>

                  {/* Middle rows */}
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-2 h-2 bg-black" /></div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-3 h-3 bg-black" /></div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black" /></div>
                  <div className="w-6 h-6 bg-red-600 text-white rounded font-black text-[7px] flex items-center justify-center">WP</div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-2 h-2 bg-black" /></div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-3 h-3 bg-black" /></div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-2 h-2 bg-black" /></div>

                  {/* Bottom row position marker */}
                  <div className="w-6 h-6 border-4 border-black bg-white flex items-center justify-center rounded-sm">
                    <div className="w-2.5 h-2.5 bg-black" />
                  </div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black" /></div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-2 h-2 bg-black" /></div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-3 h-3 bg-black" /></div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-2 h-2 bg-black" /></div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black" /></div>
                  <div className="w-6 h-6 flex items-center justify-center"><div className="w-3 h-3 bg-black" /></div>
                </div>
                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">
                  Mendukung BCA, Mandiri, BRI, GoPay, OVO, Dana, ShopeePay
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
            <span>Mendukung Semua Aplikasi Pembayaran & Bank</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-gray-100 flex flex-col gap-2">
          {onConfirmPaid && (
            <button
              type="button"
              onClick={onConfirmPaid}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <CheckCircle size={16} /> Konfirmasi Pembayaran QRIS Selesai
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-white hover:bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase border border-gray-200 transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
