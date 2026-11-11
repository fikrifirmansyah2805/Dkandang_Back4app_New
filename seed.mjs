import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import {
  INITIAL_USERS,
  INITIAL_BANK_ACCOUNTS,
  INITIAL_BUDGETS,
  INITIAL_COA,
  INITIAL_CASH_TRANSACTIONS,
  INITIAL_COMPANY_PROFILE,
  INITIAL_DEBTS,
  INITIAL_AUDIT_LOGS
} from './src/data/mockData';
import { buildDeterministicJournalsAndCOA } from './src/utils/dataRecoveryHelper';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function clean(data) {
  return JSON.parse(JSON.stringify(data));
}

async function batchWrite(collectionName, items) {
  const CHUNK = 400;
  for (let i = 0; i < items.length; i += CHUNK) {
    const slice = items.slice(i, i + CHUNK);
    const batch = writeBatch(db);
    for (const item of slice) {
      const id = item.id || item.code || `doc_${Date.now()}`;
      batch.set(doc(db, collectionName, id), clean(item), { merge: true });
    }
    await batch.commit();
  }
  console.log(`[Restored] ${collectionName}: ${items.length} documents`);
}

async function seed() {
  console.log('Restoring all D\'Kandang ERP data to Firestore...');

  const { journals, coa, banks, budgets } = buildDeterministicJournalsAndCOA({
    transactions: INITIAL_CASH_TRANSACTIONS,
    existingJournals: [],
    existingCOA: INITIAL_COA,
    existingBanks: INITIAL_BANK_ACCOUNTS,
    existingBudgets: INITIAL_BUDGETS,
    actorName: 'Sistem Pemulihan Database'
  });

  await batchWrite('users', INITIAL_USERS);
  await batchWrite('bank_accounts', banks);
  await batchWrite('budgets', budgets);
  await batchWrite('cash_transactions', INITIAL_CASH_TRANSACTIONS);
  await batchWrite('journal', journals);
  await batchWrite('coa', coa);
  await batchWrite('debts', INITIAL_DEBTS);
  await batchWrite('audit_logs', INITIAL_AUDIT_LOGS);

  await setDoc(
    doc(db, 'company_profile', 'main_profile'),
    clean({ id: 'main_profile', ...INITIAL_COMPANY_PROFILE }),
    { merge: true }
  );
  console.log('[Restored] company_profile: 1 document');

  // Seed document counters for journal periods
  await setDoc(doc(db, 'document_counters', 'journal_202608'), { lastNumber: 70, updatedAt: new Date().toISOString() }, { merge: true });
  await setDoc(doc(db, 'document_counters', 'journal_202609'), { lastNumber: 230, updatedAt: new Date().toISOString() }, { merge: true });
  await setDoc(doc(db, 'document_counters', 'journal_202610'), { lastNumber: 25, updatedAt: new Date().toISOString() }, { merge: true });
  console.log('[Restored] document_counters');

  console.log('All collections restored and synchronized.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
