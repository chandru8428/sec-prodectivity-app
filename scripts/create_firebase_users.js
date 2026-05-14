import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "edusync-auth-qa-2026",
  appId: "1:523915571034:web:061387f72cfc4383030d63",
  apiKey: "AIzaSyDAuHoThHdr4GdZqBIQuPebL99XvmTDblI",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const usersToCreate = [
  {
    email: "chandru.k1282006@gmail.com",
    pass: "chandru@8428",
    data: {
      name: "Chandru K",
      email: "chandru.k1282006@gmail.com",
      registerNumber: "RA212224220017",
      role: "admin",
      createdAt: new Date().toISOString()
    }
  },
  {
    email: "chanduru@gmail.com",
    pass: "chandru8428",
    data: {
      name: "chanduru kolanji",
      email: "chanduru@gmail.com",
      registerNumber: "212224230046",
      department: "Computer Science",
      semester: 4,
      role: "student",
      createdAt: new Date().toISOString()
    }
  },
  {
    email: "yogesh@gmail.com",
    pass: "yogesh1234",
    data: {
      name: "yogesh s",
      email: "yogesh@gmail.com",
      registerNumber: "212224230313",
      department: "Artificial Intelligence & Data Science",
      semester: 4,
      role: "student",
      createdAt: new Date().toISOString()
    }
  }
];

async function createUsers() {
  for (const u of usersToCreate) {
    try {
      console.log('Creating', u.email);
      const cred = await createUserWithEmailAndPassword(auth, u.email, u.pass);
      await setDoc(doc(db, 'users', cred.user.uid), u.data);
      console.log('Successfully created', u.email);
    } catch (err) {
      console.error('Failed for', u.email, err.code, err.message);
    }
  }
  process.exit(0);
}

createUsers();
