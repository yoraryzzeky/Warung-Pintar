import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getClosingPeriodRange,
  buildCashierClosingRecap,
  buildEmployeeRecapTable,
  formatWhatsAppPhone,
  buildClosingWhatsAppMessage,
  buildWhatsAppUrl,
  toLocalDateKey,
  type CashierClosingRecord,
} from './cashierClosing';
import type { DigitalTransaction, Transaction } from './storeLogic';

test('getClosingPeriodRange computes harian, mingguan (Monday start), and bulanan ranges accurately', () => {
  // Wednesday, 2026-11-18
  const wednesday = new Date(2026, 10, 18, 14, 30, 0);
  const daily = getClosingPeriodRange('harian', wednesday);
  assert.equal(daily.startDate, '2026-11-18');
  assert.equal(daily.endDate, '2026-11-18');

  const weekly = getClosingPeriodRange('mingguan', wednesday);
  assert.equal(weekly.startDate, '2026-11-16'); // Monday
  assert.equal(weekly.endDate, '2026-11-18');

  const monthly = getClosingPeriodRange('bulanan', wednesday);
  assert.equal(monthly.startDate, '2026-11-01');
  assert.equal(monthly.endDate, '2026-11-18');

  // Sunday edge case: 2026-11-22 -> week started Monday 2026-11-16
  const sunday = new Date(2026, 10, 22, 20, 0, 0);
  const sundayWeekly = getClosingPeriodRange('mingguan', sunday);
  assert.equal(sundayWeekly.startDate, '2026-11-16');
  assert.equal(sundayWeekly.endDate, '2026-11-22');
});

test('buildCashierClosingRecap separates Tunai, QRIS, Kasbon, Cancelled, and calculates drawer variance', () => {
  const retailTxs: Transaction[] = [
    {
      id: 'TX-1',
      date: '2026-11-18T08:15:00',
      items: [
        { cartId: 'P1-Bks', id: 'P1', name: 'Indomie Goreng', priceAtTime: 3500, costAtTime: 2800, quantity: 4, category: 'Makanan' },
      ],
      totalAmount: 14000,
      totalProfit: 2800,
      status: 'LUNAS',
      buyer: 'Pelanggan Umum',
      cashPaid: 20000,
      change: 6000,
      paymentMethod: 'TUNAI',
    },
    {
      id: 'TX-2',
      date: '2026-11-18T10:30:00',
      items: [
        { cartId: 'P2-Bks', id: 'P2', name: 'Minyak Goreng 1L', priceAtTime: 18000, costAtTime: 15000, quantity: 2, category: 'Sembako' },
      ],
      totalAmount: 36000,
      totalProfit: 6000,
      status: 'LUNAS',
      buyer: 'Pelanggan Umum',
      cashPaid: 36000,
      change: 0,
      paymentMethod: 'QRIS',
    },
    {
      id: 'TX-3',
      date: '2026-11-18T11:00:00',
      items: [
        { cartId: 'P1-Bks', id: 'P1', name: 'Indomie Goreng', priceAtTime: 3500, costAtTime: 2800, quantity: 2, category: 'Makanan' },
      ],
      totalAmount: 7000,
      totalProfit: 1400,
      status: 'MENUNGGU',
      buyer: 'Pak Joko',
      cashPaid: 0,
      change: 0,
      shortage: 7000,
      paymentMethod: 'KASBON',
    },
    {
      id: 'TX-4',
      date: '2026-11-18T12:00:00',
      items: [],
      totalAmount: 0,
      totalProfit: 0,
      status: 'LUNAS',
      buyer: 'Batal',
      cashPaid: 0,
      change: 0,
      isCancelled: true,
    },
    {
      id: 'TX-OLD',
      date: '2026-11-10T09:00:00',
      items: [],
      totalAmount: 50000,
      totalProfit: 10000,
      status: 'LUNAS',
      buyer: 'Lama',
      cashPaid: 50000,
      change: 0,
      paymentMethod: 'TUNAI',
    },
  ];

  const digitalTxs: DigitalTransaction[] = [
    {
      id: 'DIG-1',
      date: '2026-11-18T09:45:00',
      serviceType: 'Pulsa',
      provider: 'Telkomsel',
      targetNumber: '08123456789',
      baseAmount: 20000,
      fee: 2000,
      sellAmount: 22000,
      customer: 'Budi',
      status: 'BERHASIL',
      paymentMethod: 'TUNAI',
    },
  ];

  const recap = buildCashierClosingRecap(retailTxs, digitalTxs, '2026-11-16', '2026-11-18', 35000);

  assert.equal(recap.retailSettledOmset, 50000);
  assert.equal(recap.digitalOmset, 22000);
  assert.equal(recap.totalSettledOmset, 72000);
  assert.equal(recap.cashTotal, 36000); // 14.000 retail tunai + 22.000 digital tunai
  assert.equal(recap.qrisTotal, 36000);
  assert.equal(recap.kasbonTotal, 7000);
  assert.equal(recap.kasbonCount, 1);
  assert.equal(recap.cancelledCount, 1);
  assert.equal(recap.totalSettledCount, 3);
  assert.equal(recap.expectedDrawerCash, 36000);
  assert.equal(recap.cashVariance, -1000); // 35.000 fisik - 36.000 seharusnya
  assert.equal(recap.dailyBreakdown.length, 1);
  assert.equal(recap.topSoldItems[0].name, 'Indomie Goreng');
  assert.equal(recap.topSoldItems[0].quantity, 4); // Only settled retail items
  // Ensure no financial profit fields leak into operational recap objects
  assert.equal('totalProfit' in recap, false);
  assert.equal('retailProfit' in recap.dailyBreakdown[0], false);
});

