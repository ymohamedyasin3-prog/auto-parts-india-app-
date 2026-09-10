import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseFirestore, getCurrentUser } from './firebase';

const READ_ANNOUNCEMENTS_STORAGE_KEY = '@autoparts_read_announcements';
const HIDDEN_CHATS_STORAGE_KEY = '@autoparts_hidden_chats';
const DELETED_ANNOUNCEMENTS_STORAGE_KEY = '@autoparts_deleted_announcements';
const DELETED_NOTIFICATIONS_STORAGE_KEY = '@autoparts_deleted_notifications';

// In-Memory fast synchronous caches
let memoryHiddenChats: Set<string> | null = null;
let memoryReadAnnouncements: Set<string> | null = null;
let memoryDeletedNotifications: Set<string> | null = null;
let memoryDeletedAnnouncements: Set<string> | null = null;

/**
 * Gets all hidden chat IDs with fast synchronous memory cache
 */
export function getSyncLocalHiddenChatIds(): Set<string> {
  if (memoryHiddenChats) return memoryHiddenChats;
  memoryHiddenChats = new Set<string>();
  AsyncStorage.getItem(HIDDEN_CHATS_STORAGE_KEY).then((raw) => {
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) memoryHiddenChats = new Set<string>(arr);
      } catch (_) {}
    }
  }).catch(() => {});
  return memoryHiddenChats;
}

export async function getLocalHiddenChatIds(): Promise<Set<string>> {
  return getSyncLocalHiddenChatIds();
}

/**
 * Gets all announcement IDs that have been read by the current device/user
 */
export function getSyncLocalReadAnnouncementIds(): Set<string> {
  if (memoryReadAnnouncements) return memoryReadAnnouncements;
  memoryReadAnnouncements = new Set<string>();
  AsyncStorage.getItem(READ_ANNOUNCEMENTS_STORAGE_KEY).then((raw) => {
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) memoryReadAnnouncements = new Set<string>(arr);
      } catch (_) {}
    }
  }).catch(() => {});
  return memoryReadAnnouncements;
}

export async function getLocalReadAnnouncementIds(): Promise<Set<string>> {
  return getSyncLocalReadAnnouncementIds();
}

/**
 * Gets all personal notification IDs that have been deleted
 */
export function getSyncLocalDeletedNotificationIds(): Set<string> {
  if (memoryDeletedNotifications) return memoryDeletedNotifications;
  memoryDeletedNotifications = new Set<string>();
  AsyncStorage.getItem(DELETED_NOTIFICATIONS_STORAGE_KEY).then((raw) => {
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) memoryDeletedNotifications = new Set<string>(arr);
      } catch (_) {}
    }
  }).catch(() => {});
  return memoryDeletedNotifications;
}

export async function getLocalDeletedNotificationIds(): Promise<Set<string>> {
  return getSyncLocalDeletedNotificationIds();
}

/**
 * Gets all announcement IDs that have been dismissed/deleted
 */
export function getSyncLocalDeletedAnnouncementIds(): Set<string> {
  if (memoryDeletedAnnouncements) return memoryDeletedAnnouncements;
  memoryDeletedAnnouncements = new Set<string>();
  AsyncStorage.getItem(DELETED_ANNOUNCEMENTS_STORAGE_KEY).then((raw) => {
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) memoryDeletedAnnouncements = new Set<string>(arr);
      } catch (_) {}
    }
  }).catch(() => {});
  return memoryDeletedAnnouncements;
}

export async function getLocalDeletedAnnouncementIds(): Promise<Set<string>> {
  return getSyncLocalDeletedAnnouncementIds();
}

/**
 * Marks announcement IDs as read locally and in Firestore
 */
