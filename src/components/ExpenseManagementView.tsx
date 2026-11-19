import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Search,
  FileDown,
  Wallet,
  CreditCard,
  Zap,
  Truck,
  Package,
  Coffee,
  ShieldCheck,
  Wrench,
  Sparkles,
  AlertCircle,
  X,
  CheckCircle,
  Clock,
  ArrowDownRight,
  TrendingDown,
} from 'lucide-react';
import {
  formatRp,
  formatDate,
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
  type ExpensePaymentSource,
} from '../utils/storeLogic';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateUniqueRecordId } from '../utils/firestorePayload';

interface ExpenseManagementViewProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  appMode: 'owner' | 'cashier';
  currentUserRoleName: string;
  storeName: string;
  playBeep: (type?: string) => void;
}

type PeriodFilter = 'hari_ini' | 'minggu_ini' | 'bulan_ini' | 'semua';

export const ExpenseManagementView: React.FC<ExpenseManagementViewProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
  appMode,
  currentUserRoleName,
  storeName,
  playBeep,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('bulan_ini');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | ExpensePaymentSource>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Listrik & Token');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formSource, setFormSource] = useState<ExpensePaymentSource>('LACI_KAS');
  const [formDate, setFormDate] = useState<string>(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Date range filter computation
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (periodFilter === 'hari_ini') {
      return { startDate: todayStr, endDate: todayStr };
    }
    if (periodFilter === 'minggu_ini') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      const mY = monday.getFullYear();
      const mM = String(monday.getMonth() + 1).padStart(2, '0');
      const mD = String(monday.getDate()).padStart(2, '0');
      return { startDate: `${mY}-${mM}-${mD}`, endDate: todayStr };
    }
    if (periodFilter === 'bulan_ini') {
      return { startDate: `${yyyy}-${mm}-01`, endDate: todayStr };
    }
    return { startDate: '', endDate: '' };
  }, [periodFilter]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter((exp) => {
      const expDateKey = exp.date.split('T')[0];
      if (startDate && expDateKey < startDate) return false;
      if (endDate && expDateKey > endDate) return false;
      if (sourceFilter !== 'ALL' && exp.source !== sourceFilter) return false;
      if (selectedCategory !== 'ALL' && exp.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = (exp.description || '').toLowerCase().includes(q);
        const catMatch = (exp.category || '').toLowerCase().includes(q);
        const byMatch = (exp.handledBy || '').toLowerCase().includes(q);
        if (!descMatch && !catMatch && !byMatch) return false;
      }
      return true;
    });
  }, [expenses, startDate, endDate, sourceFilter, selectedCategory, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let total = 0;
    let fromDrawer = 0;
    let nonCash = 0;

    filteredExpenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      total += amt;
      if (exp.source === 'LACI_KAS') {
        fromDrawer += amt;
      } else {
        nonCash += amt;
      }
    });

    return {
      total,
      fromDrawer,
      nonCash,
      count: filteredExpenses.length,
    };
  }, [filteredExpenses]);

  // Category breakdown for insights
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((exp) => {
      const cat = exp.category || 'Lain-lain';
      map[cat] = (map[cat] || 0) + (Number(exp.amount) || 0);
    });
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Listrik & Token':
        return <Zap size={14} className="text-amber-500" />;
      case 'Transport & Bensin':
        return <Truck size={14} className="text-blue-500" />;
      case 'Perlengkapan & Plastik':
        return <Package size={14} className="text-teal-500" />;
      case 'Konsumsi & Minum':
        return <Coffee size={14} className="text-orange-500" />;
      case 'Kebersihan & Keamanan':
        return <ShieldCheck size={14} className="text-purple-500" />;
      case 'Pemeliharaan':
        return <Wrench size={14} className="text-rose-500" />;
      default:
        return <Sparkles size={14} className="text-gray-500" />;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = Number(formAmount.replace(/[^0-9]/g, ''));
    if (!parsedAmt || parsedAmt <= 0) {
      setFormError('Nominal pengeluaran harus lebih besar dari Rp 0!');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Masukkan keterangan pengeluaran (misal: Beli token listrik warung)!');
      return;
    }

    setFormError(null);
    playBeep('success');

    const newExpense: Expense = {
      id: generateUniqueRecordId('EXP'),
      date: `${formDate}T${new Date().toTimeString().slice(0, 8)}`,
      category: formCategory,
      description: formDescription.trim(),
      amount: parsedAmt,
      source: formSource,
      handledBy: currentUserRoleName || (appMode === 'owner' ? 'Owner' : 'Kasir'),
    };

    onAddExpense(newExpense);
    setShowAddModal(false);
    setFormAmount('');
    setFormDescription('');
  };

  const handleExportPDF = () => {
    playBeep('click');
    const doc = new jsPDF();
    const periodTitle =
      periodFilter === 'hari_ini'
        ? 'Hari Ini'
        : periodFilter === 'minggu_ini'
        ? 'Minggu Ini'
        : periodFilter === 'bulan_ini'
        ? 'Bulan Ini'
        : 'Semua Periode';

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 36, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text((storeName || 'WARUNG PINTAR PRO').toUpperCase(), 14, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`LAPORAN PENGELUARAN & BIAYA OPERASIONAL (${periodTitle})`, 14, 25);
    doc.setFontSize(8);
    doc.text(`Dicetak: ${formatDate(new Date().toISOString())}`, 14, 31);

    // Summary Boxes
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 42, 58, 20, 2, 2, 'FD');
    doc.roundedRect(76, 42, 58, 20, 2, 2, 'FD');
    doc.roundedRect(138, 42, 58, 20, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL PENGELUARAN', 18, 48);
    doc.text('DARI UANG TUNAI', 80, 48);
    doc.text('NON-TUNAI (REKENING)', 142, 48);

    doc.setFontSize(11);
    doc.setTextColor(225, 29, 72);
    doc.text(formatRp(stats.total), 18, 56);
    doc.setTextColor(217, 119, 6);
    doc.text(formatRp(stats.fromDrawer), 80, 56);
    doc.setTextColor(37, 99, 235);
    doc.text(formatRp(stats.nonCash), 142, 56);

    // Table
    const tableData = filteredExpenses.map((exp, idx) => [
      idx + 1,
      formatDate(exp.date),
      exp.category,
      exp.description,
      exp.source === 'LACI_KAS' ? 'Uang Tunai' : 'Non-Tunai',
      exp.handledBy,
      formatRp(exp.amount),
    ]);

    autoTable(doc, {
      startY: 68,
      head: [['No', 'Tanggal', 'Kategori', 'Keterangan', 'Sumber Dana', 'Dicatat Oleh', 'Nominal']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 26 },
        2: { cellWidth: 28 },
        3: { cellWidth: 54 },
        4: { cellWidth: 26 },
        5: { cellWidth: 22 },
        6: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] },
      },
    });

    doc.save(`Laporan_Pengeluaran_${periodTitle.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  return (
    <div className="p-2.5 sm:p-4 md:p-8 phone-landscape:p-2.5 space-y-3 sm:space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white p-3.5 sm:p-6 phone-landscape:p-3.5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-gray-800 uppercase tracking-tight leading-none">
                Biaya &amp; Pengeluaran Toko
              </h2>
              <p className="text-[9.5px] sm:text-[10px] font-bold text-gray-400 uppercase mt-1">
                Catat biaya operasional (listrik, bensin, plastik) yang memotong kas tunai atau omset
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={filteredExpenses.length === 0}
            className="flex-1 md:flex-initial py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <FileDown size={15} />
            <span>Unduh PDF</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setShowAddModal(true);
            }}
            className="flex-1 md:flex-initial py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20"
          >
            <Plus size={16} />
            <span>+ Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] sm:text-xs font-black uppercase">Total Pengeluaran</span>
            <TrendingDown size={16} className="text-rose-500" />
          </div>
          <p className="text-base sm:text-2xl font-black text-rose-600 tracking-tight">
            {formatRp(stats.total)}
          </p>
          <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold">
            {stats.count} Transaksi Pengeluaran
          </p>
        </div>

        <div className="bg-amber-50/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-200/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10px] sm:text-xs font-black uppercase">Potong Kas Tunai</span>
            <Wallet size={16} className="text-amber-600" />
          </div>
          <p className="text-base sm:text-2xl font-black text-amber-800 tracking-tight">
            {formatRp(stats.fromDrawer)}
          </p>
          <p className="text-[9px] sm:text-[10px] text-amber-600 font-bold">
            Mengurangi uang fisik tunai kasir
          </p>
        </div>

        <div className="bg-blue-50/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-blue-200/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[10px] sm:text-xs font-black uppercase">Non-Tunai / Rekening</span>
            <CreditCard size={16} className="text-blue-600" />
          </div>
          <p className="text-base sm:text-2xl font-black text-blue-800 tracking-tight">
            {formatRp(stats.nonCash)}
          </p>
          <p className="text-[9px] sm:text-[10px] text-blue-600 font-bold">
            Transfer bank / saldo non-tunai
          </p>
        </div>

        <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] sm:text-xs font-black uppercase">Kategori Terbesar</span>
            <Sparkles size={16} className="text-slate-600" />
          </div>
          <p className="text-xs sm:text-sm font-black text-slate-800 truncate">
            {categoryBreakdown[0] ? categoryBreakdown[0].category : 'Belum Ada'}
          </p>
          <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold">
            {categoryBreakdown[0] ? formatRp(categoryBreakdown[0].amount) : 'Rp 0'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Preset Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] sm:text-xs font-bold overflow-x-auto">
            {(
              [
                { id: 'hari_ini', label: 'Hari Ini' },
                { id: 'minggu_ini', label: 'Minggu Ini' },
                { id: 'bulan_ini', label: 'Bulan Ini' },
                { id: 'semua', label: 'Semua' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playBeep('click');
                  setPeriodFilter(tab.id);
                }}
                className={`py-1.5 px-2.5 sm:px-3 rounded-lg transition-all shrink-0 ${
                  periodFilter === tab.id
                    ? 'bg-white text-gray-800 shadow-sm font-black'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Source Toggle Filter */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold">
            <span className="text-gray-400 shrink-0">Sumber:</span>
            <button
              type="button"
              onClick={() => setSourceFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                sourceFilter === 'ALL'
                  ? 'bg-slate-800 text-white border-slate-800 font-black'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('LACI_KAS')}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                sourceFilter === 'LACI_KAS'
                  ? 'bg-amber-600 text-white border-amber-600 font-black'
                  : 'bg-white text-amber-700 border-amber-200'
              }`}
            >
              <Wallet size={11} />
              Uang Tunai
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('NON_TUNAI')}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                sourceFilter === 'NON_TUNAI'
                  ? 'bg-blue-600 text-white border-blue-600 font-black'
                  : 'bg-white text-blue-700 border-blue-200'
              }`}
            >
              <CreditCard size={11} />
              Non-Tunai
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari keterangan pengeluaran, dicatat oleh, dll..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-rose-500 transition-colors"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
          >
            <option value="ALL">Semua Kategori</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Expense Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-3.5 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-tight">
            Daftar Catatan Pengeluaran ({filteredExpenses.length})
          </h3>
          <span className="text-[10px] font-bold text-gray-400">
            {startDate ? `${startDate} s/d ${endDate}` : 'Semua Periode'}
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-10 text-center text-gray-400 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-50 text-gray-300 mx-auto flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <p className="text-xs sm:text-sm font-bold text-gray-600">
              Tidak ada catatan pengeluaran pada filter ini
            </p>
            <p className="text-[10px] sm:text-xs text-gray-400">
              Klik tombol &quot;+ Catat Pengeluaran&quot; untuk memasukkan biaya listrik, bensin, dll.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] sm:text-xs">
              <thead className="bg-slate-50 border-b border-gray-100 text-gray-400 uppercase font-black text-[9px] sm:text-[10px]">
                <tr>
                  <th className="py-2.5 sm:py-3.5 px-3 sm:px-4">Waktu</th>
                  <th className="py-2.5 sm:py-3.5 px-3 sm:px-4">Kategori</th>
                  <th className="py-2.5 sm:py-3.5 px-3 sm:px-4">Keterangan</th>
                  <th className="py-2.5 sm:py-3.5 px-3 sm:px-4">Sumber Dana</th>
                  <th className="py-2.5 sm:py-3.5 px-3 sm:px-4">Dicatat Oleh</th>
                  <th className="py-2.5 sm:py-3.5 px-3 sm:px-4 text-right">Nominal</th>
                  <th className="py-2.5 sm:py-3.5 px-3 sm:px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap text-gray-500 font-medium">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-800">
                        {getCategoryIcon(exp.category)}
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-gray-800 max-w-xs truncate">
                      {exp.description}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap">
                      {exp.source === 'LACI_KAS' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                          <Wallet size={11} />
                          Uang Tunai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                          <CreditCard size={11} />
                          Non-Tunai
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-gray-500 whitespace-nowrap font-medium">
                      {exp.handledBy}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-black text-rose-600 whitespace-nowrap">
                      -{formatRp(exp.amount)}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                      {deleteConfirmId === exp.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteExpense(exp.id);
                              setDeleteConfirmId(null);
                              playBeep('success');
                            }}
                            className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold"
                          >
                            Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(exp.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Hapus Pengeluaran"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah Pengeluaran */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-tight">
                    Catat Pengeluaran Toko
                  </h3>
                  <p className="text-[10px] text-rose-100 font-medium">
                    Biaya operasional toko yang memotong kas tunai atau rekening
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Kategori */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase">
                  Pilih Kategori Pengeluaran
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      className={`p-2 rounded-xl text-[10px] font-black text-left flex items-center gap-1.5 border transition-all ${
                        formCategory === cat
                          ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-sm'
                          : 'bg-slate-50 border-gray-100 text-gray-600 hover:bg-slate-100'
                      }`}
                    >
                      {getCategoryIcon(cat)}
                      <span className="truncate">{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nominal */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">
                  Nominal Pengeluaran (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-gray-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="Contoh: 50000"
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-rose-50/50 border border-rose-200 rounded-xl text-base font-black text-rose-700 outline-none focus:bg-white focus:border-rose-500"
                    required
                  />
                </div>
                {formAmount && Number(formAmount) > 0 && (
                  <p className="text-[10px] font-bold text-rose-600 pl-1">
                    Terbilang: {formatRp(Number(formAmount))}
                  </p>
                )}
              </div>

              {/* Sumber Dana */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase">
                  Sumber Dana Pengeluaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      formSource === 'LACI_KAS'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm'
                        : 'bg-slate-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="source"
                      checked={formSource === 'LACI_KAS'}
                      onChange={() => setFormSource('LACI_KAS')}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-black block">Uang Kas Tunai Toko</span>
                      <span className="text-[9.5px] font-medium text-amber-700">
                        Mengurangi uang tunai fisik kasir
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      formSource === 'NON_TUNAI'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-sm'
                        : 'bg-slate-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="source"
                      checked={formSource === 'NON_TUNAI'}
                      onChange={() => setFormSource('NON_TUNAI')}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-black block">Non-Tunai / Rekening</span>
                      <span className="text-[9.5px] font-medium text-blue-700">
                        Transfer bank pribadi atau QRIS toko
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">
                  Keterangan / Keperluan
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Contoh: Beli token PLN toko 50rb / Bensin kulakan"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-rose-500"
                  required
                />
              </div>

              {/* Tanggal */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">
                  Tanggal Pengeluaran
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                  required
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl text-xs font-black transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-rose-600/20"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
