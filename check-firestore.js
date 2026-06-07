import { config } from 'dotenv';
config();
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

async function check() {
  const app = initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    apiKey: process.env.VITE_FIREBASE_API_KEY
  });
  const db = getFirestore(app);
  
  const collections = ['users', 'students', 'profiles', 'accounts'];
  for (const col of collections) {
    const snap = await getDocs(collection(db, col));
    console.log(`Firestore ${col} count: ${snap.size}`);
  }
  process.exit(0);
}
check();
