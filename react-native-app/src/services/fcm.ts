import { getFirebaseFirestore as db } from './firebase';
import firestoreModule from '@react-native-firebase/firestore';

import { Platform, PermissionsAndroid } from "react-native";
import notifee, { AndroidImportance, EventType } from "@notifee/react-native";

import { navigate } from '../navigation/navigationRef';

let messagingModule: any = null;
let firebaseAppModule: any = null;
try {
  firebaseAppModule = require('@react-native-firebase/app');
  messagingModule = require('@react-native-firebase/messaging');
} catch (e) {
  console.warn('[FCM] Native messaging module not found:', e);
}

/**
 * Safely get messaging instance without throwing
 */
function getMessagingSafely() {
  try {
    const firebase = firebaseAppModule?.default || firebaseAppModule;
    if (firebase && typeof firebase.app !== 'function') {
      return null;
    }
    const messaging = typeof messagingModule === 'function' ? messagingModule : messagingModule?.default;
    if (typeof messaging === 'function') {
      return messaging();
    }
  } catch (e) {
    console.warn('[FCM] Native messaging instance unavailable:', e);
  }
  return null;
}

/**
 * Ensures the native Android Notification Channel with Sound and Vibration is created
 */
export async function ensureNotificationChannel(): Promise<void> {
  try {
    await notifee.createChannel({
      id: 'auto_parts_alerts_v2',
      name: 'Auto Parts Messages & Alerts',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      badge: true,
    });
  } catch (e) {
    console.warn('[FCM] Channel creation error:', e);
  }
}

/**
 * Request notification permissions safely on Android (including Android 13+ POST_NOTIFICATIONS) and iOS
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // 1. Android 13+ runtime permission prompt
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'Auto Parts needs permission to notify you instantly when buyers or sellers message you.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('[FCM] Android 13+ POST_NOTIFICATIONS permission denied');
        }
      } catch (pErr) {
        console.warn('[FCM] POST_NOTIFICATIONS permission error:', pErr);
      }
    }

    // 2. Setup Notifee channel with sound
    await ensureNotificationChannel();

    const msg = getMessagingSafely();
    if (!msg) return false;

    try {
      const authStatus = await msg.requestPermission();
      const messaging = typeof messagingModule === 'function' ? messagingModule : messagingModule?.default;
      const authorizedVal = messaging?.AuthorizationStatus?.AUTHORIZED ?? 1;
      const provisionalVal = messaging?.AuthorizationStatus?.PROVISIONAL ?? 2;
      const enabled =
        authStatus === authorizedVal ||
        authStatus === provisionalVal ||
        authStatus === 1 ||
        authStatus === 2;

      return Boolean(enabled);
    } catch (e) {
      console.warn('[FCM] requestPermission warning:', e);
      return true;
    }
  } catch (error) {
    console.error('[FCM] Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Fetches current FCM Registration Token and saves it to Firestore under the authenticated user's profile
 */
export async function saveFcmTokenToFirestore(userId: string): Promise<string | null> {
  if (!userId) return null;

  try {
    await ensureNotificationChannel();
    await requestNotificationPermission();

    const msg = getMessagingSafely();
    if (!msg) return null;

    try {
      if (!msg.isDeviceRegisteredForRemoteMessages) {
        await msg.registerDeviceForRemoteMessages();
      }
    } catch (regErr) {
      console.warn('[FCM] registerDeviceForRemoteMessages warning:', regErr);
    }

    let token: string | null = null;
    try {
      token = await msg.getToken();
    } catch (tokenErr) {
      console.warn('[FCM] getToken error:', tokenErr);
      return null;
    }

    if (!token) {
      console.warn('[FCM] No token returned from messaging().getToken()');
      return null;
    }

    console.log('[FCM] Generated FCM Token:', token.substring(0, 15) + '...');

    const userRef = db().collection('users').doc(userId);
    await userRef.update({
      fcmToken: token,
      fcmTokenLastUpdated: firestoreModule.FieldValue.serverTimestamp(),
      platform: Platform.OS,
    }).catch(async () => {
      await userRef.set({
        fcmToken: token,
        fcmTokenLastUpdated: firestoreModule.FieldValue.serverTimestamp(),
        platform: Platform.OS,
      }, { merge: true });
    });

    const safeDocId = token.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const tokenRef = db().collection('users').doc(userId).collection('fcmTokens').doc(safeDocId);
    await tokenRef.set({
      token: token,
      createdAt: firestoreModule.FieldValue.serverTimestamp(),
      platform: Platform.OS,
    }, { merge: true }).catch(() => null);

    return token;
  } catch (error) {
    console.error('[FCM] Failed to retrieve or store FCM token:', error);
    return null;
  }
}

/**
 * Removes the FCM token from Firestore when user logs out
 */
