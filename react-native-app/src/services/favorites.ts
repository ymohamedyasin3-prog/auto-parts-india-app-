import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseFirestore, getCurrentUser } from './firebase';

const STORAGE_KEY = 'autoparts_user_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const user = getCurrentUser();
  const userId = user?.uid || user?.id;

  // 1. Load initial cached favorites from local AsyncStorage
  useEffect(() => {
    let isMounted = true;
    const loadCachedFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && isMounted) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setFavorites(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to load local favorites:', e);
      }
    };
    loadCachedFavorites();
    return () => { isMounted = false; };
  }, []);

  // 2. Sync with Firestore if logged in
  useEffect(() => {
    let unsub = () => {};
    if (userId) {
      try {
        const db = getFirebaseFirestore();
        if (db && typeof db.collection === 'function') {
          unsub = db.collection('favorites').where('userId', '==', userId).onSnapshot((snap: any) => {
            const favIds: string[] = [];
            snap.forEach((doc: any) => {
              const data = doc.data();
              if (data && data.partId) {
                favIds.push(data.partId);
              }
            });
            setFavorites(favIds);
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favIds)).catch(() => {});
          }, (err: any) => {
            console.warn('Firestore favorites sync notice:', err);
          });
        }
      } catch (err) {
        console.warn('Error syncing favorites with Firestore:', err);
      }
    }
    return () => unsub();
  }, [userId]);

  const toggleFavorite = useCallback(async (arg: any) => {
    const partId = typeof arg === 'string' ? arg : (arg?.id || '');
    if (!partId) return;

    const currentUid = getCurrentUser()?.uid || getCurrentUser()?.id || userId;

    setFavorites(prev => {
      const exists = prev.includes(partId);
      const next = exists ? prev.filter(id => id !== partId) : [...prev, partId];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});

      // If logged in, sync with Firestore in background
      if (currentUid) {
        try {
          const db = getFirebaseFirestore();
          if (db && typeof db.collection === 'function') {
            const favId = `${currentUid}_${partId}`;
            const ref = db.collection('favorites').doc(favId);
            if (exists) {
              ref.delete().catch((e: any) => console.warn('Failed to delete favorite doc:', e));
            } else {
              ref.set({
                id: favId,
                userId: currentUid,
                partId,
                createdAt: Date.now()
              }).catch((e: any) => console.warn('Failed to save favorite doc:', e));
            }
          }
        } catch (err) {
          console.warn('Firestore favorite toggle error:', err);
        }
      }

      return next;
    });
  }, [userId]);

  const isFavorited = useCallback((arg: any) => {
    const partId = typeof arg === 'string' ? arg : (arg?.id || '');
    return Boolean(partId && favorites.includes(partId));
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorited };
}

export default useFavorites;
