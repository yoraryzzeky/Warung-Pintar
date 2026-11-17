import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEYS,
  DEFAULT_KASIR_DRAFT,
  loadFromStorage,
  saveToStorage,
  clearAllStoreStorage,
  isArrayValue,
  isValidKasirDraft,
  type StorageLike,
} from './storagePersistence';

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

test('saveToStorage and loadFromStorage persist and restore arrays reliably', () => {
  const storage = new MemoryStorage();
  const sampleProducts = [
    { id: 'P-1', name: 'Beras 5kg', category: 'Sembako', costPrice: 60000, sellingPrice: 68000, stock: 5 },
  ];
  const res = saveToStorage(STORAGE_KEYS.PRODUCTS, sampleProducts, storage);
  assert.equal(res.ok, true);

  const loaded = loadFromStorage<{ id: string; name: string }[]>(STORAGE_KEYS.PRODUCTS, [], isArrayValue, storage);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].name, 'Beras 5kg');
});

test('loadFromStorage returns fallback on corrupt JSON or mismatched structure', () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEYS.TRANSACTIONS, '{broken-json');
  const recoveredCorrupt = loadFromStorage(STORAGE_KEYS.TRANSACTIONS, [{ id: 'fallback' }], isArrayValue, storage);
  assert.deepEqual(recoveredCorrupt, [{ id: 'fallback' }]);

  storage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify({ not: 'an-array' }));
  const recoveredWrongType = loadFromStorage(STORAGE_KEYS.TRANSACTIONS, [], isArrayValue, storage);
  assert.deepEqual(recoveredWrongType, []);
});

test('saveToStorage catches QuotaExceededError gracefully without throwing', () => {
  const quotaStorage: StorageLike = {
    getItem: () => null,
    setItem: () => {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    },
    removeItem: () => {},
  };

  const res = saveToStorage(STORAGE_KEYS.PRODUCTS, [{ id: 'P-1' }], quotaStorage);
  assert.equal(res.ok, false);
  assert.equal(res.quotaExceeded, true);
  assert.ok(res.error && res.error.length > 0);
});

test('clearAllStoreStorage removes all persisted keys including kasir draft', () => {
  const storage = new MemoryStorage();
  saveToStorage(STORAGE_KEYS.PRODUCTS, [{ id: '1' }], storage);
  saveToStorage(STORAGE_KEYS.TRANSACTIONS, [{ id: 'TX-1' }], storage);
  saveToStorage(STORAGE_KEYS.DIGITAL_TRANSACTIONS, [{ id: 'DIG-1' }], storage);
  saveToStorage(STORAGE_KEYS.PROFILE, { ownerName: 'Toko' }, storage);
  saveToStorage(STORAGE_KEYS.KASIR_DRAFT, { ...DEFAULT_KASIR_DRAFT, buyerName: 'Budi' }, storage);

  clearAllStoreStorage(storage);

  assert.equal(storage.getItem(STORAGE_KEYS.PRODUCTS), null);
  assert.equal(storage.getItem(STORAGE_KEYS.TRANSACTIONS), null);
  assert.equal(storage.getItem(STORAGE_KEYS.DIGITAL_TRANSACTIONS), null);
  assert.equal(storage.getItem(STORAGE_KEYS.PROFILE), null);
  assert.equal(storage.getItem(STORAGE_KEYS.KASIR_DRAFT), null);
});

test('isValidKasirDraft validates cart draft payloads', () => {
  assert.equal(isValidKasirDraft({ cart: [], paymentType: 'LUNAS', paymentMethod: 'TUNAI', buyerName: '' }), true);
  assert.equal(isValidKasirDraft({ cart: 'invalid' }), false);
  assert.equal(isValidKasirDraft(null), false);
});
