/* IndexedDB persistence layer. Everything stays on-device. */
import type { Asset, Project, ProjectMeta } from '../types';

const DB_NAME = 'editez';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_MEDIA = 'media';
const STORE_JOURNAL = 'journal';
const STORE_KV = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;
let unavailable = false;

const memory = {
  projects: new Map<string, StoredProject>(),
  media: new Map<string, StoredMedia>(),
  journal: new Map<string, JournalRecord>(),
  kv: new Map<string, unknown>(),
};

export interface StoredProject {
  id: string;
  name: string;
  updatedAt: number;
  createdAt: number;
  thumb?: string;
  clipCount?: number;
  doc: Project;
}

export interface StoredMedia {
  id: string;
  blob: Blob;
  meta: Omit<Asset, 'url'>;
}

interface JournalRecord {
  id: string;
  at: number;
  doc: Project;
}

export function storageAvailable(): boolean {
  return !unavailable;
}

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      unavailable = true;
      reject(new Error('indexedDB unavailable'));
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      unavailable = true;
      reject(e);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_MEDIA)) db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_JOURNAL)) db.createObjectStore(STORE_JOURNAL, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      unavailable = true;
      reject(req.error ?? new Error('could not open database'));
    };
    req.onblocked = () => {
      /* another tab holds an old version — resolve anyway */
      if (req.readyState === 'done') resolve(req.result);
    };
  }).catch((err) => {
    unavailable = true;
    throw err;
  });
  dbPromise = promise;
  return promise;
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const req = run(transaction.objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error ?? new Error('indexedDB request failed'));
      })
  );
}

/* ------------------------------- projects ------------------------------ */

export interface SaveMeta {
  thumb?: string;
  clipCount?: number;
}

export async function listProjects(): Promise<ProjectMeta[]> {
  try {
    const rows = await tx<StoredProject[]>(STORE_PROJECTS, 'readonly', (s) => s.getAll());
    return rows
      .map((r) => ({
        id: r.id,
        name: r.name,
        updatedAt: r.updatedAt,
        createdAt: r.createdAt,
        thumb: r.thumb,
        clipCount: r.clipCount,
        duration: r.doc?.duration ?? 0,
        size: JSON.stringify(r.doc ?? {}).length,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [...memory.projects.values()]
      .map((r) => ({
        id: r.id,
        name: r.name,
        updatedAt: r.updatedAt,
        createdAt: r.createdAt,
        thumb: r.thumb,
        clipCount: r.clipCount,
        duration: r.doc?.duration ?? 0,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export async function getProject(id: string): Promise<StoredProject | null> {
  try {
    const row = await tx<StoredProject | undefined>(STORE_PROJECTS, 'readonly', (s) => s.get(id));
    return row ?? null;
  } catch {
    return memory.projects.get(id) ?? null;
  }
}

export async function saveProject(doc: Project, meta: SaveMeta = {}): Promise<void> {
  const clipCount = doc.tracks.reduce((n, t) => n + t.clips.length, 0);
  const record: StoredProject = {
    id: doc.id,
    name: doc.name,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
    thumb: meta.thumb,
    clipCount,
    doc,
  };
  // Journal first: if the tab dies mid-write we can still recover.
  try {
    await tx(STORE_JOURNAL, 'readwrite', (s) =>
      s.put({ id: doc.id, at: Date.now(), doc } satisfies JournalRecord)
    );
  } catch {
    /* journal is best-effort */
  }
  try {
    await tx(STORE_PROJECTS, 'readwrite', (s) => s.put(record));
    await clearJournal(doc.id);
  } catch (e) {
    memory.projects.set(doc.id, record);
    throw e;
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await tx(STORE_PROJECTS, 'readwrite', (s) => s.delete(id));
  } catch {
    memory.projects.delete(id);
  }
  await clearJournal(id);
  const stored = await getAllMediaIds();
  return;
}

export async function duplicateProjectRecord(doc: Project): Promise<Project> {
  return doc;
}

/* -------------------------------- journal ------------------------------ */

export async function readJournal(id: string): Promise<JournalRecord | null> {
  try {
    const row = await tx<JournalRecord | undefined>(STORE_JOURNAL, 'readonly', (s) => s.get(id));
    return row ?? null;
  } catch {
    return memory.journal.get(id) ?? null;
  }
}

export async function clearJournal(id: string): Promise<void> {
  try {
    await tx(STORE_JOURNAL, 'readwrite', (s) => s.delete(id));
  } catch {
    memory.journal.delete(id);
  }
}

/* --------------------------------- media ------------------------------- */

export async function saveMedia(asset: Asset, blob: Blob): Promise<void> {
  const { url, ...meta } = asset;
  const record: StoredMedia = { id: asset.id, blob, meta };
  try {
    await tx(STORE_MEDIA, 'readwrite', (s) => s.put(record));
  } catch (e) {
    memory.media.set(asset.id, record);
    if (!(e instanceof DOMException) || e.name !== 'QuotaExceededError') throw e;
  }
}

export async function getMedia(id: string): Promise<StoredMedia | null> {
  try {
    const row = await tx<StoredMedia | undefined>(STORE_MEDIA, 'readonly', (s) => s.get(id));
    return row ?? null;
  } catch {
    return memory.media.get(id) ?? null;
  }
}

export async function deleteMedia(id: string): Promise<void> {
  try {
    await tx(STORE_MEDIA, 'readwrite', (s) => s.delete(id));
  } catch {
    memory.media.delete(id);
  }
}

export async function getAllMediaIds(): Promise<string[]> {
  try {
    const keys = await tx<IDBValidKey[]>(STORE_MEDIA, 'readonly', (s) => s.getAllKeys());
    return keys.map(String);
  } catch {
    return [...memory.media.keys()];
  }
}

/* ---------------------------------- kv --------------------------------- */

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const v = await tx<T | undefined>(STORE_KV, 'readonly', (s) => s.get(key));
    return v ?? null;
  } catch {
    return (memory.kv.get(key) as T) ?? null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  try {
    await tx(STORE_KV, 'readwrite', (s) => s.put(value, key));
  } catch {
    memory.kv.set(key, value);
  }
}

/* -------------------------------- storage ------------------------------ */

export interface StorageInfo {
  usage: number;
  quota: number;
  supported: boolean;
}

export async function storageEstimate(): Promise<StorageInfo> {
  try {
    if (navigator.storage?.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      return { usage, quota, supported: true };
    }
  } catch {
    /* ignore */
  }
  return { usage: 0, quota: 0, supported: false };
}

export async function requestPersistent(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* ignore */
  }
  return false;
}

export async function clearEverything(): Promise<void> {
  try {
    const db = await openDB();
    await Promise.all(
      [STORE_PROJECTS, STORE_MEDIA, STORE_JOURNAL].map(
        (store) =>
          new Promise<void>((resolve) => {
            const t = db.transaction(store, 'readwrite');
            t.objectStore(store).clear();
            t.oncomplete = () => resolve();
            t.onerror = () => resolve();
          })
      )
    );
  } catch {
    /* ignore */
  }
  memory.projects.clear();
  memory.media.clear();
  memory.journal.clear();
}
