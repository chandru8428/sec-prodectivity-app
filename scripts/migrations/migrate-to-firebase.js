import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "edusync-auth-qa-2026",
  appId: "1:523915571034:web:061387f72cfc4383030d63",
  storageBucket: "edusync-auth-qa-2026.firebasestorage.app",
  apiKey: "AIzaSyDAuHoThHdr4GdZqBIQuPebL99XvmTDblI",
  authDomain: "edusync-auth-qa-2026.firebaseapp.com",
  messagingSenderId: "523915571034",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const usersToMigrate = [
  {
    "id": "50d856ff-d756-47b3-9178-d04893fc36c0",
    "name": "chandru k",
    "firstName": "chandru",
    "lastName": "k",
    "email": "chandrukolanj@gmail.com",
    "registerNumber": "212224220017",
    "department": "Information Technology",
    "semester": 4,
    "role": "student",
    "createdAt": "2026-04-26T08:43:34.59+00:00",
    "password": "chandru8428"
  },
  {
    "id": "7d36bbf0-bbcb-4fed-800c-d4f023a3f6b9",
    "name": "Chandru K",
    "firstName": null,
    "lastName": null,
    "email": "chandru.k1282006@gmail.com",
    "registerNumber": "RA212224220017",
    "department": null,
    "semester": null,
    "role": "admin",
    "createdAt": "2026-04-26T08:44:06.723+00:00",
    "password": "chandru@8428"
  },
  {
    "id": "5a032148-e8bc-4688-809c-2478cb9cb007",
    "name": "yogesh s",
    "firstName": "yogesh",
    "lastName": "s",
    "email": "yogesh@gmail.com",
    "registerNumber": "212224230313",
    "department": "Artificial Intelligence & Data Science",
    "semester": 4,
    "role": "student",
    "createdAt": "2026-04-30T05:27:49.002+00:00",
    "password": "yogesh1234"
  }
];

async function migrateUsers() {
  for (const user of usersToMigrate) {
    try {
      console.log(`Creating user: ${user.email}`);
      let uid;
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
        uid = userCredential.user.uid;
        console.log(`✅ Auth Created for ${user.email}`);
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`⚠️ ${user.email} already exists. Attempting to update password and fetch UID...`);
          // Try logging in with the old default password "Password123!"
          try {
            const cred = await signInWithEmailAndPassword(auth, user.email, "Password123!");
            await updatePassword(cred.user, user.password);
            uid = cred.user.uid;
            console.log(`✅ Password updated to new password for ${user.email}`);
          } catch (signInErr) {
            // Might already have the correct password
            try {
              const cred = await signInWithEmailAndPassword(auth, user.email, user.password);
              uid = cred.user.uid;
              console.log(`✅ Password was already correct for ${user.email}`);
            } catch (err2) {
              throw new Error(`Could not log in to update password: ${signInErr.message}`);
            }
          }
        } else {
          throw error;
        }
      }
      
      const userData = { ...user };
      delete userData.id; // Remove supabase id
      delete userData.password; // Don't save password to firestore!
      userData.uid = uid; // Add firebase uid
      
      await setDoc(doc(db, 'users', uid), userData);
      console.log(`✅ Successfully saved Firestore profile for ${user.email}`);
      
    } catch (error) {
      console.error(`❌ Failed to migrate ${user.email}:`, error.message);
    }
  }
  process.exit(0);
}

migrateUsers();
