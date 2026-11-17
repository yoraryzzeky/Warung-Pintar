import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRp,
  calculateSubtotal,
  calculateProfit,
  calculateChange,
  deductInventory,
  aggregateDailyRecap,
  getLowStockRecommendations,
  buildLast30DaysFinancialSeries,
  getReceiptPaymentMethodLabel,
  isKasbonTransaction,
  filterAndSortKasirProducts,
  restoreInventory,
  applyReturnOrExchange,
  findTransactionByReceiptQuery,
  type Product,
  type CartItem,
  type Transaction,
  type DigitalTransaction,
} from './storeLogic';

test('formatRp formats Indonesian Rupiah properly', () => {
  const result = formatRp(25000);
  assert.ok(result.includes('25.000'), `Expected 25.000 in result, got: ${result}`);
});

test('calculateSubtotal sums up price * quantity accurately', () => {
  const cart: CartItem[] = [
    { cartId: '1', id: 'p1', name: 'Minyak', priceAtTime: 18000, costAtTime: 15000, quantity: 2, category: 'Sembako' },
    { cartId: '2', id: 'p2', name: 'Indomie', priceAtTime: 3500, costAtTime: 2800, quantity: 3, category: 'Makanan' },
  ];
  const subtotal = calculateSubtotal(cart);
  assert.equal(subtotal, 18000 * 2 + 3500 * 3); // 36000 + 10500 = 46500
});

test('calculateProfit calculates net margin accurately', () => {
  const cart: CartItem[] = [
    { cartId: '1', id: 'p1', name: 'Minyak', priceAtTime: 18000, costAtTime: 15000, quantity: 2, category: 'Sembako' },
  ];
  const profit = calculateProfit(cart);
  assert.equal(profit, (18000 - 15000) * 2); // 6000
});

test('calculateChange calculates cash return accurately', () => {
  assert.equal(calculateChange(50000, 36000), 14000);
  assert.equal(calculateChange(30000, 36000), 0);
});

test('deductInventory handles pack reduction and automatic eceran breakdown', () => {
  const initialProducts: Product[] = [
    {
      id: 'p1',
      name: 'Rokok Surya 16',
      category: 'Rokok',
      costPrice: 28000,
      sellingPrice: 32000,
      stock: 5,
      isKeteng: true,
      ketengPrice: 2500,
      pcsPerPack: 16,
      eceranStock: 4,
    },
  ];

  // Buy 6 loose pcs when initial eceran is 4: should unpack 1 pack, giving 4 + 16 - 6 = 14 eceran, 4 packs left
  const cart: CartItem[] = [
    {
      cartId: 'p1-Pcs',
      id: 'p1',
      name: 'Rokok Surya 16 (Ecer)',
      priceAtTime: 2500,
      costAtTime: 1750,
      quantity: 6,
      category: 'Rokok',
      isPcs: true,
      pcsPerPack: 16,
    },
  ];

  const updated = deductInventory(initialProducts, cart);
  assert.equal(updated[0].stock, 4);
  assert.equal(updated[0].eceranStock, 14);
});

test('aggregateDailyRecap combines retail and digital transactions', () => {
  const txs: Transaction[] = [
    {
      id: 'tx-1',
      date: '2026-11-11T10:00:00.000Z',
      items: [],
      totalAmount: 100000,
      totalProfit: 20000,
      status: 'LUNAS',
      buyer: 'Umum',
      cashPaid: 100000,
      change: 0,
    },
  ];
  const digitals: DigitalTransaction[] = [
    {
      id: 'dig-1',
      date: '2026-11-11T11:00:00.000Z',
      serviceType: 'Pulsa',
      provider: 'Telkomsel',
      targetNumber: '08123456789',
      baseAmount: 50000,
      fee: 3000,
      sellAmount: 53000,
      customer: 'Budi',
      status: 'LUNAS',
    },
  ];

  const recap = aggregateDailyRecap(txs, digitals);
  assert.equal(recap.length, 1);
  assert.equal(recap[0].retailOmset, 100000);
  assert.equal(recap[0].retailProfit, 20000);
  assert.equal(recap[0].digitalOmset, 53000);
  assert.equal(recap[0].digitalProfit, 3000);
  assert.equal(recap[0].count, 2);
});

