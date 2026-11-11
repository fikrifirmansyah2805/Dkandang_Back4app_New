import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';

// Helper to remove undefined fields and circular refs which Firestore rejects
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  return JSON.parse(JSON.stringify(data));
}

// Get standard ID / Key for document
export function getItemKey<T extends { id?: string; code?: string }>(item: T): string {
  return item.id || item.code || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

// Quota exhaustion tracking to prevent endless retry storms and uncaught exceptions
let firestoreQuotaExceeded = false;
const quotaListeners = new Set<(exceeded: boolean) => void>();

export function isQuotaExceededError(error: any): boolean {
  if (!error) return false;
  const code = error?.code || '';
  const message = error?.message || error?.toString() || '';
  return (
    code === 'resource-exhausted' ||
    message.includes('Quota limit exceeded') ||
    message.includes('resource-exhausted') ||
    message.includes('Quota exceeded')
  );
}

export function getIsFirestoreQuotaExceeded(): boolean {
  return firestoreQuotaExceeded;
}

export function subscribeToQuotaStatus(listener: (exceeded: boolean) => void): () => void {
  quotaListeners.add(listener);
  listener(firestoreQuotaExceeded);
  return () => quotaListeners.delete(listener);
}

function handleQuotaExceeded(error: any): void {
  if (!firestoreQuotaExceeded && isQuotaExceededError(error)) {
    firestoreQuotaExceeded = true;
    console.warn(
      '[Firestore] Kuota penulisan harian Firestore (Spark Free Tier) telah tercapai. Operasi penulisan ke cloud ditangguhkan hingga kuota di-reset harian. Data tetap tersimpan aman di penyimpanan lokal (offline resilience).'
    );
    quotaListeners.forEach((fn) => {
      try { fn(true); } catch (_) {}
    });
  }
}

// Upsert a document in Firestore with graceful fallback on quota exhaustion
export async function saveDocument<T extends { id?: string; code?: string }>(
  collectionName: string, 
  data: T
): Promise<void> {
  const docId = getItemKey(data);
  if (firestoreQuotaExceeded) {
    // Quota reached: skip Firestore network call to avoid backoff delays
    return;
  }
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, cleanForFirestore(data), { merge: true });
  } catch (error) {
    if (isQuotaExceededError(error)) {
      handleQuotaExceeded(error);
      return;
    }
    console.error(`[Firestore] Failed to save document ${docId} in ${collectionName}:`, error);
    throw error;
  }
}

// Debounced localStorage writer to prevent main-thread blocking during Firestore snapshot bursts
const pendingStorageTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleStorageWrite(key: string, data: unknown, delayMs = 250): void {
  const existing = pendingStorageTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingStorageTimers.delete(key);
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`[Storage] Failed writing key ${key}:`, e);
    }
  }, delayMs);
  pendingStorageTimers.set(key, timer);
}

// Batch save multiple documents with quota resilience (chunked at 450 docs per batch)
export async function saveMultipleDocuments<T extends { id?: string; code?: string }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  if (!items || items.length === 0) return;
  if (firestoreQuotaExceeded) {
    return;
  }
  const CHUNK_SIZE = 450;
  try {
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      if (firestoreQuotaExceeded) break;
      const slice = items.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const item of slice) {
        const docId = getItemKey(item);
        const docRef = doc(db, collectionName, docId);
        batch.set(docRef, cleanForFirestore(item), { merge: true });
      }
      await batch.commit();
    }
  } catch (error) {
    if (isQuotaExceededError(error)) {
      handleQuotaExceeded(error);
      return;
    }
    console.error(`[Firestore] Batch save error in ${collectionName}:`, error);
    throw error;
  }
}

// Update partial document with quota resilience
export async function patchDocument(
  collectionName: string, 
  id: string, 
  updates: Record<string, any>
): Promise<void> {
  if (firestoreQuotaExceeded) {
    return;
  }
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, cleanForFirestore(updates));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      handleQuotaExceeded(error);
      return;
    }
    console.error(`[Firestore] Failed to patch document ${id} in ${collectionName}:`, error);
    throw error;
  }
}

// In-memory set to prevent repeated seeding attempts in the same runtime session
const seededCollections = new Set<string>();

// Storage key for locally tracked deleted IDs (tombstones)
const DELETED_RECORDS_KEY = 'dkandang_deleted_records';
const INITIALIZED_COLLECTIONS_KEY = 'dkandang_initialized_collections';

// In-memory cache of deleted record IDs per collection
const deletedCache: Record<string, Set<string>> = {};
let isInitializedCacheLoaded = false;
const initializedCollections = new Set<string>();

