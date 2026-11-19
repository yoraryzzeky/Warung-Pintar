export type AppMode = 'owner' | 'cashier';

export interface RoleSettings {
  mode: AppMode;
  ownerPin: string;
  cashierName: string;
}

export const DEFAULT_OWNER_PIN = '1234';

export const DEFAULT_ROLE_SETTINGS: RoleSettings = {
  mode: 'owner',
  ownerPin: DEFAULT_OWNER_PIN,
  cashierName: 'Karyawan Kasir',
};

export const OWNER_TABS = [
  'dashboard',
  'kasir',
  'digital',
  'stok',
  'riwayat',
  'rekap',
  'pengeluaran',
  'closing',
  'profil',
] as const;

export const CASHIER_TABS = ['kasir', 'digital', 'stok', 'riwayat', 'rekap_karyawan', 'closing', 'profil'] as const;

export function isValidPin(pin: string): boolean {
  const trimmed = pin.trim();
  return /^\d{4,6}$/.test(trimmed);
}

export function verifyOwnerPin(inputPin: string, storedPin: string): boolean {
  const effectiveStored = isValidPin(storedPin) ? storedPin.trim() : DEFAULT_OWNER_PIN;
  return inputPin.trim() === effectiveStored;
}

export function getAllowedTabsForMode(mode: AppMode): readonly string[] {
  return mode === 'owner' ? OWNER_TABS : CASHIER_TABS;
}

export function isTabAllowedForMode(tab: string, mode: AppMode): boolean {
  return getAllowedTabsForMode(mode).includes(tab);
}

export function getDefaultTabForMode(mode: AppMode): string {
  return mode === 'owner' ? 'dashboard' : 'kasir';
}

export function resolveNextTabAfterModeSwitch(currentTab: string, nextMode: AppMode): string {
  if (nextMode === 'cashier') {
    if (currentTab === 'dashboard' || !isTabAllowedForMode(currentTab, 'cashier')) {
      return 'kasir';
    }
    return currentTab;
  }
  return isTabAllowedForMode(currentTab, 'owner') ? currentTab : 'dashboard';
}

export function canViewFinancialProfit(mode: AppMode): boolean {
  return mode === 'owner';
}

export function canManageInventoryAndSettings(mode: AppMode): boolean {
  return mode === 'owner';
}

export function canProcessReturnWithoutPin(mode: AppMode): boolean {
  return mode === 'owner' || mode === 'cashier';
}

export function isValidRoleSettings(val: unknown): val is RoleSettings {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return false;
  const obj = val as Record<string, unknown>;
  const validMode = obj.mode === 'owner' || obj.mode === 'cashier';
  const validPin = typeof obj.ownerPin === 'string' && isValidPin(obj.ownerPin);
  const validName = typeof obj.cashierName === 'string';
  return validMode && validPin && validName;
}

/**
 * Merges cloud role configuration into local role settings.
 * Security PIN and store cashier configuration are synced, but active device mode
 * ('owner' vs 'cashier') is strictly preserved to prevent cross-device mode hijacking.
 */
export function mergeCloudRoleSettings(
  local: RoleSettings,
  cloud: RoleSettings
): RoleSettings {
  return {
    ...local,
    ownerPin: typeof cloud?.ownerPin === 'string' && isValidPin(cloud.ownerPin) ? cloud.ownerPin : local.ownerPin,
    cashierName: typeof cloud?.cashierName === 'string' && cloud.cashierName.trim()
      ? cloud.cashierName
      : local.cashierName,
    mode: local.mode, // Active mode is strictly local to this device
  };
}