export async function removeFcmTokenFromFirestore(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const msg = getMessagingSafely();
    let token: string | null = null;
    if (msg) {
      token = await msg.getToken().catch(() => null);
    }

    if (token) {
      const userRef = db().collection('users').doc(userId);
      await userRef.update({
        fcmToken: null,
        fcmTokenLastUpdated: firestoreModule.FieldValue.serverTimestamp(),
      }).catch(() => null);

      const safeDocId = token.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const tokenRef = db().collection('users').doc(userId).collection('fcmTokens').doc(safeDocId);
      await tokenRef.set({
        revoked: true,
        revokedAt: firestoreModule.FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => null);
    }

    if (msg) {
      await msg.deleteToken().catch(() => null);
    }
    console.log('[FCM] FCM Token removed on logout');
  } catch (error) {
    console.error('[FCM] Error removing FCM token on logout:', error);
  }
}

/**
 * Deep-link / navigation helper based on notification data payload
 */
export function handleNotificationPayload(remoteMessage: any) {
  if (!remoteMessage || !remoteMessage.data) return;

  console.log('[FCM] Handling notification tap data:', remoteMessage.data);
  const { screen, chatRoomId, chatId, partId, sellerId } = remoteMessage.data;

  try {
    const targetChatId = chatRoomId || chatId;
    if ((screen === 'ChatRoom' || targetChatId) && targetChatId) {
      navigate('ChatRoom', { chatId: targetChatId });
    } else if (screen === 'ProductDetail' && partId) {
      navigate('ProductDetail', { partId });
    } else if (screen === 'SellerProfile' && sellerId) {
      navigate('SellerProfile', { sellerId });
    } else if (screen === 'ChatsTab') {
      navigate('MainTabs', { screen: 'ChatsTab' });
    } else if (screen === 'HomeTab') {
      navigate('MainTabs', { screen: 'HomeTab' });
    } else if (screen) {
      navigate(screen, remoteMessage.data);
    }
  } catch (navErr) {
    console.warn('[FCM] Navigation error on notification tap:', navErr);
  }
}

/**
 * Initializes listeners for foreground, background, and initial (terminated) notification taps
 */
export function setupFcmListeners(userId?: string): () => void {
  console.log('[FCM] Setting up FCM listeners with sound support');

  const msg = getMessagingSafely();
  if (!msg) {
    return () => {};
  }

  ensureNotificationChannel();

  const unsubscribeForeground = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS && detail.notification?.data) {
      handleNotificationPayload({ data: detail.notification.data });
    }
  });

  let unsubscribeTokenRefresh = () => {};
  let unsubscribeOnMessage = () => {};
  let unsubscribeOnNotificationOpened = () => {};

  try {
    unsubscribeTokenRefresh = msg.onTokenRefresh(async (newToken: string) => {
      console.log('[FCM] Token refreshed:', newToken.substring(0, 15) + '...');
      if (userId) {
        const userRef = db().collection('users').doc(userId);
        await userRef.update({
          fcmToken: newToken,
          fcmTokenLastUpdated: firestoreModule.FieldValue.serverTimestamp(),
        }).catch(() => null);
      }
    });
  } catch (e) {
    console.warn('[FCM] onTokenRefresh listener error:', e);
  }

  try {
    unsubscribeOnMessage = msg.onMessage(async (remoteMessage: any) => {
      console.log('[FCM] Foreground notification received:', remoteMessage);

      const title = remoteMessage.notification?.title || (remoteMessage.data?.title as string) || 'Auto Parts India';
      const body = remoteMessage.notification?.body || (remoteMessage.data?.body as string) || 'You have a new message';

      try {
        await notifee.displayNotification({
          title,
          body,
          data: remoteMessage.data,
          android: {
            channelId: 'auto_parts_alerts_v2',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            pressAction: {
              id: 'default',
            },
          },
        });
      } catch (err) {
        console.warn('[FCM] notifee display error', err);
      }
    });
  } catch (e) {
    console.warn('[FCM] onMessage listener error:', e);
  }

  try {
    unsubscribeOnNotificationOpened = msg.onNotificationOpenedApp((remoteMessage: any) => {
      console.log('[FCM] Notification opened from background state:', remoteMessage);
      handleNotificationPayload(remoteMessage);
    });
  } catch (e) {
    console.warn('[FCM] onNotificationOpenedApp listener error:', e);
  }

  try {
    msg
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage) {
          console.log('[FCM] App launched from terminated state via notification:', remoteMessage);
          setTimeout(() => {
            handleNotificationPayload(remoteMessage);
          }, 800);
        }
      })
      .catch((err: any) => console.warn('[FCM] Error checking initial notification:', err));
  } catch (e) {
    console.warn('[FCM] getInitialNotification error:', e);
  }

  return () => {
    console.log('[FCM] Cleaning up FCM listeners');
    try { unsubscribeTokenRefresh(); } catch (_) {}
    try { unsubscribeOnMessage(); } catch (_) {}
    try { unsubscribeOnNotificationOpened(); } catch (_) {}
    try { unsubscribeForeground(); } catch (_) {}
  };
}