test('getLowStockRecommendations detects low stock products and sorts by urgency', () => {
  const sampleProducts: Product[] = [
    { id: '1', name: 'Minyak 1L', category: 'Sembako', costPrice: 15000, sellingPrice: 18000, stock: 2, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0 },
    { id: '2', name: 'Indomie', category: 'Makanan', costPrice: 2800, sellingPrice: 3500, stock: 20, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0 },
    { id: '3', name: 'Gula 1Kg', category: 'Sembako', costPrice: 14000, sellingPrice: 16500, stock: 0, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0 },
  ];

  const recs = getLowStockRecommendations(sampleProducts, 5);
  assert.equal(recs.length, 2);
  assert.equal(recs[0].product.id, '3'); // stock 0 comes first
  assert.equal(recs[0].suggestedOrderQty, 10);
  assert.equal(recs[1].product.id, '1');
  assert.equal(recs[1].suggestedOrderQty, 8);
  assert.equal(recs[1].estimatedCost, 8 * 15000);
});

test('buildLast30DaysFinancialSeries produces 30 points with omset, laba, and marginPercent', () => {
  const ref = new Date('2026-11-13T12:00:00.000Z');
  const txs: Transaction[] = [
    {
      id: 'tx-1',
      date: '2026-11-13T08:00:00.000Z',
      items: [],
      totalAmount: 100000,
      totalProfit: 20000,
      status: 'LUNAS',
      buyer: 'Umum',
      cashPaid: 100000,
      change: 0,
    },
    {
      id: 'tx-2',
      date: '2026-11-13T09:00:00.000Z',
      items: [],
      totalAmount: 50000,
      totalProfit: 10000,
      status: 'MENUNGGU', // kasbon should be excluded from settled omset/laba
      buyer: 'Budi',
      cashPaid: 0,
      change: 0,
    },
  ];
  const digitals: DigitalTransaction[] = [
    {
      id: 'dig-1',
      date: '2026-11-13T10:00:00.000Z',
      serviceType: 'Pulsa',
      provider: 'XL',
      targetNumber: '0819',
      baseAmount: 20000,
      fee: 5000,
      sellAmount: 25000,
      customer: 'Ani',
      status: 'LUNAS',
    },
  ];

  const series = buildLast30DaysFinancialSeries(txs, digitals, ref);
  assert.equal(series.length, 30);
  const lastDay = series[29];
  assert.equal(lastDay.date, '2026-11-13');
  assert.equal(lastDay.omset, 125000);
  assert.equal(lastDay.laba, 25000);
  assert.equal(lastDay.marginPercent, 20);
});

test('getReceiptPaymentMethodLabel & isKasbonTransaction map Tunai, Non Tunai, and Kasbon accurately', () => {
  assert.equal(getReceiptPaymentMethodLabel({ status: 'LUNAS', paymentMethod: 'TUNAI' }), 'Tunai');
  assert.equal(getReceiptPaymentMethodLabel({ status: 'LUNAS', paymentMethod: 'QRIS' }), 'Non Tunai');
  assert.equal(getReceiptPaymentMethodLabel({ status: 'MENUNGGU', paymentMethod: 'KASBON', shortage: 5000 }), 'Kasbon');
  assert.equal(getReceiptPaymentMethodLabel({ status: 'LUNAS', paymentMethod: 'KASBON', shortage: 0 }), 'Kasbon');
  assert.equal(getReceiptPaymentMethodLabel({ status: 'LUNAS' }), 'Tunai');
  assert.equal(getReceiptPaymentMethodLabel({ status: 'MENUNGGU' }), 'Kasbon');

  assert.equal(isKasbonTransaction({ status: 'LUNAS', paymentMethod: 'TUNAI' }), false);
  assert.equal(isKasbonTransaction({ status: 'LUNAS', paymentMethod: 'QRIS' }), false);
  assert.equal(isKasbonTransaction({ status: 'MENUNGGU' }), true);
  assert.equal(isKasbonTransaction({ status: 'LUNAS', shortage: 2000 }), true);
});

