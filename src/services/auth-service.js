/**
 * Auth Service — Firebase Authentication Operations
 */
import { auth, googleProvider, db, signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword, signOut, onAuthStateChanged, doc, setDoc, getDoc } from '/src/firebase.js';

export async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email, password, profile) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: profile.displayName });
  // Create user document in Firestore
  await setDoc(doc(db, 'users', cred.user.uid), {
    displayName: profile.displayName,
    email: cred.user.email,
    regNo: profile.regNo || '',
    department: profile.department || '',
    semester: profile.semester || 1,
    role: profile.role || 'student',
    createdAt: new Date().toISOString(),
  });
  return cred;
}

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', cred.user.uid), {
      displayName: cred.user.displayName,
      email: cred.user.email,
      regNo: '',
      department: '',
      semester: 1,
      role: 'student',
      createdAt: new Date().toISOString(),
    });
  }
  return cred;
}

export async function signOut() {
  return fbSignOut(auth);
}

export async function getUserProfile(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() ? userDoc.data() : null;
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
