import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const HIDDEN_CHATS_STORAGE_KEY = '@autoparts_hidden_chats';

async function getLocalHiddenChatIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(HIDDEN_CHATS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set<string>(arr);
    }
  } catch (_) {}
  return new Set<string>();
}

async function addLocalHiddenChatId(chatId: string): Promise<void> {
  if (!chatId) return;
  try {
    const set = await getLocalHiddenChatIds();
    set.add(chatId);
    await AsyncStorage.setItem(HIDDEN_CHATS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (_) {}
}
import {
  Text,
  Searchbar,
  Badge,
  Divider,
  ActivityIndicator,
  Button,
  Icon,
} from 'react-native-paper';
import { getFirebaseFirestore, getCurrentUser, getFirebaseAuth } from '../services/firebase';
import { markNotificationAsRead } from '../services/notifications';
import { useLanguage } from '../context/LanguageContext';
import BrandLogo from '../components/BrandLogo';
import { UserAvatar } from '../components/UserAvatar';
import { ChatListSkeleton } from '../components/SkeletonLoaders';

export default function ChatsScreen({ navigation, user: initialUser }: any) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [activeUser, setActiveUser] = useState<any>(initialUser || getCurrentUser());
  const { translateDynamic } = useLanguage();

  // Listen to auth state changes and storage updates reactively
  useEffect(() => {
    // 1. Initial check from AsyncStorage
    AsyncStorage.getItem('@autoparts_current_user').then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (parsed && (parsed.uid || parsed.id || parsed.email)) {
            setActiveUser((prev: any) => prev || parsed);
          }
        } catch (_) {}
      }
    }).catch(() => {});

    let unsubAuth = () => {};
    try {
      const auth = getFirebaseAuth();
      if (auth && typeof auth.onAuthStateChanged === 'function') {
        unsubAuth = auth.onAuthStateChanged((u: any) => {
          setActiveUser(u || getCurrentUser());
        });
      } else {
        setActiveUser(getCurrentUser());
      }
    } catch (_) {
      setActiveUser(getCurrentUser());
    }

    return () => {
      try { unsubAuth(); } catch (_) {}
    };
  }, []);

  const getCleanId = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.id || val.uid || val._id || '';
    return String(val);
  };

  // Helper to accurately determine if current user is the buyer in a chat
  const isCurrentUserBuyer = (chat: any, activeUid: string, activeEmail?: string): boolean => {
    if (!chat) return true;
    const buyerId = getCleanId(chat.buyerId).toLowerCase();
    const sellerId = getCleanId(chat.sellerId).toLowerCase();
    const uidLower = (activeUid || '').toLowerCase();
    const emailLower = (activeEmail || '').toLowerCase();

    // 1. If sellerId matches activeUid or activeEmail, the user is the SELLER -> NOT the buyer
    if (sellerId && (sellerId === uidLower || (emailLower && sellerId === emailLower))) {
      return false;
    }
    // 2. If buyerId matches activeUid or activeEmail, the user is the BUYER
    if (buyerId && (buyerId === uidLower || (emailLower && buyerId === emailLower))) {
      return true;
    }
    // 3. Fallback: if sellerId is someone else, the user initiated the chat as buyer
    if (sellerId && sellerId !== uidLower && (!emailLower || sellerId !== emailLower)) {
      return true;
    }
    // 4. Fallback: if buyerId is someone else, user is the seller
    if (buyerId && buyerId !== uidLower && (!emailLower || buyerId !== emailLower)) {
      return false;
    }
    return true;
  };

  // Helper to get the other party's user ID
  const getPartnerIdFromChat = (c: any, uid: string, email?: string): string => {
    if (!c) return '';
    const bId = getCleanId(c.buyerId);
    const sId = getCleanId(c.sellerId);
    const uidLower = (uid || '').toLowerCase();
    const emailLower = (email || '').toLowerCase();

    const isMatch = (id: string) => {
      const lower = (id || '').toLowerCase();
      return lower === uidLower || (emailLower && lower === emailLower);
    };

    if (sId && !isMatch(sId) && sId !== 'seller') return sId;
    if (bId && !isMatch(bId) && bId !== 'buyer') return bId;
    if (Array.isArray(c.participants)) {
      const other = c.participants.find((p: any) => {
        const pid = getCleanId(p);
        return pid && !isMatch(pid) && pid !== 'seller' && pid !== 'buyer';
      });
      if (other) return getCleanId(other);
    }
    return isCurrentUserBuyer(c, uid, email) ? sId : bId;
  };

  const loadUserChats = useCallback(() => {
    const user = activeUser || getCurrentUser();
    const activeUid = user?.uid || user?.id || '';
    const activeEmail = (user?.email || '').trim().toLowerCase();

    if (!activeUid && !activeEmail) {
      setLoading(false);
      setRefreshing(false);
      return () => {};
    }

    // Try reading cached chats from AsyncStorage immediately
    const cacheKey = `@autoparts_cached_chats_${activeUid || activeEmail}`;
    AsyncStorage.getItem(cacheKey).then((raw) => {
      if (raw) {
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            setChats((prev) => (prev.length === 0 ? list : prev));
            setLoading(false);
          }
        } catch (_) {}
      }
    }).catch(() => {});

    try {
      const db = getFirebaseFirestore();
      if (!db || typeof db.collection !== 'function') {
        setLoading(false);
        setRefreshing(false);
        return () => {};
      }

      let buyerChats: any[] = [];
      let sellerChats: any[] = [];
      let partChats: any[] = [];
      let emailBuyerChats: any[] = [];
      let emailSellerChats: any[] = [];
      let emailPartChats: any[] = [];
      let allChatsFallback: any[] = [];

      const mergeChats = async () => {
        try {
          const chatsMap = new Map<string, any>();
          const hiddenChatSet = await getLocalHiddenChatIds();
          const targetIds = [activeUid, activeEmail, user?.phoneNumber].filter(Boolean);

          const matchesUser = (c: any): boolean => {
            if (!c || !c.id) return false;
            if (hiddenChatSet.has(c.id)) return false;
            if (Array.isArray(c.hiddenFor)) {
              if (c.hiddenFor.some((hid: any) => targetIds.includes(hid))) return false;
            }

            const cBuyer = getCleanId(c.buyerId).toLowerCase();
            const cSeller = getCleanId(c.sellerId).toLowerCase();
            const cLastSender = getCleanId(c.lastSenderId).toLowerCase();
            const cParts = Array.isArray(c.participants) ? c.participants.map((p: any) => getCleanId(p).toLowerCase()) : [];

            return targetIds.some((tId) => {
              const tLower = String(tId).toLowerCase();
              return (
                cBuyer === tLower ||
                cSeller === tLower ||
                cLastSender === tLower ||
                cParts.includes(tLower) ||
                (typeof c.id === 'string' && c.id.toLowerCase().includes(tLower))
              );
            });
          };

          [
            ...buyerChats,
            ...sellerChats,
            ...partChats,
            ...emailBuyerChats,
            ...emailSellerChats,
            ...emailPartChats,
            ...allChatsFallback,
          ].forEach((c) => {
            if (!c || !c.id) return;
            if (matchesUser(c)) {
              chatsMap.set(c.id, c);
            }
          });
          
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

          // Save list to AsyncStorage cache
          AsyncStorage.setItem(cacheKey, JSON.stringify(list)).catch(() => {});

          // Enrich with live user profile photos from Firestore
          const partnerIds = Array.from(
            new Set(
              list
                .map((c: any) => getPartnerIdFromChat(c, activeUid, activeEmail))
                .filter((id: string) => id && id !== 'seller' && id !== 'buyer')
            )
          );

          if (partnerIds.length > 0) {
            Promise.all(
              partnerIds.map(async (pId) => {
                try {
                  if (!pId) return { pId, photo: null };
                  const uDoc = await db.collection('users').doc(pId).get();
                  const exists = typeof uDoc?.exists === 'function' ? uDoc.exists() : Boolean(uDoc?.exists);
                  if (exists) {
                    const uData = typeof uDoc?.data === 'function' ? uDoc.data() : uDoc?.data;
                    const photo =
                      uData?.photoURL ||
                      uData?.profilePhoto ||
                      uData?.profileImageUrl ||
                      uData?.avatarUrl ||
                      uData?.photo ||
                      uData?.customPhoto ||
                      null;
                    return { pId, photo };
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
                    const pId = getPartnerIdFromChat(c, activeUid, activeEmail);
                    const livePhoto = pId ? photoMap[pId] : null;
                    const isUserBuyer = isCurrentUserBuyer(c, activeUid, activeEmail);
                    if (livePhoto) {
                      return {
                        ...c,
                        partnerPhoto: livePhoto,
                        sellerPhoto: isUserBuyer ? livePhoto : (c.sellerPhoto || livePhoto),
                        buyerPhoto: !isUserBuyer ? livePhoto : (c.buyerPhoto || livePhoto),
                      };
                    }
                    return c;
                  })
                );
              }
            });
          }
        } catch (err) {
          console.warn('[ChatsScreen] mergeChats error:', err);
          setLoading(false);
          setRefreshing(false);
        }
      };

      const unsubs: (() => void)[] = [];

      if (activeUid) {
        const unsubBuyer = db.collection('chats').where('buyerId', '==', activeUid).onSnapshot(
          (snapshot: any) => {
            buyerChats = [];
            if (snapshot && typeof snapshot.forEach === 'function') {
              snapshot.forEach((doc: any) => buyerChats.push({ id: doc.id || (doc.data && doc.data().id), ...(doc.data ? doc.data() : doc) }));
            }
            mergeChats();
          },
          () => { mergeChats(); }
        );
        unsubs.push(unsubBuyer);

        const unsubSeller = db.collection('chats').where('sellerId', '==', activeUid).onSnapshot(
          (snapshot: any) => {
            sellerChats = [];
            if (snapshot && typeof snapshot.forEach === 'function') {
              snapshot.forEach((doc: any) => sellerChats.push({ id: doc.id || (doc.data && doc.data().id), ...(doc.data ? doc.data() : doc) }));
            }
            mergeChats();
          },
          () => { mergeChats(); }
        );
        unsubs.push(unsubSeller);

        const unsubPart = db.collection('chats').where('participants', 'array-contains', activeUid).onSnapshot(
          (snapshot: any) => {
            partChats = [];
            if (snapshot && typeof snapshot.forEach === 'function') {
              snapshot.forEach((doc: any) => partChats.push({ id: doc.id || (doc.data && doc.data().id), ...(doc.data ? doc.data() : doc) }));
            }
            mergeChats();
          },
          () => { mergeChats(); }
        );
        unsubs.push(unsubPart);
      }

      if (activeEmail && activeEmail !== activeUid) {
        const unsubEmailBuyer = db.collection('chats').where('buyerId', '==', activeEmail).onSnapshot(
          (snapshot: any) => {
            emailBuyerChats = [];
            if (snapshot && typeof snapshot.forEach === 'function') {
              snapshot.forEach((doc: any) => emailBuyerChats.push({ id: doc.id || (doc.data && doc.data().id), ...(doc.data ? doc.data() : doc) }));
            }
            mergeChats();
          },
          () => { mergeChats(); }
        );
        unsubs.push(unsubEmailBuyer);

        const unsubEmailSeller = db.collection('chats').where('sellerId', '==', activeEmail).onSnapshot(
          (snapshot: any) => {
            emailSellerChats = [];
            if (snapshot && typeof snapshot.forEach === 'function') {
              snapshot.forEach((doc: any) => emailSellerChats.push({ id: doc.id || (doc.data && doc.data().id), ...(doc.data ? doc.data() : doc) }));
            }
            mergeChats();
          },
          () => { mergeChats(); }
        );
        unsubs.push(unsubEmailSeller);

        const unsubEmailPart = db.collection('chats').where('participants', 'array-contains', activeEmail).onSnapshot(
          (snapshot: any) => {
            emailPartChats = [];
            if (snapshot && typeof snapshot.forEach === 'function') {
              snapshot.forEach((doc: any) => emailPartChats.push({ id: doc.id || (doc.data && doc.data().id), ...(doc.data ? doc.data() : doc) }));
            }
            mergeChats();
          },
          () => { mergeChats(); }
        );
        unsubs.push(unsubEmailPart);
      }

      // Fallback: general query on chats collection
      const unsubAll = db.collection('chats').onSnapshot(
        (snapshot: any) => {
          allChatsFallback = [];
          if (snapshot && typeof snapshot.forEach === 'function') {
            snapshot.forEach((doc: any) => allChatsFallback.push({ id: doc.id || (doc.data && doc.data().id), ...(doc.data ? doc.data() : doc) }));
          }
          mergeChats();
        },
        () => { mergeChats(); }
      );
      unsubs.push(unsubAll);

      return () => {
        unsubs.forEach((fn) => {
          try { fn(); } catch (_) {}
        });
      };
    } catch (e) {
      console.warn('[ChatsScreen] Error in loadUserChats:', e);
      setLoading(false);
      setRefreshing(false);
      return () => {};
    }
  }, [activeUser?.uid, activeUser?.id, activeUser?.email]);

  useEffect(() => {
    setLoading(true);
    const unsub = loadUserChats();

    // Listen to navigation focus to refresh chats when tab is selected
    const unsubFocus = navigation?.addListener ? navigation.addListener('focus', () => {
      const u = getCurrentUser();
      if (u) setActiveUser(u);
      loadUserChats();
    }) : () => {};

    return () => {
      try {
        if (typeof unsub === 'function') unsub();
        if (typeof unsubFocus === 'function') unsubFocus();
      } catch (_) {}
    };
  }, [loadUserChats, navigation]);

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
        <StatusBar barStyle="light-content" backgroundColor="#0066FF" />
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
    const activeUid = activeUser?.uid || activeUser?.id || '';
    const activeEmail = (activeUser?.email || '').trim().toLowerCase();
    if (Array.isArray(chat.hiddenFor) && (chat.hiddenFor.includes(activeUid) || (activeEmail && chat.hiddenFor.includes(activeEmail)))) {
      return false;
    }
    const isUserBuyer = isCurrentUserBuyer(chat, activeUid, activeEmail);

    // Filter by Tab:
    // 'buy' tab: ONLY show chats where current user is BUYING from a seller
    if (activeFilter === 'buy' && !isUserBuyer) {
      return false;
    }
    // 'sell' tab: ONLY show chats where current user is SELLING to a buyer
    if (activeFilter === 'sell' && isUserBuyer) {
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
    const activeUid = activeUser?.uid || activeUser?.id || '';
    const activeEmail = (activeUser?.email || '').trim().toLowerCase();
    const isUserBuyer = isCurrentUserBuyer(item, activeUid, activeEmail);
    const partnerName = isUserBuyer
      ? item.sellerName || translateDynamic('Verified Seller')
      : item.buyerName || translateDynamic('Buyer');
    const partnerId = getPartnerIdFromChat(item, activeUid, activeEmail);
    const userProfilePicture = (
      item.partnerPhoto ||
      (isUserBuyer
        ? (item.sellerPhoto || item.sellerPhotoURL || item.sellerAvatar)
        : (item.buyerPhoto || item.buyerPhotoURL || item.buyerAvatar)) ||
      null
    );

    const unreadCount =
      item.unreadCount?.[activeUid] ||
      (activeEmail && item.unreadCount?.[activeEmail]) ||
      (item.lastSenderId && item.lastSenderId !== activeUid && item.lastSenderId !== activeEmail && item.unread ? 1 : 0);

    const handleDeleteChat = (chatItem: any) => {
      Alert.alert(
        translateDynamic('Delete Conversation'),
        `${translateDynamic('Are you sure you want to delete the chat with')} ${partnerName}?`,
        [
          { text: translateDynamic('Cancel'), style: 'cancel' },
          {
            text: translateDynamic('Delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                if (chatItem.id) {
                  await addLocalHiddenChatId(chatItem.id);
                }
                const db = getFirebaseFirestore();
                if (db && typeof db.collection === 'function' && chatItem.id) {
                  const chatRef = db.collection('chats').doc(chatItem.id);
                  const snap = await chatRef.get();
                  const currentHidden = snap?.exists ? (snap.data()?.hiddenFor || []) : [];
                  const nextHidden = Array.from(new Set([...currentHidden, activeUid]));
                  await chatRef.set({
                    hiddenFor: nextHidden,
                    clearedAt: {
                      ...(snap.data()?.clearedAt || {}),
                      [activeUid]: Date.now(),
                    },
                  }, { merge: true });
                }
                setChats((prev) => prev.filter((c) => c.id !== chatItem.id));
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
            partnerId: partnerId,
            partnerName: partnerName,
            partnerPhoto: userProfilePicture,
            part: {
              id: item.partId,
              title: item.partTitle || 'Spare Part',
              imageUrl: item.partImageUrl,
              price: item.partPrice || 0,
              sellerId: item.sellerId,
              sellerName: item.sellerName,
            },
            chat: {
              ...item,
              partnerPhoto: userProfilePicture,
              sellerPhoto: isUserBuyer ? (userProfilePicture || item.sellerPhoto) : item.sellerPhoto,
              buyerPhoto: !isUserBuyer ? (userProfilePicture || item.buyerPhoto) : item.buyerPhoto,
            },
          });
        }}
      >
        {/* User Profile Avatar */}
        <View style={styles.avatarContainer}>
          <UserAvatar
            photoUrl={userProfilePicture}
            name={partnerName}
            size={48}
            borderWidth={1.5}
            borderColor="#E2E8F0"
          />

          {/* Small Product Part Thumbnail Badge */}
          {item.partImageUrl ? (
            <View style={styles.partBadgeContainer}>
              <Image source={{ uri: item.partImageUrl }} style={styles.partBadgeImage} />
            </View>
          ) : null}
        </View>

        {/* Middle Content: Name, Role Badge, Part Title & Last Message */}
        <View style={styles.chatInfo}>
          <View style={styles.nameAndBadgeRow}>
            <Text numberOfLines={1} style={styles.partnerNameText}>
              {partnerName}
            </Text>
            <View
              style={[
                styles.roleBadge,
                isUserBuyer ? styles.roleBadgeBuy : styles.roleBadgeSell,
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  isUserBuyer ? styles.roleBadgeTextBuy : styles.roleBadgeTextSell,
                ]}
              >
                {isUserBuyer ? translateDynamic('Buy') : translateDynamic('Sell')}
              </Text>
            </View>
          </View>

          {item.partTitle ? (
            <Text numberOfLines={1} style={styles.partTitleSub}>
              {item.partTitle}
            </Text>
          ) : null}

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
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />

      {/* Royal Blue Top Header Bar matching Home Screen */}
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

        {/* Row 3: Filter Tabs: All, Buy, Sell */}
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
              activeFilter === 'buy' ? styles.filterTabPillActive : styles.filterTabPillInactive,
            ]}
            onPress={() => setActiveFilter('buy')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'buy' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              {translateDynamic('Buy')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTabPill,
              activeFilter === 'sell' ? styles.filterTabPillActive : styles.filterTabPillInactive,
            ]}
            onPress={() => setActiveFilter('sell')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'sell' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              {translateDynamic('Sell')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main White Curved List Container */}
      <View style={styles.sheetContainer}>
        {loading ? (
          <ChatListSkeleton count={6} />
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
                  <Icon
                    source={
                      activeFilter === 'buy'
                        ? 'shopping-outline'
                        : activeFilter === 'sell'
                        ? 'tag-outline'
                        : 'chat-outline'
                    }
                    size={44}
                    color="#94A3B8"
                  />
                </View>
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  {searchQuery
                    ? translateDynamic('No matching conversations found')
                    : activeFilter === 'buy'
                    ? translateDynamic('No buying chats yet')
                    : activeFilter === 'sell'
                    ? translateDynamic('No selling inquiries yet')
                    : translateDynamic('No active conversations yet')}
                </Text>
                <Text variant="bodySmall" style={styles.emptySub}>
                  {searchQuery
                    ? translateDynamic('Try a different search query for parts or sellers.')
                    : activeFilter === 'buy'
                    ? translateDynamic('When you chat with sellers to buy auto spare parts, those conversations appear here.')
                    : activeFilter === 'sell'
                    ? translateDynamic('When buyers send inquiries for parts you posted for sale, those messages appear here.')
                    : translateDynamic('Browse spare parts and click "Chat" to contact sellers in real-time.')}
                </Text>
                {!searchQuery && (
                  <Button
                    mode="contained-tonal"
                    onPress={() => {
                      if (activeFilter === 'sell') {
                        navigation.navigate('MainTabs', { screen: 'Sell' });
                      } else {
                        navigation.navigate('MainTabs', { screen: 'HomeTab' });
                      }
                    }}
                    style={{ marginTop: 16 }}
                    buttonColor="#EFF6FF"
                    textColor="#0072F5"
                    icon={activeFilter === 'sell' ? 'plus-circle' : 'car-search'}
                  >
                    {activeFilter === 'sell'
                      ? translateDynamic('Post an Ad to Sell Parts')
                      : translateDynamic('Browse Spare Parts to Buy')}
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
    backgroundColor: '#0066FF',
  },
  header: {
    backgroundColor: '#0066FF',
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
  headerProfileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
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
    position: 'relative',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
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
  partBadgeContainer: {
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
  partBadgeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  nameAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  partnerNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeBuy: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  roleBadgeSell: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  roleBadgeTextBuy: {
    color: '#1D4ED8',
  },
  roleBadgeTextSell: {
    color: '#B45309',
  },
  partTitleSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066FF',
    marginBottom: 3,
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
    backgroundColor: '#0066FF',
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
