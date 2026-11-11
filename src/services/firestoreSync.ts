// src/services/firestoreSync.ts
// Universal Database Sync Engine (Supports: Back4App, Supabase, Custom REST API, Built-in Express Server DB & LocalStorage)

const env = (import.meta as any).env || {};

// Konfigurasi Otomatis Berdasarkan Environment Variables yang Diisi User
const DB_PROVIDER: 'back4app' | 'supabase' | 'custom' | 'server' =
  env.VITE_DB_PROVIDER ||
  (env.VITE_BACK4APP_APP_ID ? 'back4app' : env.VITE_SUPABASE_URL ? 'supabase' : env.VITE_CUSTOM_DB_URL ? 'custom' : 'server');

const BACK4APP_APP_ID = env.VITE_BACK4APP_APP_ID || '';
const BACK4APP_KEY = env.VITE_BACK4APP_REST_KEY || env.VITE_BACK4APP_JS_KEY || '';
const BACK4APP_URL = (env.VITE_BACK4APP_SERVER_URL || 'https://parseapi.back4app.com').replace(/\/$/, '');

const SUPABASE_URL = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || '';

const CUSTOM_DB_URL = (env.VITE_CUSTOM_DB_URL || '').replace(/\/$/, '');
const CUSTOM_DB_KEY = env.VITE_CUSTOM_DB_KEY || '';

const LOCAL_Mirror_PREFIX = 'dkandang_univ_db_';
const DELETED_RECORDS_KEY = 'dkandang_deleted_records';
const INITIALIZED_COLLECTIONS_KEY = 'dkandang_initialized_collections';

// In-memory subscribers untuk sinkronisasi real-time antar komponen
const collectionSubscribers = new Map<string, Set<(items: any[]) => void>>();
const deletedCache: Record<string, Set<string>> = {};
let isInitializedCacheLoaded = false;
const initializedCollections = new Set<string>();

export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  return JSON.parse(JSON.stringify(data));
}

export function getItemKey<T extends { id?: string; code?: string }>(item: T): string {
  return item.id || item.code || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

export function isQuotaExceededError(_error: any): boolean {
  return false;
}

export function getIsFirestoreQuotaExceeded(): boolean {
  return false;
}

export function subscribeToQuotaStatus(listener: (exceeded: boolean) => void): () => void {
  listener(false);
  return () => {};
}

// ---------------- LOCAL MIRROR & REALTIME DISPATCHER ----------------
function readLocalMirror<T>(collectionName: string): Record<string, T> {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(`${LOCAL_Mirror_PREFIX}${collectionName}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    }
  } catch (e) {}
  return {};
}

function writeLocalMirror<T>(collectionName: string, mapData: Record<string, T>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${LOCAL_Mirror_PREFIX}${collectionName}`, JSON.stringify(mapData));
    }
  } catch (e) {}
}

function notifyCollectionListeners(collectionName: string): void {
  const subs = collectionSubscribers.get(collectionName);
  if (!subs || subs.size === 0) return;
  const mapData = readLocalMirror<any>(collectionName);
  const items = Object.values(mapData).filter((item: any) => {
    const key = getItemKey(item);
    return !isRecordDeleted(collectionName, key);
  });
  subs.forEach((cb) => {
    try { cb(items); } catch (e) {}
  });
}

