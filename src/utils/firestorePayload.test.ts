import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLUEPRINT_LIMITS,
  sanitizeFirestoreId,
  generateUniqueRecordId,
  clampString,
  shouldUpdateExistingOwnerNotification,
  sanitizeUserAccountPayload,
  sanitizeStoreProfilePayload,
  sanitizeAppSettingsPayload,
  sanitizeProductPayload,
  sanitizeTransactionPayload,
  sanitizeDigitalTransactionPayload,
  sanitizeOwnerNotificationPayload,
  sanitizeClosingRecordPayload,
  hydrateClosingRecordFromCloud,
  computeCollectionDiff,
} from './firestorePayload.ts';

test('sanitizeFirestoreId strips invalid path characters and enforces length limit', () => {
  assert.equal(sanitizeFirestoreId('P-001'), 'P-001');
  assert.equal(sanitizeFirestoreId('../bad/id space'), '___bad_id_space');
  assert.equal(sanitizeFirestoreId('   ', 'FALLBACK').startsWith('FALLBACK-'), true);
  assert.equal(sanitizeFirestoreId('a'.repeat(300)).length, BLUEPRINT_LIMITS.ID_MAX);
});

test('sanitizeProductPayload enforces schema defaults, numeric floors, and string maxLength', () => {
  const sanitized = sanitizeProductPayload('user-123', {
    id: 'P/009',
    name: 'X'.repeat(250),
    category: 'Sembako',
    costPrice: -500,
    sellingPrice: 12000,
    stock: -2,
    isKeteng: true,
    ketengPrice: 1500,
    pcsPerPack: 0,
    eceranStock: 4,
    image: 'img'.repeat(100000),
  });

  assert.equal(sanitized.ownerUid, 'user-123');
  assert.equal(sanitized.id, 'P_009');
  assert.equal(sanitized.name.length, BLUEPRINT_LIMITS.PRODUCT_NAME_MAX);
  assert.equal(sanitized.costPrice, 0);
  assert.equal(sanitized.stock, 0);
  assert.equal(sanitized.pcsPerPack, 1);
  assert.equal(sanitized.image.length, BLUEPRINT_LIMITS.IMAGE_DATA_MAX);
  assert.equal(sanitized.barcode, '');
  assert.equal(sanitized.minStock, 5);
});

test('sanitizeTransactionPayload bounds items and returnRecords and normalizes enums', () => {
  const manyItems = Array.from({ length: 130 }, (_, idx) => ({
    cartId: `c-${idx}`,
    id: `P-${idx}`,
    name: `Item ${idx}`,
    priceAtTime: 1000,
    costAtTime: 800,
    quantity: 1,
    category: 'Makanan',
  }));

  const sanitized = sanitizeTransactionPayload('user-1', {
    id: 'TX-101',
    date: '2026-11-17T08:00:00.000Z',
    items: manyItems,
    totalAmount: 130000,
    totalProfit: 26000,
    status: 'INVALID' as any,
    buyer: 'Budi',
    cashPaid: 150000,
    change: 20000,
  });

  assert.equal(sanitized.items.length, BLUEPRINT_LIMITS.TX_ITEMS_MAX);
  assert.equal(sanitized.status, 'LUNAS');
  assert.equal(sanitized.type, 'RETAIL');
  assert.equal(sanitized.paymentMethod, 'TUNAI');
  assert.equal(sanitized.isCancelled, false);
  assert.deepEqual(sanitized.returnRecords, []);
});

test('sanitizeAppSettingsPayload validates themeId, mode, and 4-6 digit ownerPin', () => {
  const valid = sanitizeAppSettingsPayload('u1', {
    themeId: 'emerald',
    soundEnabled: false,
    roleSettings: { mode: 'cashier', ownerPin: '5678', cashierName: 'Rina' },
  });
  assert.equal(valid.themeId, 'emerald');
  assert.equal(valid.mode, 'cashier');
  assert.equal(valid.ownerPin, '5678');

  const invalid = sanitizeAppSettingsPayload('u1', {
    themeId: 'neon' as any,
    soundEnabled: true,
    roleSettings: { mode: 'superadmin' as any, ownerPin: 'abc', cashierName: '' },
  });
  assert.equal(invalid.themeId, 'ocean');
  assert.equal(invalid.mode, 'owner');
  assert.equal(invalid.ownerPin, '1234');
  assert.equal(invalid.cashierName, 'Karyawan Kasir');
});

test('sanitizeUserAccountPayload, sanitizeStoreProfilePayload, and sanitizeDigitalTransactionPayload trim oversized inputs', () => {
  const account = sanitizeUserAccountPayload({
    uid: 'uid-abc',
    email: 'user@example.com',
    displayName: 'D'.repeat(200),
    photoURL: 'https://example.com/a.png',
  });
  assert.equal(account.displayName.length, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);

  const profile = sanitizeStoreProfilePayload('uid-abc', { ownerName: 'Toko'.repeat(60) });
  assert.equal(profile.id, 'main');
  assert.equal(profile.ownerName.length, BLUEPRINT_LIMITS.OWNER_NAME_MAX);

  const dig = sanitizeDigitalTransactionPayload('uid-abc', {
    id: 'DIG-1',
    date: '2026-11-17T08:00:00.000Z',
    serviceType: 'Pulsa',
    provider: 'Telkomsel',
    targetNumber: '08123456789',
    baseAmount: 10000,
    fee: 2000,
    sellAmount: 12000,
    customer: 'Ani',
    status: 'BERHASIL',
  });
  assert.equal(dig.ownerUid, 'uid-abc');
  assert.equal(dig.paymentMethod, 'TUNAI');
});

