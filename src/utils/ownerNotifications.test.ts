import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRetailTxNotification,
  createDigitalTxNotification,
  createReturnExchangeNotification,
  createClosingConfirmNotification,
  mergeOwnerNotifications,
  synthesizeMissingCashierNotifications,
  type OwnerNotificationItem,
} from './ownerNotifications';
import type { DigitalTransaction, ReturnExchangeRecord, Transaction } from './storeLogic';

test('notification builders create properly structured unread Owner notifications', () => {
  const retailTx: Transaction = {
    id: 'TX-1001',
    date: '2026-11-18T09:00:00.000Z',
    items: [
      {
        cartId: 'P1-Bks',
        id: 'P1',
        name: 'Indomie Goreng',
        priceAtTime: 3500,
        costAtTime: 2800,
        quantity: 2,
        category: 'Makanan',
      },
    ],
    totalAmount: 7000,
    totalProfit: 1400,
    status: 'LUNAS',
    buyer: 'Pelanggan Umum',
    cashPaid: 10000,
    change: 3000,
    paymentMethod: 'TUNAI',
    handledBy: 'Siti',
  };

  const retailNotif = createRetailTxNotification(retailTx, 'Siti');
  assert.equal(retailNotif.id, 'NOTIF-TX-TX-1001');
  assert.equal(retailNotif.type, 'TRANSACTION_NEW');
  assert.equal(retailNotif.read, false);
  assert.equal(retailNotif.handledBy, 'Siti');
  assert.equal(retailNotif.amount, 7000);
  assert.match(retailNotif.message, /2x Indomie Goreng/);

  const digTx: DigitalTransaction = {
    id: 'DIG-2001',
    date: '2026-11-18T09:10:00.000Z',
    serviceType: 'Pulsa',
    provider: 'Telkomsel',
    targetNumber: '08123456789',
    baseAmount: 20000,
    fee: 2500,
    sellAmount: 22500,
    customer: 'Budi',
    status: 'LUNAS',
    paymentMethod: 'TUNAI',
    handledBy: 'Siti',
  };

  const digNotif = createDigitalTxNotification(digTx, 'Siti');
  assert.equal(digNotif.id, 'NOTIF-DIG-DIG-2001');
  assert.equal(digNotif.type, 'DIGITAL_NEW');
  assert.equal(digNotif.amount, 22500);

  const retRecord: ReturnExchangeRecord = {
    id: 'RET-3001',
    date: '2026-11-18T09:20:00.000Z',
    action: 'EXCHANGE',
    condition: 'GOOD',
    reason: 'Salah varian',
    returnedItems: [
      {
        cartId: 'P1-Bks',
        id: 'P1',
        name: 'Indomie Goreng',
        priceAtTime: 3500,
        costAtTime: 2800,
        quantity: 1,
        category: 'Makanan',
      },
    ],
    replacementItems: [],
    refundAmount: 0,
    replacementAmount: 5000,
    priceDifference: 1500,
    processedBy: 'Siti',
  };

  const retNotif = createReturnExchangeNotification(retailTx, retRecord, 'Siti');
  assert.equal(retNotif.id, 'NOTIF-RET-RET-3001');
  assert.equal(retNotif.type, 'TRANSACTION_RETURN');
  assert.equal(retNotif.amount, 1500);
  assert.match(retNotif.title, /Tukar Barang/);

  const closeNotif = createClosingConfirmNotification({
    id: 'CLOSE-1',
    confirmedAt: '2026-11-18T17:00:00.000Z',
    periodLabel: 'Harian',
    cashierName: 'Siti',
    totalSettledOmset: 150000,
    expectedDrawerCash: 100000,
    physicalCashCount: 100000,
    cashVariance: 0,
  });
  assert.equal(closeNotif.type, 'CLOSING_CONFIRM');
  assert.equal(closeNotif.detail, 'Kas Klop (Rp 0)');
  assert.match(closeNotif.message, /Kas Tunai/);
  assert.doesNotMatch(closeNotif.message, /laci/i);
});