// ---------------- CLOUD ADAPTERS (BACK4APP / SUPABASE / CUSTOM / SERVER) ----------------
async function cloudFetchCollection<T>(collectionName: string): Promise<T[] | null> {
  try {
    if (DB_PROVIDER === 'back4app' && BACK4APP_APP_ID && BACK4APP_KEY) {
      const headers: Record<string, string> = {
        'X-Parse-Application-Id': BACK4APP_APP_ID,
        'Content-Type': 'application/json'
      };
      if (env.VITE_BACK4APP_REST_KEY) {
        headers['X-Parse-REST-API-Key'] = BACK4APP_KEY;
      } else {
        headers['X-Parse-JavaScript-Key'] = BACK4APP_KEY;
      }
      const res = await fetch(`${BACK4APP_URL}/classes/${collectionName}?limit=2000`, { headers });
      if (!res.ok) return null;
      const json = await res.json();
      if (Array.isArray(json.results)) {
        return json.results.map((r: any) => {
          const { objectId, createdAt, updatedAt, ACL, __type, className, payloadJson, ...rest } = r;
          const base = payloadJson ? JSON.parse(payloadJson) : rest;
          return { ...base, id: base.id || base.code || objectId } as T;
        });
      }
      return null;
    }

    if (DB_PROVIDER === 'supabase' && SUPABASE_URL && SUPABASE_KEY) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/erp_records?collection=eq.${encodeURIComponent(collectionName)}&select=*`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
          }
        }
      );
      if (!res.ok) return null;
      const rows = await res.json();
      return Array.isArray(rows) ? rows.map((r: any) => r.data as T) : null;
    }

    const baseUrl = DB_PROVIDER === 'custom' && CUSTOM_DB_URL ? CUSTOM_DB_URL : '/api/db';
    const res = await fetch(`${baseUrl}/${encodeURIComponent(collectionName)}`, {
      headers: CUSTOM_DB_KEY ? { Authorization: `Bearer ${CUSTOM_DB_KEY}` } : undefined
    });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json.items) ? json.items : null;
  } catch (e) {
    return null;
  }
}

async function cloudUpsertDocuments<T extends { id?: string; code?: string }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  if (!items || items.length === 0) return;
  try {
    if (DB_PROVIDER === 'back4app' && BACK4APP_APP_ID && BACK4APP_KEY) {
      const headers: Record<string, string> = {
        'X-Parse-Application-Id': BACK4APP_APP_ID,
        'Content-Type': 'application/json'
      };
      if (env.VITE_BACK4APP_REST_KEY) {
        headers['X-Parse-REST-API-Key'] = BACK4APP_KEY;
      } else {
        headers['X-Parse-JavaScript-Key'] = BACK4APP_KEY;
      }
      for (const item of items) {
        const docId = getItemKey(item);
        const cleanItem = cleanForFirestore(item);
        await fetch(`${BACK4APP_URL}/classes/${collectionName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            docId,
            ...cleanItem,
            payloadJson: JSON.stringify(cleanItem)
          })
        });
      }
      return;
    }

    if (DB_PROVIDER === 'supabase' && SUPABASE_URL && SUPABASE_KEY) {
      const payload = items.map((item) => ({
        id: `${collectionName}:${getItemKey(item)}`,
        collection: collectionName,
        doc_id: getItemKey(item),
        data: cleanForFirestore(item),
        updated_at: new Date().toISOString()
      }));
      await fetch(`${SUPABASE_URL}/rest/v1/erp_records`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });
      return;
    }

    const baseUrl = DB_PROVIDER === 'custom' && CUSTOM_DB_URL ? CUSTOM_DB_URL : '/api/db';
    await fetch(`${baseUrl}/${encodeURIComponent(collectionName)}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CUSTOM_DB_KEY ? { Authorization: `Bearer ${CUSTOM_DB_KEY}` } : {})
      },
      body: JSON.stringify({ items: cleanForFirestore(items) })
    });
  } catch (e) {
    // Offline / local fallback tetap berjalan aman tanpa melempar error
  }
}

async function cloudDeleteDocuments(collectionName: string, ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  try {
    const baseUrl = DB_PROVIDER === 'custom' && CUSTOM_DB_URL ? CUSTOM_DB_URL : '/api/db';
    await fetch(`${baseUrl}/${encodeURIComponent(collectionName)}/delete-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CUSTOM_DB_KEY ? { Authorization: `Bearer ${CUSTOM_DB_KEY}` } : {})
      },
      body: JSON.stringify({ ids })
    });
  } catch (e) {}
}

// ---------------- PUBLIC CRUD API (100% KOMPATIBEL DENGAN ERPContext) ----------------
export async function saveDocument<T extends { id?: string; code?: string }>(
  collectionName: string,
  data: T
): Promise<void> {
  const docId = getItemKey(data);
  const clean = cleanForFirestore(data);
  const mapData = readLocalMirror<T>(collectionName);
  mapData[docId] = { ...clean, id: (clean as any).id || docId };
  writeLocalMirror(collectionName, mapData);
  notifyCollectionListeners(collectionName);
  await cloudUpsertDocuments(collectionName, [mapData[docId]]);
}

const pendingStorageTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleStorageWrite(key: string, data: unknown, delayMs = 250): void {
  const existing = pendingStorageTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingStorageTimers.delete(key);
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }, delayMs);
  pendingStorageTimers.set(key, timer);
}

export async function saveMultipleDocuments<T extends { id?: string; code?: string }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  if (!items || items.length === 0) return;
  const mapData = readLocalMirror<T>(collectionName);
  const cleanedList: T[] = [];
  for (const item of items) {
    const docId = getItemKey(item);
    const clean = cleanForFirestore(item);
    const normalized = { ...clean, id: (clean as any).id || docId };
    mapData[docId] = normalized;
    cleanedList.push(normalized);
  }
  writeLocalMirror(collectionName, mapData);
  notifyCollectionListeners(collectionName);
  await cloudUpsertDocuments(collectionName, cleanedList);
}

