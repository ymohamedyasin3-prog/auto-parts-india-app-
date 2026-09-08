
import { getApp as getAppInternal } from '@react-native-firebase/app';
import authModule from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';
import firestoreModule from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_SPARE_PARTS } from '../data/mockData';

const FIREBASE_PROJECT_ID = 'auto-parts-market-place-20312';
const FIRESTORE_DB_ID = 'ai-studio-autopartsmarketp-6b6de595-2abc-431d-a6dc-0141a5eff96f';
const FIREBASE_API_KEY = 'AIzaSyAGYut7q3nCW-qSDPSldGSbxAjnna_-bvo';
const STORAGE_KEY_PREFIX = '@autoparts_firestore_';

export function getApp() {
  try {
    return getAppInternal();
  } catch (_) {
    return (firebase as any)?.app?.() || null;
  }
}

let cachedAuthUser: any = null;
const authListeners = new Set<(user: any) => void>();

// Initialize cached user from AsyncStorage on app load
AsyncStorage.getItem('@autoparts_current_user').then((val) => {
  if (val) {
    try {
      const parsed = JSON.parse(val);
      if (parsed) {
        parsed.updateProfile = async (updates: any) => {
          if (updates.displayName) parsed.displayName = updates.displayName;
          if (updates.photoURL) {
            parsed.photoURL = updates.photoURL;
            parsed.profilePhoto = updates.photoURL;
          }
          await setCurrentAuthUser({ ...parsed });
        };
        cachedAuthUser = parsed;
        authListeners.forEach((cb) => {
          try { cb(cachedAuthUser); } catch (_) {}
        });
      }
    } catch (_) {}
  }
}).catch(() => {});

export async function setCurrentAuthUser(user: any) {
  if (user) {
    user.updateProfile = async (updates: { displayName?: string; photoURL?: string }) => {
      if (updates.displayName) user.displayName = updates.displayName;
      if (updates.photoURL) {
        user.photoURL = updates.photoURL;
        user.profilePhoto = updates.photoURL;
      }
      await setCurrentAuthUser({ ...user });
    };
  }
  cachedAuthUser = user;
  try {
    if (user) {
      await AsyncStorage.setItem('@autoparts_current_user', JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem('@autoparts_current_user');
    }
  } catch (_) {}

  // Broadcast to all active listeners
  authListeners.forEach((cb) => {
    try { cb(cachedAuthUser); } catch (_) {}
  });
}

export async function clearAppCache() {
  try {
    // Only clear current user session and search history; PRESERVE marketplace ads in cloud cache!
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => 
      k === '@autoparts_recently_viewed' || 
      k === '@autoparts_current_user'
    );
    if (cacheKeys.length > 0) {
      for (const k of cacheKeys) {
        await AsyncStorage.removeItem(k);
      }
    }
  } catch (err) {
    console.warn('[firebase.ts] Cache clear error:', err);
  }
}