test('filterAndSortKasirProducts filters by query/category and sorts flat products alphabetically A-Z', () => {
  const sampleProducts: Product[] = [
    { id: '1', name: 'Indomie Soto', category: 'Makanan', costPrice: 2800, sellingPrice: 3500, stock: 10, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0 },
    { id: '2', name: 'Indomie Goreng', category: 'Makanan', costPrice: 2800, sellingPrice: 3500, stock: 10, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0 },
    { id: '3', name: 'Dji Sam Soe 12', category: 'Rokok', costPrice: 19000, sellingPrice: 22000, stock: 10, isKeteng: true, ketengPrice: 2000, pcsPerPack: 12, eceranStock: 12 },
    { id: '4', name: 'Minyak Goreng 1L', category: 'Sembako', costPrice: 15000, sellingPrice: 18000, stock: 4, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0 },
    { id: '5', name: 'Aqua 600ml', category: 'Minuman', costPrice: 2500, sellingPrice: 4000, stock: 15, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0 },
  ];

  // All products sorted strictly A-Z regardless of category
  const allSorted = filterAndSortKasirProducts(sampleProducts, '', 'Semua');
  assert.deepEqual(
    allSorted.map((p) => p.name),
    ['Aqua 600ml', 'Dji Sam Soe 12', 'Indomie Goreng', 'Indomie Soto', 'Minyak Goreng 1L']
  );

  // Search by keyword returns matching items sorted A-Z
  const mieResults = filterAndSortKasirProducts(sampleProducts, 'indomie', 'Semua');
  assert.deepEqual(
    mieResults.map((p) => p.name),
    ['Indomie Goreng', 'Indomie Soto']
  );

  // Category filter combined with query
  const rokokResults = filterAndSortKasirProducts(sampleProducts, '', 'Rokok');
  assert.deepEqual(rokokResults.map((p) => p.name), ['Dji Sam Soe 12']);

  const sotoInMakanan = filterAndSortKasirProducts(sampleProducts, 'soto', 'Makanan');
  assert.equal(sotoInMakanan.length, 1);
  assert.equal(sotoInMakanan[0].id, '1');
});

test('applyReturnOrExchange handles full cancellation with stock restoration and recap exclusion', () => {
  const initialProducts: Product[] = [
    { id: 'P-1', name: 'Indomie Goreng', category: 'Makanan', costPrice: 2800, sellingPrice: 3500, stock: 10, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0 },
  ];
  const tx: Transaction = {
    id: 'TX-555001',
    date: '2026-11-14T08:00:00.000Z',
    items: [
      { cartId: 'P-1-Bungkus', id: 'P-1', name: 'Indomie Goreng', priceAtTime: 3500, costAtTime: 2800, quantity: 3, category: 'Makanan' },
    ],
    totalAmount: 10500,
    totalProfit: 2100,
    status: 'LUNAS',
    buyer: 'Pelanggan Umum',
    cashPaid: 10500,
    change: 0,
    paymentMethod: 'TUNAI',
  };

  assert.equal(findTransactionByReceiptQuery([tx], ' tx-555001 ')?.id, 'TX-555001');

  const res = applyReturnOrExchange({
    products: initialProducts,
    transaction: tx,
    action: 'CANCEL',
    returnedItems: tx.items,
    condition: 'GOOD',
    reason: 'Pembeli Batal',
    processedBy: 'Owner',
  });

  assert.equal(res.updatedProducts[0].stock, 13);
  assert.equal(res.updatedTransaction.isCancelled, true);
  assert.equal(res.updatedTransaction.totalAmount, 0);
  assert.equal(res.updatedTransaction.totalProfit, 0);
  assert.equal(res.record.refundAmount, 10500);

  // Cancelled transaction must be excluded from recap & 30-day chart
  const recap = aggregateDailyRecap([res.updatedTransaction], []);
  assert.equal(recap.length, 0);
  const series = buildLast30DaysFinancialSeries([res.updatedTransaction], [], new Date('2026-11-14T12:00:00.000Z'));
  assert.equal(series[29].omset, 0);
  assert.equal(series[29].laba, 0);
});

