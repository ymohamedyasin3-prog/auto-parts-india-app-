import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseFirestore, getCurrentUser } from './firebase';

const STORAGE_KEY = 'autoparts_user_favorites';

// Global memory cache to ensure instant state sharing across all screens
let globalFavoritesCache: string[] = [];
const globalListeners = new Set<(favs: string[]) => void>();

function notifyListeners(nextFavs: string[]) {
  globalFavoritesCache = nextFavs;
  globalListeners.forEach(listener => {
    try {
      listener(nextFavs);
    } catch (_) {}
  });
}

// Initial hydration from AsyncStorage
AsyncStorage.getItem(STORAGE_KEY).then(stored => {
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        notifyListeners(parsed);
      }
    } catch (_) {}
  }
}).catch(() => {});

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(globalFavoritesCache);
  const user = getCurrentUser();
  const userId = user?.uid || user?.id;
  const isMountedRef = useRef(true);

  // Subscribe to global memory cache changes
  useEffect(() => {
    isMountedRef.current = true;
    const listener = (newFavs: string[]) => {
      if (isMountedRef.current) {
        setFavorites(newFavs);
      }
    };
    globalListeners.add(listener);

    // Initial load from storage if memory cache is empty
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored && isMountedRef.current) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            notifyListeners(parsed);
          }
        } catch (_) {}
      }
    }).catch(() => {});

    return () => {
      isMountedRef.current = false;
      globalListeners.delete(listener);
    };
  }, []);

  // Sync with Firestore if logged in (WITHOUT destructively erasing local favorites on empty snapshot)
  useEffect(() => {
    let unsub = () => {};
    if (userId) {
      try {
        const db = getFirebaseFirestore();
        if (db && typeof db.collection === 'function') {
          unsub = db.collection('favorites').where('userId', '==', userId).onSnapshot((snap: any) => {
            const remoteFavIds: string[] = [];
            if (snap && typeof snap.forEach === 'function') {
              snap.forEach((doc: any) => {
                const data = typeof doc.data === 'function' ? doc.data() : doc;
                if (data && data.partId) {
                  remoteFavIds.push(data.partId);
                }
              });
            }
            // Merge remote with current local favorites to prevent losing user clicks
            if (remoteFavIds.length > 0) {
              const merged = Array.from(new Set([...globalFavoritesCache, ...remoteFavIds]));
              notifyListeners(merged);
              AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
            }
          }, (err: any) => {
            console.log('Favorites Firestore notice:', err);
          });
        }
      } catch (err) {
        console.log('Favorites sync notice:', err);
      }
    }
    return () => unsub();
  }, [userId]);

  const toggleFavorite = useCallback(async (arg: any) => {
    const partId = typeof arg === 'string' ? arg : (arg?.id || '');
    if (!partId) return;

    const currentUid = getCurrentUser()?.uid || getCurrentUser()?.id || userId;
    const exists = globalFavoritesCache.includes(partId);
    const next = exists
      ? globalFavoritesCache.filter(id => id !== partId)
      : [...globalFavoritesCache, partId];

    // 1. Immediately update global cache and all components
    notifyListeners(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});

    // 2. Persist to Firestore in background if user is logged in
    if (currentUid) {
      try {
        const db = getFirebaseFirestore();
        if (db && typeof db.collection === 'function') {
          const favId = `${currentUid}_${partId}`;
          const ref = db.collection('favorites').doc(favId);
          if (exists) {
            ref.delete().catch(() => {});
          } else {
            ref.set({
              id: favId,
              userId: currentUid,
              partId,
              createdAt: Date.now()
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.log('Firestore favorite toggle notice:', err);
      }
    }
  }, [userId]);

  const isFavorited = useCallback((arg: any) => {
    const partId = typeof arg === 'string' ? arg : (arg?.id || '');
    return Boolean(partId && favorites.includes(partId));
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorited };
}

export default useFavorites;