export function getFirebaseAuth(): any {
  try {
    let inst: any = null;
    if (typeof authModule === 'function') {
      try { inst = (authModule as any)(); } catch (_) {}
    }
    if (!inst && (authModule as any)?.default && typeof (authModule as any).default === 'function') {
      try { inst = (authModule as any).default(); } catch (_) {}
    }
    if (!inst && typeof (firebase as any)?.auth === 'function') {
      try { inst = (firebase as any).auth(); } catch (_) {}
    }
    if (!inst) {
      inst = authModule || {};
    }

    return {
      ...(typeof inst === 'object' ? inst : {}),
      get currentUser() {
        return (inst as any)?.currentUser || cachedAuthUser || null;
      },
      onAuthStateChanged: (callback: (user: any) => void) => {
        authListeners.add(callback);
        // Immediate callback with current value
        setTimeout(() => {
          try {
            callback(cachedAuthUser || (inst as any)?.currentUser || null);
          } catch (_) {}
        }, 10);

        let nativeUnsub: any = null;
        if (inst && typeof inst.onAuthStateChanged === 'function') {
          try {
            nativeUnsub = inst.onAuthStateChanged((u: any) => {
              if (u) {
                const mappedUser = {
                  uid: u.uid,
                  id: u.uid,
                  email: u.email || '',
                  displayName: u.displayName || u.email?.split('@')[0] || 'Auto Parts User',
                  name: u.displayName || u.email?.split('@')[0] || 'Auto Parts User',
                  photoURL: u.photoURL || '',
                };
                setCurrentAuthUser(mappedUser);
              }
            });
          } catch (_) {}
        }

        return () => {
          authListeners.delete(callback);
          if (nativeUnsub) {
            try { nativeUnsub(); } catch (_) {}
          }
        };
      },
      signOut: async () => {
        try {
          if (inst && typeof inst.signOut === 'function') {
            await inst.signOut();
          }
        } catch (_) {}
        await clearAppCache();
        await setCurrentAuthUser(null);
      },
    };
  } catch (err) {
    console.warn('[firebase.ts] getFirebaseAuth fallback:', err);
    return {
      get currentUser() {
        return cachedAuthUser || null;
      },
      onAuthStateChanged: (callback: (user: any) => void) => {
        authListeners.add(callback);
        setTimeout(() => {
          try { callback(cachedAuthUser); } catch (_) {}
        }, 10);
        return () => authListeners.delete(callback);
      },
      signOut: async () => {
        await clearAppCache();
        await setCurrentAuthUser(null);
      },
    };
  }
}

// -------------------------------------------------------------
// REAL CLOUD FIRESTORE REST ENGINE (Zero-Fail Direct Cloud Sync)
// -------------------------------------------------------------

function encodeFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(encodeFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = encodeFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function decodeFirestoreValue(valObj: any): any {
  if (!valObj || typeof valObj !== 'object') return null;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
  if ('doubleValue' in valObj) return parseFloat(valObj.doubleValue);
  if ('booleanValue' in valObj) return valObj.booleanValue;
  if ('nullValue' in valObj) return null;
  if ('arrayValue' in valObj) {
    return (valObj.arrayValue?.values || []).map(decodeFirestoreValue);
  }
  if ('mapValue' in valObj) {
    const res: Record<string, any> = {};
    const fields = valObj.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = decodeFirestoreValue(v);
    }
    return res;
  }
  if ('timestampValue' in valObj) return new Date(valObj.timestampValue).getTime();
  return null;
}

function decodeFirestoreDoc(docObj: any): any {
  if (!docObj || !docObj.name) return null;
  const nameParts = docObj.name.split('/');
  const docId = nameParts[nameParts.length - 1];
  const fields = docObj.fields || {};
  const data: Record<string, any> = { id: docId };
  for (const [k, v] of Object.entries(fields)) {
    data[k] = decodeFirestoreValue(v);
  }
  return {
    id: docId,
    data: () => ({ ...data }),
    exists: true,
    ...data,
  };
}

