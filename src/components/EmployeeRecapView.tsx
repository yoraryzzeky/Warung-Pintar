import React, { useMemo, useState } from 'react';
import {
  Users,
  TrendingUp,
  Wallet,
  QrCode,
  Clock,
  Calendar,
  Search,
  ClipboardCheck,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  formatRp,
  type DigitalTransaction,
  type Expense,
  type Transaction,
} from '../utils/storeLogic';
import {
  buildCashierClosingRecap,
  buildEmployeeRecapTable,
  getClosingPeriodRange,
  toLocalDateKey,
  type CashierClosingRecord,
  type ClosingPeriodPreset,
} from '../utils/cashierClosing';

interface EmployeeRecapViewProps {
  transactions: Transaction[];
  digitalTransactions: DigitalTransaction[];
  expenses?: Expense[];
  closingRecords?: CashierClosingRecord[];
  cashierName: string;
  onOpenClosing?: () => void;
  playBeep?: (type?: string) => void;
}

export const EmployeeRecapView: React.FC<EmployeeRecapViewProps> = ({
  transactions,
  digitalTransactions,
  expenses = [],
  closingRecords = [],
  cashierName,
  onOpenClosing,
  playBeep,
}) => {
  const initialDaily = useMemo(() => getClosingPeriodRange('harian'), []);
  const [periodPreset, setPeriodPreset] = useState<ClosingPeriodPreset>('harian');
  const [startDate, setStartDate] = useState(initialDaily.startDate);
  const [endDate, setEndDate] = useState(initialDaily.endDate);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const handleSelectPreset = (preset: Exclude<ClosingPeriodPreset, 'custom'>) => {
    playBeep?.('click');
    const range = getClosingPeriodRange(preset);
    setPeriodPreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const periodLabel = useMemo(() => {
    if (periodPreset === 'harian') return 'Harian (Hari Ini)';
    if (periodPreset === 'mingguan') return 'Mingguan (Minggu Ini)';
    if (periodPreset === 'bulanan') return 'Bulanan (Bulan Ini)';
    return 'Periode Kustom';
  }, [periodPreset]);

  const recap = useMemo(
    () =>
      buildCashierClosingRecap(
        transactions,
        digitalTransactions,
        startDate,
        endDate,
        null,
        expenses
      ),
    [transactions, digitalTransactions, startDate, endDate, expenses]
  );

  const employeeRows = useMemo(
    () =>
      buildEmployeeRecapTable(
        transactions,
        digitalTransactions,
        closingRecords,
        startDate,
        endDate
      ),
    [transactions, digitalTransactions, closingRecords, startDate, endDate]
  );

  const filteredEmployeeRows = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employeeRows;
    return employeeRows.filter((row) => row.employeeName.toLowerCase().includes(q));
  }, [employeeRows, employeeSearch]);

  const filteredClosings = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    return (closingRecords || []).filter((rec) => {
      const key = toLocalDateKey(rec.confirmedAt);
      if (startDate && key && key < startDate) return false;
      if (endDate && key && key > endDate) return false;
      if (q && !rec.cashierName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [closingRecords, startDate, endDate, employeeSearch]);

  const employeeTotals = useMemo(
    () =>
      filteredEmployeeRows.reduce(
        (acc, r) => ({
          txCount: acc.txCount + r.txCount,
          retailOmset: acc.retailOmset + r.retailOmset,
          digitalOmset: acc.digitalOmset + r.digitalOmset,
          cashTotal: acc.cashTotal + r.cashTotal,
          qrisTotal: acc.qrisTotal + r.qrisTotal,
          kasbonTotal: acc.kasbonTotal + r.kasbonTotal,
          totalOmset: acc.totalOmset + r.totalOmset,
          closingCount: acc.closingCount + r.closingCount,
        }),
        {
          txCount: 0,
          retailOmset: 0,
          digitalOmset: 0,
          cashTotal: 0,
          qrisTotal: 0,
          kasbonTotal: 0,
          totalOmset: 0,
          closingCount: 0,
        }
      ),
    [filteredEmployeeRows]
  );

  return (
    <div
      data-testid="employee-recap-view"
      className="p-2.5 sm:p-4 md:p-8 phone-landscape:p-2.5 space-y-3 sm:space-y-5 animate-in fade-in duration-300"
    >
      {/* Header Tabel Rekap Khusus Karyawan */}
      <div className="bg-white p-3.5 sm:p-6 phone-landscape:p-3.5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2.5 sm:gap-4">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-gray-800 uppercase tracking-tight leading-none">
                Tabel Rekap Karyawan Kasir
              </h2>
              <p className="text-[9.5px] sm:text-[10px] font-bold text-gray-400 uppercase mt-1">
                Kasir Aktif: <span className="text-indigo-700">{cashierName || 'Karyawan Kasir'}</span>{' '}
                • Ringkasan penjualan per karyawan/shift (tanpa data modal/laba)
              </p>
            </div>
          </div>

          {onOpenClosing && (
            <button
              type="button"
              onClick={() => {
                playBeep?.('click');
                onOpenClosing();
              }}
              className="px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <ClipboardCheck size={14} />
              <span>Buka &amp; Konfirmasi Closing</span>
            </button>
          )}
        </div>

        {/* Filter Periode + Cari Karyawan */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div
            className="flex flex-wrap bg-slate-100 p-1 rounded-xl sm:rounded-2xl text-[9.5px] sm:text-[10px] font-black uppercase gap-1"
            role="tablist"
            aria-label="Periode Rekap Karyawan"
          >
            {(['harian', 'mingguan', 'bulanan'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                role="tab"
                aria-selected={periodPreset === preset}
                onClick={() => handleSelectPreset(preset)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all ${
                  periodPreset === preset
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {preset === 'harian' ? 'Harian' : preset === 'mingguan' ? 'Mingguan' : 'Bulanan'}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-52">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                aria-label="Cari nama karyawan kasir"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Filter nama kasir..."
                className="w-full pl-8 pr-7 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
              />
              {employeeSearch && (
                <button
                  type="button"
                  onClick={() => setEmployeeSearch('')}
                  aria-label="Hapus filter kasir"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-gray-50 px-2.5 py-2 rounded-xl border border-gray-200 w-full sm:w-auto">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              <input
                type="date"
                aria-label="Tanggal mulai rekap karyawan"
                value={startDate}
                onChange={(e) => {
                  setPeriodPreset('custom');
                  setStartDate(e.target.value);
                }}
                className="bg-transparent text-[10px] font-black outline-none uppercase"
              />
              <span className="text-gray-300">-</span>
              <input
                type="date"
                aria-label="Tanggal selesai rekap karyawan"
                value={endDate}
                onChange={(e) => {
                  setPeriodPreset('custom');
                  setEndDate(e.target.value);
                }}
                className="bg-transparent text-[10px] font-black outline-none uppercase"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Kartu Operasional Karyawan (Tanpa Laba / Harga Modal) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-indigo-600 text-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-md shadow-indigo-500/20 flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/20 flex items-center justify-center mb-2">
              <TrendingUp size={16} />
            </div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-indigo-100">
              Total Omset ({periodPreset === 'custom' ? 'Periode' : periodPreset})
            </p>
            <h3 className="text-sm sm:text-xl font-black mt-0.5 tabular-nums truncate">
              {formatRp(recap.totalSettledOmset)}
            </h3>
          </div>
          <p className="text-[8.5px] sm:text-[9px] font-bold text-indigo-100 uppercase mt-1.5 tabular-nums">
            {recap.totalSettledCount} Tx Lunas • Rtl {recap.retailSettledCount} / PPOB {recap.digitalCount}
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
              <Wallet size={16} />
            </div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400">
              Uang Tunai Sistem
            </p>
            <h3 className="text-sm sm:text-xl font-black text-emerald-700 mt-0.5 tabular-nums truncate">
              {formatRp(recap.expectedDrawerCash)}
            </h3>
          </div>
          <p className="text-[8.5px] sm:text-[9px] font-bold text-gray-400 uppercase mt-1.5">
            Tunai Masuk {formatRp(recap.cashTotal)}
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-blue-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
              <QrCode size={16} />
            </div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400">
              Non-Tunai QRIS
            </p>
            <h3 className="text-sm sm:text-xl font-black text-blue-700 mt-0.5 tabular-nums truncate">
              {formatRp(recap.qrisTotal)}
            </h3>
          </div>
          <p className="text-[8.5px] sm:text-[9px] font-bold text-gray-400 uppercase mt-1.5">
            Masuk Rekening Toko
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
              <Clock size={16} />
            </div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400">
              Piutang Kasbon
            </p>
            <h3 className="text-sm sm:text-xl font-black text-amber-700 mt-0.5 tabular-nums truncate">
              {formatRp(recap.kasbonTotal)}
            </h3>
          </div>
          <p className="text-[8.5px] sm:text-[9px] font-bold text-gray-400 uppercase mt-1.5 tabular-nums">
            {recap.kasbonCount} Tx Belum Lunas
          </p>
        </div>
      </div>

      {/* Tabel Rekap Khusus Karyawan (Per Kasir / Shift) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase">
              Rekap Penjualan Per Karyawan / Shift
            </h3>
            <p className="text-[9.5px] font-bold text-gray-400 uppercase mt-0.5">
              {periodLabel} • {startDate || '-'} s/d {endDate || '-'}
            </p>
          </div>
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9.5px] font-black uppercase tabular-nums">
            {filteredEmployeeRows.length} Karyawan
          </span>
        </div>

        <div className="px-3.5 py-1.5 bg-slate-50/70 border-b border-gray-100 text-[9px] font-bold uppercase text-gray-400 sm:hidden">
          Geser tabel ke samping untuk detail lengkap →
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[740px]" data-testid="employee-recap-table">
            <thead>
              <tr className="bg-slate-50 text-[9.5px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-3.5 sm:px-5 py-3">Nama Karyawan</th>
                <th className="px-3 py-3 text-center">Tx Lunas</th>
                <th className="px-3 py-3 text-right">Omset Retail</th>
                <th className="px-3 py-3 text-right">Omset PPOB</th>
                <th className="px-3 py-3 text-right">Tunai</th>
                <th className="px-3 py-3 text-right">QRIS</th>
                <th className="px-3 py-3 text-right">Kasbon</th>
                <th className="px-3 py-3 text-right">Total Omset</th>
                <th className="px-3.5 sm:px-5 py-3 text-center">Closing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployeeRows.map((row) => (
                <tr key={row.employeeName} className="text-[11px] sm:text-xs hover:bg-slate-50/70">
                  <td className="px-3.5 sm:px-5 py-3 font-black text-gray-900 uppercase whitespace-nowrap">
                    {row.employeeName}
                  </td>
                  <td className="px-3 py-3 text-center font-black text-blue-600 tabular-nums">
                    {row.txCount}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-gray-700 tabular-nums">
                    {formatRp(row.retailOmset)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-indigo-600 tabular-nums">
                    {formatRp(row.digitalOmset)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-emerald-700 tabular-nums">
                    {formatRp(row.cashTotal)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-blue-700 tabular-nums">
                    {formatRp(row.qrisTotal)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-amber-700 tabular-nums">
                    {formatRp(row.kasbonTotal)}
                  </td>
                  <td className="px-3 py-3 text-right font-black text-gray-900 tabular-nums">
                    {formatRp(row.totalOmset)}
                  </td>
                  <td className="px-3.5 sm:px-5 py-3 text-center whitespace-nowrap">
                    {row.closingCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9.5px] font-black uppercase">
                        <CheckCircle2 size={11} />
                        {row.closingCount}x Terkonfirmasi
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[9.5px] font-bold uppercase">
                        Belum Closing
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {filteredEmployeeRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white text-[11px] sm:text-xs font-black">
                  <td className="px-3.5 sm:px-5 py-3 uppercase">Total Keseluruhan</td>
                  <td className="px-3 py-3 text-center tabular-nums">{employeeTotals.txCount}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatRp(employeeTotals.retailOmset)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatRp(employeeTotals.digitalOmset)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatRp(employeeTotals.cashTotal)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatRp(employeeTotals.qrisTotal)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatRp(employeeTotals.kasbonTotal)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatRp(employeeTotals.totalOmset)}
                  </td>
                  <td className="px-3.5 sm:px-5 py-3 text-center tabular-nums">
                    {employeeTotals.closingCount}x
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {filteredEmployeeRows.length === 0 && (
          <div className="text-center py-8 px-4 text-gray-400 font-bold uppercase text-[10px]">
            Belum ada aktivitas transaksi karyawan pada periode {periodLabel.toLowerCase()} ini.
          </div>
        )}
      </div>

      {/* Riwayat Konfirmasi Closing Karyawan */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase">
              Riwayat Konfirmasi Closing Karyawan
            </h3>
            <p className="text-[9.5px] font-bold text-gray-400 uppercase mt-0.5">
              Catatan closing shift yang sudah dikonfirmasi ke Owner
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[9.5px] font-black uppercase tabular-nums">
            {filteredClosings.length} Record
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 text-[9.5px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-3.5 sm:px-5 py-3">Waktu Closing</th>
                <th className="px-3 py-3">Karyawan</th>
                <th className="px-3 py-3">Periode</th>
                <th className="px-3 py-3 text-right">Omset Bersih</th>
                <th className="px-3 py-3 text-right">Tunai Sistem</th>
                <th className="px-3 py-3 text-right">Selisih Kas</th>
                <th className="px-3.5 sm:px-5 py-3 text-center">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClosings.map((rec) => {
                const varianceBadge =
                  rec.cashVariance === null
                    ? 'Belum Diisi'
                    : rec.cashVariance === 0
                      ? 'KLOP (Rp 0)'
                      : rec.cashVariance > 0
                        ? `+${formatRp(rec.cashVariance)}`
                        : formatRp(rec.cashVariance);
                return (
                  <tr key={rec.id} className="text-[11px] sm:text-xs hover:bg-slate-50/70">
                    <td className="px-3.5 sm:px-5 py-3 font-bold text-gray-700 whitespace-nowrap">
                      {new Date(rec.confirmedAt).toLocaleString('id-ID', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-3 py-3 font-black text-gray-900 uppercase">
                      {rec.cashierName}
                    </td>
                    <td className="px-3 py-3 font-bold text-gray-500 uppercase text-[10px]">
                      {rec.periodLabel}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-gray-900 tabular-nums">
                      {formatRp(rec.totalSettledOmset)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-emerald-700 tabular-nums">
                      {formatRp(rec.expectedDrawerCash)}
                    </td>
                    <td className="px-3 py-3 text-right font-black tabular-nums">
                      <span
                        className={
                          rec.cashVariance === 0
                            ? 'text-emerald-600'
                            : rec.cashVariance && rec.cashVariance < 0
                              ? 'text-rose-600'
                              : 'text-slate-600'
                        }
                      >
                        {varianceBadge}
                      </span>
                    </td>
                    <td className="px-3.5 sm:px-5 py-3 text-center">
                      {rec.sentToWhatsApp ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9.5px] font-black uppercase">
                          Siap / Terkirim
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[9.5px] font-bold uppercase">
                          Tersimpan
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredClosings.length === 0 && (
          <div className="text-center py-6 px-4 text-gray-400 font-bold uppercase text-[10px]">
            Belum ada riwayat konfirmasi closing pada periode ini.
          </div>
        )}
      </div>
    </div>
  );
};
