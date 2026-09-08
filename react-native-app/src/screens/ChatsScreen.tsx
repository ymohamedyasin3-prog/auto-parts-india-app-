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
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'buyers' | 'sellers'>('all');
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

      // To support legacy chats and new chats simultaneously, we fetch where buyerId == activeUid, sellerId == activeUid, and participants array-contains activeUid.
      let buyerChats: any[] = [];
      let sellerChats: any[] = [];
      let partChats: any[] = [];
      let buyerLoaded = false;
      let sellerLoaded = false;
      let partLoaded = false;

      const mergeChats = () => {
        if (!buyerLoaded || !sellerLoaded || !partLoaded) return;
        const chatsMap = new Map<string, any>();
        buyerChats.forEach(c => chatsMap.set(c.id, c));
        sellerChats.forEach(c => chatsMap.set(c.id, c));
        partChats.forEach(c => chatsMap.set(c.id, c));
        
        const list = Array.from(chatsMap.values());
        
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
          new Set(
            list.map((c: any) => {
              const isUserBuyer = c.buyerId === activeUid || c.buyerId?.id === activeUid;
              return isUserBuyer 
                ? c.sellerId || (Array.isArray(c.participants) ? c.participants.find((p: string) => p !== activeUid) : null)
                : c.buyerId || (Array.isArray(c.participants) ? c.participants.find((p: string) => p !== activeUid) : null);
            }).filter(Boolean)
          )
        );

        if (partnerIds.length > 0) {
          Promise.all(
            partnerIds.map(async (pId) => {
              try {
                if (!pId) return { pId, photo: null };
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
                  const isUserBuyer = c.buyerId === activeUid || c.buyerId?.id === activeUid;
                  const pId = isUserBuyer 
                    ? c.sellerId || (Array.isArray(c.participants) ? c.participants.find((p: string) => p !== activeUid) : null)
                    : c.buyerId || (Array.isArray(c.participants) ? c.participants.find((p: string) => p !== activeUid) : null);
                  const livePhoto = photoMap[pId];
                  if (livePhoto) {
                    if (isUserBuyer) {
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
      };

      const unsubBuyer = db.collection('chats').where('buyerId', '==', activeUid).onSnapshot(
        (snapshot: any) => {
          buyerChats = [];
          if (snapshot && typeof snapshot.forEach === 'function') {
            snapshot.forEach((doc: any) => buyerChats.push({ id: doc.id || (doc.data && doc.data().id), ...(doc.data ? doc.data() : doc) }));
          }
          buyerLoaded = true;
          mergeChats();
        },
        () => {
          buyerLoaded = true;
          mergeChats();
        }
      );

      const unsubSeller = db.collection('chats').where('sellerId', '==', activeUid).onSnapshot(
        (snapshot: any) => {
          sellerChats = [];
          if (snapshot && typeof snapshot.forEach === 'function') {
            snapshot.forEach((doc: any) => sellerChats.push({ id: doc.id || (doc.data && doc.data().id), ...(doc.data ? doc.data() : doc) }));
          }
          sellerLoaded = true;
          mergeChats();
        },
        () => {
          sellerLoaded = true;
          mergeChats();
        }
      );

      const unsubPart = db.collection('chats').where('participants', 'array-contains', activeUid).onSnapshot(
        (snapshot: any) => {
          partChats = [];
          if (snapshot && typeof snapshot.forEach === 'function') {
            snapshot.forEach((doc: any) => partChats.push({ id: doc.id || (doc.data && doc.data().id), ...(doc.data ? doc.data() : doc) }));
          }
          partLoaded = true;
          mergeChats();
        },
        () => {
          partLoaded = true;
          mergeChats();
        }
      );

      return () => {
        unsubBuyer();
        unsubSeller();
        unsubPart();
      };
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

  const formatChatTime = (timestamp: any) => {
    const millis = parseTimestamp(timestamp);
    const date = new Date(millis);
    const now = new Date();
    
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${minutesStr} ${ampm}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return translateDynamic('Yesterday');
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  const formatPrice = (price: number) => {
    if (!price) return '₹0';
    return `₹${Number(price).toLocaleString('en-IN')}`;
  };

  if (!activeUser) {
    return (
      <View style={styles.authPromptContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#083B84" />
        <View style={styles.authCard}>
          <View style={styles.authIconCircle}>
            <Icon source="message-text-lock-outline" size={36} color="#0072F5" />
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
            buttonColor="#0072F5"
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

    if (activeFilter === 'buyers' && isUserBuyer) {
      // Current user is buyer, so the partner is a seller. Filter out if looking for buyers.
      return false;
    }
    if (activeFilter === 'sellers' && !isUserBuyer) {
      // Current user is seller, so partner is buyer. Filter out if looking for sellers.
      return false;
    }

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
    const partnerPhoto = isUserBuyer ? item.sellerPhoto : item.buyerPhoto;
    const displayAvatar = partnerPhoto || item.partImageUrl;

    const unreadCount =
      item.unreadCount?.[activeUid] ||
      (item.lastSenderId && item.lastSenderId !== activeUid && item.unread ? 1 : 0);

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
        activeOpacity={0.75}
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
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {(partnerName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Middle Content: Name & Last Message */}
        <View style={styles.chatInfo}>
          <Text numberOfLines={1} style={styles.partnerNameText}>
            {partnerName}
          </Text>
          <Text numberOfLines={1} style={styles.lastMessageText}>
            {item.lastMessageText || translateDynamic('Tap to start conversation...')}
          </Text>
        </View>

        {/* Right Content: Timestamp & Blue Unread Count */}
        <View style={styles.metaContainer}>
          <Text style={styles.timestampText}>
            {formatChatTime(item.lastMessageAt || item.updatedAt || item.createdAt)}
          </Text>
          {unreadCount > 0 ? (
            <View style={styles.unreadCircleBadge}>
              <Text style={styles.unreadCircleBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : (
            <View style={{ height: 20 }} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#083B84" />

      {/* Royal Navy Blue Top Header Bar matching image */}
      <View style={styles.header}>
        {/* Row 1: Brand title Auto Parts India */}
        <View style={styles.brandRow}>
          <Text style={styles.brandAutoParts}>Auto Parts </Text>
          <Text style={styles.brandIndia}>India</Text>
        </View>

        {/* Row 2: Chats Title & Icons */}
        <View style={styles.titleRow}>
          <Text style={styles.headerMainTitle}>{translateDynamic('Chats')}</Text>
          <View style={styles.headerActionIcons}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setShowSearch(!showSearch)}
              activeOpacity={0.7}
            >
              <Icon source="magnify" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={onRefresh}
              activeOpacity={0.7}
            >
              <Icon source="dots-vertical" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expandable Search Input */}
        {showSearch && (
          <View style={styles.searchbarWrap}>
            <Searchbar
              placeholder={translateDynamic('Search chats or parts...')}
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
              inputStyle={styles.searchInput}
              iconColor="#FFFFFF"
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
            />
          </View>
        )}

        {/* Row 3: Filter Tabs: All, Buyers, Sellers */}
        <View style={styles.filterTabsRow}>
          <TouchableOpacity
            style={[
              styles.filterTabPill,
              activeFilter === 'all' ? styles.filterTabPillActive : styles.filterTabPillInactive,
            ]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'all' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              {translateDynamic('All')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTabPill,
              activeFilter === 'buyers' ? styles.filterTabPillActive : styles.filterTabPillInactive,
            ]}
            onPress={() => setActiveFilter('buyers')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'buyers' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              {translateDynamic('Buyers')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTabPill,
              activeFilter === 'sellers' ? styles.filterTabPillActive : styles.filterTabPillInactive,
            ]}
            onPress={() => setActiveFilter('sellers')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'sellers' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              {translateDynamic('Sellers')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main White Curved List Container */}
      <View style={styles.sheetContainer}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#0072F5" />
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
                colors={['#0072F5']}
                tintColor="#0072F5"
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
                    textColor="#0072F5"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#083B84',
  },
  header: {
    backgroundColor: '#083B84',
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandAutoParts: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  brandIndia: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B00',
    letterSpacing: 0.2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerMainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchbarWrap: {
    marginBottom: 12,
  },
  searchbar: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
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
  filterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterTabPill: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterTabPillActive: {
    backgroundColor: '#0072F5',
  },
  filterTabPillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterTabTextInactive: {
    color: '#CBD5E1',
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  listContent: {
    paddingVertical: 6,
    flexGrow: 1,
  },
  chatCard: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0072F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  partnerNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  lastMessageText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 18,
  },
  metaContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 44,
  },
  timestampText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  unreadCircleBadge: {
    backgroundColor: '#0072F5',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCircleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    backgroundColor: '#F1F5F9',
    height: 1,
    marginLeft: 82,
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
    backgroundColor: '#083B84',
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
    backgroundColor: 'rgba(0, 114, 245, 0.1)',
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
