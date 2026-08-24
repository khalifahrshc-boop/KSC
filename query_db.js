import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const snapshot = await getDocs(collection(db, 'systemSettings'));
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', JSON.stringify(doc.data()));
  });
  console.log("Done");
  process.exit(0);
}
run().catch(console.error);
