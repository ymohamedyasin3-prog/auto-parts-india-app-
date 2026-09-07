import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Image,
} from 'react-native';
import { Text, Surface, ActivityIndicator, Icon } from 'react-native-paper';
import { getFirebaseFirestore, getCurrentUser } from '../services/firebase';
import { 
  markAnnouncementsAsRead, 
  markNotificationAsRead, 
  markAllUserNotificationsAsRead,
  getLocalReadAnnouncementIds 
} from '../services/notifications';

export default function NotificationsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'all' | 'chats' | 'announcements'>('all');
  const [personalNotifs, setPersonalNotifs] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const currentUser = getCurrentUser();
  const currentUid = currentUser?.uid || currentUser?.id;

  const fetchNotifications = () => {
    try {
      const db = getFirebaseFirestore();
      if (!db || typeof db.collection !== 'function') {
        setLoading(false);
        setRefreshing(false);
        return () => {};
      }

      // 1. Fetch personal chat/inquiry notifications
      let unsubNotifs = () => {};
      if (currentUid) {
        unsubNotifs = db
          .collection('notifications')
          .where('recipientId', '==', currentUid)
          .orderBy('createdAt', 'desc')
          .limit(40)
          .onSnapshot(
            (snapshot: any) => {
              const list: any[] = [];
              if (snapshot && typeof snapshot.forEach === 'function') {
                snapshot.forEach((doc: any) => {
                  list.push({ id: doc.id, ...(doc.data ? doc.data() : doc) });
                });
              }
              setPersonalNotifs(list);
              setLoading(false);
              setRefreshing(false);
            },
            (err: any) => {
              console.warn('[NotificationsScreen] Personal notifs snapshot error:', err);
              setLoading(false);
              setRefreshing(false);
            }
          );
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
            if (snapshot && typeof snapshot.forEach === 'function') {
              snapshot.forEach((doc: any) => {
                const data = doc.data ? doc.data() : doc;
                const isRead = readSet.has(doc.id);
                list.push({ 
                  id: doc.id, 
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
    if (currentUid) {
      await markAllUserNotificationsAsRead(currentUid);
    }
    const annIds = announcements.map((a) => a.id).filter(Boolean);
    if (annIds.length > 0) {
      await markAnnouncementsAsRead(annIds);
    }
    // Update local state optimistically
    setPersonalNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })));
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

  // Merge and filter items based on selected tab
  const combinedList = React.useMemo(() => {
    let list: any[] = [];
    if (activeTab === 'all') {
      list = [...personalNotifs, ...announcements];
    } else if (activeTab === 'chats') {
      list = [...personalNotifs];
    } else {
      list = [...announcements];
    }
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [activeTab, personalNotifs, announcements]);

  const unreadTotal = React.useMemo(() => {
    const unreadPersonal = personalNotifs.filter((n) => !n.read).length;
    const unreadAnn = announcements.filter((a) => !a.read).length;
    return unreadPersonal + unreadAnn;
  }, [personalNotifs, announcements]);

  const renderItem = ({ item }: { item: any }) => {
    const isChat = item.type === 'chat_message' || Boolean(item.chatId);
    const isUnread = item.read === false;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleNotificationPress(item)}
      >
        <Surface style={[styles.card, isUnread && styles.cardUnread]} elevation={1}>
          <View style={styles.cardHeader}>
            {/* Left Icon or Product Thumbnail */}
            {isChat && item.partImageUrl ? (
              <Image source={{ uri: item.partImageUrl }} style={styles.productThumb} />
            ) : (
              <View style={[styles.iconBox, { backgroundColor: isChat ? 'rgba(0, 102, 255, 0.12)' : 'rgba(59, 130, 246, 0.12)' }]}>
                <Icon 
                  source={isChat ? "comment-text-outline" : "bullhorn-variant-outline"} 
                  size={20} 
                  color={isChat ? "#0066FF" : "#38BDF8"} 
                />
              </View>
            )}

            <View style={styles.headerInfo}>
              <View style={styles.titleRow}>
                <Text variant="titleSmall" style={[styles.annTitle, isUnread && styles.annTitleBold]} numberOfLines={1}>
                  {isChat ? (item.senderName || 'New Inquiry') : (item.title || 'Platform Announcement')}
                </Text>
                <View style={styles.timeBadgeContainer}>
                  {isUnread && <View style={styles.unreadDot} />}
                  <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
                </View>
              </View>

              {isChat && item.partTitle ? (
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

          {isChat && (
            <View style={styles.chatActionRow}>
              <Text style={styles.tapToReplyText}>Tap to open conversation →</Text>
            </View>
          )}
        </Surface>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />

      {/* Header Bar with Tabs and Mark All Read Action */}
      <View style={styles.topControlBar}>
        <View style={styles.tabPillContainer}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'all' && styles.tabPillActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabPillText, activeTab === 'all' && styles.tabPillTextActive]}>
              All ({personalNotifs.length + announcements.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'chats' && styles.tabPillActive]}
            onPress={() => setActiveTab('chats')}
          >
            <Text style={[styles.tabPillText, activeTab === 'chats' && styles.tabPillTextActive]}>
              Chats ({personalNotifs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'announcements' && styles.tabPillActive]}
            onPress={() => setActiveTab('announcements')}
          >
            <Text style={[styles.tabPillText, activeTab === 'announcements' && styles.tabPillTextActive]}>
              Broadcasts ({announcements.length})
            </Text>
          </TouchableOpacity>
        </View>

        {unreadTotal > 0 && (
          <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllRead}>
            <Icon source="check-all" size={16} color="#38BDF8" />
            <Text style={styles.markReadText}>Mark Read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#0066FF" size="large" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : combinedList.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconBox}>
            <Icon source="bell-off-outline" size={48} color="#64748B" />
          </View>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            No Notifications Yet
          </Text>
          <Text style={styles.emptySubtitle}>
            When buyers or sellers send you messages, or when platform updates are published, they will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={combinedList}
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
    gap: 6,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabPillActive: {
    backgroundColor: '#0066FF',
  },
  tabPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markReadText: {
    color: '#38BDF8',
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
    gap: 6,
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
  partTitleSub: {
    color: '#38BDF8',
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
