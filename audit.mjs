import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const collectionsToCheck = [
  { collectionName: 'journal', field: 'entryNumber' },
  { collectionName: 'quotations', field: 'quotationNumber' },
  { collectionName: 'sales_orders', field: 'soNumber' },
  { collectionName: 'sales_invoices', field: 'invoiceNumber' },
  { collectionName: 'vendors', field: 'code' },
  { collectionName: 'purchase_requisitions', field: 'prNumber' },
  { collectionName: 'purchase_orders', field: 'poNumber' },
  { collectionName: 'stock_opnames', field: 'opnameNumber' }
];

async function runAudit() {
  console.log("Starting audit for duplicate document numbers...");
  let hasDuplicates = false;
  
  for (const { collectionName, field } of collectionsToCheck) {
    try {
      const snap = await getDocs(collection(db, collectionName));
      const counts = {};
      const maxPerPeriod = {}; // Keep track of max number per period for seeding later
      
      snap.forEach(doc => {
        const data = doc.data();
        const docNum = data[field];
        if (docNum) {
          counts[docNum] = (counts[docNum] || 0) + 1;
          
          // Also try to extract the numeric part to help with Step 2 (Seeding)
          // E.g. JV-202609-001 -> period: 202609, number: 1
          let period = null;
          let num = 0;
          
          const parts = docNum.split('-');
          if (collectionName === 'vendors') {
             // VND-DPK-101
             if (parts.length >= 3) {
                num = parseInt(parts[2], 10);
                period = 'all'; // No reset
             }
          } else {
             // Prefix-Period-Number
             if (parts.length >= 3) {
                period = parts[1];
                num = parseInt(parts[2], 10);
             }
          }
          
          if (period && !isNaN(num)) {
             if (!maxPerPeriod[period] || num > maxPerPeriod[period]) {
                maxPerPeriod[period] = num;
             }
          }
        }
      });
      
      const duplicates = Object.entries(counts).filter(([num, count]) => count > 1);
      
      if (duplicates.length > 0) {
        hasDuplicates = true;
        console.log(`\n[WARNING] Duplicates found in collection: ${collectionName}`);
        console.log(`Field: ${field}`);
        console.table(duplicates.map(([num, count]) => ({ 'Document Number': num, 'Occurrences': count })));
      }
      
      console.log(`\nMax numbers for ${collectionName}:`);
      console.log(JSON.stringify(maxPerPeriod, null, 2));
      
    } catch (e) {
      console.error(`Error querying ${collectionName}:`, e);
    }
  }
  
  if (!hasDuplicates) {
    console.log("\n[SUCCESS] No duplicate document numbers found in any collection.");
  }
  process.exit(0);
}

runAudit();