export async function markAnnouncementsAsRead(announcementIds: string[]): Promise<void> {
  if (!announcementIds || announcementIds.length === 0) return;
  try {
    const existingSet = getSyncLocalReadAnnouncementIds();
    announcementIds.forEach((id) => {
      if (id) existingSet.add(id);
    });
    AsyncStorage.setItem(
      READ_ANNOUNCEMENTS_STORAGE_KEY,
      JSON.stringify(Array.from(existingSet))
    ).catch(() => {});

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
 * Adds a notification ID to local deleted list
 */
export async function addLocalDeletedNotificationId(id: string): Promise<void> {
  if (!id) return;
  try {
    const set = getSyncLocalDeletedNotificationIds();
    set.add(id);
    AsyncStorage.setItem(DELETED_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(Array.from(set))).catch(() => {});
  } catch (err) {
    console.warn('[notifications] Error saving local deleted notification:', err);
  }
}

/**
 * Adds multiple notification IDs to local deleted list
 */
export async function addLocalDeletedNotificationIds(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  try {
    const set = getSyncLocalDeletedNotificationIds();
    ids.forEach((id) => { if (id) set.add(id); });
    AsyncStorage.setItem(DELETED_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(Array.from(set))).catch(() => {});
  } catch (err) {
    console.warn('[notifications] Error saving local deleted notifications:', err);
  }
}

/**
 * Deletes or dismisses an announcement for current user locally and in user preferences / backend
 */
export async function deleteAnnouncementForUser(announcementId: string): Promise<void> {
  if (!announcementId) return;
  try {
    const existingSet = await getLocalDeletedAnnouncementIds();
    existingSet.add(announcementId);
    await AsyncStorage.setItem(
      DELETED_ANNOUNCEMENTS_STORAGE_KEY,
      JSON.stringify(Array.from(existingSet))
    );

    const user = getCurrentUser();
    const uid = user?.uid || user?.id;
    const db = getFirebaseFirestore();

    if (db && typeof db.collection === 'function') {
      const userEmail = (user?.email || '').toLowerCase();
      const isAdminUser =
        user?.isAdmin === true ||
        user?.role === 'admin' ||
        userEmail === 'www.allahforgiveness877@gmail.com' ||
        userEmail === 'wwwautoparts2@gmail.com' ||
        userEmail === 'ym1950394@gmail.com';

      // If admin, delete the announcement directly from the backend announcements collection
      if (isAdminUser) {
        await db.collection('announcements').doc(announcementId).delete().catch(() => {});
      }

      // Record deletion in user's backend profile
      if (uid) {
        await db
          .collection('users')
          .doc(uid)
          .collection('deleted_announcements')
          .doc(announcementId)
          .set({ deletedAt: Date.now(), id: announcementId }, { merge: true })
          .catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[notifications] Error deleting announcement for user:', err);
  }
}

/**
 * Deletes or dismisses multiple announcements for current user locally and in backend
 */
export async function deleteMultipleAnnouncementsForUser(announcementIds: string[]): Promise<void> {
  if (!announcementIds || announcementIds.length === 0) return;
  try {
    const existingSet = await getLocalDeletedAnnouncementIds();
    announcementIds.forEach((id) => {
      if (id) existingSet.add(id);
    });
    await AsyncStorage.setItem(
      DELETED_ANNOUNCEMENTS_STORAGE_KEY,
      JSON.stringify(Array.from(existingSet))
    );

    const user = getCurrentUser();
    const uid = user?.uid || user?.id;
    const db = getFirebaseFirestore();

    if (db && typeof db.collection === 'function') {
      const userEmail = (user?.email || '').toLowerCase();
      const isAdminUser =
        user?.isAdmin === true ||
        user?.role === 'admin' ||
        userEmail === 'www.allahforgiveness877@gmail.com' ||
        userEmail === 'wwwautoparts2@gmail.com' ||
        userEmail === 'ym1950394@gmail.com';

      const promises = announcementIds.map(async (annId) => {
        if (!annId) return;
        if (isAdminUser) {
          await db.collection('announcements').doc(annId).delete().catch(() => {});
        }
        if (uid) {
          await db
            .collection('users')
            .doc(uid)
            .collection('deleted_announcements')
            .doc(annId)
            .set({ deletedAt: Date.now(), id: annId }, { merge: true })
            .catch(() => {});
        }
      });
      await Promise.all(promises);
    }
  } catch (err) {
    console.warn('[notifications] Error deleting multiple announcements for user:', err);
  }
}

/**
 * Deletes all personal notifications for a recipient from Firestore backend and local storage
 */
export async function deleteAllPersonalNotifications(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const db = getFirebaseFirestore();
    if (db && typeof db.collection === 'function') {
      // 1. Query by recipientId
      const snapRecipient = await db
        .collection('notifications')
        .where('recipientId', '==', userId)
        .get();

      // 2. Query by userId
      const snapUser = await db
        .collection('notifications')
        .where('userId', '==', userId)
        .get();

      const docIds: string[] = [];
      const docsToDelete: any[] = [];

      if (snapRecipient && snapRecipient.docs) {
        snapRecipient.docs.forEach((d: any) => {
          docIds.push(d.id);
          docsToDelete.push(d);
        });
      }
      if (snapUser && snapUser.docs) {
        snapUser.docs.forEach((d: any) => {
          if (!docIds.includes(d.id)) {
            docIds.push(d.id);
            docsToDelete.push(d);
          }
        });
      }

      await addLocalDeletedNotificationIds(docIds);

      // Delete from backend Firestore collection
      const deletePromises = docsToDelete.map((docSnap: any) =>
        docSnap.ref
          ? docSnap.ref.delete().catch(() => {})
          : db.collection('notifications').doc(docSnap.id).delete().catch(() => {})
      );

      // Record in backend user collection
      const userRecordPromises = docIds.map((id) =>
        db
          .collection('users')
          .doc(userId)
          .collection('deleted_notifications')
          .doc(id)
          .set({ deletedAt: Date.now(), id }, { merge: true })
          .catch(() => {})
      );

      await Promise.all([...deletePromises, ...userRecordPromises]);
    }
  } catch (e) {
    console.warn('[notifications] Error deleting all personal notifications:', e);
  }
}

/**
 * Deletes a notification from Firestore backend and local storage
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    await addLocalDeletedNotificationId(notificationId);
    const db = getFirebaseFirestore();
    const user = getCurrentUser();
    const uid = user?.uid || user?.id;

    if (db && typeof db.collection === 'function') {
      // 1. Delete directly from backend 'notifications' collection
      await db.collection('notifications').doc(notificationId).delete().catch(() => {});

      // 2. If it's a chat inquiry id, also check if underlying document exists in notifications
      if (notificationId.startsWith('chat_inq_')) {
        const rawChatId = notificationId.replace('chat_inq_', '');
        await db.collection('notifications').doc(rawChatId).delete().catch(() => {});
      }

      // 3. Persist in backend under user's deleted_notifications subcollection
      if (uid) {
        await db
          .collection('users')
          .doc(uid)
          .collection('deleted_notifications')
          .doc(notificationId)
          .set({ deletedAt: Date.now(), id: notificationId }, { merge: true })
          .catch(() => {});
      }
    }
  } catch (e) {
    console.warn('[notifications] Error deleting notification from backend:', e);
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

// Singleton Store for Real-time Unread Counts
type UnreadCountsResult = {
  unreadChats: number;
  unreadNotifications: number;
  totalUnread: number;
  latestNotification?: any;
};

let activeSingletonUserId: string | null = null;
let activeSubscribers = new Set<(counts: UnreadCountsResult) => void>();
let activeSingletonUnsub: (() => void) | null = null;
let cachedUnreadResult: UnreadCountsResult = { unreadChats: 0, unreadNotifications: 0, totalUnread: 0 };
let emitDebounceTimer: any = null;

function notifySubscribers() {
  if (emitDebounceTimer) clearTimeout(emitDebounceTimer);
  emitDebounceTimer = setTimeout(() => {
    activeSubscribers.forEach((cb) => {
      try { cb(cachedUnreadResult); } catch (_) {}
    });
  }, 50);
}

function startSingletonListener(userId: string): () => void {
  let unreadChatCount = 0;
  let unreadNotifCount = 0;
  let unreadAnnounceCount = 0;
  let latestNotifItem: any = null;

  let unsubChats = () => {};
  let unsubNotifs = () => {};
  let unsubAnnouncements = () => {};

  const db = getFirebaseFirestore();
  if (!db || typeof db.collection !== 'function') {
    return () => {};
  }

  const updateAndEmit = () => {
    const totalNotifs = unreadNotifCount + unreadAnnounceCount;
    cachedUnreadResult = {
      unreadChats: unreadChatCount,
      unreadNotifications: totalNotifs,
      totalUnread: unreadChatCount + totalNotifs,
      latestNotification: latestNotifItem,
    };
    notifySubscribers();
  };

  try {
    // 1. Single query for chats using participants array-contains
    unsubChats = db.collection('chats').where('participants', 'array-contains', userId).onSnapshot(
      (snapshot: any) => {
        try {
          const chatsMap = new Map<string, any>();
          const hiddenChatSet = getSyncLocalHiddenChatIds();

          if (snapshot && typeof snapshot.forEach === 'function') {
            snapshot.forEach((doc: any) => {
              const docId = doc.id;
              const data = doc.data ? doc.data() : doc;
              if (!docId || !data) return;
              if (hiddenChatSet.has(docId)) return;
              if (Array.isArray(data.hiddenFor) && data.hiddenFor.includes(userId)) return;
              chatsMap.set(docId, data);
            });
          }

          let count = 0;
          chatsMap.forEach((data) => {
            const unreadFromMap = typeof data?.unreadCount?.[userId] === 'number' 
              ? data.unreadCount[userId] 
              : 0;
            const hasUnreadFlag = data && data.lastSenderId && data.lastSenderId !== userId && data.unread === true;

            if (unreadFromMap > 0 || hasUnreadFlag) {
              count += Math.max(unreadFromMap, 1);
            }
          });
          unreadChatCount = count;
        } catch (_) {
          unreadChatCount = 0;
        }
        updateAndEmit();
      },
      () => {
        unreadChatCount = 0;
        updateAndEmit();
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
          try {
            const deletedNotifSet = getSyncLocalDeletedNotificationIds();
            if (snapshot && typeof snapshot.forEach === 'function') {
              snapshot.forEach((doc: any) => {
                const docId = doc.id;
                const data = { id: docId, ...(doc.data ? doc.data() : doc) };
                if (docId && deletedNotifSet.has(docId)) return;
                if (data?.deleted || (Array.isArray(data?.deletedFor) && data.deletedFor.includes(userId))) return;
                count += 1;
                if (!newest || (data.createdAt && data.createdAt > (newest.createdAt || 0))) {
                  newest = data;
                }
              });
            }
          } catch (_) {}
          unreadNotifCount = count;
          latestNotifItem = newest;
          updateAndEmit();
        },
        () => {
          unreadNotifCount = 0;
          updateAndEmit();
        }
      );

    // 3. Listen to announcements
    unsubAnnouncements = db
      .collection('announcements')
      .limit(10)
      .onSnapshot(
        (snapshot: any) => {
          try {
            const readSet = getSyncLocalReadAnnouncementIds();
            const deletedSet = getSyncLocalDeletedAnnouncementIds();
            let count = 0;
            if (snapshot && typeof snapshot.forEach === 'function') {
              snapshot.forEach((doc: any) => {
                const docId = doc.id;
                if (docId && !readSet.has(docId) && !deletedSet.has(docId)) {
                  count += 1;
                }
              });
            }
            unreadAnnounceCount = count;
          } catch (_) {
            unreadAnnounceCount = 0;
          }
          updateAndEmit();
        },
        () => {
          unreadAnnounceCount = 0;
          updateAndEmit();
        }
      );
  } catch (err) {
    console.warn('[notifications] Error in startSingletonListener:', err);
  }

  return () => {
    try { unsubChats(); } catch (_) {}
    try { unsubNotifs(); } catch (_) {}
    try { unsubAnnouncements(); } catch (_) {}
  };
}

/**
 * Subscribes to real-time unread counts for Chats and General Notifications
 */
export function subscribeToUserUnreadCounts(
  userId: string | null | undefined,
  callback: (counts: UnreadCountsResult) => void
): () => void {
  if (!userId) {
    callback({ unreadChats: 0, unreadNotifications: 0, totalUnread: 0 });
    return () => {};
  }

  // Teardown previous user singleton if logged-in user changed
  if (activeSingletonUserId !== userId) {
    if (activeSingletonUnsub) {
      try { activeSingletonUnsub(); } catch (_) {}
      activeSingletonUnsub = null;
    }
    activeSubscribers.clear();
    activeSingletonUserId = userId;
    cachedUnreadResult = { unreadChats: 0, unreadNotifications: 0, totalUnread: 0 };
  }

  activeSubscribers.add(callback);
  // Send immediate cached result
  callback(cachedUnreadResult);

  if (!activeSingletonUnsub) {
    activeSingletonUnsub = startSingletonListener(userId);
  }

  return () => {
    activeSubscribers.delete(callback);
    if (activeSubscribers.size === 0) {
      if (activeSingletonUnsub) {
        try { activeSingletonUnsub(); } catch (_) {}
        activeSingletonUnsub = null;
      }
      activeSingletonUserId = null;
    }
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
