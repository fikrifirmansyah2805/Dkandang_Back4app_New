import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  const snap = await getDocs(collection(db, 'sales_orders'));
  console.log('sales_orders count:', snap.size);
  const snap2 = await getDocs(collection(db, 'quotations'));
  console.log('quotations count:', snap2.size);
  process.exit(0);
}
test();
