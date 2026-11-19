import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  KeyRound,
  X,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import {
  DEFAULT_OWNER_PIN,
  verifyOwnerPin,
  type AppMode,
  type RoleSettings,
} from '../utils/roleMode';

interface RoleModeModalProps {
  roleSettings: RoleSettings;
  onSwitchToCashier: (cashierName: string) => void;
  onUnlockOwner: () => void;
  onClose: () => void;
}

export const RoleModeModal: React.FC<RoleModeModalProps> = ({
  roleSettings,
  onSwitchToCashier,
  onUnlockOwner,
  onClose,
}) => {
  const isCurrentlyOwner = roleSettings.mode === 'owner';
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [cashierNameInput, setCashierNameInput] = useState(
    roleSettings.cashierName || 'Karyawan Kasir'
  );

  useEffect(() => {
    setPinInput('');
    setPinError(null);
    setCashierNameInput(roleSettings.cashierName || 'Karyawan Kasir');
  }, [roleSettings.mode, roleSettings.cashierName]);

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyOwnerPin(pinInput, roleSettings.ownerPin)) {
      setPinError('PIN Owner salah. Silakan periksa kembali.');
      return;
    }
    setPinError(null);
    onUnlockOwner();
  };

  const handleCashierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = cashierNameInput.trim() || 'Karyawan Kasir';
    onSwitchToCashier(cleanedName);
  };

  const renderModeTitle = (mode: AppMode) =>
    mode === 'owner'
      ? 'Beralih ke Mode Karyawan Kasir'
      : 'Buka Mode Owner (Verifikasi PIN)';

  return (
    <div
      className="fixed inset-0 bg-black/65 z-[130] flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Mode Owner dan Karyawan Kasir"
    >
      <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-md p-4 sm:p-6 md:p-7 space-y-3.5 sm:space-y-5 shadow-2xl border border-slate-100 max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <div className="flex items-start justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
                isCurrentlyOwner
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              {isCurrentlyOwner ? <UserCheck size={20} /> : <Lock size={20} />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase leading-tight">
                {renderModeTitle(roleSettings.mode)}
              </h3>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-0.5">
                {isCurrentlyOwner
                  ? 'Batasi akses laporan laba, harga modal, & pengaturan sebelum menyerahkan perangkat ke kasir.'
                  : 'Masukkan PIN Owner untuk membuka akses penuh keuangan, stok, dan pengaturan toko.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Tutup dialog ganti mode"
          >
            <X size={18} />
          </button>
        </div>

        {isCurrentlyOwner ? (
          <form onSubmit={handleCashierSubmit} className="space-y-3 sm:space-y-4">
            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 space-y-2 text-[10px] sm:text-[11px]">
              <div className="flex items-start gap-2 text-emerald-700 font-bold">
                <CheckCircle size={14} className="shrink-0 mt-0.5" />
                <span>
                  Akses Kasir: Transaksi Kasir & Barcode, PPOB Digital, Cek Stok Barang, Riwayat,
                  Retur / Tukar Barang, Cicilan Kasbon, Tabel Rekap Karyawan, &amp; Closing Shift.
                </span>
              </div>
              <div className="flex items-start gap-2 text-amber-700 font-bold">
                <Lock size={14} className="shrink-0 mt-0.5" />
                <span>
                  Terkunci (Butuh PIN Owner): Beranda Omset/Laba, Rekap Owner, Harga Modal,
                  Edit/Hapus Stok, Biaya Toko, Edit Toko, &amp; Backup Data.
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="cashier-shift-name"
                className="block text-[10px] font-black uppercase text-slate-500 ml-1"
              >
                Nama Kasir / Shift Aktif
              </label>
              <input
                id="cashier-shift-name"
                type="text"
                value={cashierNameInput}
                onChange={(e) => setCashierNameInput(e.target.value)}
                placeholder="Cth: Budi (Shift Pagi)"
                autoFocus
                className="w-full p-2.5 sm:p-3.5 bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-xs text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                className="py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
              >
                <UserCheck size={15} />
                Aktifkan Mode Kasir
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUnlockSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="owner-pin-input"
                  className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1.5"
                >
                  <KeyRound size={13} className="text-indigo-600" />
                  <span>Masukkan PIN Owner (4-6 Digit)</span>
                </label>
              </div>
              <input
                id="owner-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, ''));
                  if (pinError) setPinError(null);
                }}
                placeholder="••••"
                autoFocus
                className="w-full p-2.5 sm:p-3.5 bg-white border border-slate-300 focus:border-indigo-500 rounded-xl outline-none font-mono font-black text-center tracking-[0.4em] text-base sm:text-lg text-slate-900"
              />
              {roleSettings.ownerPin === DEFAULT_OWNER_PIN && (
                <p className="text-[10px] font-bold text-slate-500 text-center pt-1">
                  PIN bawaan awal: <span className="font-mono font-black text-indigo-600">1234</span>{' '}
                  (dapat diubah di menu Profil Mode Owner)
                </p>
              )}
            </div>

            {pinError && (
              <div
                role="alert"
                className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 sm:p-3 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                <span>{pinError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={pinInput.length < 4}
                className="py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition-all"
              >
                <ShieldCheck size={15} />
                Buka Mode Owner
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
