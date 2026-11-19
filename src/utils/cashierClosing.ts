import {
  formatRp,
  isKasbonTransaction,
  type DigitalTransaction,
  type Expense,
  type Transaction,
} from './storeLogic';

export type ClosingPeriodPreset = 'harian' | 'mingguan' | 'bulanan' | 'custom';

export interface CashierClosingRecord {
  id: string;
  confirmedAt: string;
  periodPreset: ClosingPeriodPreset;
  periodLabel: string;
  startDate: string;
  endDate: string;
  cashierName: string;
  totalSettledOmset: number;
  retailSettledOmset: number;
  digitalOmset: number;
  totalExpenses: number;
  expectedDrawerCash: number;
  physicalCashCount: number | null;
  cashVariance: number | null;
  qrisTotal: number;
  kasbonTotal: number;
  totalSettledCount: number;
  note: string;
  sentToWhatsApp: boolean;
  ownerPhone: string;
}

export interface EmployeeRecapRow {
  employeeName: string;
  txCount: number;
  retailCount: number;
  digitalCount: number;
  retailOmset: number;
  digitalOmset: number;
  cashTotal: number;
  qrisTotal: number;
  kasbonTotal: number;
  kasbonCount: number;
  totalOmset: number;
  closingCount: number;
  lastClosingAt: string | null;
  lastVariance: number | null;
}

export interface ClosingDailyRow {
  date: string;
  count: number;
  retailOmset: number;
  digitalOmset: number;
  expensesAmount: number;
  totalOmset: number;
  cashOmset: number;
  qrisOmset: number;
  kasbonAmount: number;
}

export interface ClosingTopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export interface CashierClosingRecap {
  startDate: string;
  endDate: string;
  totalSettledOmset: number;
  retailSettledOmset: number;
  digitalOmset: number;
  cashTotal: number;
  qrisTotal: number;
  kasbonTotal: number;
  totalSettledCount: number;
  retailSettledCount: number;
  digitalCount: number;
  kasbonCount: number;
  cancelledCount: number;
  tarikTunaiCount: number;
  tarikTunaiDrawerCash: number;
  expenseDrawerCash: number;
  totalExpenses: number;
  expectedDrawerCash: number;
  physicalCashCount: number | null;
  cashVariance: number | null;
  dailyBreakdown: ClosingDailyRow[];
  topSoldItems: ClosingTopProduct[];
}

