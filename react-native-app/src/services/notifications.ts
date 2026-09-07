import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseFirestore, getCurrentUser } from './firebase';

const READ_ANNOUNCEMENTS_STORAGE_KEY = '@autoparts_read_announcements';

/**
 * Gets all announcement IDs that have been read by the current device/user
 */
export async function getLocalReadAnnouncementIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_ANNOUNCEMENTS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set<string>(arr);
      }
    }
  } catch (err) {
    console.warn('[notifications] Error reading local read announcements:', err);
  }
  return new Set<string>();
}

/**
 * Marks announcement IDs as read locally and in Firestore
 */
export async function markAnnouncementsAsRead(announcementIds: string[]): Promise<void> {
  if (!announcementIds || announcementIds.length === 0) return;
  try {
    const existingSet = await getLocalReadAnnouncementIds();
    announcementIds.forEach((id) => {
      if (id) existingSet.add(id);
    });
    await AsyncStorage.setItem(
      READ_ANNOUNCEMENTS_STORAGE_KEY,
      JSON.stringify(Array.from(existingSet))
    );

    // Sync to user document in Firestore if logged in
    const user = getCurrentUser();
    const uid = user?.uid || user?.id;
    if (uid) {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        const batchPromises = announcementIds.map((id) =>
          db
            .collection('users')
            .doc(uid)
            .collection('read_announcements')
            .doc(id)
            .set({ readAt: Date.now() }, { merge: true })
            .catch(() => {})
        );
        await Promise.all(batchPromises);
      }
    }
  } catch (err) {
    console.warn('[notifications] Error marking announcements as read:', err);
  }
}

/**
 * Sends a real-time chat notification document to Firestore and triggers push
 */
export async function sendChatMessageNotification(params: {
  chatId: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  partId?: string;
  partTitle?: string;
  partPrice?: number;
  partImageUrl?: string;
  buyerId?: string;
  buyerName?: string;
  sellerId?: string;
  sellerName?: string;
}): Promise<void> {
  const {
    chatId,
    recipientId,
    senderId,
    senderName,
    senderPhoto,
    text,
    partId,
    partTitle,
    partPrice,
    partImageUrl,
    buyerId,
    buyerName,
    sellerId,
    sellerName,
  } = params;

  if (!chatId || !recipientId || !senderId) return;

  const now = Date.now();
  const notificationId = `${chatId}_${recipientId}`;

  // 1. Save directly into Firestore notifications collection for the recipient
  try {
    const db = getFirebaseFirestore();
    if (db && typeof db.collection === 'function') {
      await db.collection('notifications').doc(notificationId).set({
        id: notificationId,
        chatId,
        recipientId,
        senderId,
        senderName: senderName || 'User',
        senderPhoto: senderPhoto || '',
        text: text || 'Sent a message',
        createdAt: now,
        read: false,
        type: 'chat_message',
        partId: partId || '',
        partTitle: partTitle || 'Spare Part',
        partPrice: Number(partPrice) || 0,
        partImageUrl: partImageUrl || '',
        buyerId: buyerId || '',
        buyerName: buyerName || '',
        sellerId: sellerId || '',
        sellerName: sellerName || '',
      }, { merge: true });
    }
  } catch (e) {
    console.warn('[notifications] Error saving chat notification to Firestore:', e);
  }

  // 2. Trigger server-side push notification
  try {
    const endpoints = [
      typeof window !== 'undefined' && window.location?.origin ? `${window.location.origin}/api/notifications/send` : null,
      'https://ais-pre-4dp4t7tqjoefwoiuc4pb6b-572875732715.asia-southeast1.run.app/api/notifications/send',
      'https://ais-dev-4dp4t7tqjoefwoiuc4pb6b-572875732715.asia-southeast1.run.app/api/notifications/send'
    ].filter(Boolean) as string[];

    const targetUrl = endpoints[0];

    fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId,
        senderName,
        receiverId: recipientId,
        text,
        chatId,
        partTitle,
        partImageUrl,
      })
    }).catch(() => {
      // Fallback try preview/dev url
      if (endpoints[1]) {
        fetch(endpoints[1], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId,
            senderName,
            receiverId: recipientId,
            text,
            chatId,
            partTitle,
            partImageUrl,
          })
        }).catch(() => {});
      }
    });
  } catch (_) {}
}

/**
 * Marks a specific notification as read in Firestore
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    const db = getFirebaseFirestore();
    if (db && typeof db.collection === 'function') {
      await db.collection('notifications').doc(notificationId).update({
        read: true,
        readAt: Date.now(),
      });
    }
  } catch (e) {
    console.warn('[notifications] Error marking notification as read:', e);
  }
}

/**
 * Marks all notifications for a user as read
 */
