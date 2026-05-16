import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, increment, arrayUnion, serverTimestamp, writeBatch, orderBy, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  projectId: "edusync-auth-qa-2026",
  appId: "1:523915571034:web:061387f72cfc4383030d63",
  storageBucket: "edusync-auth-qa-2026.firebasestorage.app",
  apiKey: "AIzaSyDAuHoThHdr4GdZqBIQuPebL99XvmTDblI",
  authDomain: "edusync-auth-qa-2026.firebaseapp.com",
  messagingSenderId: "523915571034",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  increment,
  arrayUnion,
  serverTimestamp,
  writeBatch,
  orderBy,
  limit,
  ref,
  uploadBytesResumable,
  getDownloadURL
};
