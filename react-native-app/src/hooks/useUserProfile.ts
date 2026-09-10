import { useState, useEffect } from 'react';
import { getFirebaseAuth, getFirebaseFirestore, getCurrentUser } from '../services/firebase';

export interface UserProfileData {
  uid: string | null;
  displayName: string;
  email: string;
  photoURL: string | null;
  role?: string;
  phone?: string;
  location?: string;
}

// Global cached state for instant availability across all components
let globalProfile: UserProfileData = {
  uid: null,
  displayName: 'User',
  email: '',
  photoURL: null,
};

const listeners = new Set<(profile: UserProfileData) => void>();

function updateGlobalProfile(newProfile: Partial<UserProfileData>) {
  globalProfile = { ...globalProfile, ...newProfile };
  listeners.forEach((listener) => {
    try {
      listener(globalProfile);
    } catch (_) {}
  });
}

/**
 * Extracts the highest-priority valid profile photo URL from user data objects.
 */
export function extractProfilePhoto(userData: any): string | null {
  if (!userData) return null;
  const candidate =
    userData.customPhoto ||
    userData.profilePhoto ||
    userData.photoURL ||
    userData.profileImageUrl ||
    userData.avatarUrl ||
    userData.photo;

  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    const trimmed = candidate.trim();
    // Exclude stock default avatar placeholders so genuine avatars or initial placeholders are used
    if (trimmed.includes('photo-1534528741775-53994a69daeb')) {
      return null;
    }
    return trimmed;
  }
  return null;
}

/**
 * Hook providing the authenticated user's latest profile and photo in real time across the app.
 * Automatically synchronizes with Firebase Auth, Firestore `users/{uid}`, and local sessions.
 */
export function useUserProfile(): UserProfileData {
  const [profile, setProfile] = useState<UserProfileData>(() => {
    const current = getCurrentUser();
    if (current) {
      const photo = extractProfilePhoto(current);
      return {
        uid: current.uid || current.id || null,
        displayName: current.displayName || current.name || current.email?.split('@')[0] || 'User',
        email: current.email || '',
        photoURL: photo,
      };
    }
    return globalProfile;
  });

  useEffect(() => {
    listeners.add(setProfile);

    // Initial check from current session
    const current = getCurrentUser();
    if (current?.uid) {
      const photo = extractProfilePhoto(current);
      updateGlobalProfile({
        uid: current.uid,
        displayName: current.displayName || current.name || current.email?.split('@')[0] || 'User',
        email: current.email || '',
        photoURL: photo,
      });
    }

    let unsubAuth = () => {};
    let unsubFirestore = () => {};

    try {
      const authInst = getFirebaseAuth();
      if (authInst && typeof authInst.onAuthStateChanged === 'function') {
        unsubAuth = authInst.onAuthStateChanged((user: any) => {
          if (user) {
            const authPhoto = extractProfilePhoto(user);
            updateGlobalProfile({
              uid: user.uid,
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              photoURL: authPhoto,
            });

            // Listen to Firestore `users/{uid}` in real-time
            try {
              const db = getFirebaseFirestore();
              if (db && typeof db.collection === 'function') {
                unsubFirestore(); // Unsub existing if any
                unsubFirestore = db.collection('users').doc(user.uid).onSnapshot(
                  (docSnap: any) => {
                    const exists = typeof docSnap?.exists === 'function' ? docSnap.exists() : Boolean(docSnap?.exists);
                    if (exists) {
                      const data = typeof docSnap?.data === 'function' ? docSnap.data() : docSnap?.data;
                      if (data) {
                        const fsPhoto = extractProfilePhoto(data);
                        updateGlobalProfile({
                          uid: user.uid,
                          displayName: data.displayName || data.name || user.displayName || 'User',
                          email: data.email || user.email || '',
                          photoURL: fsPhoto || authPhoto,
                          role: data.role,
                          phone: data.phone,
                          location: data.location,
                        });
                      }
                    }
                  },
                  () => {}
                );
              }
            } catch (_) {}
          } else {
            updateGlobalProfile({
              uid: null,
              displayName: 'User',
              email: '',
              photoURL: null,
            });
            unsubFirestore();
          }
        });
      }
    } catch (_) {}

    return () => {
      listeners.delete(setProfile);
      unsubAuth();
      unsubFirestore();
    };
  }, []);

  return profile;
}
