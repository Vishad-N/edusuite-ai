import { useSyncExternalStore } from "react";

/**
 * Unsaved work kept on this PC (plan "IndexedDB drafts while offline"; DN-075).
 * One draft per user and document type. It is written while there are unsaved changes and
 * removed once the work is saved or discarded, so it only ever holds work not yet on the server.
 * If IndexedDB can't be opened, drafts live in memory for this run only.
 */
export type Draft = {
  title: string;
  content: unknown;
  /** The saved document this draft changes, if any, and the version it started from. */
  docId?: string | undefined;
  docUpdatedAt?: string | undefined;
  savedAt: string;
  /** The user pressed Save while offline: save as soon as the connection is back. */
  wantSave?: boolean | undefined;
};

const DB = "edusuite-drafts";
const STORE = "drafts";
const memory = new Map<string, Draft>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) return resolve(undefined);
        try {
          const req = fn(db.transaction(STORE, mode).objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export const draftKey = (userId: string, type: string) => `${userId}:${type}`;

export async function loadDraft(key: string): Promise<Draft | null> {
  const db = await openDb();
  if (!db) return memory.get(key) ?? null;
  return ((await run<Draft>("readonly", (s) => s.get(key) as IDBRequest<Draft>)) ?? null) as Draft | null;
}

export async function saveDraft(key: string, draft: Draft): Promise<void> {
  const db = await openDb();
  if (!db) return void memory.set(key, draft);
  await run("readwrite", (s) => s.put(draft, key));
}

export async function deleteDraft(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return void memory.delete(key);
  await run("readwrite", (s) => s.delete(key));
}

/** Whether the PC thinks it is online (browser events; a failed request is the real test). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener("online", notify);
      window.addEventListener("offline", notify);
      return () => {
        window.removeEventListener("online", notify);
        window.removeEventListener("offline", notify);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}