export async function markAllUserNotificationsAsRead(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const db = getFirebaseFirestore();
    if (db && typeof db.collection === 'function') {
      const snap = await db.collection('notifications')
        .where('recipientId', '==', userId)
        .where('read', '==', false)
        .get();

      if (snap && snap.docs) {
        const promises = snap.docs.map((docSnap: any) =>
          docSnap.ref.update({ read: true, readAt: Date.now() }).catch(() => {})
        );
        await Promise.all(promises);
      }
    }
  } catch (e) {
    console.warn('[notifications] Error marking all notifications as read:', e);
  }
}

/**
 * Subscribes to real-time unread counts for Chats and General Notifications
 */
export function subscribeToUserUnreadCounts(
  userId: string | null | undefined,
  callback: (counts: {
    unreadChats: number;
    unreadNotifications: number;
    totalUnread: number;
    latestNotification?: any;
  }) => void
): () => void {
  if (!userId) {
    callback({ unreadChats: 0, unreadNotifications: 0, totalUnread: 0 });
    return () => {};
  }

  let isMounted = true;
  let unreadChatCount = 0;
  let unreadNotifCount = 0;
  let unreadAnnounceCount = 0;
  let latestNotifItem: any = null;

  let unsubChats = () => {};
  let unsubNotifs = () => {};
  let unsubAnnouncements = () => {};

  const emit = () => {
    if (!isMounted) return;
    const totalNotifs = unreadNotifCount + unreadAnnounceCount;
    callback({
      unreadChats: unreadChatCount,
      unreadNotifications: totalNotifs,
      totalUnread: unreadChatCount + totalNotifs,
      latestNotification: latestNotifItem,
    });
  };

  try {
    const db = getFirebaseFirestore();
    if (!db || typeof db.collection !== 'function') {
      callback({ unreadChats: 0, unreadNotifications: 0, totalUnread: 0 });
      return () => {};
    }

    // 1. Listen to unread chats
    unsubChats = db
      .collection('chats')
      .where('participants', 'array-contains', userId)
      .onSnapshot(
        (snapshot: any) => {
          let count = 0;
          if (snapshot && typeof snapshot.forEach === 'function') {
            snapshot.forEach((doc: any) => {
              const data = doc.data ? doc.data() : doc;
              if (
                data &&
                data.lastSenderId &&
                data.lastSenderId !== userId &&
                data.unread === true
              ) {
                count += 1;
              }
            });
          }
          unreadChatCount = count;
          emit();
        },
        () => {
          unreadChatCount = 0;
          emit();
        }
      );

    // 2. Listen to unread personal notifications
    unsubNotifs = db
      .collection('notifications')
      .where('recipientId', '==', userId)
      .where('read', '==', false)
      .onSnapshot(
        (snapshot: any) => {
          let count = 0;
          let newest: any = null;
          if (snapshot && typeof snapshot.forEach === 'function') {
            snapshot.forEach((doc: any) => {
              const data = { id: doc.id, ...(doc.data ? doc.data() : doc) };
              count += 1;
              if (!newest || (data.createdAt && data.createdAt > (newest.createdAt || 0))) {
                newest = data;
              }
            });
          }
          unreadNotifCount = count;
          latestNotifItem = newest;
          emit();
        },
        () => {
          unreadNotifCount = 0;
          emit();
        }
      );

    // 3. Listen to announcements
    unsubAnnouncements = db
      .collection('announcements')
      .limit(20)
      .onSnapshot(
        async (snapshot: any) => {
          try {
            const readSet = await getLocalReadAnnouncementIds();
            let count = 0;
            if (snapshot && typeof snapshot.forEach === 'function') {
              snapshot.forEach((doc: any) => {
                const docId = doc.id;
                if (docId && !readSet.has(docId)) {
                  count += 1;
                }
              });
            }
            unreadAnnounceCount = count;
            emit();
          } catch (_) {
            unreadAnnounceCount = 0;
            emit();
          }
        },
        () => {
          unreadAnnounceCount = 0;
          emit();
        }
      );
  } catch (err) {
    console.warn('[notifications] Error in subscribeToUserUnreadCounts:', err);
    callback({ unreadChats: 0, unreadNotifications: 0, totalUnread: 0 });
  }

  return () => {
    isMounted = false;
    try { unsubChats(); } catch (_) {}
    try { unsubNotifs(); } catch (_) {}
    try { unsubAnnouncements(); } catch (_) {}
  };
}

/**
 * Subscribes to announcements and computes real unread notification count
 */
export function subscribeToUnreadNotificationCount(
  callback: (unreadCount: number) => void
): () => void {
  const user = getCurrentUser();
  const uid = user?.uid || user?.id;

  return subscribeToUserUnreadCounts(uid, (res) => {
    callback(res.totalUnread);
  });
}