export function toLocalDateKey(dateInput: Date | string): string | null {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getClosingPeriodRange(
  preset: Exclude<ClosingPeriodPreset, 'custom'>,
  referenceDate: Date = new Date()
): { startDate: string; endDate: string; label: string } {
  const ref = new Date(referenceDate);
  const endDate = toLocalDateKey(ref) || '';

  if (preset === 'harian') {
    return {
      startDate: endDate,
      endDate,
      label: 'Harian (Hari Ini)',
    };
  }

  if (preset === 'mingguan') {
    const dayOfWeek = ref.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(ref);
    monday.setDate(ref.getDate() - diffToMonday);
    const startDate = toLocalDateKey(monday) || endDate;
    return {
      startDate,
      endDate,
      label: 'Mingguan (Minggu Ini)',
    };
  }

  // bulanan
  const firstOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const startDate = toLocalDateKey(firstOfMonth) || endDate;
  return {
    startDate,
    endDate,
    label: 'Bulanan (Bulan Ini)',
  };
}

export function buildCashierClosingRecap(
  transactions: Transaction[],
  digitalTransactions: DigitalTransaction[],
  startDate?: string,
  endDate?: string,
  physicalCashCount: number | null = null,
  expenses: Expense[] = []
): CashierClosingRecap {
  const normalizedStart = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : '';
  const normalizedEnd = endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : '';

  const isInRange = (dateStr: string | undefined): string | null => {
    if (!dateStr) return null;
    const key = toLocalDateKey(dateStr);
    if (!key) return null;
    if (normalizedStart && key < normalizedStart) return null;
    if (normalizedEnd && key > normalizedEnd) return null;
    return key;
  };

  const dailyMap: Record<string, ClosingDailyRow> = {};
  const itemMap: Record<string, ClosingTopProduct> = {};

  const ensureDayRow = (dateKey: string): ClosingDailyRow => {
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = {
        date: dateKey,
        count: 0,
        retailOmset: 0,
        digitalOmset: 0,
        expensesAmount: 0,
        totalOmset: 0,
        cashOmset: 0,
        qrisOmset: 0,
        kasbonAmount: 0,
      };
    }
    return dailyMap[dateKey];
  };

  let retailSettledOmset = 0;
  let retailSettledCount = 0;
  let digitalOmset = 0;
  let digitalCount = 0;
  let cashTotal = 0;
  let qrisTotal = 0;
  let kasbonTotal = 0;
  let kasbonCount = 0;
  let cancelledCount = 0;
  let tarikTunaiCount = 0;
  let tarikTunaiDrawerCash = 0;

  transactions.forEach((tx) => {
    const dateKey = isInRange(tx.date);
    if (!dateKey) return;

    if (tx.isCancelled) {
      cancelledCount += 1;
      return;
    }

    const row = ensureDayRow(dateKey);

    if (isKasbonTransaction(tx)) {
      const due =
        tx.shortage !== undefined
          ? Math.max(0, Number(tx.shortage) || 0)
          : Math.max(0, Number(tx.totalAmount) || 0);
      kasbonTotal += due;
      kasbonCount += 1;
      row.kasbonAmount += due;
      return;
    }

    if (tx.status !== 'LUNAS') return;

    const amount = Math.max(0, Number(tx.totalAmount) || 0);
    retailSettledOmset += amount;
    retailSettledCount += 1;
    row.retailOmset += amount;
    row.count += 1;

    if (tx.paymentMethod === 'QRIS') {
      qrisTotal += amount;
      row.qrisOmset += amount;
    } else {
      cashTotal += amount;
      row.cashOmset += amount;
    }

    if (Array.isArray(tx.items)) {
      tx.items.forEach((item) => {
        const key = (item.name || item.id || 'Produk').trim();
        const qty = Math.max(0, Number(item.quantity) || 0);
        const rev = (Number(item.priceAtTime) || 0) * qty;
        if (!itemMap[key]) {
          itemMap[key] = { name: key, quantity: 0, revenue: 0 };
        }
        itemMap[key].quantity += qty;
        itemMap[key].revenue += rev;
      });
    }
  });

  digitalTransactions.forEach((tx) => {
    const dateKey = isInRange(tx.date);
    if (!dateKey) return;

    const row = ensureDayRow(dateKey);
    const amount = Math.max(0, Number(tx.sellAmount) || 0);

    if (isKasbonTransaction(tx)) {
      kasbonTotal += amount;
      kasbonCount += 1;
      row.kasbonAmount += amount;
      return;
    }

    digitalOmset += amount;
    digitalCount += 1;
    row.digitalOmset += amount;
    row.count += 1;

    // Tarik Tunai: Uang fisik tunai diambil dari laci toko (baseAmount) dan masuk ke transaksi non-tunai
    if (tx.serviceType === 'Tarik Tunai') {
      tarikTunaiCount += 1;
      const cashOut = Math.max(0, Number(tx.baseAmount) || 0);
      tarikTunaiDrawerCash += cashOut;
      qrisTotal += amount;
      row.qrisOmset += amount;
    } else if (tx.paymentMethod === 'QRIS') {
      qrisTotal += amount;
      row.qrisOmset += amount;
    } else {
      cashTotal += amount;
      row.cashOmset += amount;
    }
  });

  let expenseDrawerCash = 0;
  let totalExpenses = 0;

  (expenses || []).forEach((exp) => {
    const dateKey = isInRange(exp.date);
    if (!dateKey) return;
    const expAmt = Math.max(0, Number(exp.amount) || 0);
    totalExpenses += expAmt;
    if (exp.source === 'LACI_KAS') {
      expenseDrawerCash += expAmt;
    }
    const row = ensureDayRow(dateKey);
    row.expensesAmount += expAmt;
  });

  Object.values(dailyMap).forEach((row) => {
    row.totalOmset = row.retailOmset + row.digitalOmset - row.expensesAmount;
  });

  const dailyBreakdown = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
  const topSoldItems = Object.values(itemMap)
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 10);

  const totalSettledOmset = retailSettledOmset + digitalOmset - totalExpenses;
  const totalSettledCount = retailSettledCount + digitalCount;
  const expectedDrawerCash = cashTotal - tarikTunaiDrawerCash - expenseDrawerCash;
  const validPhysical =
    typeof physicalCashCount === 'number' && Number.isFinite(physicalCashCount) && physicalCashCount >= 0
      ? physicalCashCount
      : null;
  const cashVariance = validPhysical !== null ? validPhysical - expectedDrawerCash : null;

  return {
    startDate: normalizedStart,
    endDate: normalizedEnd,
    totalSettledOmset,
    retailSettledOmset,
    digitalOmset,
    cashTotal,
    qrisTotal,
    kasbonTotal,
    totalSettledCount,
    retailSettledCount,
    digitalCount,
    kasbonCount,
    cancelledCount,
    tarikTunaiCount,
    tarikTunaiDrawerCash,
    expenseDrawerCash,
    totalExpenses,
    expectedDrawerCash,
    physicalCashCount: validPhysical,
    cashVariance,
    dailyBreakdown,
    topSoldItems,
  };
}

