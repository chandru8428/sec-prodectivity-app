import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  projectId: "edusync-auth-qa-2026",
  appId: "1:523915571034:web:061387f72cfc4383030d63",
  apiKey: "AIzaSyDAuHoThHdr4GdZqBIQuPebL99XvmTDblI",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const usersToTest = [
  { email: "chandru.k1282006@gmail.com", pass: "chandru@8428" },
  { email: "chanduru@gmail.com", pass: "chandru8428" },
  { email: "yogesh@gmail.com", pass: "yogesh1234" }
];

async function testUsers() {
  for (const u of usersToTest) {
    try {
      await signInWithEmailAndPassword(auth, u.email, u.pass);
      console.log('Login SUCCESS for', u.email);
    } catch (err) {
      console.log('Login FAILED for', u.email, err.code);
    }
  }
  process.exit(0);
}

testUsers();
