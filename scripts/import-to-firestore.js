const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error('Missing Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars.');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function importCollection(filePath, collectionName) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const item of data) {
    const ref = db.collection(collectionName).doc(item.id || item.slug);
    batch.set(ref, { ...item, created_at: now, updated_at: now }, { merge: true });
  }

  await batch.commit();
  console.log(`Imported ${data.length} documents to ${collectionName}`);
}

async function main() {
  const dataDir = path.join(__dirname, '..', 'data');

  await importCollection(path.join(dataDir, 'seed-courts.json'), 'courts');
  await importCollection(path.join(dataDir, 'categories.json'), 'categories');

  console.log('Import complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