const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents`;

// In-memory local cache synced with Cloud Firestore
const cloudCache: Record<string, Record<string, any>> = {};
const activeListeners: Record<string, Set<(snapshot: any) => void>> = {};
const activeDocListeners: Record<string, Set<(docSnap: any) => void>> = {};

function notifyLocalSubscribers(collPath: string) {
  const listeners = activeListeners[collPath];
  if (!listeners || listeners.size === 0) return;
  const cachedDocs = Object.values(cloudCache[collPath] || {});
  const snapshot = {
    docs: cachedDocs.map((item) => ({
      id: item.id,
      data: () => ({ ...item }),
      exists: true,
    })),
    empty: cachedDocs.length === 0,
    size: cachedDocs.length,
    forEach: (cb: (d: any) => void) => {
      cachedDocs.forEach((item) => {
        cb({ id: item.id, data: () => ({ ...item }), exists: true });
      });
    },
  };
  listeners.forEach((cb) => {
    try { cb(snapshot); } catch (_) {}
  });
}

function notifyLocalDocSubscribers(collPath: string, docId: string, data: any) {
  const fullPath = `${normalizeCollectionPath(collPath)}/${docId}`;
  const listeners = activeDocListeners[fullPath];
  if (!listeners || listeners.size === 0) return;
  const docSnap = {
    id: docId,
    data: () => (data ? { ...data } : null),
    exists: Boolean(data),
  };
  listeners.forEach((cb) => {
    try { cb(docSnap); } catch (_) {}
  });
}

function normalizeCollectionPath(collPath: string): string {
  const p = collPath.startsWith('/') ? collPath.substring(1) : collPath;
  if (p === 'parts' || p === 'products' || p === 'products/listings/items') {
    return 'spareParts';
  }
  return p;
}

// Fetch real documents from Cloud Firestore
async function fetchCloudCollection(collPath: string, whereClauses?: any[]): Promise<any[]> {
  try {
    const cleanPath = normalizeCollectionPath(collPath);
    const pathsToQuery: string[] = [];

    if (cleanPath === 'spareParts') {
      pathsToQuery.push('spareParts', 'products');
    } else {
      pathsToQuery.push(cleanPath);
    }

    const fetchedMap = new Map<string, any>();
    const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents:runQuery?key=${FIREBASE_API_KEY}`;

    await Promise.all(
      pathsToQuery.map(async (collectionId) => {
        try {
          const structuredQuery: any = {
            from: [{ collectionId }],
            limit: 100,
          };

          if (whereClauses && whereClauses.length > 0) {
            const filters = whereClauses.map((clause: any) => {
              let op = 'EQUAL';
              if (clause.op === '==') op = 'EQUAL';
              else if (clause.op === 'array-contains') op = 'ARRAY_CONTAINS';
              else if (clause.op === 'in') op = 'IN';
              else if (clause.op === '>') op = 'GREATER_THAN';
              else if (clause.op === '<') op = 'LESS_THAN';
              else if (clause.op === '>=') op = 'GREATER_THAN_OR_EQUAL';
              else if (clause.op === '<=') op = 'LESS_THAN_OR_EQUAL';

              const value: any = {};
              if (typeof clause.val === 'string') value.stringValue = clause.val;
              else if (typeof clause.val === 'boolean') value.booleanValue = clause.val;
              else if (typeof clause.val === 'number') {
                if (Number.isInteger(clause.val)) value.integerValue = clause.val;
                else value.doubleValue = clause.val;
              }

              return {
                fieldFilter: {
                  field: { fieldPath: clause.field },
                  op,
                  value
                }
              };
            });

            if (filters.length === 1) {
              structuredQuery.where = filters[0];
            } else {
              structuredQuery.where = {
                compositeFilter: {
                  op: 'AND',
                  filters
                }
              };
            }
          }

          const res = await fetch(runQueryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ structuredQuery }),
          });

          if (res.ok) {
            const jsonArray: any = await res.json();
            if (Array.isArray(jsonArray)) {
              jsonArray.forEach((entry: any) => {
                if (entry.document) {
                  const decoded = decodeFirestoreDoc(entry.document);
                  if (decoded && decoded.id) {
                    fetchedMap.set(decoded.id, decoded);
                  }
                }
              });
            }
          } else {
            // Fallback to GET listing if runQuery returns an unexpected status
            try {
              const fallbackRes = await fetch(`${firestoreBaseUrl}/${collectionId}?key=${FIREBASE_API_KEY}&pageSize=100`);
              if (fallbackRes.ok) {
                const json: any = await fallbackRes.json();
                const docs = json.documents || [];
                docs.forEach((d: any) => {
                  const decoded = decodeFirestoreDoc(d);
                  if (decoded && decoded.id) {
                    fetchedMap.set(decoded.id, decoded);
                  }
                });
              }
            } catch (_) {}
          }
        } catch (fetchErr) {
          console.warn(`[Firestore Cloud] Fetch query error for ${collectionId}:`, fetchErr);
        }
      })
    );

    const parsedDocs = Array.from(fetchedMap.values());

    // Update cache with the exact live state from Firestore, preserving very recent local writes
    const currentCache = cloudCache[collPath] || {};
    const liveDocMap: Record<string, any> = {};
    
    // 1. Keep local docs that were written in the last 15 seconds (to avoid race conditions)
    Object.keys(currentCache).forEach((docId) => {
      const doc = currentCache[docId];
      if (doc._localTs && Date.now() - doc._localTs < 15000) {
        liveDocMap[docId] = doc;
      }
    });

    // 2. Overwrite with fetched docs
    parsedDocs.forEach((doc) => {
      liveDocMap[doc.id] = { ...doc };
    });

    cloudCache[collPath] = liveDocMap;
    if (cleanPath !== collPath) {
      const currentCleanCache = cloudCache[cleanPath] || {};
      const liveCleanDocMap: Record<string, any> = {};
      Object.keys(currentCleanCache).forEach((docId) => {
        const doc = currentCleanCache[docId];
        if (doc._localTs && Date.now() - doc._localTs < 15000) {
          liveCleanDocMap[docId] = doc;
        }
      });
      parsedDocs.forEach((doc) => {
        liveCleanDocMap[doc.id] = { ...doc };
      });
      cloudCache[cleanPath] = liveCleanDocMap;
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY_PREFIX + collPath, JSON.stringify(liveDocMap));
      if (cleanPath !== collPath) {
        await AsyncStorage.setItem(STORAGE_KEY_PREFIX + cleanPath, JSON.stringify(liveDocMap));
      }
    } catch (_) {}

    notifyLocalSubscribers(collPath);
    if (cleanPath !== collPath) {
      notifyLocalSubscribers(cleanPath);
    }
    return parsedDocs;
  } catch (err) {
    console.warn(`[Firestore Cloud] Fetch error for ${collPath}:`, err);
    return Object.values(cloudCache[collPath] || {});
  }
}