test('applyReturnOrExchange handles DAMAGED partial return without restocking damaged items', () => {
  const initialProducts: Product[] = [
    { id: 'P-1', name: 'Indomie Goreng', category: 'Makanan', costPrice: 2800, sellingPrice: 3500, stock: 10, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0 },
  ];
  const tx: Transaction = {
    id: 'TX-555002',
    date: '2026-11-14T08:00:00.000Z',
    items: [
      { cartId: 'P-1-Bungkus', id: 'P-1', name: 'Indomie Goreng', priceAtTime: 3500, costAtTime: 2800, quantity: 3, category: 'Makanan' },
    ],
    totalAmount: 10500,
    totalProfit: 2100,
    status: 'LUNAS',
    buyer: 'Pelanggan Umum',
    cashPaid: 10500,
    change: 0,
    paymentMethod: 'TUNAI',
  };

  const res = applyReturnOrExchange({
    products: initialProducts,
    transaction: tx,
    action: 'PARTIAL_RETURN',
    returnedItems: [{ ...tx.items[0], quantity: 1 }],
    condition: 'DAMAGED',
    reason: 'Kemasan Rusak',
    processedBy: 'Owner',
  });

  // Damaged item must NOT increase sellable stock
  assert.equal(res.updatedProducts[0].stock, 10);
  assert.equal(res.updatedTransaction.isCancelled, false);
  assert.equal(res.updatedTransaction.items[0].quantity, 2);
  assert.equal(res.updatedTransaction.totalAmount, 7000);
  assert.equal(res.updatedTransaction.totalProfit, 1400);
  assert.equal(res.record.refundAmount, 3500);
});

test('applyReturnOrExchange handles item exchange with price difference and dual inventory update', () => {
  const initialProducts: Product[] = [
    { id: 'P-1', name: 'Indomie Goreng', category: 'Makanan', costPrice: 2800, sellingPrice: 3500, stock: 10, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0 },
    { id: 'P-2', name: 'Minyak Goreng 1L', category: 'Sembako', costPrice: 15000, sellingPrice: 18000, stock: 5, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0 },
  ];
  const tx: Transaction = {
    id: 'TX-555003',
    date: '2026-11-14T08:00:00.000Z',
    items: [
      { cartId: 'P-1-Bungkus', id: 'P-1', name: 'Indomie Goreng', priceAtTime: 3500, costAtTime: 2800, quantity: 2, category: 'Makanan' },
    ],
    totalAmount: 7000,
    totalProfit: 1400,
    status: 'LUNAS',
    buyer: 'Pelanggan Umum',
    cashPaid: 7000,
    change: 0,
    paymentMethod: 'TUNAI',
  };

  const res = applyReturnOrExchange({
    products: initialProducts,
    transaction: tx,
    action: 'EXCHANGE',
    returnedItems: [{ ...tx.items[0], quantity: 2 }],
    replacementItems: [
      { cartId: 'P-2-Bungkus', id: 'P-2', name: 'Minyak Goreng 1L', priceAtTime: 18000, costAtTime: 15000, quantity: 1, category: 'Sembako' },
    ],
    condition: 'GOOD',
    reason: 'Tukar Produk Lain',
    processedBy: 'Siti',
  });

  // P-1 restored (+2 -> 12), P-2 deducted (-1 -> 4)
  assert.equal(res.updatedProducts.find((p) => p.id === 'P-1')?.stock, 12);
  assert.equal(res.updatedProducts.find((p) => p.id === 'P-2')?.stock, 4);
  assert.equal(res.record.refundAmount, 7000);
  assert.equal(res.record.replacementAmount, 18000);
  assert.equal(res.record.priceDifference, 11000);
  assert.equal(res.updatedTransaction.totalAmount, 18000);
  assert.equal(res.updatedTransaction.totalProfit, 3000);
  assert.equal(res.updatedTransaction.isCancelled, false);
  assert.equal(res.updatedTransaction.items.length, 1);
  assert.equal(res.updatedTransaction.items[0].id, 'P-2');

  // Verify loose/keteng inventory restoration works too
  const looseRestored = restoreInventory(
    [{ id: 'R-1', name: 'Rokok', category: 'Rokok', costPrice: 19000, sellingPrice: 22000, stock: 5, isKeteng: true, ketengPrice: 2000, pcsPerPack: 12, eceranStock: 3 }],
    [{ cartId: 'R-1-Pcs', id: 'R-1', name: 'Rokok (Ecer)', priceAtTime: 2000, costAtTime: 1583, quantity: 4, category: 'Rokok', isPcs: true, pcsPerPack: 12 }],
    'GOOD'
  );
  assert.equal(looseRestored[0].eceranStock, 7);
});


