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
import { formatRp, type Transaction, type DigitalTransaction } from '../utils/storeLogic';

interface SalesTrendChartProps {
  transactions: Transaction[];
  digitalTransactions: DigitalTransaction[];
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
  transactions,
  digitalTransactions,
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

      // Total retail sales (LUNAS)
      const retailOmset = transactions
        .filter((t) => t.status === 'LUNAS' && t.date && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);

      // Total digital transactions
      const digitalOmset = digitalTransactions
        .filter((t) => t.date && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + (Number(t.sellAmount) || 0), 0);

      const totalOmset = retailOmset + digitalOmset;

      data.push({
        date: dateStr,
        label: dayLabel,
        omset: totalOmset,
        retail: retailOmset,
        digital: digitalOmset,
      });
    }

    return data;
  }, [transactions, digitalTransactions]);

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
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
      {/* Header and Summary stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black shadow-sm">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
              Tren Omset Penjualan Harian
              <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                30 Hari Terakhir
              </span>
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Visualisasi performa pendapatan retail fisik dan transaksi digital warung
            </p>
          </div>
        </div>

        {/* 30-Day Highlight Metrics */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-50 px-3.5 py-2 rounded-2xl border border-gray-100 text-right">
            <span className="text-[9px] font-bold text-gray-400 uppercase block">Total 30 Hari</span>
            <span className="text-xs font-black text-indigo-600">{formatRp(summary.total)}</span>
          </div>
          <div className="bg-slate-50 px-3.5 py-2 rounded-2xl border border-gray-100 text-right">
            <span className="text-[9px] font-bold text-gray-400 uppercase block">Rata-rata / Hari</span>
            <span className="text-xs font-black text-blue-600">{formatRp(summary.avg)}</span>
          </div>
          {summary.best && summary.best.omset > 0 && (
            <div className="bg-emerald-50 px-3.5 py-2 rounded-2xl border border-emerald-100 text-right">
              <span className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-0.5 justify-end">
                <ArrowUpRight size={10} /> Rekor ({summary.best.label})
              </span>
              <span className="text-xs font-black text-emerald-700">{formatRp(summary.best.omset)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart Component */}
      <div className="w-full h-72">
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