// Write document to Cloud Firestore
async function writeCloudDoc(collPath: string, docId: string, data: any, isMerge = false): Promise<void> {
  try {
    const cleanPath = normalizeCollectionPath(collPath);
    if (!cloudCache[collPath]) cloudCache[collPath] = {};
    const existing = cloudCache[collPath][docId] || {};
    const merged = isMerge ? { ...existing, ...data, id: docId, _localTs: Date.now() } : { id: docId, ...data, _localTs: Date.now() };
    cloudCache[collPath][docId] = merged;
    if (cleanPath !== collPath) {
      if (!cloudCache[cleanPath]) cloudCache[cleanPath] = {};
      cloudCache[cleanPath][docId] = merged;
    }
    notifyLocalSubscribers(collPath);
    if (cleanPath !== collPath) {
      notifyLocalSubscribers(cleanPath);
    }
    notifyLocalDocSubscribers(collPath, docId, merged);
    if (cleanPath !== collPath) {
      notifyLocalDocSubscribers(cleanPath, docId, merged);
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY_PREFIX + collPath, JSON.stringify(cloudCache[collPath]));
      if (cleanPath !== collPath) {
        await AsyncStorage.setItem(STORAGE_KEY_PREFIX + cleanPath, JSON.stringify(cloudCache[cleanPath]));
      }
    } catch (_) {}

    // Encode fields for Firestore REST API
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(merged)) {
      if (k !== 'id') {
        fields[k] = encodeFirestoreValue(v);
      }
    }

    const pathsToWrite: string[] = [];
    if (cleanPath === 'spareParts') {
      pathsToWrite.push('spareParts', 'products', 'products/listings/items');
    } else {
      pathsToWrite.push(collPath);
    }

    // Write to Cloud Firestore endpoints
    await Promise.all(
      pathsToWrite.map(async (targetPath) => {
        const patchUrl = `${firestoreBaseUrl}/${targetPath}/${docId}?key=${FIREBASE_API_KEY}`;
        try {
          const res = await fetch(patchUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields }),
          });
          if (res.ok) {
            console.log(`[Firestore Cloud Write Success] Saved ${targetPath}/${docId}`);
          } else {
            const errText = await res.text();
            console.warn(`[Firestore Cloud Write Notice] HTTP ${res.status} for ${targetPath}/${docId}:`, errText);
          }
        } catch (postErr) {
          console.warn(`[Firestore Cloud Write Error] ${targetPath}/${docId}:`, postErr);
        }
      })
    );
  } catch (err) {
    console.warn(`[Firestore Cloud] Write error to ${collPath}/${docId}:`, err);
  }
}

