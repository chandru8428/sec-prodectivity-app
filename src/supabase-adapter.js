import { supabase } from './supabase.js';

export const db = {};

// --- AUTH MOCK ---
function mapUser(user) {
  if (!user) return null;
  return {
    ...user,
    uid: user.id,
    displayName: user.user_metadata?.displayName || '',
  };
}

export async function signInWithEmailAndPassword(auth, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw Object.assign(new Error(error.message), { code: error.message.includes('Invalid') ? 'auth/invalid-credential' : 'auth/error' });
  return { user: mapUser(data.user) };
}

export async function createUserWithEmailAndPassword(auth, email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw Object.assign(new Error(error.message), { code: error.message.includes('already registered') ? 'auth/email-already-in-use' : 'auth/error' });
  return { user: mapUser(data.user) };
}

export async function signInWithPopup(auth, provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) throw error;
  // This causes a redirect, so it won't return
  return { user: { uid: 'temp', email: '', displayName: '' } };
}

export async function signOut(auth) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChanged(auth, callback) {
  const safeCallback = (user) => {
    try {
      callback(mapUser(user || null));
    } catch (err) {
      console.error('onAuthStateChanged callback error', err);
    }
  };

  // call it immediately with current session
  supabase.auth.getSession()
    .then(({ data: { session } }) => {
      safeCallback(session?.user || null);
    })
    .catch((err) => {
      console.warn('getSession failed, falling back to signed-out state:', err);
      safeCallback(null);
    });
  
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    safeCallback(session?.user || null);
  });
  return () => data.subscription.unsubscribe();
}

export async function updateProfile(user, data) {
  await supabase.auth.updateUser({ data: { displayName: data.displayName } });
}

// --- FIRESTORE MOCK ---
function parsePath(paths) {
  let table = paths[0];
  let extraData = {};
  if (paths[0] === 'users' && paths.length > 2) {
    if (paths[2] === 'attendance') { table = 'attendance'; extraData.user_id = paths[1]; }
    else if (paths[2] === 'gpa') { table = 'gpa'; extraData.user_id = paths[1]; }
  } else if (paths[0] === 'posts' && paths.length > 2) {
    if (paths[2] === 'replies') { table = 'replies'; extraData.post_id = paths[1]; }
  }
  // id exists if paths has an even number of segments (collection/id pairs)
  const hasId = paths.length % 2 === 0;
  return { table, extraData, id: hasId ? paths[paths.length - 1] : null };
}

export function collection(db, ...paths) {
  return { isCollection: true, paths };
}

function generateId() {
  return crypto.randomUUID();
}

export function doc(dbOrCol, ...paths) {
  if (dbOrCol?.isCollection) {
    const allPaths = [...dbOrCol.paths, ...paths];
    // If paths is empty, auto-generate an ID so doc(collection(db,'table')) works
    if (paths.length === 0) {
      allPaths.push(generateId());
    }
    return { isDoc: true, paths: allPaths };
  }
  return { isDoc: true, paths };
}

export async function getDoc(docRef) {
  const { table, extraData, id } = parsePath(docRef.paths);
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return { exists: () => false, data: () => null, id };
    throw error;
  }
  if (!data) return { exists: () => false, data: () => null, id };
  return { exists: () => true, data: () => data, id };
}

function cleanPayload(payload) {
  const cleaned = { ...payload };
  for (let key in cleaned) {
    if (cleaned[key]?._isServerTimestamp) cleaned[key] = new Date().toISOString();
    if (cleaned[key]?._isIncrement) delete cleaned[key];
    if (cleaned[key]?._isArrayUnion) delete cleaned[key];
    if (cleaned[key]?._isArrayRemove) delete cleaned[key];
  }
  return cleaned;
}