export function buildEmployeeRecapTable(
  transactions: Transaction[],
  digitalTransactions: DigitalTransaction[],
  closingRecords: CashierClosingRecord[] = [],
  startDate?: string,
  endDate?: string
): EmployeeRecapRow[] {
  const normalizedStart = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : '';
  const normalizedEnd = endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : '';

  const isInRange = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    const key = toLocalDateKey(dateStr);
    if (!key) return false;
    if (normalizedStart && key < normalizedStart) return false;
    if (normalizedEnd && key > normalizedEnd) return false;
    return true;
  };

  const map: Record<string, EmployeeRecapRow> = {};
  const ensureEmployee = (rawName?: string): EmployeeRecapRow => {
    const clean = (rawName || '').trim() || 'Karyawan Kasir';
    const key = clean.toLowerCase();
    if (!map[key]) {
      map[key] = {
        employeeName: clean,
        txCount: 0,
        retailCount: 0,
        digitalCount: 0,
        retailOmset: 0,
        digitalOmset: 0,
        cashTotal: 0,
        qrisTotal: 0,
        kasbonTotal: 0,
        kasbonCount: 0,
        totalOmset: 0,
        closingCount: 0,
        lastClosingAt: null,
        lastVariance: null,
      };
    }
    return map[key];
  };

  transactions.forEach((tx) => {
    if (tx.isCancelled || !isInRange(tx.date)) return;
    const row = ensureEmployee(tx.handledBy);
    if (isKasbonTransaction(tx)) {
      const due =
        tx.shortage !== undefined
          ? Math.max(0, Number(tx.shortage) || 0)
          : Math.max(0, Number(tx.totalAmount) || 0);
      row.kasbonTotal += due;
      row.kasbonCount += 1;
      return;
    }
    if (tx.status !== 'LUNAS') return;
    const amt = Math.max(0, Number(tx.totalAmount) || 0);
    row.retailCount += 1;
    row.txCount += 1;
    row.retailOmset += amt;
    if (tx.paymentMethod === 'QRIS') {
      row.qrisTotal += amt;
    } else {
      row.cashTotal += amt;
    }
  });

  digitalTransactions.forEach((tx) => {
    if (!isInRange(tx.date)) return;
    const row = ensureEmployee(tx.handledBy);
    const amt = Math.max(0, Number(tx.sellAmount) || 0);
    if (isKasbonTransaction(tx)) {
      row.kasbonTotal += amt;
      row.kasbonCount += 1;
      return;
    }
    row.digitalCount += 1;
    row.txCount += 1;
    row.digitalOmset += amt;
    if (tx.serviceType === 'Tarik Tunai' || tx.paymentMethod === 'QRIS') {
      row.qrisTotal += amt;
    } else {
      row.cashTotal += amt;
    }
  });

  closingRecords.forEach((rec) => {
    if (!isInRange(rec.confirmedAt)) return;
    const row = ensureEmployee(rec.cashierName);
    row.closingCount += 1;
    if (!row.lastClosingAt || new Date(rec.confirmedAt).getTime() > new Date(row.lastClosingAt).getTime()) {
      row.lastClosingAt = rec.confirmedAt;
      row.lastVariance = rec.cashVariance;
    }
  });

  return Object.values(map)
    .map((row) => ({
      ...row,
      totalOmset: row.retailOmset + row.digitalOmset,
    }))
    .sort((a, b) => b.totalOmset - a.totalOmset || b.txCount - a.txCount);
}

