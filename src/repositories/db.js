// Couche repository local-first (IndexedDB).
// Interface volontairement simple (get/all/put/remove/clear) pour permettre un
// adaptateur cloud facultatif (PostgreSQL/Supabase + RLS) sans toucher aux écrans.

export const SCHEMA_VERSION = 1;
export const DB_VERSION = 2; // v2 : ajout de « tombstones » (suppressions à synchroniser)
export const STORES = {
  kv: { keyPath: 'key' },
  profiles: { keyPath: 'id' },
  garments: { keyPath: 'id', indexes: ['profileId'] },
  photos: { keyPath: 'id', indexes: ['ownerId'] },
  outfits: { keyPath: 'id', indexes: ['profileId'] },
  wearlog: { keyPath: 'id', indexes: ['profileId', 'date'] },
  calendar: { keyPath: 'id', indexes: ['profileId', 'date'] },
  wishlist: { keyPath: 'id', indexes: ['profileId'] },
  palettes: { keyPath: 'id', indexes: ['profileId'] },
  analyses: { keyPath: 'id', indexes: ['profileId'] },
  tombstones: { keyPath: 'id' },
};

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function openDB(name = 'style-studio') {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) { reject(new Error('IndexedDB indisponible')); return; }
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [storeName, def] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: def.keyPath });
          (def.indexes || []).forEach((ix) => store.createIndex(ix, ix, { unique: false }));
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Base bloquée par un autre onglet'));
  });
}

/** Repli en mémoire si IndexedDB est indisponible (navigation privée ancienne). */
class MemoryDB {
  constructor() { this.data = Object.fromEntries(Object.keys(STORES).map((s) => [s, new Map()])); this.memory = true; }
}

export class Repository {
  constructor(db) { this.db = db; this.listeners = new Set(); }
  get isMemory() { return this.db instanceof MemoryDB; }
  static async create(name) {
    try { return new Repository(await openDB(name)); }
    catch (e) { console.warn('IndexedDB indisponible, stockage en mémoire', e); return new Repository(new MemoryDB()); }
  }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(store, op, value) { this.listeners.forEach((fn) => fn({ store, op, value })); }

  _keyPath(store) { return STORES[store].keyPath; }

  async get(store, key) {
    if (this.isMemory) return structuredClone(this.db.data[store].get(key));
    return promisify(this.db.transaction(store).objectStore(store).get(key));
  }
  async all(store, filter) {
    let rows;
    if (this.isMemory) rows = [...this.db.data[store].values()].map((v) => structuredClone(v));
    else rows = await promisify(this.db.transaction(store).objectStore(store).getAll());
    return filter ? rows.filter(filter) : rows;
  }
  /** raw : enregistrement tel quel (données reçues de la synchronisation, sans modifier dates ni révision). */
  async put(store, value, { silent = false, raw = false } = {}) {
    const now = new Date().toISOString();
    const rec = { ...value };
    if (store !== 'kv' && store !== 'tombstones' && !raw) {
      rec.createdAt = rec.createdAt || now;
      rec.updatedAt = now;
      rec.rev = (rec.rev || 0) + 1;
      rec.schemaVersion = SCHEMA_VERSION;
    }
    if (this.isMemory) this.db.data[store].set(rec[this._keyPath(store)], structuredClone(rec));
    else {
      const tx = this.db.transaction(store, 'readwrite');
      tx.objectStore(store).put(rec);
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('Transaction annulée')); });
    }
    if (!silent) this.emit(store, 'put', rec);
    return rec;
  }
  async putMany(store, values) {
    for (const v of values) await this.put(store, v, { silent: true });
    this.emit(store, 'bulk', null);
  }
  /** Supprime et garde une trace datée (tombstone) pour propager la suppression aux autres appareils. */
  async remove(store, key, { tombstone = true, silent = false } = {}) {
    if (tombstone && store !== 'tombstones') await this.put('tombstones', { id: `${store}:${key}`, store, key, deletedAt: new Date().toISOString() }, { silent: true });
    if (this.isMemory) this.db.data[store].delete(key);
    else {
      const tx = this.db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    }
    if (!silent) this.emit(store, 'remove', key);
  }
  async clear(store) {
    if (this.isMemory) this.db.data[store].clear();
    else {
      const tx = this.db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    }
    this.emit(store, 'clear', null);
  }
  async kvGet(key, fallback = null) {
    const row = await this.get('kv', key);
    return row ? row.value : fallback;
  }
  async kvSet(key, value) { return this.put('kv', { key, value, updatedAt: new Date().toISOString() }); }
  close() { if (!this.isMemory) this.db.close(); }
}

export function uid(prefix = 'id') {
  const rnd = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}_${Date.now().toString(36)}${rnd[0].toString(36)}${rnd[1].toString(36).slice(0, 4)}`;
}
