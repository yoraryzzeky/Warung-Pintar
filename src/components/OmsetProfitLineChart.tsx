import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp, Calendar, Percent } from 'lucide-react';
import {
  formatRp,
  buildLast30DaysFinancialSeries,
  type Transaction,
  type DigitalTransaction,
} from '../utils/storeLogic';

interface OmsetProfitLineChartProps {
  transactions: Transaction[];
  digitalTransactions: DigitalTransaction[];
}

export const OmsetProfitLineChart: React.FC<OmsetProfitLineChartProps> = ({
  transactions,
  digitalTransactions,
}) => {
  const chartData = useMemo(
    () => buildLast30DaysFinancialSeries(transactions, digitalTransactions),
    [transactions, digitalTransactions]
  );

  const summary = useMemo(() => {
    const totalOmset = chartData.reduce((acc, cur) => acc + cur.omset, 0);
    const totalLaba = chartData.reduce((acc, cur) => acc + cur.laba, 0);
    const overallMargin = totalOmset > 0 ? ((totalLaba / totalOmset) * 100).toFixed(1) : '0.0';
    return { totalOmset, totalLaba, overallMargin };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl text-xs space-y-2 border border-slate-700 min-w-[200px]">
          <p className="font-bold text-slate-300 text-[11px] flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <Calendar size={12} className="text-blue-400" /> {item.label} ({item.date})
          </p>
          <div className="flex justify-between items-center">
            <span className="text-blue-300 font-medium">Total Omset</span>
            <span className="font-bold tabular-nums text-white">{formatRp(item.omset)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-emerald-300 font-medium">Total Laba Bersih</span>
            <span className="font-bold tabular-nums text-emerald-400">{formatRp(item.laba)}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[10px]">
            <span className="text-slate-400">Efisiensi Margin</span>
            <span className="font-bold tabular-nums text-amber-300">{item.marginPercent}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section
      aria-label="Grafik Perbandingan Omset dan Laba Bersih"
      className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Perbandingan Omset vs Laba Bersih (30 Hari Terakhir)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau efisiensi margin keuntungan harian dari total omset toko
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap text-right">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Omset 30 Hari</span>
            <span className="text-xs sm:text-sm font-bold text-blue-600 tabular-nums">
              {formatRp(summary.totalOmset)}
            </span>
          </div>
          <div className="h-7 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Laba Bersih 30 Hari</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-600 tabular-nums">
              {formatRp(summary.totalLaba)}
            </span>
          </div>
          <div className="h-7 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />
          <div>
            <span className="text-[11px] font-medium text-slate-400 flex items-center justify-end gap-1">
              <Percent size={11} /> Efisiensi Margin
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-800 tabular-nums">
              {summary.overallMargin}%
            </span>
          </div>
        </div>
      </div>

      <div className="w-full h-72" data-testid="omset-profit-line-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
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
              tickFormatter={(v) =>
                v >= 1000000
                  ? `${(v / 1000000).toFixed(1)}Jt`
                  : v >= 1000
                  ? `${Math.round(v / 1000)}k`
                  : String(v)
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="omset"
              name="Total Omset"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: '#2563eb', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="laba"
              name="Total Laba Bersih"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: '#10b981', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