// Delete document from Cloud Firestore
async function deleteCloudDoc(collPath: string, docId: string): Promise<void> {
  try {
    const cleanPath = normalizeCollectionPath(collPath);
    if (cloudCache[collPath]) {
      delete cloudCache[collPath][docId];
    }
    if (cleanPath !== collPath && cloudCache[cleanPath]) {
      delete cloudCache[cleanPath][docId];
    }
    notifyLocalSubscribers(collPath);
    if (cleanPath !== collPath) {
      notifyLocalSubscribers(cleanPath);
    }
    notifyLocalDocSubscribers(collPath, docId, null);
    if (cleanPath !== collPath) {
      notifyLocalDocSubscribers(cleanPath, docId, null);
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PREFIX + collPath, JSON.stringify(cloudCache[collPath] || {}));
      if (cleanPath !== collPath) {
        await AsyncStorage.setItem(STORAGE_KEY_PREFIX + cleanPath, JSON.stringify(cloudCache[cleanPath] || {}));
      }
    } catch (_) {}

    const pathsToDelete: string[] = [];
    if (cleanPath === 'spareParts') {
      pathsToDelete.push('spareParts', 'products', 'products/listings/items');
    } else {
      pathsToDelete.push(cleanPath);
    }

    await Promise.all(
      pathsToDelete.map(async (targetPath) => {
        try {
          await fetch(`${firestoreBaseUrl}/${targetPath}/${docId}?key=${FIREBASE_API_KEY}`, {
            method: 'DELETE',
          });
        } catch (_) {}
      })
    );
  } catch (err) {
    console.warn(`[Firestore Cloud] Delete error for ${collPath}/${docId}:`, err);
  }
}

// Pre-load from AsyncStorage cache on boot
['spareParts', 'products/listings/items', 'users', 'chats', 'favorites', 'follows', 'banners', 'topCategories', 'carBrands', 'announcements'].forEach((coll) => {
  AsyncStorage.getItem(STORAGE_KEY_PREFIX + coll).then((val) => {
    if (val) {
      try {
        cloudCache[coll] = JSON.parse(val);
        notifyLocalSubscribers(coll);
      } catch (_) {}
    }
  }).catch(() => {});
});