export async function patchDocument(
  collectionName: string,
  id: string,
  updates: Record<string, any>
): Promise<void> {
  const mapData = readLocalMirror<any>(collectionName);
  const existing = mapData[id] || { id };
  const updated = { ...existing, ...cleanForFirestore(updates), id };
  mapData[id] = updated;
  writeLocalMirror(collectionName, mapData);
  notifyCollectionListeners(collectionName);
  await cloudUpsertDocuments(collectionName, [updated]);
}

function ensureDeletedCacheLoaded(collectionName: string): Set<string> {
  if (!deletedCache[collectionName]) {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(DELETED_RECORDS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            for (const col of Object.keys(parsed)) {
              if (Array.isArray(parsed[col])) {
                deletedCache[col] = new Set(parsed[col]);
              }
            }
          }
        }
      }
    } catch (e) {}
    if (!deletedCache[collectionName]) {
      deletedCache[collectionName] = new Set();
    }
  }
  return deletedCache[collectionName];
}

function ensureInitializedCacheLoaded(): Set<string> {
  if (!isInitializedCacheLoaded) {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(INITIALIZED_COLLECTIONS_KEY);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach((col: string) => initializedCollections.add(col));
          }
        }
      }
    } catch (e) {}
    isInitializedCacheLoaded = true;
  }
  return initializedCollections;
}

export function isCollectionInitialized(collectionName: string): boolean {
  return ensureInitializedCacheLoaded().has(collectionName);
}

