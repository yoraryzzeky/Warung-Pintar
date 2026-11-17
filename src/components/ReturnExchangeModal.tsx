import React, { useMemo, useState } from 'react';
import {
  X,
  RotateCcw,
  ArrowLeftRight,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  Lock,
  CheckCircle,
  PackageCheck,
  PackageX,
} from 'lucide-react';
import {
  applyReturnOrExchange,
  calculateSubtotal,
  formatRp,
  type CartItem,
  type Product,
  type ReturnExchangeRecord,
  type ReturnStockCondition,
  type Transaction,
  type TransactionReturnAction,
} from '../utils/storeLogic';
import { verifyOwnerPin, type AppMode } from '../utils/roleMode';

interface ReturnExchangeModalProps {
  transaction: Transaction;
  products: Product[];
  appMode: AppMode;
  ownerPin: string;
  cashierName: string;
  onApply: (result: {
    updatedProducts: Product[];
    updatedTransaction: Transaction;
    record: ReturnExchangeRecord;
  }) => void;
  onClose: () => void;
}

const PRESET_REASONS = [
  'Salah Beli',
  'Tukar Varian / Ukuran',
  'Kemasan Rusak',
  'Pembeli Membatalkan Pesanan',
];

export const ReturnExchangeModal: React.FC<ReturnExchangeModalProps> = ({
  transaction,
  products,
  appMode,
  ownerPin,
  cashierName,
  onApply,
  onClose,
}) => {
  const [mode, setMode] = useState<'REFUND' | 'EXCHANGE'>('REFUND');
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    (transaction.items || []).forEach((it) => {
      initial[it.cartId] = Number(it.quantity) || 0;
    });
    return initial;
  });
  const [replacementCart, setReplacementCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [condition, setCondition] = useState<ReturnStockCondition>('GOOD');
  const [reason, setReason] = useState('Salah Beli');
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const returnedItems = useMemo<CartItem[]>(() => {
    return (transaction.items || [])
      .map((item) => {
        const qty = Math.min(Number(item.quantity) || 0, Math.max(0, returnQuantities[item.cartId] || 0));
        return qty > 0 ? { ...item, quantity: qty } : null;
      })
      .filter(Boolean) as CartItem[];
  }, [transaction.items, returnQuantities]);

  const isReturningAllItems = useMemo(() => {
    if (!transaction.items?.length) return false;
    return transaction.items.every(
      (item) => (returnQuantities[item.cartId] || 0) >= (Number(item.quantity) || 0)
    );
  }, [transaction.items, returnQuantities]);

  const refundAmount = useMemo(() => calculateSubtotal(returnedItems), [returnedItems]);
  const replacementAmount = useMemo(() => calculateSubtotal(replacementCart), [replacementCart]);
  const priceDifference = replacementAmount - refundAmount;

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products
      .filter((p) => {
        const hasStock = p.stock > 0 || (p.isKeteng && (p.eceranStock || 0) > 0);
        if (!hasStock) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [products, productSearch]);

  const updateReturnQty = (cartId: string, maxQty: number, delta: number) => {
    setErrorMsg(null);
    setReturnQuantities((prev) => {
      const nextVal = Math.max(0, Math.min(maxQty, (prev[cartId] || 0) + delta));
      return { ...prev, [cartId]: nextVal };
    });
  };

  const toggleSelectAllReturn = () => {
    setErrorMsg(null);
    const next: Record<string, number> = {};
    (transaction.items || []).forEach((it) => {
      next[it.cartId] = isReturningAllItems ? 0 : Number(it.quantity) || 0;
    });
    setReturnQuantities(next);
  };

  const addReplacementItem = (p: Product, unitMode: 'Bungkus' | 'Pcs') => {
    setErrorMsg(null);
    const isPcs = unitMode === 'Pcs';
    const cartId = `${p.id}-${unitMode}`;
    const price = isPcs ? p.ketengPrice : p.sellingPrice;
    const cost = isPcs ? p.costPrice / (p.pcsPerPack || 1) : p.costPrice;

    setReplacementCart((prev) => {
      const existing = prev.find((i) => i.cartId === cartId);
      if (existing) {
        return prev.map((i) => (i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          cartId,
          id: p.id,
          name: isPcs ? `${p.name} (Ecer)` : p.name,
          priceAtTime: price,
          costAtTime: cost,
          quantity: 1,
          category: p.category,
          isPcs,
          pcsPerPack: p.pcsPerPack || 1,
          image: p.image,
        },
      ];
    });
  };

  const updateReplacementQty = (cartId: string, delta: number) => {
    setErrorMsg(null);
    setReplacementCart((prev) =>
      prev
        .map((item) => {
          if (item.cartId !== cartId) return item;
          const nextQty = item.quantity + delta;
          return nextQty > 0 ? { ...item, quantity: nextQty } : null;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnedItems.length === 0) {
      setErrorMsg('Pilih minimal 1 item barang yang dibatalkan atau ditukar.');
      return;
    }
    if (mode === 'EXCHANGE' && replacementCart.length === 0) {
      setErrorMsg('Pilih minimal 1 barang pengganti untuk transaksi Tukar Barang.');
      return;
    }
    if (appMode === 'cashier' && !verifyOwnerPin(pinInput, ownerPin)) {
      setErrorMsg('PIN Owner salah. Di Mode Kasir, retur/pembatalan wajib disetujui Owner.');
      return;
    }

    const action: TransactionReturnAction =
      mode === 'EXCHANGE' ? 'EXCHANGE' : isReturningAllItems ? 'CANCEL' : 'PARTIAL_RETURN';

    const result = applyReturnOrExchange({
      products,
      transaction,
      action,
      returnedItems,
      replacementItems: mode === 'EXCHANGE' ? replacementCart : [],
      condition,
      reason,
      processedBy: appMode === 'owner' ? 'Owner' : cashierName,
    });

    onApply(result);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[130] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Proses Retur Pembatalan atau Tukar Barang"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl custom-scrollbar"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              {mode === 'REFUND' ? <RotateCcw size={22} /> : <ArrowLeftRight size={22} />}
            </div>
            <div>
              <h3 className="font-black text-sm md:text-base text-gray-800 uppercase">
                Retur, Pembatalan &amp; Tukar Barang
              </h3>
              <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                Struk <span className="font-mono text-gray-800">{transaction.id}</span> •{' '}
                {transaction.buyer || 'Pelanggan Umum'} • Total Awal{' '}
                <span className="text-blue-600">{formatRp(transaction.totalAmount)}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal retur"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setMode('REFUND');
              setErrorMsg(null);
            }}
            className={`py-2.5 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${
              mode === 'REFUND'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <RotateCcw size={14} />
            <span>Batalkan / Refund</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('EXCHANGE');
              setErrorMsg(null);
            }}
            className={`py-2.5 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${
              mode === 'EXCHANGE'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <ArrowLeftRight size={14} />
            <span>Tukar Barang</span>
          </button>
        </div>

        {/* Step 1: Select items to return */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase text-gray-500">
              1. Pilih Item yang Dikembalikan / Dibatalkan
            </label>
            <button
              type="button"
              onClick={toggleSelectAllReturn}
              className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800"
            >
              {isReturningAllItems ? 'Kosongkan Pilihan' : 'Pilih Semua Item'}
            </button>
          </div>
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            {(transaction.items || []).map((item) => {
              const selectedQty = returnQuantities[item.cartId] || 0;
              return (
                <div
                  key={item.cartId}
                  className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-100"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-xs text-gray-800 uppercase truncate">{item.name}</p>
                    <p className="text-[10px] font-bold text-gray-400">
                      Dibeli: {item.quantity} x {formatRp(item.priceAtTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateReturnQty(item.cartId, item.quantity, -1)}
                      aria-label={`Kurangi retur ${item.name}`}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-gray-700"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-6 text-center text-xs font-black tabular-nums">
                      {selectedQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateReturnQty(item.cartId, item.quantity, 1)}
                      aria-label={`Tambah retur ${item.name}`}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-gray-700"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2 (Exchange Only): Select Replacement Items */}
        {mode === 'EXCHANGE' && (
          <div className="space-y-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <label className="block text-[10px] font-black uppercase text-blue-900">
              2. Pilih Barang Pengganti
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Cari barang pengganti (nama, kategori, atau barcode)..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-blue-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-100 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-gray-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold">
                      {p.category} • Stok: {p.stock} Bks
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => addReplacementItem(p, 'Bungkus')}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase"
                    >
                      + Bks ({formatRp(p.sellingPrice)})
                    </button>
                    {p.isKeteng && (p.eceranStock || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => addReplacementItem(p, 'Pcs')}
                        className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase"
                      >
                        + Pcs ({formatRp(p.ketengPrice)})
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {replacementCart.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-blue-200/70">
                <p className="text-[10px] font-black uppercase text-blue-800">
                  Barang Pengganti Dipilih:
                </p>
                {replacementCart.map((rep) => (
                  <div
                    key={rep.cartId}
                    className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-blue-200 text-xs"
                  >
                    <span className="font-black text-gray-800 truncate pr-2">
                      {rep.name} ({formatRp(rep.priceAtTime)})
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateReplacementQty(rep.cartId, -1)}
                        className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-black text-xs w-5 text-center">{rep.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateReplacementQty(rep.cartId, 1)}
                        className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Condition & Reason */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-gray-500">
              Kondisi Barang Retur
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setCondition('GOOD')}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                  condition === 'GOOD'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <PackageCheck size={16} className={condition === 'GOOD' ? 'text-emerald-600' : 'text-gray-400'} />
                <div>
                  <p className="text-[11px] font-black uppercase">Layak Jual</p>
                  <p className="text-[9px] font-bold opacity-80">Stok otomatis masuk kembali</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setCondition('DAMAGED')}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                  condition === 'DAMAGED'
                    ? 'bg-amber-50 border-amber-400 text-amber-900'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <PackageX size={16} className={condition === 'DAMAGED' ? 'text-amber-600' : 'text-gray-400'} />
                <div>
                  <p className="text-[11px] font-black uppercase">Rusak / Kedaluwarsa</p>
                  <p className="text-[9px] font-bold opacity-80">Tidak dikembalikan ke stok jual</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="return-reason-input" className="text-[10px] font-black uppercase text-gray-500">
              Alasan Retur / Tukar
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${
                    reason === preset
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              id="return-reason-input"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tulis alasan pembatalan / penukaran..."
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-300 font-bold">
            <span>Nilai Barang Diretur:</span>
            <span>{formatRp(refundAmount)}</span>
          </div>
          {mode === 'EXCHANGE' && (
            <div className="flex justify-between text-slate-300 font-bold">
              <span>Nilai Barang Pengganti:</span>
              <span>{formatRp(replacementAmount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-slate-700 font-black text-sm">
            {mode === 'REFUND' ? (
              <>
                <span>
                  {transaction.status === 'MENUNGGU'
                    ? 'Pengurangan Tagihan Kasbon:'
                    : 'Total Dana Dikembalikan (Refund):'}
                </span>
                <span className="text-rose-400">{formatRp(refundAmount)}</span>
              </>
            ) : priceDifference > 0 ? (
              <>
                <span>Selisih (Pembeli Tambah Bayar):</span>
                <span className="text-emerald-400">+ {formatRp(priceDifference)}</span>
              </>
            ) : priceDifference < 0 ? (
              <>
                <span>Selisih (Kembalian ke Pembeli):</span>
                <span className="text-amber-400">{formatRp(Math.abs(priceDifference))}</span>
              </>
            ) : (
              <>
                <span>Selisih Tukar Barang:</span>
                <span className="text-emerald-400">Impas (Rp 0)</span>
              </>
            )}
          </div>
        </div>

        {/* Owner PIN Authorization when in Cashier mode */}
        {appMode === 'cashier' && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-2">
            <label
              htmlFor="return-owner-pin"
              className="text-[10px] font-black uppercase text-amber-900 flex items-center gap-1.5"
            >
              <Lock size={13} className="text-amber-700" />
              <span>Otorisasi PIN Owner Diperlukan (Mode Karyawan Kasir)</span>
            </label>
            <input
              id="return-owner-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, ''));
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Masukkan PIN Owner (4-6 digit)"
              className="w-full p-3 bg-white border border-amber-300 rounded-xl font-mono font-black text-center tracking-[0.35em] text-sm outline-none focus:border-amber-600"
              required
            />
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2"
          >
            <AlertTriangle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black text-xs uppercase"
          >
            Batal
          </button>
          <button
            type="submit"
            className={`py-3.5 text-white rounded-xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-1.5 ${
              mode === 'REFUND'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            <CheckCircle size={15} />
            <span>
              {mode === 'REFUND'
                ? isReturningAllItems
                  ? 'Konfirmasi Batalkan Struk'
                  : 'Simpan Retur Sebagian'
                : 'Proses Tukar Barang'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