test('computeCollectionDiff identifies created, updated, and deleted items cleanly', () => {
  const prev = [
    { id: '1', name: 'A', stock: 5 },
    { id: '2', name: 'B', stock: 10 },
    { id: '3', name: 'C', stock: 2 },
  ];
  const next = [
    { id: '1', name: 'A', stock: 5 },
    { id: '2', name: 'B Updated', stock: 8 },
    { id: '4', name: 'D', stock: 1 },
  ];
  const diff = computeCollectionDiff(prev, next);
  assert.deepEqual(diff.created, [{ id: '4', name: 'D', stock: 1 }]);
  assert.deepEqual(diff.updated, [{ id: '2', name: 'B Updated', stock: 8 }]);
  assert.deepEqual(diff.deletedIds, ['3']);
});

test('sanitizeOwnerNotificationPayload validates enum type, clamps lengths, and floors amount', () => {
  const notif = sanitizeOwnerNotificationPayload('uid-owner', {
    id: 'NOTIF/1',
    type: 'UNKNOWN_TYPE' as any,
    title: 'Kasir Transaksi Baru',
    message: '2x Kopi Kapal Api',
    amount: -5000,
    timestamp: '2026-11-18T10:00:00.000Z',
    read: false,
    handledBy: 'Siti',
    txId: 'TX-1',
    detail: 'Lunas',
  });

  assert.equal(notif.id, 'NOTIF_1');
  assert.equal(notif.type, 'TRANSACTION_NEW');
  assert.equal(notif.amount, 0);
  assert.equal(notif.handledBy, 'Siti');
  assert.equal(notif.read, false);
});

test('sanitizeClosingRecordPayload & hydrateClosingRecordFromCloud preserve null/valid physicalCashCount cleanly', () => {
  const sanitizedEmptyPhysical = sanitizeClosingRecordPayload('uid-owner', {
    id: 'CLOSE-1',
    confirmedAt: '2026-11-18T18:00:00.000Z',
    periodPreset: 'invalid_preset' as any,
    periodLabel: 'Harian',
    startDate: '2026-11-18',
    endDate: '2026-11-18',
    cashierName: 'Siti',
    totalSettledOmset: 120000,
    retailSettledOmset: 100000,
    digitalOmset: 20000,
    totalExpenses: 5000,
    expectedDrawerCash: 95000,
    physicalCashCount: null,
    cashVariance: null,
    qrisTotal: 20000,
    kasbonTotal: 0,
    totalSettledCount: 4,
    note: 'Selesai',
    sentToWhatsApp: true,
    ownerPhone: '08123456789',
  });

  assert.equal(sanitizedEmptyPhysical.periodPreset, 'harian');
  assert.equal(sanitizedEmptyPhysical.physicalCashCount, -1);
  assert.equal(sanitizedEmptyPhysical.cashVariance, 0);

  const hydratedEmpty = hydrateClosingRecordFromCloud(sanitizedEmptyPhysical);
  assert.equal(hydratedEmpty.physicalCashCount, null);
  assert.equal(hydratedEmpty.cashVariance, null);

  const sanitizedWithCash = sanitizeClosingRecordPayload('uid-owner', {
    ...hydratedEmpty,
    physicalCashCount: 100000,
    cashVariance: 5000,
  });
  const hydratedWithCash = hydrateClosingRecordFromCloud(sanitizedWithCash);
  assert.equal(hydratedWithCash.physicalCashCount, 100000);
  assert.equal(hydratedWithCash.cashVariance, 5000);
});

test('clampString enforces UTF-8 byte limits for multi-byte characters and emojis', () => {
  const sample = '•'.repeat(60) + '🎉'.repeat(10);
  const clamped = clampString(sample, 40);
  const bytes = new TextEncoder().encode(clamped).length;
  assert.ok(bytes <= 40);
  assert.ok(bytes >= 37);
});

test('generateUniqueRecordId produces valid Firestore IDs with unique suffixes', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const id = generateUniqueRecordId('TX');
    assert.match(id, /^TX-[A-Z0-9]+$/);
    assert.ok(id.length <= BLUEPRINT_LIMITS.ID_MAX);
    seen.add(id);
  }
  assert.equal(seen.size, 50);
});

test('shouldUpdateExistingOwnerNotification avoids redundant writes and allows read toggles', () => {
  assert.equal(shouldUpdateExistingOwnerNotification(null, false), false);
  assert.equal(shouldUpdateExistingOwnerNotification({ read: false }, false), false);
  assert.equal(shouldUpdateExistingOwnerNotification({ read: true }, true), false);
  assert.equal(shouldUpdateExistingOwnerNotification({ read: false }, true), true);
});