// Helper to load deleted cache from localStorage
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
    } catch (e) {
      console.warn('[Firestore] Failed reading deleted records cache:', e);
    }
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

  // 1. Save to localStorage immediately
  try {
    const raw = localStorage.getItem(DELETED_RECORDS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[collectionName] = Array.from(set);
    localStorage.setItem(DELETED_RECORDS_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('[Firestore] Failed saving deleted record to localStorage:', e);
  }

  // 2. Persist to Firestore system_metadata/deleted_records
  try {
    const metaRef = doc(db, 'system_metadata', 'deleted_records');
    await setDoc(metaRef, {
      [collectionName]: Array.from(set),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('[Firestore] Failed syncing deleted record to system_metadata:', e);
  }
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

    const metaRef = doc(db, 'system_metadata', 'deleted_records');
    await setDoc(metaRef, {
      [collectionName]: Array.from(set),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {}
}

// Global listener for system_metadata/deleted_records to sync across devices & tabs
let isListeningToDeletedRecords = false;
export function initDeletedRecordsListener(): void {
  if (isListeningToDeletedRecords) return;
  isListeningToDeletedRecords = true;

  try {
    const metaRef = doc(db, 'system_metadata', 'deleted_records');
    onSnapshot(metaRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        let changed = false;
        for (const col of Object.keys(data)) {
          if (Array.isArray(data[col])) {
            const set = ensureDeletedCacheLoaded(col);
            for (const id of data[col]) {
              if (!set.has(id)) {
                set.add(id);
                changed = true;
              }
            }
          }
        }
        if (changed) {
          try {
            const serialized: Record<string, string[]> = {};
            for (const col of Object.keys(deletedCache)) {
              serialized[col] = Array.from(deletedCache[col]);
            }
            localStorage.setItem(DELETED_RECORDS_KEY, JSON.stringify(serialized));
          } catch (e) {}
        }
      }
    }, () => {});
  } catch (e) {}
}

// Start listener immediately
initDeletedRecordsListener();

// Delete document from Firestore and register tombstone
export async function deleteDocument(
  collectionName: string, 
  id: string
): Promise<void> {
  try {
    // 1. Mark permanently deleted in tombstone registry first
    await markRecordAsDeleted(collectionName, id);

    if (firestoreQuotaExceeded) {
      return;
    }

    // 2. Delete the document in Firestore
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      handleQuotaExceeded(error);
      return;
    }
    console.error(`[Firestore] Failed to delete document ${id} in ${collectionName}:`, error);
    throw error;
  }
}

// Batch delete multiple documents by ID and register tombstones in one batch operation
export async function deleteMultipleDocuments(
  collectionName: string,
  ids: string[]
): Promise<void> {
  const validIds = Array.from(new Set((ids || []).filter(Boolean)));
  if (validIds.length === 0) return;

  // 1. Register all IDs in deleted tombstone cache & localStorage
  const set = ensureDeletedCacheLoaded(collectionName);
  validIds.forEach((id) => set.add(id));
  try {
    const raw = localStorage.getItem(DELETED_RECORDS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[collectionName] = Array.from(set);
    localStorage.setItem(DELETED_RECORDS_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('[Firestore] Failed saving batch deleted records to localStorage:', e);
  }

  // 2. Sync tombstones to Firestore system_metadata/deleted_records
  if (!firestoreQuotaExceeded) {
    try {
      const metaRef = doc(db, 'system_metadata', 'deleted_records');
      await setDoc(
        metaRef,
        {
          [collectionName]: Array.from(set),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (e) {
      if (isQuotaExceededError(e)) {
        handleQuotaExceeded(e);
      } else {
        console.warn('[Firestore] Failed syncing batch deleted records to system_metadata:', e);
      }
    }
  }

  // 3. Batch delete from Firestore collection in chunks of 450
  if (firestoreQuotaExceeded) return;
  const CHUNK_SIZE = 450;
  try {
    for (let i = 0; i < validIds.length; i += CHUNK_SIZE) {
      if (firestoreQuotaExceeded) break;
      const slice = validIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const id of slice) {
        const docRef = doc(db, collectionName, id);
        batch.delete(docRef);
      }
      await batch.commit();
    }
  } catch (error) {
    if (isQuotaExceededError(error)) {
      handleQuotaExceeded(error);
      return;
    }
    console.error(`[Firestore] Failed batch deleting ${validIds.length} docs from ${collectionName}:`, error);
    throw error;
  }
}

// Scan Firestore cash_transactions and journal directly and batch-delete all outflow records & linked journals
export async function purgeOutflowDocumentsFromFirestore(
  knownOutflowIds: string[] = [],
  knownJournalIds: string[] = []
): Promise<{ deletedOutflowIds: string[]; deletedJournalIds: string[] }> {
  const outflowIdSet = new Set<string>(knownOutflowIds.filter(Boolean));
  const journalIdSet = new Set<string>(knownJournalIds.filter(Boolean));

  try {
    const txColRef = collection(db, 'cash_transactions');
    const txSnap = await getDocs(txColRef);
    txSnap.forEach((d) => {
      const data = d.data();
      const docId = data?.id || d.id;
      if (data?.type === 'outflow' || String(docId).startsWith('tx_exp_')) {
        outflowIdSet.add(docId);
        outflowIdSet.add(d.id);
      }
    });
  } catch (e) {
    console.warn('[Firestore] Notice scanning cash_transactions for outflows:', e);
  }

  try {
    const jrnColRef = collection(db, 'journal');
    const jrnSnap = await getDocs(jrnColRef);
    jrnSnap.forEach((d) => {
      const data = d.data();
      const docId = data?.id || d.id;
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
        journalIdSet.add(d.id);
      }
    });
  } catch (e) {
    console.warn('[Firestore] Notice scanning journal for expense entries:', e);
  }

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

// Purge obsolete reconstructed school documents (lead_sch_2026_*, quo_sch_2026_*, so_sch_2026_*, inv_sch_2026_*) from Firestore
export async function purgeObsoleteReconstructedSchoolDocsFromFirestore(): Promise<void> {
  const targets: Array<{ col: string; prefix: string }> = [
    { col: 'leads', prefix: 'lead_sch_2026_' },
    { col: 'quotations', prefix: 'quo_sch_2026_' },
    { col: 'sales_orders', prefix: 'so_sch_2026_' },
    { col: 'sales_invoices', prefix: 'inv_sch_2026_' }
  ];

  for (const { col, prefix } of targets) {
    try {
      const snap = await getDocs(collection(db, col));
      const idsToDelete: string[] = [];
      snap.forEach((d) => {
        const docId = String(d.data()?.id || d.id);
        if (docId.startsWith(prefix) || d.id.startsWith(prefix)) {
          idsToDelete.push(docId);
          if (d.id !== docId) idsToDelete.push(d.id);
        }
      });
      if (idsToDelete.length > 0) {
        await deleteMultipleDocuments(col, idsToDelete);
      }
    } catch (e) {
      console.warn(`[Firestore] Notice purging obsolete prefix ${prefix} from ${col}:`, e);
    }
  }
}

// Delete all documents in a collection (chunked at 450 docs per batch)
export async function clearCollection(collectionName: string): Promise<void> {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const CHUNK_SIZE = 450;
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const slice = docs.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        slice.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
      console.log(`[Firestore] Cleared all documents in ${collectionName}`);
    }
  } catch (error) {
    console.error(`[Firestore] Failed to clear collection ${collectionName}:`, error);
  }
}

// Seed initial dataset - disabled to prevent mock/dummy data from being injected
export async function seedIfEmpty<T extends { id?: string; code?: string }>(
  _collectionName: string, 
  _initialItems: T[]
): Promise<void> {
  // Strictly disabled: Database must contain only user-entered real data
  return;
}

// Subscribe to real-time changes
export function subscribeToCollection<T extends { id?: string; code?: string }>(
  collectionName: string,
  onData: (items: T[]) => void,
  initialSeedFallback?: T[],
  onStatusChange?: (isLive: boolean) => void
): () => void {
  const colRef = collection(db, collectionName);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      if (onStatusChange) onStatusChange(true);
      if (!snapshot.empty) {
        markCollectionInitialized(collectionName);
        const seenKeys = new Set<string>();
        const items = snapshot.docs
          .map((d) => {
            const data = d.data() as T;
            return { ...data, id: data.id || d.id };
          })
          .filter((item) => {
            const key = getItemKey(item);
            if (seenKeys.has(key)) return false;
            seenKeys.add(key);
            if (isRecordDeleted(collectionName, key)) {
              // Purge any zombie document from Firestore asynchronously if quota allows
              if (!firestoreQuotaExceeded) {
                const docRef = doc(db, collectionName, key);
                deleteDoc(docRef).catch(() => {});
              }
              return false;
            }
            return true;
          });
        onData(items);
      } else {
        // When Firestore collection is empty, preserve non-deleted initial/local fallback data
        // in local state and localStorage without triggering uncontrolled Firestore batch writes
        const fallbackList = Array.isArray(initialSeedFallback)
          ? initialSeedFallback.filter((item) => {
              const key = getItemKey(item);
              return !isRecordDeleted(collectionName, key);
            })
          : [];

        if (fallbackList.length > 0) {
          onData(fallbackList);
        } else {
          onData([]);
        }
      }
    },
    (error) => {
      console.warn(`[Firestore] Real-time listener for ${collectionName} notice:`, error);
      if (onStatusChange) onStatusChange(false);
    }
  );

  return unsubscribe;
}
