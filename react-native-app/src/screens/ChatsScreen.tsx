import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  Searchbar,
  Badge,
  Divider,
  ActivityIndicator,
  Button,
  Icon,
} from 'react-native-paper';
import { getFirebaseFirestore, getCurrentUser } from '../services/firebase';
import { markNotificationAsRead } from '../services/notifications';
import { useLanguage } from '../context/LanguageContext';
import BrandLogo from '../components/BrandLogo';

export default function ChatsScreen({ navigation, user: initialUser }: any) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const activeUser = initialUser || getCurrentUser();
  const { translateDynamic } = useLanguage();

  const loadUserChats = useCallback(() => {
    const activeUid = activeUser?.uid || activeUser?.id;
    if (!activeUid) {
      setLoading(false);
      setRefreshing(false);
      return () => {};
    }

    try {
      const db = getFirebaseFirestore();
      if (!db || typeof db.collection !== 'function') {
        setLoading(false);
        setRefreshing(false);
        return () => {};
      }

      // Query chats collection where activeUid is a participant, buyer, or seller
      const { Filter } = require('@react-native-firebase/firestore');
      const chatsRef = db.collection('chats').where(
        Filter.or(
          Filter('participants', 'array-contains', activeUid),
          Filter('buyerId', '==', activeUid),
          Filter('sellerId', '==', activeUid)
        )
      );
      
      const unsubscribe = chatsRef.onSnapshot(
        (snapshot: any) => {
          const list: any[] = [];
          if (snapshot && typeof snapshot.forEach === 'function') {
            snapshot.forEach((doc: any) => {
              const data = doc.data ? doc.data() : doc;
              const chatId = doc.id || data.id;
              
              const isParticipant =
                (Array.isArray(data.participants) && data.participants.includes(activeUid)) ||
                data.buyerId === activeUid ||
                data.sellerId === activeUid ||
                (typeof chatId === 'string' && chatId.includes(activeUid));

              if (isParticipant) {
                list.push({ id: chatId, ...data });
              }
            });
          }

          // Sort by latest message time
          list.sort((a, b) => {
            const timeA = parseTimestamp(a.lastMessageAt || a.updatedAt || a.createdAt || 0);
            const timeB = parseTimestamp(b.lastMessageAt || b.updatedAt || b.createdAt || 0);
            return timeB - timeA;
          });

          setChats(list);
          setLoading(false);
          setRefreshing(false);

          // Enrich with live user photos from Firestore
          const partnerIds = Array.from(
            new Set(list.map((c) => (c.buyerId === activeUid ? c.sellerId : c.buyerId)).filter(Boolean))
          );
          if (partnerIds.length > 0) {
            Promise.all(
              partnerIds.map(async (pId) => {
                try {
                  const uDoc = await db.collection('users').doc(pId).get();
                  if (uDoc && uDoc.exists) {
                    const uData = uDoc.data();
                    return { pId, photo: uData?.photoURL || uData?.profilePhoto || null };
                  }
                } catch (_) {}
                return { pId, photo: null };
              })
            ).then((results) => {
              const photoMap: Record<string, string> = {};
              results.forEach((r) => {
                if (r.photo) photoMap[r.pId] = r.photo;
              });
              if (Object.keys(photoMap).length > 0) {
                setChats((prev) =>
                  prev.map((c) => {
                    const pId = c.buyerId === activeUid ? c.sellerId : c.buyerId;
                    const livePhoto = photoMap[pId];
                    if (livePhoto) {
                      if (c.buyerId === activeUid) {
                        return { ...c, sellerPhoto: livePhoto };
                      } else {
                        return { ...c, buyerPhoto: livePhoto };
                      }
                    }
                    return c;
                  })
                );
              }
            });
          }
        },
        (err: any) => {
          console.warn('[ChatsScreen] Snapshot error:', err);
          setLoading(false);
          setRefreshing(false);
        }
      );

      return unsubscribe;
    } catch (e) {
      console.warn('[ChatsScreen] Error in loadUserChats:', e);
      setLoading(false);
      setRefreshing(false);
      return () => {};
    }
  }, [activeUser?.uid, activeUser?.id]);

  useEffect(() => {
    setLoading(true);
    const unsub = loadUserChats();
    return () => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch (_) {}
    };
  }, [loadUserChats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUserChats();
  };

  const parseTimestamp = (ts: any): number => {
    if (!ts) return Date.now();
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') {
      const parsed = Date.parse(ts);
      return isNaN(parsed) ? Date.now() : parsed;
    }
    if (typeof ts === 'object') {
      if (typeof ts.toMillis === 'function') return ts.toMillis();
      if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    }
    return Date.now();
  };

  const getRelativeTime = (timestamp: any) => {
    const millis = parseTimestamp(timestamp);
    const difference = Date.now() - millis;
    if (difference < 0) return translateDynamic('Just now');
    const minutes = Math.floor(difference / (60 * 1000));
    if (minutes < 1) return translateDynamic('Just now');
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days > 30) return translateDynamic('Recently');
    return `${days}d ago`;
  };

  const formatPrice = (price: number) => {
    if (!price) return '₹0';
    return `₹${Number(price).toLocaleString('en-IN')}`;
  };

  if (!activeUser) {
    return (
      <View style={styles.authPromptContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0B1220" />
        <View style={styles.authCard}>
          <View style={styles.authIconCircle}>
            <Icon source="message-text-lock-outline" size={36} color="#1565FF" />
          </View>
          <Text variant="titleLarge" style={styles.authTitle}>
            {translateDynamic('Sign in to View Chats')}
          </Text>
          <Text variant="bodyMedium" style={styles.authSub}>
            {translateDynamic('Connect directly with verified buyers and sellers in real-time.')}
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Auth')}
            style={styles.signInBtn}
            buttonColor="#1565FF"
            textColor="#FFFFFF"
            icon="login"
          >
            {translateDynamic('Sign In / Register')}
          </Button>
        </View>
      </View>
    );
  }

  const filteredChats = chats.filter((chat) => {
    const activeUid = activeUser.uid || activeUser.id;
    const isUserBuyer = chat.buyerId ? activeUid === chat.buyerId : activeUid !== chat.sellerId;
    const partnerName = isUserBuyer ? chat.sellerName : chat.buyerName;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      (partnerName || '').toLowerCase().includes(query) ||
      (chat.buyerName || '').toLowerCase().includes(query) ||
      (chat.sellerName || '').toLowerCase().includes(query) ||
      (chat.partTitle || '').toLowerCase().includes(query) ||
      (chat.lastMessageText || '').toLowerCase().includes(query)
    );
  });

  const renderChatItem = ({ item }: { item: any }) => {
    const activeUid = activeUser.uid || activeUser.id;
    const isUserBuyer = item.buyerId ? activeUid === item.buyerId : activeUid !== item.sellerId;
    const partnerName = isUserBuyer
      ? item.sellerName || 'Verified Seller'
      : item.buyerName || 'Buyer';
    const partnerRole = isUserBuyer ? 'Seller' : 'Buyer';
    const partnerPhoto = isUserBuyer ? item.sellerPhoto : item.buyerPhoto;
    const partnerId = isUserBuyer 
      ? item.sellerId || (Array.isArray(item.participants) ? item.participants.find((p: string) => p !== activeUid) : 'seller')
      : item.buyerId || (Array.isArray(item.participants) ? item.participants.find((p: string) => p !== activeUid) : 'buyer');

    const unreadCount =
      item.unreadCount?.[activeUid] ||
      (item.lastSenderId && item.lastSenderId !== activeUid && item.unread ? 1 : 0);

    const partImage =
      item.partImageUrl ||
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=200';

    const handleDeleteChat = (chatItem: any) => {
      Alert.alert(
        'Delete Conversation',
        `Are you sure you want to delete the chat history with ${partnerName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const db = getFirebaseFirestore();
                if (db && typeof db.collection === 'function' && chatItem.id) {
                  await db.collection('chats').doc(chatItem.id).delete();
                }
                setChats((prev) => prev.filter((c) => c.id !== chatItem.id));
                Alert.alert('Deleted', 'Conversation removed.');
              } catch (err: any) {
                console.warn('[ChatsScreen] Delete error:', err);
              }
            },
          },
        ]
      );
    };

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.chatCard}
        onLongPress={() => handleDeleteChat(item)}
        onPress={() => {
          if (activeUid && item.id) {
            markNotificationAsRead(`${item.id}_${activeUid}`);
          }
          navigation.navigate('ChatRoom', {
            chatId: item.id,
            part: {
              id: item.partId,
              title: item.partTitle || 'Spare Part',
              imageUrl: item.partImageUrl,
              price: item.partPrice || 0,
              sellerId: item.sellerId,
              sellerName: item.sellerName,
            },
            chat: item,
          });
        }}
      >
        {/* Avatar with part thumbnail badge */}
        <View style={styles.avatarContainer}>
          {partnerPhoto ? (
            <Image source={{ uri: partnerPhoto }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {(partnerName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Small thumbnail badge of the spare part */}
          {item.partImageUrl ? (
            <View style={styles.partBadgeOverlay}>
              <Image source={{ uri: item.partImageUrl }} style={styles.partBadgeImg} />
            </View>
          ) : null}

          {unreadCount > 0 && <View style={styles.unreadPulseDot} />}
        </View>

        {/* Middle content info */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeaderRow}>
            <View style={styles.partnerNameRow}>
              <Text variant="titleSmall" numberOfLines={1} style={styles.partnerNameText}>
                {partnerName}
              </Text>
              <View
                style={[
                  styles.roleTag,
                  isUserBuyer ? styles.sellerTag : styles.buyerTag,
                ]}
              >
                <Text
                  style={[
                    { fontSize: 10, fontWeight: '700' },
                    { color: isUserBuyer ? '#3B82F6' : '#10B981' },
                  ]}
                >
                  {partnerRole}
                </Text>
              </View>
            </View>

            <Text style={styles.timestampText}>
              {getRelativeTime(item.lastMessageAt || item.updatedAt || item.createdAt)}
            </Text>
          </View>

          {/* Spare part title badge */}
          <View style={styles.partTitleRow}>
            <Icon source="car-wrench" size={13} color="#2563EB" />
            <Text numberOfLines={1} style={styles.partTitleText}>
              {item.partTitle || translateDynamic('Spare Part Inquiry')}
            </Text>
            {item.partPrice ? (
              <Text style={styles.partPriceText}>{formatPrice(item.partPrice)}</Text>
            ) : null}
          </View>

          {/* Last message preview */}
          <View style={styles.lastMessageRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.lastMessageText,
                unreadCount > 0 && styles.lastMessageTextUnread,
              ]}
            >
              {item.lastMessageText || translateDynamic('Tap to start conversation...')}
            </Text>
            {unreadCount > 0 ? (
              <Badge size={20} style={styles.unreadBadge}>
                {unreadCount}
              </Badge>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />

      {/* Modern Blue Header matching Home Screen Theme */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{translateDynamic('Chats & Messages')}</Text>
          <TouchableOpacity
            style={styles.notifIconBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Icon source="bell-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Inbox Search input */}
        <Searchbar
          placeholder={translateDynamic('Search conversations or parts...')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor="#FFFFFF"
          placeholderTextColor="rgba(255, 255, 255, 0.7)"
        />
      </View>

      {/* Main Conversation List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>{translateDynamic('Syncing conversations...')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          ItemSeparatorComponent={() => <Divider style={styles.divider} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1565FF']}
              tintColor="#1565FF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon source="chat-outline" size={44} color="#94A3B8" />
              </View>
              <Text variant="titleMedium" style={styles.emptyTitle}>
                {searchQuery
                  ? translateDynamic('No matching conversations found')
                  : translateDynamic('No active conversations yet')}
              </Text>
              <Text variant="bodySmall" style={styles.emptySub}>
                {searchQuery
                  ? translateDynamic('Try a different search query for parts or sellers.')
                  : translateDynamic('Browse spare parts and click "Chat" to contact sellers in real-time.')}
              </Text>
              {!searchQuery && (
                <Button
                  mode="contained-tonal"
                  onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
                  style={{ marginTop: 16 }}
                  buttonColor="#EFF6FF"
                  textColor="#1565FF"
                  icon="car-search"
                >
                  {translateDynamic('Browse Spare Parts')}
                </Button>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0066FF',
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  notifIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchbar: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 14,
    height: 42,
    elevation: 0,
    borderWidth: 0,
  },
  searchInput: {
    fontSize: 13,
    color: '#FFFFFF',
    minHeight: 0,
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  chatCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1565FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  partBadgeOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  partBadgeImg: {
    width: '100%',
    height: '100%',
  },
  unreadPulseDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  partnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  partnerNameText: {
    fontWeight: '700',
    color: '#0F172A',
    fontSize: 14,
    maxWidth: '70%',
  },
  roleTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginLeft: 6,
  },
  sellerTag: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  sellerTagText: {
    color: '#2563EB',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  buyerTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  buyerTagText: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timestampText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  partTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  partTitleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
    flex: 1,
  },
  partPriceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  lastMessageTextUnread: {
    color: '#0F172A',
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
  },
  divider: {
    backgroundColor: '#F1F5F9',
    height: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySub: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  authPromptContainer: {
    flex: 1,
    backgroundColor: '#0B1220',
    justifyContent: 'center',
    padding: 24,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  authIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(21, 101, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  authTitle: {
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  authSub: {
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  signInBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 4,
  },
});
