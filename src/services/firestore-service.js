/**
 * Firestore Service — CRUD Operations
 */
import {
  db,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  writeBatch,
  where,
  setDoc,
  getDoc,
  increment,
  arrayUnion,
  limit,
} from '/src/firebase.js';
import {
  db as supabaseDb,
  collection as sbCollection,
  query as sbQuery,
  orderBy as sbOrderBy,
  getDocs as sbGetDocs,
  deleteDoc as sbDeleteDoc,
  doc as sbDoc,
  where as sbWhere,
} from '/src/supabase-adapter.js';

// === EXAMS ===
export async function getExams() {
  const q = query(collection(db, 'exams'), orderBy('date'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getFilteredExamsForStudent(regNo) {
  if (!regNo) return [];
  const q = query(collection(db, 'exams'), orderBy('date'));
  const snap = await getDocs(q);
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const lowerReg = regNo.toLowerCase();
  return all.filter(e => {
    const target = String(e.targetStudent || 'all').toLowerCase();
    return target === 'all' || target.includes(lowerReg);
  });
}

export async function addExam(exam) {
  return addDoc(collection(db, 'exams'), { ...exam, createdAt: serverTimestamp() });
}

export async function updateExam(id, data) {
  return updateDoc(doc(db, 'exams', id), data);
}

export async function deleteExam(id) {
  return deleteDoc(doc(db, 'exams', id));
}

export async function clearAllExams() {
  const snap = await getDocs(collection(db, 'exams'));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  return batch.commit();
}

// === EXAM SCHEDULES (for upload timetable) ===
export async function getExamSchedules(filterReg = '', filterType = '') {
  let q = sbCollection(supabaseDb, 'examSchedules');
  const constraints = [];
  if (filterReg) constraints.push(sbWhere('registerNumber', '==', filterReg.toUpperCase()));
  if (filterType) constraints.push(sbWhere('examType', '==', filterType));
  constraints.push(sbOrderBy('examDate'));
  q = sbQuery(q, ...constraints);
  const snap = await sbGetDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function clearExamSchedulesByType(examType) {
  console.log('clearExamSchedulesByType called with examType:', examType);
  
  // Get raw Supabase docs directly from table
  const q = sbCollection(supabaseDb, 'examSchedules');
  const snap = await sbGetDocs(q);
  
  console.log('Total docs fetched from Supabase:', snap.docs.length);
  
  // Filter by type if needed
  let docsToDelete = snap.docs;
  if (examType && examType !== '') {
    docsToDelete = snap.docs.filter(d => d.data().examType === examType);
    console.log('Filtered by type:', examType, '-> docs to delete:', docsToDelete.length);
  } else {
    console.log('No type filter - will delete ALL:', docsToDelete.length);
  }
  
  if (docsToDelete.length === 0) {
    console.log('No docs to delete');
    return;
  }
  
  // Delete each doc individually using deleteDoc
  console.log('Starting individual deletions...');
  let deletedCount = 0;
  
  for (const d of docsToDelete) {
    try {
      await sbDeleteDoc(d.ref);
      deletedCount++;
      if (deletedCount % 100 === 0) {
        console.log('Deleted:', deletedCount, 'records...');
      }
    } catch (err) {
      console.error('Error deleting doc:', d.id, err);
    }
  }
  
  console.log('Total deleted:', deletedCount);
}

export async function deleteExamSchedule(id) {
  return sbDeleteDoc(sbDoc(supabaseDb, 'examSchedules', id));
}

export async function uploadExamsBatch(exams) {
  const batch = writeBatch(db);
  exams.forEach(exam => {
    const ref = doc(collection(db, 'exams'));
    batch.set(ref, { ...exam, createdAt: serverTimestamp() });
  });
  return batch.commit();
}

// === ATTENDANCE ===
export async function getAttendance(userId) {
  const snap = await getDocs(collection(db, 'users', userId, 'attendance'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateAttendance(userId, subjectId, data) {
  return setDoc(doc(db, 'users', userId, 'attendance', subjectId), data, { merge: true });
}

export async function logAttendance(userId, subjectId, entry) {
  const ref = doc(db, 'users', userId, 'attendance', subjectId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const current = snap.data();
    await updateDoc(ref, {
      attended: entry.present ? increment(1) : current.attended,
      total: increment(1),
      logs: arrayUnion({ date: entry.date, present: entry.present }),
    });
  } else {
    await setDoc(ref, {
      subjectName: entry.subjectName,
      attended: entry.present ? 1 : 0,
      total: 1,
      logs: [{ date: entry.date, present: entry.present }],
    });
  }
}

// === GPA ===
export async function saveGPA(userId, semesterId, data) {
  return setDoc(doc(db, 'users', userId, 'gpa', semesterId), { ...data, updatedAt: serverTimestamp() });
}

export async function getGPAHistory(userId) {
  const snap = await getDocs(query(collection(db, 'users', userId, 'gpa'), orderBy('semester')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// === Q&A BOARD ===
export async function createPost(post) {
  return addDoc(collection(db, 'posts'), {
    ...post,
    votes: 0,
    votedBy: [],
    createdAt: serverTimestamp(),
  });
}

export async function getPosts(filters = {}) {
  let q = collection(db, 'posts');
  const constraints = [];

  if (filters.type) constraints.push(where('type', '==', filters.type));
  if (filters.subject) constraints.push(where('subject', '==', filters.subject));
  if (filters.semester) constraints.push(where('semester', '==', filters.semester));

  constraints.push(orderBy(filters.sortBy || 'createdAt', 'desc'));
  if (filters.limit) constraints.push(limit(filters.limit));

  q = query(q, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function votePost(postId, userId, direction) {
  const ref = doc(db, 'posts', postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const votedBy = data.votedBy || [];

  if (votedBy.includes(userId)) return; // Already voted

  await updateDoc(ref, {
    votes: increment(direction === 'up' ? 1 : -1),
    votedBy: arrayUnion(userId),
  });
}

export async function addReply(postId, reply) {
  return addDoc(collection(db, 'posts', postId, 'replies'), {
    ...reply,
    createdAt: serverTimestamp(),
  });
}

export async function getReplies(postId) {
  const q = query(collection(db, 'posts', postId, 'replies'), orderBy('createdAt'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// === TIMETABLES ===
export async function saveTimetable(timetable) {
  return addDoc(collection(db, 'timetables'), { ...timetable, createdAt: serverTimestamp() });
}

export async function getTimetables(userId) {
  const q = query(collection(db, 'timetables'), where('createdBy', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// === CALENDAR ===
export async function getAcademicCalendar(year) {
  const snap = await getDoc(doc(db, 'calendar', String(year)));
  return snap.exists() ? snap.data() : { holidays: [], events: [] };
}

// === USER ===
export async function updateUserProfile(userId, data) {
  return updateDoc(doc(db, 'users', userId), data);
}
