/**
 * Device-local persistence for design files.
 *
 * Documents are saved to the browser's IndexedDB so work is stored locally on
 * the user's device — instant, private, and available offline. The cloud copy
 * remains the multiplayer sync channel, but the device copy is the source a
 * save actually writes to first.
 *
 * Schema: db "node-designs", store "files", key = fileId (string)
 */

const DB_NAME = "node-designs";
const DB_VERSION = 1;
const STORE = "files";

export interface LocalSavedFile {
  id: string;
  name: string;
  doc: unknown; // DesignDoc — validated by the caller
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
        tx.oncomplete = () => db.close();
      }),
  );
}

/** Persist a file (doc + name) to this device. Resolves when durably written. */
export function saveFileLocal(
  id: string,
  name: string,
  doc: unknown,
): Promise<void> {
  const record: LocalSavedFile = { id, name, doc, savedAt: Date.now() };
  return withStore("readwrite", (store) => store.put(record) as IDBRequest<IDBValidKey>).then(
    () => undefined,
  );
}

/** Load a file saved on this device, or null if it was never saved here. */
export function loadFileLocal(id: string): Promise<LocalSavedFile | null> {
  return withStore<LocalSavedFile | undefined>("readonly", (store) =>
    store.get(id) as IDBRequest<LocalSavedFile | undefined>,
  ).then((r) => r ?? null);
}

/** Every file saved on this device, most recently saved first. */
export function listFilesLocal(): Promise<LocalSavedFile[]> {
  return withStore<LocalSavedFile[]>("readonly", (store) =>
    store.getAll() as IDBRequest<LocalSavedFile[]>,
  ).then((rows) => rows.sort((a, b) => b.savedAt - a.savedAt));
}

/** Remove a file from this device. */
export function deleteFileLocal(id: string): Promise<void> {
  return withStore("readwrite", (store) =>
    store.delete(id) as unknown as IDBRequest<undefined>,
  ).then(() => undefined);
}