test('toLocalDateKey handles YYYY-MM-DD strings and invalid inputs cleanly', () => {
  assert.equal(toLocalDateKey('2026-11-17'), '2026-11-17');
  assert.equal(toLocalDateKey('not-a-date'), null);
});

test('buildCashierClosingRecap deducts Tarik Tunai and Laci Kas expenses from expected drawer cash', () => {
  const retailTxs: Transaction[] = [
    {
      id: 'TX-1',
      date: '2026-11-18T08:00:00',
      items: [
        { cartId: 'P1-Bks', id: 'P1', name: 'Beras 5kg', priceAtTime: 65000, costAtTime: 55000, quantity: 1, category: 'Sembako' },
      ],
      totalAmount: 65000,
      totalProfit: 10000,
      status: 'LUNAS',
      buyer: 'Pelanggan Tunai',
      cashPaid: 65000,
      change: 0,
      paymentMethod: 'TUNAI',
    },
  ];

  const digitalTxs: DigitalTransaction[] = [
    {
      id: 'DIG-TARIK-1',
      date: '2026-11-18T09:00:00',
      serviceType: 'Tarik Tunai',
      provider: 'BCA',
      targetNumber: '1234567890',
      baseAmount: 50000, // Uang fisik keluar dari laci
      fee: 3000,
      sellAmount: 53000, // Masuk ke transfer/QRIS toko
      customer: 'Siti',
      status: 'LUNAS',
      paymentMethod: 'QRIS',
    },
  ];

  const expenses = [
    {
      id: 'EXP-1',
      date: '2026-11-18T10:00:00',
      category: 'Listrik & Token',
      description: 'Token listrik warung',
      amount: 10000,
      source: 'LACI_KAS' as const, // Mengurangi uang fisik laci
      handledBy: 'Kasir',
    },
    {
      id: 'EXP-2',
      date: '2026-11-18T11:00:00',
      category: 'Transport & Bensin',
      description: 'Bensin transfer rekening pribadi',
      amount: 15000,
      source: 'NON_TUNAI' as const, // Tidak mengurangi laci
      handledBy: 'Owner',
    },
  ];

  // Expected Drawer Cash:
  // Retail Tunai: +65.000
  // Tarik Tunai dari laci: -50.000
  // Pengeluaran Laci: -10.000
  // Expected Drawer Cash = 65.000 - 50.000 - 10.000 = 5.000
  // Total Omset = 65.000 (Retail) + 53.000 (PPOB) - 25.000 (Total Pengeluaran Hari Ini) = 93.000
  const recap = buildCashierClosingRecap(retailTxs, digitalTxs, '2026-11-18', '2026-11-18', 5000, expenses);

  assert.equal(recap.cashTotal, 65000);
  assert.equal(recap.tarikTunaiCount, 1);
  assert.equal(recap.tarikTunaiDrawerCash, 50000);
  assert.equal(recap.qrisTotal, 53000); // 53.000 masuk ke non-tunai
  assert.equal(recap.expenseDrawerCash, 10000);
  assert.equal(recap.totalExpenses, 25000);
  assert.equal(recap.totalSettledOmset, 93000);
  assert.equal(recap.dailyBreakdown[0].expensesAmount, 25000);
  assert.equal(recap.dailyBreakdown[0].totalOmset, 93000);
  assert.equal(recap.expectedDrawerCash, 5000);
  assert.equal(recap.cashVariance, 0); // 5000 fisik - 5000 sistem = pas
});