function createRealFirestoreQuery(rawCollectionPath: string) {
  const collectionPath = normalizeCollectionPath(rawCollectionPath);
  let whereClauses: { field: string; op: string; val: any }[] = [];
  let orderField: string | null = null;
  let orderDirection: 'asc' | 'desc' = 'desc';
  let limitCount: number | null = null;

  const queryObj = {
    where: (field: string, op: string, val: any) => {
      whereClauses.push({ field, op, val });
      return queryObj;
    },
    orderBy: (field: string, dir: 'asc' | 'desc' = 'asc') => {
      orderField = field;
      orderDirection = dir;
      return queryObj;
    },
    limit: (n: number) => {
      limitCount = n;
      return queryObj;
    },
    get: async () => {
      const liveDocs = await fetchCloudCollection(collectionPath, whereClauses);
      let filtered = [...liveDocs];

      // Apply in-memory filtering on fetched documents
      whereClauses.forEach(({ field, op, val }) => {
        filtered = filtered.filter((d) => {
          const itemVal = d[field];
          if (op === '==' || op === '===') return itemVal === val;
          if (op === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(val);
          if (op === 'in') return Array.isArray(val) && val.includes(itemVal);
          if (op === '>') return itemVal > val;
          if (op === '<') return itemVal < val;
          if (op === '>=') return itemVal >= val;
          if (op === '<=') return itemVal <= val;
          return true;
        });
      });

      if (orderField) {
        filtered.sort((a, b) => {
          const va = a[orderField!];
          const vb = b[orderField!];
          if (va < vb) return orderDirection === 'asc' ? -1 : 1;
          if (va > vb) return orderDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }

      if (limitCount && limitCount > 0) {
        filtered = filtered.slice(0, limitCount);
      }

      const docs = filtered.map((d) => ({
        id: d.id,
        data: () => ({ ...d }),
        exists: true,
      }));

      return {
        docs,
        empty: docs.length === 0,
        size: docs.length,
        forEach: (cb: (doc: any) => void) => docs.forEach(cb),
      };
    },
    onSnapshot: (onNext: (snap: any) => void, _onError?: (err: any) => void) => {
      if (!activeListeners[collectionPath]) {
        activeListeners[collectionPath] = new Set();
      }

      const subscriber = (snap: any) => {
        let filteredDocs = snap.docs || [];
        whereClauses.forEach(({ field, op, val }) => {
          filteredDocs = filteredDocs.filter((d: any) => {
            const data = typeof d.data === 'function' ? d.data() : d;
            const itemVal = data[field];
            if (op === '==' || op === '===') return itemVal === val;
            if (op === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(val);
            if (op === 'in') return Array.isArray(val) && val.includes(itemVal);
            return true;
          });
        });

        onNext({
          docs: filteredDocs,
          empty: filteredDocs.length === 0,
          size: filteredDocs.length,
          forEach: (cb: (doc: any) => void) => filteredDocs.forEach(cb),
        });
      };

      activeListeners[collectionPath].add(subscriber);

      // 1. Immediately emit from in-memory cache or AsyncStorage so UI is populated instantly with zero lag
      const emitCurrent = () => {
        const cached = Object.values(cloudCache[collectionPath] || {});
        subscriber({
          docs: cached.map((i) => ({ id: i.id, data: () => ({ ...i }), exists: true })),
          empty: cached.length === 0,
          size: cached.length,
          forEach: (cb: (d: any) => void) => {
            cached.forEach((item) => cb({ id: item.id, data: () => ({ ...item }), exists: true }));
          },
        });
      };

      emitCurrent();

      // If in-memory was empty, attempt immediate AsyncStorage load
      if (!cloudCache[collectionPath] || Object.keys(cloudCache[collectionPath]).length === 0) {
        AsyncStorage.getItem(STORAGE_KEY_PREFIX + collectionPath).then((val) => {
          if (val) {
            try {
              cloudCache[collectionPath] = JSON.parse(val);
              emitCurrent();
            } catch (_) {}
          }
        }).catch(() => {});
      }

      // 2. Trigger cloud fetch
      fetchCloudCollection(collectionPath, whereClauses).then((items) => {
        subscriber({
          docs: items.map((i) => ({ id: i.id, data: () => ({ ...i }), exists: true })),
          empty: items.length === 0,
          size: items.length,
          forEach: (cb: (doc: any) => void) => items.forEach(cb),
        });
      });

      return () => {
        activeListeners[collectionPath]?.delete(subscriber);
      };
    },
    doc: (docId: string) => {
      const docPath = `${collectionPath}/${docId}`;
      return {
        id: docId,
        collection: (subCollName: string) => createRealFirestoreQuery(`${docPath}/${subCollName}`),
        get: async () => {
          try {
            const res = await fetch(`${firestoreBaseUrl}/${docPath}?key=${FIREBASE_API_KEY}`);
            if (res.ok) {
              const data = await res.json();
              const decoded = decodeFirestoreDoc(data);
              if (decoded) {
                if (!cloudCache[collectionPath]) cloudCache[collectionPath] = {};
                cloudCache[collectionPath][docId] = decoded;
                return {
                  id: docId,
                  data: () => ({ ...decoded }),
                  exists: true,
                };
              }
            } else if (res.status === 404) {
              if (cloudCache[collectionPath]) {
                delete cloudCache[collectionPath][docId];
              }
              return { id: docId, data: () => null, exists: false };
            }
          } catch (_) {}

          const cached = cloudCache[collectionPath]?.[docId];
          return {
            id: docId,
            data: () => cached ? { ...cached } : null,
            exists: Boolean(cached),
          };
        },
        set: async (data: any, options?: { merge?: boolean }) => {
          await writeCloudDoc(collectionPath, docId, data, Boolean(options?.merge));
        },
        update: async (data: any) => {
          await writeCloudDoc(collectionPath, docId, data, true);
        },
        delete: async () => {
          await deleteCloudDoc(collectionPath, docId);
        },
        onSnapshot: (onNext: (docSnap: any) => void, _onError?: (err: any) => void) => {
          const fullPath = `${normalizeCollectionPath(collectionPath)}/${docId}`;
          if (!activeDocListeners[fullPath]) {
            activeDocListeners[fullPath] = new Set();
          }
          activeDocListeners[fullPath].add(onNext);

          // 1. Immediately notify with in-memory cached doc if available
          const cached = cloudCache[collectionPath]?.[docId];
          if (cached) {
            try {
              onNext({ id: docId, data: () => ({ ...cached }), exists: true });
            } catch (_) {}
          }

          // 2. Fetch from cloud REST to ensure fresh data
          const fetchAndNotify = async () => {
            try {
              const res = await fetch(`${firestoreBaseUrl}/${docPath}?key=${FIREBASE_API_KEY}`);
              if (res.ok) {
                const data = await res.json();
                const decoded = decodeFirestoreDoc(data);
                if (decoded) {
                  if (!cloudCache[collectionPath]) cloudCache[collectionPath] = {};
                  cloudCache[collectionPath][docId] = decoded;
                  onNext({ id: docId, data: () => ({ ...decoded }), exists: true });
                  return;
                }
              } else if (res.status === 404) {
                if (cloudCache[collectionPath]) {
                  delete cloudCache[collectionPath][docId];
                }
                onNext({ id: docId, data: () => null, exists: false });
                return;
              }
            } catch (_) {}
            const fallbackCached = cloudCache[collectionPath]?.[docId];
            onNext({ id: docId, data: () => fallbackCached ? { ...fallbackCached } : null, exists: Boolean(fallbackCached) });
          };
          fetchAndNotify();

          return () => {
            activeDocListeners[fullPath]?.delete(onNext);
          };
        },
      };
    },
    add: async (data: any) => {
      const docId = 'part_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const fullDoc = { id: docId, ...data, createdAt: data.createdAt || Date.now() };
      await writeCloudDoc(collectionPath, docId, fullDoc, false);
      return {
        id: docId,
        get: async () => ({ id: docId, data: () => fullDoc, exists: true }),
      };
    },
  };

  return queryObj;
}

export function getFirebaseFirestore(): any {
  return {
    collection: (collName: string) => createRealFirestoreQuery(collName),
    doc: (path: string) => {
      const parts = path.split('/');
      if (parts.length >= 2) {
        const coll = parts.slice(0, parts.length - 1).join('/');
        const docId = parts[parts.length - 1];
        return createRealFirestoreQuery(coll).doc(docId);
      }
      return createRealFirestoreQuery(path).doc('default');
    },
    batch: () => {
      const ops: (() => Promise<any>)[] = [];
      return {
        set: (docRef: any, data: any, options?: any) => {
          ops.push(() => docRef.set(data, options));
        },
        update: (docRef: any, data: any) => {
          ops.push(() => docRef.update(data));
        },
        delete: (docRef: any) => {
          ops.push(() => docRef.delete());
        },
        commit: async () => {
          for (const op of ops) {
            await op();
          }
        },
      };
    },
  };
}

export function getCurrentUser(): any {
  try {
    const authInst = getFirebaseAuth();
    return authInst?.currentUser || null;
  } catch (_) {
    return null;
  }
}

export const app = getApp();
export const auth = getFirebaseAuth();
export const firestore = getFirebaseFirestore;
export const getFirestoreInstance = getFirebaseFirestore;
export default getFirebaseAuth;



