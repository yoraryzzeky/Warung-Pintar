/**
 * IndexedDB Persistence Layer for Warung Pintar Pro
 * Provides high-capacity offline storage without the 5MB LocalStorage quota limit,
 * with seamless fallback when IndexedDB is unavailable.
 */

export const IDB_NAME = 'wp_pintar_db';
export const IDB_VERSION = 1;
export const IDB_STORE_NAME = 'store_kv';

function openStoreDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openStoreDb();
  if (!db) return undefined;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    } finally {
      try {
        db.close();
      } catch {
        // Ignore close errors
      }
    }
  });
}

export async function idbSet<T>(key: string, value: T): Promise<boolean> {
  const db = await openStoreDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    } finally {
      try {
        db.close();
      } catch {
        // Ignore close errors
      }
    }
  });
}

export async function idbRemove(key: string): Promise<void> {
  const db = await openStoreDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    } finally {
      try {
        db.close();
      } catch {
        // Ignore close errors
      }
    }
  });
}

export async function idbClearAll(): Promise<void> {
  const db = await openStoreDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    } finally {
      try {
        db.close();
      } catch {
        // Ignore close errors
      }
    }
  });
}