export function formatWhatsAppPhone(rawPhone?: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith('8')) {
    return `62${digits}`;
  }
  return digits;
}

export function buildClosingWhatsAppMessage(params: {
  storeName: string;
  cashierName: string;
  periodLabel: string;
  recap: CashierClosingRecap;
  note?: string;
  confirmedAt?: string;
}): string {
  const { storeName, cashierName, periodLabel, recap, note, confirmedAt } = params;
  const varianceText =
    recap.cashVariance === null
      ? 'Belum diisi'
      : recap.cashVariance === 0
        ? 'KLOP / PAS (Rp 0)'
        : recap.cashVariance > 0
          ? `LEBIH (+${formatRp(recap.cashVariance)})`
          : `KURANG (${formatRp(recap.cashVariance)})`;

  const confirmedTime = new Date(confirmedAt || new Date().toISOString()).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const lines: string[] = [
    `*KONFIRMASI CLOSING KASIR*`,
    `Toko: *${(storeName || 'Warung Pintar Mandiri').toUpperCase()}*`,
    `Kasir: ${cashierName || 'Karyawan Kasir'}`,
    `Periode: ${periodLabel} (${recap.startDate || '-'} s/d ${recap.endDate || '-'})`,
    `Waktu Konfirmasi: ${confirmedTime}`,
    ``,
    `*RINGKASAN OMSET*`,
    `• Omset Retail (${recap.retailSettledCount} Tx): ${formatRp(recap.retailSettledOmset)}`,
    `• Omset PPOB (${recap.digitalCount} Tx): ${formatRp(recap.digitalOmset)}`,
  ];

  if (recap.totalExpenses > 0) {
    lines.push(`• Potongan Biaya Toko: -${formatRp(recap.totalExpenses)}`);
  }

  lines.push(`• *Total Omset Bersih: ${formatRp(recap.totalSettledOmset)}*`);
  lines.push(``);
  lines.push(`*RINCIAN KAS TUNAI & PEMBAYARAN*`);
  lines.push(`• Tunai Masuk: ${formatRp(recap.cashTotal)}`);
  if (recap.tarikTunaiDrawerCash > 0) {
    lines.push(`• Tarik Tunai: -${formatRp(recap.tarikTunaiDrawerCash)}`);
  }
  if (recap.expenseDrawerCash > 0) {
    lines.push(`• Pengeluaran Tunai: -${formatRp(recap.expenseDrawerCash)}`);
  }
  lines.push(`• *Uang Tunai Sistem: ${formatRp(recap.expectedDrawerCash)}*`);
  lines.push(
    `• Uang Fisik Tunai: ${recap.physicalCashCount !== null ? formatRp(recap.physicalCashCount) : 'Belum diisi'}`
  );
  lines.push(`• Selisih Kas: *${varianceText}*`);
  lines.push(`• Non-Tunai QRIS: ${formatRp(recap.qrisTotal)}`);
  lines.push(`• Piutang Kasbon (${recap.kasbonCount} Tx): ${formatRp(recap.kasbonTotal)}`);

  if (recap.topSoldItems.length > 0) {
    lines.push(``);
    lines.push(`*BARANG TERLARIS*`);
    recap.topSoldItems.slice(0, 5).forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.name} (${item.quantity}x) - ${formatRp(item.revenue)}`);
    });
  }

  if (note && note.trim()) {
    lines.push(``);
    lines.push(`*Catatan Kasir:* ${note.trim()}`);
  }

  lines.push(``);
  lines.push(`_(Terlampir file gambar/foto Rekap Closing Kasir)_`);

  return lines.join('\n');
}

export function buildWhatsAppUrl(ownerPhone: string | undefined, message: string): string {
  const formatted = formatWhatsAppPhone(ownerPhone);
  const encoded = encodeURIComponent(message);
  return formatted ? `https://wa.me/${formatted}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

