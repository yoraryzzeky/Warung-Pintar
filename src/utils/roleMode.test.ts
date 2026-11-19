import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_OWNER_PIN,
  DEFAULT_ROLE_SETTINGS,
  isValidPin,
  verifyOwnerPin,
  getAllowedTabsForMode,
  isTabAllowedForMode,
  getDefaultTabForMode,
  resolveNextTabAfterModeSwitch,
  canViewFinancialProfit,
  canManageInventoryAndSettings,
  canProcessReturnWithoutPin,
  isValidRoleSettings,
  mergeCloudRoleSettings,
} from './roleMode';

test('isValidPin accepts 4 to 6 numeric digits and rejects others', () => {
  assert.equal(isValidPin('1234'), true);
  assert.equal(isValidPin('009912'), true);
  assert.equal(isValidPin('123'), false);
  assert.equal(isValidPin('1234567'), false);
  assert.equal(isValidPin('abcd'), false);
  assert.equal(isValidPin('12a4'), false);
});

test('verifyOwnerPin validates against stored PIN or falls back to default 1234', () => {
  assert.equal(verifyOwnerPin('1234', DEFAULT_OWNER_PIN), true);
  assert.equal(verifyOwnerPin(' 5678 ', '5678'), true);
  assert.equal(verifyOwnerPin('9999', '5678'), false);
  assert.equal(verifyOwnerPin('1234', 'invalid'), true);
});

test('mode permissions separate Owner and Karyawan Kasir cleanly', () => {
  assert.equal(canViewFinancialProfit('owner'), true);
  assert.equal(canManageInventoryAndSettings('owner'), true);
  assert.equal(canViewFinancialProfit('cashier'), false);
  assert.equal(canManageInventoryAndSettings('cashier'), false);
  assert.equal(canProcessReturnWithoutPin('owner'), true);
  assert.equal(canProcessReturnWithoutPin('cashier'), true);

  assert.deepEqual(getAllowedTabsForMode('cashier'), ['kasir', 'digital', 'stok', 'riwayat', 'rekap_karyawan', 'closing', 'profil']);
  assert.equal(isTabAllowedForMode('dashboard', 'cashier'), false);
  assert.equal(isTabAllowedForMode('rekap', 'cashier'), false);
  assert.equal(isTabAllowedForMode('rekap_karyawan', 'cashier'), true);
  assert.equal(isTabAllowedForMode('rekap_karyawan', 'owner'), false);
  assert.equal(isTabAllowedForMode('closing', 'cashier'), true);
  assert.equal(isTabAllowedForMode('kasir', 'cashier'), true);
  assert.equal(isTabAllowedForMode('rekap', 'owner'), true);
});

test('resolveNextTabAfterModeSwitch redirects restricted tabs safely', () => {
  assert.equal(getDefaultTabForMode('owner'), 'dashboard');
  assert.equal(getDefaultTabForMode('cashier'), 'kasir');
  assert.equal(resolveNextTabAfterModeSwitch('dashboard', 'cashier'), 'kasir');
  assert.equal(resolveNextTabAfterModeSwitch('rekap', 'cashier'), 'kasir');
  assert.equal(resolveNextTabAfterModeSwitch('pengeluaran', 'cashier'), 'kasir');
  assert.equal(resolveNextTabAfterModeSwitch('rekap_karyawan', 'owner'), 'dashboard');
  assert.equal(resolveNextTabAfterModeSwitch('riwayat', 'cashier'), 'riwayat');
  assert.equal(resolveNextTabAfterModeSwitch('kasir', 'owner'), 'kasir');
});

test('isValidRoleSettings validates stored payload shape', () => {
  assert.equal(isValidRoleSettings(DEFAULT_ROLE_SETTINGS), true);
  assert.equal(isValidRoleSettings({ mode: 'cashier', ownerPin: '5678', cashierName: 'Budi' }), true);
  assert.equal(isValidRoleSettings({ mode: 'admin', ownerPin: '1234', cashierName: 'A' }), false);
  assert.equal(isValidRoleSettings({ mode: 'owner', ownerPin: '12', cashierName: 'A' }), false);
  assert.equal(isValidRoleSettings(null), false);
});

test('mergeCloudRoleSettings syncs security PIN and cashierName but strictly preserves local device mode', () => {
  // Device 1 is in OWNER mode; cloud sync brings cashier mode from Device 2
  const device1Local = { mode: 'owner' as const, ownerPin: '1234', cashierName: 'Karyawan Kasir' };
  const cloudFromDevice2 = { mode: 'cashier' as const, ownerPin: '9999', cashierName: 'Siti (Shift Pagi)' };

  const mergedOnDevice1 = mergeCloudRoleSettings(device1Local, cloudFromDevice2);
  assert.equal(mergedOnDevice1.mode, 'owner'); // Device 1 remains in OWNER mode!
  assert.equal(mergedOnDevice1.ownerPin, '9999');
  assert.equal(mergedOnDevice1.cashierName, 'Siti (Shift Pagi)');

  // Device 2 is in CASHIER mode; cloud sync brings owner mode from Device 1
  const device2Local = { mode: 'cashier' as const, ownerPin: '1234', cashierName: 'Budi' };
  const cloudFromDevice1 = { mode: 'owner' as const, ownerPin: '5678', cashierName: 'Karyawan Toko' };

  const mergedOnDevice2 = mergeCloudRoleSettings(device2Local, cloudFromDevice1);
  assert.equal(mergedOnDevice2.mode, 'cashier'); // Device 2 remains in CASHIER mode!
  assert.equal(mergedOnDevice2.ownerPin, '5678');
  assert.equal(mergedOnDevice2.cashierName, 'Karyawan Toko');
});

