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
  isValidRoleSettings,
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

  assert.deepEqual(getAllowedTabsForMode('cashier'), ['kasir', 'digital', 'stok', 'riwayat', 'profil']);
  assert.equal(isTabAllowedForMode('dashboard', 'cashier'), false);
  assert.equal(isTabAllowedForMode('rekap', 'cashier'), false);
  assert.equal(isTabAllowedForMode('kasir', 'cashier'), true);
  assert.equal(isTabAllowedForMode('rekap', 'owner'), true);
});

test('resolveNextTabAfterModeSwitch redirects restricted tabs safely', () => {
  assert.equal(getDefaultTabForMode('owner'), 'dashboard');
  assert.equal(getDefaultTabForMode('cashier'), 'kasir');
  assert.equal(resolveNextTabAfterModeSwitch('dashboard', 'cashier'), 'kasir');
  assert.equal(resolveNextTabAfterModeSwitch('rekap', 'cashier'), 'kasir');
  assert.equal(resolveNextTabAfterModeSwitch('ai_scan', 'cashier'), 'kasir');
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