export async function setDoc(docRef, data, options = {}) {
  const { table, extraData, id } = parsePath(docRef.paths);
  const resolvedId = id || generateId();
  const payload = cleanPayload({ id: resolvedId, ...extraData, ...data });

  const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

export async function addDoc(colRef, data) {
  const { table, extraData } = parsePath(colRef.paths);
  const payload = cleanPayload({ id: generateId(), ...extraData, ...data });
  const { data: res, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw error;
  return { id: res?.id || payload.id };
}

export async function updateDoc(docRef, data) {
  const { table, extraData, id } = parsePath(docRef.paths);
  const payload = cleanPayload({ ...data });
  const { error } = await supabase.from(table).update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteDoc(docRef) {
  const { table, id } = parsePath(docRef.paths);
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export function query(colRef, ...filters) {
  return { isQuery: true, colRef, filters };
}

export function where(field, op, val) {
  return { type: 'where', field, op, val };
}

export function orderBy(field, dir = 'asc') {
  return { type: 'orderBy', field, dir };
}

export function limit(num) {
  return { type: 'limit', num };
}

export async function getDocs(queryObj) {
  let colRef = queryObj.isQuery ? queryObj.colRef : queryObj;
  const { table, extraData } = parsePath(colRef.paths);
  
  let builder = supabase.from(table).select('*');
  
  // Apply extraData (e.g. user_id = '123' for nested collections)
  for (let k in extraData) {
    builder = builder.eq(k, extraData[k]);
  }

  if (queryObj.isQuery) {
    for (let f of queryObj.filters) {
      if (f.type === 'where') {
        if (f.op === '==') builder = builder.eq(f.field, f.val);
        else if (f.op === '>') builder = builder.gt(f.field, f.val);
        else if (f.op === '<') builder = builder.lt(f.field, f.val);
        else if (f.op === '>=') builder = builder.gte(f.field, f.val);
        else if (f.op === '<=') builder = builder.lte(f.field, f.val);
        else if (f.op === 'array-contains') builder = builder.contains(f.field, [f.val]);
      } else if (f.type === 'orderBy') {
        builder = builder.order(f.field, { ascending: f.dir !== 'desc' });
      } else if (f.type === 'limit') {
        builder = builder.limit(f.num);
      }
    }
  }

  const { data, error } = await builder;
  if (error) throw error;
  const docs = (data || []).map(d => ({ 
    id: d.id, 
    data: () => d,
    ref: doc(colRef, d.id)
  }));
  return { empty: docs.length === 0, docs, size: docs.length };
}

export function onSnapshot(queryObj, callback) {
  // MOCK: just fetch once
  getDocs(queryObj).then(callback);
  return () => {}; // unsubscribe mock
}

export function serverTimestamp() { return { _isServerTimestamp: true }; }
export function increment(n) { return { _isIncrement: true, val: n }; }
export function arrayUnion(...vals) { return { _isArrayUnion: true, vals }; }
export function arrayRemove(...vals) { return { _isArrayRemove: true, vals }; }

export function writeBatch(db) {
  const operations = [];
  return {
    set(ref, data) { operations.push({ type: 'set', ref, data }); },
    update(ref, data) { operations.push({ type: 'update', ref, data }); },
    delete(ref) { operations.push({ type: 'delete', ref }); },
    async commit() {
      // Group all SET operations by table for bulk insert
      const insertsByTable = {};
      const nonInsertOps = [];

      for (let op of operations) {
        if (op.type === 'set') {
          const { table, extraData, id } = parsePath(op.ref.paths);
          const resolvedId = id || generateId();
          const payload = cleanPayload({ id: resolvedId, ...extraData, ...op.data });
          if (!insertsByTable[table]) insertsByTable[table] = [];
          insertsByTable[table].push(payload);
        } else {
          nonInsertOps.push(op);
        }
      }

      // Bulk insert per table
      for (const [table, rows] of Object.entries(insertsByTable)) {
        const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }

      // Handle updates and deletes individually
      for (let op of nonInsertOps) {
        if (op.type === 'update') await updateDoc(op.ref, op.data);
        if (op.type === 'delete') await deleteDoc(op.ref);
      }
    }
  };
}
