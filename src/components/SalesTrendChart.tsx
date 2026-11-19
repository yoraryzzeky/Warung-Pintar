import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import { formatRp, type Transaction, type DigitalTransaction, type Expense } from '../utils/storeLogic';

interface SalesTrendChartProps {
  transactions: Transaction[];
  digitalTransactions: DigitalTransaction[];
  expenses?: Expense[];
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
  transactions,
  digitalTransactions,
  expenses = [],
}) => {
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayLabel = `${d.getDate()} ${d.toLocaleDateString('id-ID', { month: 'short' })}`;

      // Total retail sales (LUNAS, non-cancelled)
      const retailOmset = transactions
        .filter((t) => t.status === 'LUNAS' && !t.isCancelled && t.date && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);

      // Total digital transactions
      const digitalOmset = digitalTransactions
        .filter((t) => t.date && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + (Number(t.sellAmount) || 0), 0);

      // Total expenses on this day
      const dayExpenses = (expenses || [])
        .filter((e) => e.date && e.date.startsWith(dateStr))
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const totalOmset = (retailOmset + digitalOmset) - dayExpenses;

      data.push({
        date: dateStr,
        label: dayLabel,
        omset: totalOmset,
        retail: retailOmset,
        digital: digitalOmset,
        expenses: dayExpenses,
      });
    }

    return data;
  }, [transactions, digitalTransactions, expenses]);

  const summary = useMemo(() => {
    const total = chartData.reduce((acc, cur) => acc + cur.omset, 0);
    const avg = Math.round(total / 30);
    const best = chartData.reduce((prev, current) => (prev.omset > current.omset ? prev : current), chartData[0]);
    return { total, avg, best };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[170px]">
          <p className="font-black text-gray-300 uppercase text-[10px] flex items-center gap-1">
            <Calendar size={12} className="text-blue-400" /> {item.label} ({item.date})
          </p>
          <div className="border-t border-slate-800 pt-1">
            <span className="text-[10px] text-gray-400 block">Total Omset:</span>
            <span className="font-black text-base text-yellow-300">{formatRp(item.omset)}</span>
          </div>
          <div className="text-[9px] text-gray-300 flex justify-between pt-1 border-t border-slate-800">
            <span>Retail Fisik:</span>
            <span className="font-bold text-blue-300">{formatRp(item.retail)}</span>
          </div>
          <div className="text-[9px] text-gray-300 flex justify-between">
            <span>Layanan Digital:</span>
            <span className="font-bold text-emerald-300">{formatRp(item.digital)}</span>
          </div>
          {item.expenses > 0 && (
            <div className="text-[9px] text-rose-300 flex justify-between">
              <span>Biaya Toko:</span>
              <span className="font-bold">-{formatRp(item.expenses)}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-[2.5rem] p-3.5 sm:p-6 md:p-8 phone-landscape:p-3 border border-gray-100 shadow-sm space-y-3 sm:space-y-6 phone-landscape:space-y-2.5">
      {/* Header and Summary stats */}
      <div className="flex flex-col sm:flex-row phone-landscape:flex-col justify-between items-start sm:items-center phone-landscape:items-start gap-2.5 sm:gap-4 border-b border-gray-100 pb-3 sm:pb-5 phone-landscape:pb-2.5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 phone-landscape:w-7 phone-landscape:h-7 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center font-black shadow-sm shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-tight flex flex-wrap items-center gap-1.5 sm:gap-2">
              Tren Omset Penjualan Harian
              <span className="bg-indigo-100 text-indigo-700 text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                30 Hari
              </span>
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider phone-landscape:hidden">
              Visualisasi performa pendapatan retail fisik dan transaksi digital warung
            </p>
          </div>
        </div>

        {/* 30-Day Highlight Metrics */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="bg-slate-50 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl border border-gray-100 text-left sm:text-right">
            <span className="text-[8.5px] sm:text-[9px] font-bold text-gray-400 uppercase block">Total 30 Hari</span>
            <span className="text-[11px] sm:text-xs font-black text-indigo-600 tabular-nums">{formatRp(summary.total)}</span>
          </div>
          <div className="bg-slate-50 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl border border-gray-100 text-left sm:text-right">
            <span className="text-[8.5px] sm:text-[9px] font-bold text-gray-400 uppercase block">Rata-rata / Hari</span>
            <span className="text-[11px] sm:text-xs font-black text-blue-600 tabular-nums">{formatRp(summary.avg)}</span>
          </div>
          {summary.best && summary.best.omset > 0 && (
            <div className="bg-emerald-50 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl border border-emerald-100 text-left sm:text-right">
              <span className="text-[8.5px] sm:text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-0.5 sm:justify-end">
                <ArrowUpRight size={10} /> Rekor ({summary.best.label})
              </span>
              <span className="text-[11px] sm:text-xs font-black text-emerald-700 tabular-nums">{formatRp(summary.best.omset)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart Component */}
      <div className="w-full h-44 sm:h-60 md:h-72 phone-landscape:h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}Jt` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(238, 242, 255, 0.6)' }} />
            <Bar
              dataKey="omset"
              fill="#4f46e5"
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
