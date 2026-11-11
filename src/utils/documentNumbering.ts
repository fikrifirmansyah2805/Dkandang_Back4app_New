import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function getNextDocumentNumber(docType: string, periodKey: string | null): Promise<number> {
  const counterId = periodKey ? `${docType}_${periodKey}` : docType;
  const counterRef = doc(db, 'document_counters', counterId);

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const current = counterDoc.exists() ? (Number(counterDoc.data().lastNumber) || 0) : 0;
    const next = current + 1;

    transaction.set(
      counterRef,
      {
        lastNumber: next,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    return next;
  });
}

/**
 * Reserves a contiguous block of sequential document numbers atomically via Firestore runTransaction
 * to prevent race conditions during bulk imports.
 * Returns the starting number of the reserved range [startNumber, startNumber + count - 1].
 */
export async function reserveDocumentNumberRange(
  docType: string,
  periodKey: string | null,
  count: number,
  fallbackBaseNumber = 0
): Promise<number> {
  if (count <= 0) return fallbackBaseNumber + 1;
  const counterId = periodKey ? `${docType}_${periodKey}` : docType;
  const counterRef = doc(db, 'document_counters', counterId);

  try {
    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentRaw = counterDoc.exists() ? (Number(counterDoc.data().lastNumber) || 0) : 0;
      const effectiveBase = Math.max(currentRaw, fallbackBaseNumber);
      const nextLast = effectiveBase + count;

      transaction.set(
        counterRef,
        {
          lastNumber: nextLast,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      return effectiveBase + 1;
    });
  } catch (err) {
    console.warn(`[reserveDocumentNumberRange] Fallback local counter for ${counterId}:`, err);
    return fallbackBaseNumber + 1;
  }
}