test('buildEmployeeRecapTable groups retail, PPOB, kasbon, and closing counts per employee without exposing profit', () => {
  const retailTxs: Transaction[] = [
    {
      id: 'TX-E1',
      date: '2026-11-18T08:30:00',
      items: [],
      totalAmount: 40000,
      totalProfit: 8000,
      status: 'LUNAS',
      buyer: 'Pembeli A',
      cashPaid: 50000,
      change: 10000,
      paymentMethod: 'TUNAI',
      handledBy: 'Siti',
    },
    {
      id: 'TX-E2',
      date: '2026-11-18T09:15:00',
      items: [],
      totalAmount: 25000,
      totalProfit: 5000,
      status: 'MENUNGGU',
      buyer: 'Pak Budi',
      cashPaid: 0,
      change: 0,
      shortage: 25000,
      paymentMethod: 'KASBON',
      handledBy: 'Siti',
    },
    {
      id: 'TX-E3',
      date: '2026-11-18T13:00:00',
      items: [],
      totalAmount: 60000,
      totalProfit: 12000,
      status: 'LUNAS',
      buyer: 'Pembeli B',
      cashPaid: 60000,
      change: 0,
      paymentMethod: 'QRIS',
      handledBy: 'Andi',
    },
  ];

  const digitalTxs: DigitalTransaction[] = [
    {
      id: 'DIG-E1',
      date: '2026-11-18T10:00:00',
      serviceType: 'Tarik Tunai',
      provider: 'BRI',
      targetNumber: '00112233',
      baseAmount: 50000,
      fee: 3000,
      sellAmount: 53000,
      customer: 'Rina',
      status: 'LUNAS',
      paymentMethod: 'QRIS',
      handledBy: 'Siti',
    },
  ];

  const closingRecords: CashierClosingRecord[] = [
    {
      id: 'CLOSE-1',
      confirmedAt: '2026-11-18T16:30:00',
      periodPreset: 'harian',
      periodLabel: 'Harian',
      startDate: '2026-11-18',
      endDate: '2026-11-18',
      cashierName: 'Siti',
      totalSettledOmset: 93000,
      retailSettledOmset: 40000,
      digitalOmset: 53000,
      totalExpenses: 0,
      expectedDrawerCash: -10000,
      physicalCashCount: 0,
      cashVariance: 10000,
      qrisTotal: 53000,
      kasbonTotal: 25000,
      totalSettledCount: 2,
      note: 'Shift pagi lancar',
      sentToWhatsApp: true,
      ownerPhone: '081234567890',
    },
  ];

  const rows = buildEmployeeRecapTable(retailTxs, digitalTxs, closingRecords, '2026-11-18', '2026-11-18');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].employeeName, 'Siti');
  assert.equal(rows[0].txCount, 2);
  assert.equal(rows[0].retailOmset, 40000);
  assert.equal(rows[0].digitalOmset, 53000);
  assert.equal(rows[0].totalOmset, 93000);
  assert.equal(rows[0].kasbonTotal, 25000);
  assert.equal(rows[0].closingCount, 1);
  assert.equal(rows[0].lastVariance, 10000);
  assert.equal('totalProfit' in rows[0], false);

  assert.equal(rows[1].employeeName, 'Andi');
  assert.equal(rows[1].qrisTotal, 60000);
});

test('formatWhatsAppPhone and buildWhatsAppUrl normalize Indonesian numbers and encode message', () => {
  assert.equal(formatWhatsAppPhone('0812-3456-7890'), '6281234567890');
  assert.equal(formatWhatsAppPhone('81234567890'), '6281234567890');
  assert.equal(formatWhatsAppPhone('+62 812 9999 0000'), '6281299990000');
  assert.equal(formatWhatsAppPhone(''), '');

  const recap = buildCashierClosingRecap([], [], '2026-11-18', '2026-11-18', 100000);
  const message = buildClosingWhatsAppMessage({
    storeName: 'Warung Maju',
    cashierName: 'Siti',
    periodLabel: 'Harian',
    recap,
    note: 'Aman terkendali',
    confirmedAt: '2026-11-18T17:00:00.000Z',
  });
  assert.match(message, /\*KONFIRMASI CLOSING KASIR\*/);
  assert.match(message, /\*RINCIAN KAS TUNAI & PEMBAYARAN\*/);
  assert.match(message, /Uang Tunai Sistem:/);
  assert.doesNotMatch(message, /laci/i);
  assert.match(message, /Kasir: Siti/);
  assert.match(message, /Aman terkendali/);

  const waUrl = buildWhatsAppUrl('08123456789', message);
  assert.equal(waUrl.startsWith('https://wa.me/628123456789?text='), true);
});

