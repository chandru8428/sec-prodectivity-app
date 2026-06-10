require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const fdb = getFirestore(app);

async function run() {
  // Fix: The Google login UID (5lSrqTeSPceJjJAuWqIw9SAdfhA2) has role=student
  // but it should be admin since it's chandru.k1282006@gmail.com
  // Also add registerNumber so exam lookups work
  console.log("Updating Firestore doc 5lSrqTeSPceJjJAuWqIw9SAdfhA2 → role: admin, registerNumber: RA212224220017...");
  try {
    await updateDoc(doc(fdb, 'users', '5lSrqTeSPceJjJAuWqIw9SAdfhA2'), {
      role: 'admin',
      registerNumber: 'RA212224220017',
      name: 'Chandru K'
    });
    console.log("SUCCESS: Firestore user updated to admin with register number.");
  } catch (err) {
    console.error("Firestore update failed:", err.message);
    console.log("\n--- MANUAL FIX NEEDED ---");
    console.log("Go to Firebase Console → Firestore → users collection");
    console.log("Find doc: 5lSrqTeSPceJjJAuWqIw9SAdfhA2");
    console.log("Change 'role' from 'student' to 'admin'");
    console.log("Add 'registerNumber' field with value 'RA212224220017'");
  }
  process.exit(0);
}
run();