export function markCollectionInitialized(collectionName: string): void {
  const set = ensureInitializedCacheLoaded();
  set.add(collectionName);
  try {
    localStorage.setItem(INITIALIZED_COLLECTIONS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function getDeletedIds(collectionName: string): Set<string> {
  return ensureDeletedCacheLoaded(collectionName);
}

export function isRecordDeleted(collectionName: string, id: string): boolean {
  if (!id) return false;
  return ensureDeletedCacheLoaded(collectionName).has(id);
}

export async function markRecordAsDeleted(collectionName: string, id: string): Promise<void> {
  if (!id) return;
  const set = ensureDeletedCacheLoaded(collectionName);
  set.add(id);
  try {
    const raw = localStorage.getItem(DELETED_RECORDS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[collectionName] = Array.from(set);
    localStorage.setItem(DELETED_RECORDS_KEY, JSON.stringify(obj));
  } catch (e) {}
}

export async function unmarkRecordAsDeleted(collectionName: string, id: string): Promise<void> {
  if (!id) return;
  const set = ensureDeletedCacheLoaded(collectionName);
  set.delete(id);
  try {
    const raw = localStorage.getItem(DELETED_RECORDS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[collectionName] = Array.from(set);
    localStorage.setItem(DELETED_RECORDS_KEY, JSON.stringify(obj));
  } catch (e) {}
}

export function initDeletedRecordsListener(): void {}

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  await markRecordAsDeleted(collectionName, id);
  const mapData = readLocalMirror<any>(collectionName);
  delete mapData[id];
  writeLocalMirror(collectionName, mapData);
  notifyCollectionListeners(collectionName);
  await cloudDeleteDocuments(collectionName, [id]);
}

export async function deleteMultipleDocuments(collectionName: string, ids: string[]): Promise<void> {
  const validIds = Array.from(new Set((ids || []).filter(Boolean)));
  if (validIds.length === 0) return;

  const set = ensureDeletedCacheLoaded(collectionName);
  const mapData = readLocalMirror<any>(collectionName);

  validIds.forEach((id) => {
    set.add(id);
    delete mapData[id];
  });

  try {
    const raw = localStorage.getItem(DELETED_RECORDS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[collectionName] = Array.from(set);
    localStorage.setItem(DELETED_RECORDS_KEY, JSON.stringify(obj));
  } catch (e) {}

  writeLocalMirror(collectionName, mapData);
  notifyCollectionListeners(collectionName);
  await cloudDeleteDocuments(collectionName, validIds);
}

export async function purgeOutflowDocumentsFromFirestore(
  knownOutflowIds: string[] = [],
  knownJournalIds: string[] = []
): Promise<{ deletedOutflowIds: string[]; deletedJournalIds: string[] }> {
  const outflowIdSet = new Set<string>(knownOutflowIds.filter(Boolean));
  const journalIdSet = new Set<string>(knownJournalIds.filter(Boolean));

  const txMap = readLocalMirror<any>('cash_transactions');
  Object.values(txMap).forEach((data: any) => {
    const docId = data?.id;
    if (data?.type === 'outflow' || String(docId).startsWith('tx_exp_')) {
      outflowIdSet.add(docId);
    }
  });

  const jrnMap = readLocalMirror<any>('journal');
  Object.values(jrnMap).forEach((data: any) => {
    const docId = data?.id;
    const refId = String(data?.referenceId || '');
    const hasExpenseDebit =
      Array.isArray(data?.lines) &&
      data.lines.some(
        (l: any) =>
          (String(l?.accountCode || '').startsWith('5') || String(l?.accountCode || '').startsWith('6')) &&
          Number(l?.debit) > 0
      );
    if (
      outflowIdSet.has(refId) ||
      refId.startsWith('tx_exp_') ||
      String(docId).startsWith('jrn_sync_tx_exp_') ||
      (data?.referenceModule === 'finance' && hasExpenseDebit)
    ) {
      journalIdSet.add(docId);
    }
  });

  const deletedOutflowIds = Array.from(outflowIdSet);
  const deletedJournalIds = Array.from(journalIdSet);

  if (deletedOutflowIds.length > 0) {
    await deleteMultipleDocuments('cash_transactions', deletedOutflowIds);
  }
  if (deletedJournalIds.length > 0) {
    await deleteMultipleDocuments('journal', deletedJournalIds);
  }

  return { deletedOutflowIds, deletedJournalIds };
}

export async function purgeObsoleteReconstructedSchoolDocsFromFirestore(): Promise<void> {
  const targets: Array<{ col: string; prefix: string }> = [
    { col: 'leads', prefix: 'lead_sch_2026_' },
    { col: 'quotations', prefix: 'quo_sch_2026_' },
    { col: 'sales_orders', prefix: 'so_sch_2026_' },
    { col: 'sales_invoices', prefix: 'inv_sch_2026_' }
  ];

  for (const { col, prefix } of targets) {
    const mapData = readLocalMirror<any>(col);
    const idsToDelete = Object.keys(mapData).filter((id) => id.startsWith(prefix));
    if (idsToDelete.length > 0) {
      await deleteMultipleDocuments(col, idsToDelete);
    }
  }
}

export async function clearCollection(collectionName: string): Promise<void> {
  const mapData = readLocalMirror<any>(collectionName);
  const allIds = Object.keys(mapData);
  writeLocalMirror(collectionName, {});
  notifyCollectionListeners(collectionName);
  if (allIds.length > 0) {
    await cloudDeleteDocuments(collectionName, allIds);
  }
}

export async function seedIfEmpty<T extends { id?: string; code?: string }>(
  _collectionName: string,
  _initialItems: T[]
): Promise<void> {
  return;
}

export function subscribeToCollection<T extends { id?: string; code?: string }>(
  collectionName: string,
  onData: (items: T[]) => void,
  initialSeedFallback?: T[],
  onStatusChange?: (isLive: boolean) => void
): () => void {
  if (!collectionSubscribers.has(collectionName)) {
    collectionSubscribers.set(collectionName, new Set());
  }
  collectionSubscribers.get(collectionName)!.add(onData);

  // 1. Load dari Local Mirror / Initial Seed terlebih dahulu secara instan
  const localMap = readLocalMirror<T>(collectionName);
  const localItems = Object.values(localMap).filter((item) => {
    const key = getItemKey(item);
    return !isRecordDeleted(collectionName, key);
  });

  if (localItems.length > 0) {
    onData(localItems);
  } else if (Array.isArray(initialSeedFallback) && initialSeedFallback.length > 0) {
    const fallbackFiltered = initialSeedFallback.filter((item) => !isRecordDeleted(collectionName, getItemKey(item)));
    const seededMap: Record<string, T> = {};
    fallbackFiltered.forEach((item) => {
      seededMap[getItemKey(item)] = item;
    });
    writeLocalMirror(collectionName, seededMap);
    onData(fallbackFiltered);
  } else {
    onData([]);
  }

  // 2. Sinkronisasi dengan Cloud / Server DB di latar belakang
  cloudFetchCollection<T>(collectionName).then((remoteItems) => {
    if (remoteItems && remoteItems.length > 0) {
      markCollectionInitialized(collectionName);
      const mergedMap = readLocalMirror<T>(collectionName);
      remoteItems.forEach((item) => {
        const key = getItemKey(item);
        if (!isRecordDeleted(collectionName, key)) {
          mergedMap[key] = item;
        }
      });
      writeLocalMirror(collectionName, mergedMap);
      if (onStatusChange) onStatusChange(true);
      notifyCollectionListeners(collectionName);
    } else {
      if (onStatusChange) onStatusChange(true);
    }
  }).catch(() => {
    if (onStatusChange) onStatusChange(false);
  });

  return () => {
    collectionSubscribers.get(collectionName)?.delete(onData);
  };
}