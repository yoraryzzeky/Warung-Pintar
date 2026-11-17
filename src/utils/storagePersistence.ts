import type { CartItem } from './storeLogic';

export const STORAGE_KEYS = {
  PRODUCTS: 'wp_offline_products',
  TRANSACTIONS: 'wp_offline_transactions',
  DIGITAL_TRANSACTIONS: 'wp_offline_digital',
  PROFILE: 'wp_offline_profile',
  KASIR_DRAFT: 'wp_offline_kasir_draft',
  ROLE_SETTINGS: 'wp_offline_role_settings',
  THEME: 'wp_offline_theme',
  SOUND_ENABLED: 'wp_offline_sound_enabled',
} as const;

export interface KasirDraft {
  cart: CartItem[];
  paymentType: 'LUNAS' | 'MENUNGGU';
  paymentMethod: 'TUNAI' | 'QRIS' | 'KASBON';
  buyerName: string;
}

export const DEFAULT_KASIR_DRAFT: KasirDraft = {
  cart: [],
  paymentType: 'LUNAS',
  paymentMethod: 'TUNAI',
  buyerName: '',
};

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const getDefaultStorage = (): StorageLike | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
};

export const isArrayValue = <T>(val: unknown): val is T[] => Array.isArray(val);

export const isPlainObject = (val: unknown): val is Record<string, any> =>
  typeof val === 'object' && val !== null && !Array.isArray(val);

export const isValidKasirDraft = (val: unknown): val is KasirDraft => {
  if (!isPlainObject(val)) return false;
  if (!Array.isArray(val.cart)) return false;
  return true;
};

export function loadFromStorage<T>(
  key: string,
  fallback: T,
  validator?: (value: unknown) => value is T,
  storage: StorageLike | null = getDefaultStorage()
): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw === null || raw === '') return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (validator && !validator(parsed)) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(
  key: string,
  value: T,
  storage: StorageLike | null = getDefaultStorage()
): { ok: boolean; quotaExceeded?: boolean; error?: string } {
  if (!storage) return { ok: false, error: 'LocalStorage tidak tersedia di perangkat ini.' };
  try {
    storage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22;
    return {
      ok: false,
      quotaExceeded: isQuota,
      error: isQuota
        ? 'Memori penyimpanan browser penuh. Hapus foto berukuran besar atau cadangkan data ke file JSON.'
        : 'Gagal menyimpan data ke penyimpanan lokal browser.',
    };
  }
}

export function clearAllStoreStorage(storage: StorageLike | null = getDefaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEYS.PRODUCTS);
    storage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    storage.removeItem(STORAGE_KEYS.DIGITAL_TRANSACTIONS);
    storage.removeItem(STORAGE_KEYS.PROFILE);
    storage.removeItem(STORAGE_KEYS.KASIR_DRAFT);
    storage.removeItem(STORAGE_KEYS.ROLE_SETTINGS);
    storage.removeItem(STORAGE_KEYS.THEME);
    storage.removeItem(STORAGE_KEYS.SOUND_ENABLED);
  } catch {
    // Ignore storage removal errors in restricted modes
  }
}
