import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { Text, Surface, ActivityIndicator, Icon } from 'react-native-paper';
import { NotificationListSkeleton } from '../components/SkeletonLoaders';
import { getFirebaseFirestore, getCurrentUser, getFirebaseAuth } from '../services/firebase';
import { 
  markAnnouncementsAsRead, 
  markNotificationAsRead, 
  markAllUserNotificationsAsRead,
  deleteNotification,
  deleteAnnouncementForUser,
  deleteMultipleAnnouncementsForUser,
  deleteAllPersonalNotifications,
  getLocalReadAnnouncementIds,
  getLocalDeletedAnnouncementIds,
  getLocalDeletedNotificationIds
} from '../services/notifications';

export default function NotificationsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'chats' | 'announcements'>('chats');
  const [personalNotifs, setPersonalNotifs] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(getCurrentUser());
  
  useEffect(() => {
    let unsubAuth = () => {};
    try {
      const auth = getFirebaseAuth();
      if (auth && typeof auth.onAuthStateChanged === 'function') {
        unsubAuth = auth.onAuthStateChanged((u: any) => {
          setCurrentUser(u || getCurrentUser());
        });
      }
    } catch (_) {}
    return () => {
      try { unsubAuth(); } catch (_) {}
    };
  }, []);

  const currentUid = currentUser?.uid || currentUser?.id;

  const fetchNotifications = () => {
    try {
      const db = getFirebaseFirestore();
      if (!db || typeof db.collection !== 'function') {
        setLoading(false);
        setRefreshing(false);
        return () => {};
      }

      // 1. Fetch personal chat/inquiry notifications & real-time chat inquiries
      let unsubNotifs = () => {};
      let unsubChats = () => {};

      if (currentUid) {
        const notifQuery = db
          .collection('notifications')
          .where('recipientId', '==', currentUid);

        const handleNotifSnapshot = async (snapshot: any) => {
          const list: any[] = [];
          const deletedNotifSet = await getLocalDeletedNotificationIds();
          if (snapshot && typeof snapshot.forEach === 'function') {
            snapshot.forEach((doc: any) => {
              const docId = doc.id;
              const data = doc.data ? doc.data() : doc;
              if (docId && deletedNotifSet.has(docId)) return;
              if (data?.deleted || (Array.isArray(data?.deletedFor) && data.deletedFor.includes(currentUid))) return;
              list.push({ id: docId, ...data });
            });
          }

          // Also check active chat inquiries where user has unread messages
          try {
            const chatSnapshots = await db
              .collection('chats')
              .where('participants', 'array-contains', currentUid)
              .get();

            if (chatSnapshots && typeof chatSnapshots.forEach === 'function') {
              chatSnapshots.forEach((cDoc: any) => {
                const cData = cDoc.data ? cDoc.data() : cDoc;
                const cId = cDoc.id;
                // If this chat has unread message from partner and not yet in list
                const unreadForMe = (typeof cData?.unreadCount?.[currentUid] === 'number' && cData.unreadCount[currentUid] > 0) ||
                                    (cData?.lastSenderId && cData.lastSenderId !== currentUid && cData.unread === true);
                
                const alreadyInNotifs = list.some((n) => n.chatId === cId || n.id === cId);
                if (!alreadyInNotifs && (unreadForMe || cData?.lastMessageText)) {
                  const partnerName = cData?.buyerId === currentUid ? (cData?.sellerName || 'Seller') : (cData?.buyerName || 'Buyer');
                  list.push({
                    id: `chat_inq_${cId}`,
                    chatId: cId,
                    type: 'chat_message',
                    senderId: cData?.lastSenderId || '',
                    senderName: partnerName,
                    text: cData?.lastMessageText || 'New message in chat',
                    partId: cData?.partId || '',
                    partTitle: cData?.partTitle || 'Auto Spare Part',
                    partPrice: cData?.partPrice || 0,
                    partImageUrl: cData?.partImageUrl || '',
                    buyerId: cData?.buyerId,
                    buyerName: cData?.buyerName,
                    sellerId: cData?.sellerId,
                    sellerName: cData?.sellerName,
                    read: !unreadForMe,
                    createdAt: cData?.lastMessageAt || cData?.updatedAt || Date.now(),
                  });
                }
              });
            }
          } catch (_) {}

          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setPersonalNotifs(list);
          setLoading(false);
          setRefreshing(false);
        };

        try {
          unsubNotifs = notifQuery.onSnapshot(
            handleNotifSnapshot,
            (err: any) => {
              console.warn('[NotificationsScreen] Personal notifs snapshot error:', err);
              // Fallback to plain get if snapshot failed
              notifQuery.get().then(handleNotifSnapshot).catch(() => {});
              setLoading(false);
              setRefreshing(false);
            }
          );
        } catch (e) {
          console.warn('[NotificationsScreen] onSnapshot exception:', e);
        }
      } else {
        setPersonalNotifs([]);
        setLoading(false);
      }

      // 2. Fetch platform announcements
      const unsubAnnounce = db
        .collection('announcements')
        .orderBy('createdAt', 'desc')
        .limit(30)
        .onSnapshot(
          async (snapshot: any) => {
            const list: any[] = [];
            const readSet = await getLocalReadAnnouncementIds();
            const deletedSet = await getLocalDeletedAnnouncementIds();
            if (snapshot && typeof snapshot.forEach === 'function') {
              snapshot.forEach((doc: any) => {
                const docId = doc.id;
                // Skip if deleted/dismissed by this user
                if (docId && deletedSet.has(docId)) {
                  return;
                }
                const data = doc.data ? doc.data() : doc;
                const isRead = readSet.has(docId);
                list.push({ 
                  id: docId, 
                  ...data, 
                  type: 'announcement', 
                  read: isRead 
                });
              });
            }
            setAnnouncements(list);
            setLoading(false);
            setRefreshing(false);
          },
          (err: any) => {
            console.warn('[NotificationsScreen] Announcements snapshot error:', err);
            setLoading(false);
            setRefreshing(false);
          }
        );

      return () => {
        try { unsubNotifs(); } catch (_) {}
        try { unsubAnnounce(); } catch (_) {}
      };
    } catch (e) {
      console.warn('[NotificationsScreen] Fetch error:', e);
      setLoading(false);
      setRefreshing(false);
      return () => {};
    }
  };

  useEffect(() => {
    const unsub = fetchNotifications();
    return () => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch (_) {}
    };
  }, [currentUid]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    if (activeTab === 'chats' && currentUid) {
      await markAllUserNotificationsAsRead(currentUid);
      setPersonalNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } else if (activeTab === 'announcements') {
      const annIds = announcements.map((a) => a.id).filter(Boolean);
      if (annIds.length > 0) {
        await markAnnouncementsAsRead(annIds);
        setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })));
      }
    }
  };

  const handleDeleteAllNotifications = () => {
    const isChat = activeTab === 'chats';
    const count = isChat ? personalNotifs.length : announcements.length;
    if (count === 0) return;

    Alert.alert(
      'Clear All Notifications',
      `Are you sure you want to delete all ${count} ${isChat ? 'chat notifications' : 'broadcasts'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            if (isChat) {
              setPersonalNotifs([]);
              if (currentUid) {
                await deleteAllPersonalNotifications(currentUid);
              }
            } else {
              const allIds = announcements.map((a) => a.id).filter(Boolean);
              setAnnouncements([]);
              if (allIds.length > 0) {
                await deleteMultipleAnnouncementsForUser(allIds);
              }
            }
          },
        },
      ]
    );
  };

  const handleDeleteNotification = (item: any) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to remove this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // If item belongs to personal notifications tab or is in notifications collection
            if (activeTab === 'chats' || item.type !== 'announcement') {
              setPersonalNotifs((prev) => prev.filter((n) => n.id !== item.id));
              await deleteNotification(item.id);
            } else {
              setAnnouncements((prev) => prev.filter((a) => a.id !== item.id));
              await deleteAnnouncementForUser(item.id);
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = (item: any) => {
    if (item.type === 'chat_message' || item.chatId) {
      // Mark as read
      markNotificationAsRead(item.id);
      setPersonalNotifs((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      // Navigate to chat room
      navigation.navigate('ChatRoom', {
        chatId: item.chatId,
        part: {
          id: item.partId,
          title: item.partTitle,
          imageUrl: item.partImageUrl,
          price: item.partPrice,
          sellerId: item.sellerId,
          sellerName: item.sellerName,
        },
        chat: {
          id: item.chatId,
          partId: item.partId,
          partTitle: item.partTitle,
          partImageUrl: item.partImageUrl,
          partPrice: item.partPrice,
          buyerId: item.buyerId,
          buyerName: item.buyerName,
          sellerId: item.sellerId,
          sellerName: item.sellerName,
        }
      });
    } else if (item.type === 'new_follower' || item.followerId || (item.senderId && !item.chatId)) {
      // Mark follow notification as read
      markNotificationAsRead(item.id);
      setPersonalNotifs((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      const targetUserId = item.followerId || item.senderId;
      if (targetUserId) {
        navigation.navigate('SellerProfile', {
          sellerId: targetUserId,
          sellerName: item.followerName || item.senderName || 'User',
        });
      }
    } else {
      // Mark announcement as read on tap
      markAnnouncementsAsRead([item.id]);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, read: true } : a))
      );
    }
  };

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Recently';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Filter items based on selected tab ('chats' or 'announcements')
  const currentList = React.useMemo(() => {
    let list: any[] = [];
    if (activeTab === 'chats') {
      list = [...personalNotifs];
    } else {
      list = [...announcements];
    }
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [activeTab, personalNotifs, announcements]);

  const unreadCurrentTab = React.useMemo(() => {
    if (activeTab === 'chats') {
      return personalNotifs.filter((n) => !n.read).length;
    }
    return announcements.filter((a) => !a.read).length;
  }, [activeTab, personalNotifs, announcements]);

  const renderItem = ({ item }: { item: any }) => {
    const isFollow = item.type === 'new_follower' || item.type === 'follow';
    const isChat = item.type === 'chat_message' || Boolean(item.chatId);
    const isUnread = item.read === false;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleNotificationPress(item)}
      >
        <Surface style={[styles.card, isUnread && styles.cardUnread]} elevation={1}>
          <View style={styles.cardHeader}>
            {/* Left Icon or Product Thumbnail or Follower Avatar */}
            {isChat && item.partImageUrl ? (
              <Image source={{ uri: item.partImageUrl }} style={styles.productThumb} />
            ) : isFollow && (item.senderPhoto || item.followerPhoto) ? (
              <Image source={{ uri: item.senderPhoto || item.followerPhoto }} style={styles.productThumb} />
            ) : (
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isFollow
                      ? 'rgba(16, 185, 129, 0.15)'
                      : isChat
                      ? 'rgba(0, 102, 255, 0.12)'
                      : 'rgba(59, 130, 246, 0.12)',
                  },
                ]}
              >
                <Icon
                  source={
                    isFollow
                      ? 'account-plus'
                      : isChat
                      ? 'comment-text-outline'
                      : 'bullhorn-variant-outline'
                  }
                  size={22}
                  color={isFollow ? '#10B981' : isChat ? '#0066FF' : '#38BDF8'}
                />
              </View>
            )}

            <View style={styles.headerInfo}>
              <View style={styles.titleRow}>
                <Text variant="titleSmall" style={[styles.annTitle, isUnread && styles.annTitleBold]} numberOfLines={1}>
                  {isFollow
                    ? item.senderName || item.followerName || 'New Follower'
                    : isChat
                    ? item.senderName || 'New Inquiry'
                    : item.title || 'Platform Announcement'}
                </Text>
                <View style={styles.timeBadgeContainer}>
                  {isUnread && <View style={styles.unreadDot} />}
                  <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
                  
                  {/* Delete / Remove Action */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteNotification(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon source="trash-can-outline" size={17} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>

              {isFollow ? (
                <Text style={styles.followerSubText} numberOfLines={1}>
                  ✨ Started following you
                </Text>
              ) : isChat && item.partTitle ? (
                <Text style={styles.partTitleSub} numberOfLines={1}>
                  🚗 {item.partTitle} {item.partPrice ? `(₹${Number(item.partPrice).toLocaleString('en-IN')})` : ''}
                </Text>
              ) : (
                <Text style={styles.authorText}>
                  {item.authorEmail ? `By ${item.authorEmail.split('@')[0]}` : 'Auto Parts Official'}
                </Text>
              )}
            </View>
          </View>

          <Text style={[styles.annText, isUnread && styles.annTextUnread]} numberOfLines={3}>
            {item.text || item.message || ''}
          </Text>

          {isFollow ? (
            <View style={styles.chatActionRow}>
              <Text style={styles.tapToFollowProfileText}>Tap to view profile →</Text>
            </View>
          ) : isChat ? (
            <View style={styles.chatActionRow}>
              <Text style={styles.tapToReplyText}>Tap to open conversation →</Text>
            </View>
          ) : null}
        </Surface>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />

      {/* Header Bar with Tabs and Actions */}
      <View style={styles.topControlBar}>
        <View style={styles.tabPillContainer}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'chats' && styles.tabPillActive]}
            onPress={() => setActiveTab('chats')}
          >
            <Text style={[styles.tabPillText, activeTab === 'chats' && styles.tabPillTextActive]}>
              Chat ({personalNotifs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'announcements' && styles.tabPillActive]}
            onPress={() => setActiveTab('announcements')}
          >
            <Text style={[styles.tabPillText, activeTab === 'announcements' && styles.tabPillTextActive]}>
              Broadcast ({announcements.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerActionsRight}>
          {unreadCurrentTab > 0 && (
            <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllRead}>
              <Icon source="check-all" size={15} color="#38BDF8" />
              <Text style={styles.markReadText}>Read</Text>
            </TouchableOpacity>
          )}

          {currentList.length > 0 && (
            <TouchableOpacity 
              style={styles.deleteAllBtn} 
              onPress={handleDeleteAllNotifications}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon source="trash-can-outline" size={15} color="#EF4444" />
              <Text style={styles.deleteAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <NotificationListSkeleton count={5} />
      ) : currentList.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconBox}>
            <Icon source={activeTab === 'chats' ? "comment-off-outline" : "bell-off-outline"} size={48} color="#64748B" />
          </View>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            {activeTab === 'chats' ? 'No Chat Notifications' : 'No Broadcasts Yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'chats'
              ? 'When buyers or sellers send you inquiries and chat messages, they will appear here.'
              : 'When platform announcements or official updates are published, they will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0066FF"
              colors={['#0066FF']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  topControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
    backgroundColor: '#0F1E36',
  },
  tabPillContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabPillActive: {
    backgroundColor: '#0066FF',
  },
  tabPillText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  markReadText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  deleteAllText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#0F1E36',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  cardUnread: {
    backgroundColor: '#132847',
    borderColor: '#0066FF',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#1E293B',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  annTitle: {
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  annTitleBold: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  timeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
  },
  timeText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 3,
    marginLeft: 4,
    borderRadius: 6,
  },
  partTitleSub: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  followerSubText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  authorText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  annText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  annTextUnread: {
    color: '#F1F5F9',
  },
  chatActionRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  tapToReplyText: {
    color: '#0066FF',
    fontSize: 12,
    fontWeight: '700',
  },
  tapToFollowProfileText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 13,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
});
