require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function run() {
  console.log("=== SUPABASE: All users ===");
  const { data: sbUsers, error: sbErr } = await supabase.from('users').select('*');
  if (sbErr) console.error("Supabase error:", sbErr);
  else {
    console.log("Total Supabase users:", sbUsers.length);
    sbUsers.forEach(u => console.log("  id:", u.id, "| email:", u.email, "| role:", u.role, "| regNo:", u.registerNumber));
  }

  console.log("\n=== FIRESTORE: Users with email chandru.k1282006@gmail.com ===");
  const q = query(collection(db, 'users'), where('email', '==', 'chandru.k1282006@gmail.com'));
  const snap = await getDocs(q);
  snap.forEach(doc => console.log("  docId:", doc.id, "=>", JSON.stringify(doc.data())));

  console.log("\n=== FIRESTORE: All users (first 20) ===");
  const allSnap = await getDocs(collection(db, 'users'));
  let count = 0;
  allSnap.forEach(doc => {
    if (count < 20) {
      const d = doc.data();
      console.log("  docId:", doc.id, "| email:", d.email, "| role:", d.role, "| regNo:", d.registerNumber);
      count++;
    }
  });
  console.log("  Total Firestore users:", allSnap.size);

  process.exit(0);
}
run();