test('mergeOwnerNotifications preserves read status and sorts newest first', () => {
  const existing: OwnerNotificationItem[] = [
    {
      id: 'N-1',
      type: 'TRANSACTION_NEW',
      title: 'Old',
      message: 'msg',
      timestamp: '2026-11-18T08:00:00.000Z',
      read: true,
      handledBy: 'Siti',
    },
  ];
  const incoming: OwnerNotificationItem[] = [
    {
      id: 'N-1',
      type: 'TRANSACTION_NEW',
      title: 'Old Updated',
      message: 'msg',
      timestamp: '2026-11-18T08:00:00.000Z',
      read: false,
      handledBy: 'Siti',
    },
    {
      id: 'N-2',
      type: 'DIGITAL_NEW',
      title: 'Newest',
      message: 'msg2',
      timestamp: '2026-11-18T10:00:00.000Z',
      read: false,
      handledBy: 'Siti',
    },
  ];

  const merged = mergeOwnerNotifications(existing, incoming);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'N-2');
  assert.equal(merged[1].id, 'N-1');
  assert.equal(merged[1].read, true); // Preserves previously marked read
});

test('synthesizeMissingCashierNotifications detects remote cashier txs, digital txs, and returns while ignoring Owner', () => {
  const baseTx: Transaction = {
    id: 'TX-BASE',
    date: '2026-11-18T07:00:00.000Z',
    items: [],
    totalAmount: 10000,
    totalProfit: 2000,
    status: 'LUNAS',
    buyer: 'Umum',
    cashPaid: 10000,
    change: 0,
    handledBy: 'Owner',
    returnRecords: [],
  };

  const nextTransactions: Transaction[] = [
    {
      ...baseTx,
      returnRecords: [
        {
          id: 'RET-CASHIER-1',
          date: '2026-11-18T09:00:00.000Z',
          action: 'PARTIAL_RETURN',
          condition: 'GOOD',
          reason: 'Bocor',
          returnedItems: [],
          refundAmount: 3500,
          replacementAmount: 0,
          priceDifference: 0,
          processedBy: 'Siti',
        },
      ],
    },
    {
      id: 'TX-CASHIER-2',
      date: '2026-11-18T09:05:00.000Z',
      items: [],
      totalAmount: 25000,
      totalProfit: 5000,
      status: 'LUNAS',
      buyer: 'Andi',
      cashPaid: 25000,
      change: 0,
      handledBy: 'Siti',
    },
    {
      id: 'TX-OWNER-3',
      date: '2026-11-18T09:06:00.000Z',
      items: [],
      totalAmount: 12000,
      totalProfit: 2000,
      status: 'LUNAS',
      buyer: 'OwnerSelf',
      cashPaid: 12000,
      change: 0,
      handledBy: 'Owner',
    },
  ];

  const nextDigital: DigitalTransaction[] = [
    {
      id: 'DIG-CASHIER-1',
      date: '2026-11-18T09:10:00.000Z',
      serviceType: 'Token PLN',
      provider: 'PLN',
      targetNumber: '123456',
      baseAmount: 20000,
      fee: 2500,
      sellAmount: 22500,
      customer: 'Dina',
      status: 'LUNAS',
      handledBy: 'Siti',
    },
  ];

  // When current device is in cashier mode, don't synthesize owner notifications locally during sync
  const noneInCashier = synthesizeMissingCashierNotifications({
    prevTransactions: [baseTx],
    nextTransactions,
    prevDigitalTransactions: [],
    nextDigitalTransactions: nextDigital,
    existingNotifications: [],
    currentDeviceMode: 'cashier',
  });
  assert.equal(noneInCashier.length, 0);

  // When current device is in owner mode, synthesize missing cashier transactions & returns (skipping Owner-handled)
  const synthesized = synthesizeMissingCashierNotifications({
    prevTransactions: [baseTx],
    nextTransactions,
    prevDigitalTransactions: [],
    nextDigitalTransactions: nextDigital,
    existingNotifications: [],
    currentDeviceMode: 'owner',
  });

  const ids = synthesized.map((n) => n.id).sort();
  assert.deepEqual(ids, ['NOTIF-DIG-DIG-CASHIER-1', 'NOTIF-RET-RET-CASHIER-1', 'NOTIF-TX-TX-CASHIER-2']);
});
