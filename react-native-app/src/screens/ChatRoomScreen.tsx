import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  StatusBar,
  Linking,
  TextInput,
  Text,
  BackHandler,
} from 'react-native';
import { Icon, ActivityIndicator, Appbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFirebaseFirestore, getCurrentUser } from '../services/firebase';
import { sendChatMessageNotification, markNotificationAsRead } from '../services/notifications';
import { promptImageSourceDialog } from '../services/imagePickerService';
import { uploadImageToCloudinary } from '../services/cloudinary';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelectorModal } from '../components/LanguageSelectorModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text?: string;
  imageUrl?: string | null;
  createdAt: number | any;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  readBy?: string[];
}

export default function ChatRoomScreen({ route, navigation, user: initialUser }: any) {
  const insets = useSafeAreaInsets();
  const { language, t, translateDynamic } = useLanguage();

  const { chatId: routeChatId, part: routePart, chat: routeChat } = route.params || {};
  const activeUser = initialUser || getCurrentUser();
  const currentUid = activeUser?.uid || activeUser?.id || 'guest';
  const currentName = activeUser?.displayName || activeUser?.name || activeUser?.email?.split('@')[0] || 'User';
  const currentUserPhoto = activeUser?.photoURL || '';

  // Determine item & chatId
  const part = routePart || (routeChat ? {
    id: routeChat.partId,
    title: routeChat.partTitle,
    imageUrl: routeChat.partImageUrl,
    price: routeChat.partPrice,
    sellerId: routeChat.sellerId,
    sellerName: routeChat.sellerName,
    contactPhone: routeChat.contactPhone,
  } : null);

  const chatId = routeChatId || (part && currentUid ? `${currentUid}_${part.sellerId || 'seller'}_${part.id || 'item'}` : 'default_chat');

  // Loaded chat document state from Firestore (in case routeChat wasn't fully populated)
  const [remoteChatDoc, setRemoteChatDoc] = useState<any>(null);

  // Subscribe to the chat document itself so participants/names/photos are always accurate in real-time
  useEffect(() => {
    if (!chatId) return;
    let unsub = () => {};
    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        unsub = db.collection('chats').doc(chatId).onSnapshot((docSnap: any) => {
          if (docSnap && docSnap.exists) {
            const data = docSnap.data();
            setRemoteChatDoc(data);
          }
        }, () => {});
      }
    } catch (_) {}
    return () => { try { unsub(); } catch (_) {} };
  }, [chatId]);

  const mergedChat = remoteChatDoc || routeChat;

  // Partner Identification logic
  const isCurrentUserBuyer = mergedChat?.buyerId
    ? mergedChat.buyerId === currentUid
    : (part?.sellerId ? part.sellerId !== currentUid : true);

  // Compute partnerId accurately
  let resolvedPartnerId = 'seller';
  if (mergedChat) {
    if (mergedChat.buyerId === currentUid) {
      resolvedPartnerId = mergedChat.sellerId || 'seller';
    } else if (mergedChat.sellerId === currentUid) {
      resolvedPartnerId = mergedChat.buyerId || 'buyer';
    } else if (Array.isArray(mergedChat.participants)) {
      const other = mergedChat.participants.find((p: string) => p && p !== currentUid);
      if (other) resolvedPartnerId = other;
    }
  } else if (part) {
    resolvedPartnerId = part.sellerId === currentUid ? 'buyer' : (part.sellerId || 'seller');
  }

  const partnerId = resolvedPartnerId;

  const partnerName = mergedChat
    ? (isCurrentUserBuyer ? (mergedChat.sellerName || 'Verified Seller') : (mergedChat.buyerName || 'Buyer'))
    : (part ? (part.sellerName || 'Verified Seller') : 'Seller');
  const partnerRole = isCurrentUserBuyer ? 'Seller' : 'Buyer';
  const partnerPhoto = mergedChat
    ? (isCurrentUserBuyer ? mergedChat.sellerPhoto : mergedChat.buyerPhoto)
    : (part ? part.sellerPhoto : '');

  const [livePartnerPhoto, setLivePartnerPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId || partnerId === 'seller' || partnerId === 'buyer') return;
    let unsub = () => {};
    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        unsub = db.collection('users').doc(partnerId).onSnapshot((docSnap: any) => {
          if (docSnap && docSnap.exists) {
            const uData = docSnap.data();
            if (uData?.photoURL || uData?.profilePhoto) {
              setLivePartnerPhoto(uData.photoURL || uData.profilePhoto);
            }
          }
        }, () => {});
      }
    } catch (_) {}
    return () => { try { unsub(); } catch (_) {} };
  }, [partnerId]);

  const effectivePartnerPhoto = livePartnerPhoto || partnerPhoto;

  // State Management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Unified Back Navigation Logic
  const handleBackNavigation = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'ChatsTab' });
    return true; // Prevent default behavior
  }, [navigation]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackNavigation);
    return () => backHandler.remove();
  }, [handleBackNavigation]);

  // Presence & Typing State
  const [partnerPresence, setPartnerPresence] = useState<{ online: boolean; lastSeen: number }>({
    online: true,
    lastSeen: Date.now(),
  });
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Subscribe to Chat Messages Real-time (Firestore query)
  useEffect(() => {
    if (!chatId) return;

    let unsubscribe = () => {};
    try {
      const db = getFirebaseFirestore();
      if (!db || typeof db.collection !== 'function') return;

      const messagesRef = db.collection('chats').doc(chatId).collection('messages');
      const q = messagesRef.orderBy('createdAt', 'asc');

      unsubscribe = q.onSnapshot(
        (snapshot: any) => {
          const list: ChatMessage[] = [];
          if (snapshot && typeof snapshot.forEach === 'function') {
            snapshot.forEach((doc: any) => {
              const data = doc.data ? doc.data() : doc;
              list.push({
                id: doc.id || data.id,
                ...data,
                status: data.status || 'read',
              });
            });
          }

          // Sort messages by createdAt
          list.sort((a, b) => {
            const timeA = typeof a.createdAt === 'number' ? a.createdAt : Date.now();
            const timeB = typeof b.createdAt === 'number' ? b.createdAt : Date.now();
            return timeA - timeB;
          });

          setMessages(list);

          // If there are unread messages sent by the partner, mark them as read and reset unread status
          const hasIncomingUnread = list.some((msg) => msg.senderId !== currentUid && msg.status !== 'read');
          if (hasIncomingUnread) {
            list.forEach(async (msg) => {
              if (msg.senderId !== currentUid && msg.status !== 'read') {
                try {
                  await messagesRef.doc(msg.id).set({ status: 'read' }, { merge: true });
                } catch (_) {}
              }
            });

            try {
              const currentUnreadMap = mergedChat?.unreadCount || {};
              const newUnreadMap = { ...currentUnreadMap };
              newUnreadMap[currentUid] = 0;
              
              db.collection('chats').doc(chatId).set({
                unreadCount: newUnreadMap,
                unread: false,
              }, { merge: true });
              markNotificationAsRead(`${chatId}_${currentUid}`);
            } catch (_) {}
          }
        },
        (err: any) => {
          console.warn('[ChatRoomScreen] Messages snapshot error:', err);
        }
      );
    } catch (e) {
      console.warn('[ChatRoomScreen] Exception in messages listener:', e);
    }

    return () => {
      try {
        unsubscribe();
      } catch (_) {}
    };
  }, [chatId, currentUid]);

  // 2. Subscribe to Partner Typing Status & Presence Real-time
  useEffect(() => {
    if (!chatId || !partnerId) return;

    let unsubTyping = () => {};
    let unsubPresence = () => {};

    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        const typingDocRef = db.collection('chats').doc(chatId).collection('typing').doc(partnerId);
        unsubTyping = typingDocRef.onSnapshot(
          (docSnap: any) => {
            const data = docSnap?.data ? docSnap.data() : docSnap;
            if (data && data.isTyping) {
              const age = Date.now() - (data.timestamp || 0);
              setPartnerIsTyping(age < 8000);
            } else {
              setPartnerIsTyping(false);
            }
          },
          (err: any) => console.warn('[ChatRoomScreen] Typing error:', err)
        );

        const presenceDocRef = db.collection('presence').doc(partnerId);
        unsubPresence = presenceDocRef.onSnapshot(
          (docSnap: any) => {
            const data = docSnap?.data ? docSnap.data() : docSnap;
            if (data) {
              setPartnerPresence({
                online: data.online === true,
                lastSeen: data.lastSeen || Date.now(),
              });
            }
          },
          (err: any) => console.warn('[ChatRoomScreen] Presence error:', err)
        );
      }
    } catch (e) {
      console.warn('[ChatRoomScreen] Exception in typing/presence:', e);
    }

    return () => {
      try {
        unsubTyping();
        unsubPresence();
      } catch (_) {}
    };
  }, [chatId, partnerId]);

  // Update Current User's Typing Status
  const emitTyping = useCallback(
    async (isTyping: boolean) => {
      if (!chatId || !currentUid) return;
      try {
        const db = getFirebaseFirestore();
        if (db && typeof db.collection === 'function') {
          await db
            .collection('chats')
            .doc(chatId)
            .collection('typing')
            .doc(currentUid)
            .set({
              isTyping,
              timestamp: Date.now(),
              userId: currentUid,
            }, { merge: true });
        }
      } catch (_) {}
    },
    [chatId, currentUid]
  );

  const handleInputChange = (text: string) => {
    setInputText(text);

    if (text.trim().length > 0) {
      emitTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emitTyping(false);
      }, 3000);
    } else {
      emitTyping(false);
    }
  };

  // 3. Send Message Logic
  const executeSend = async (textToSend: string, imageUrl?: string | null) => {
    const cleanText = textToSend ? textToSend.trim() : '';
    if (!cleanText && !imageUrl) return;
    if (!chatId || !activeUser) {
      Alert.alert('Sign In Required', 'Please sign in to message this seller.');
      return;
    }

    const now = Date.now();

    setInputText('');
    emitTyping(false);
    setIsSending(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const db = getFirebaseFirestore();
      if (!db || typeof db.collection !== 'function') {
        throw new Error('Firestore is not initialized');
      }

      const messagesRef = db.collection('chats').doc(chatId).collection('messages');

      const docRef = await messagesRef.add({
        senderId: currentUid,
        senderName: currentName,
        senderPhoto: currentUserPhoto,
        text: cleanText,
        imageUrl: imageUrl || null,
        createdAt: now,
        status: 'sent',
      });

      // Update parent Chat document for inbox previews
      const resolvedBuyerId = mergedChat?.buyerId || (isCurrentUserBuyer ? currentUid : partnerId);
      const resolvedBuyerName = mergedChat?.buyerName || (isCurrentUserBuyer ? currentName : partnerName);
      const resolvedSellerId = mergedChat?.sellerId || (isCurrentUserBuyer ? partnerId : currentUid);
      const resolvedSellerName = mergedChat?.sellerName || (isCurrentUserBuyer ? partnerName : currentName);
      const participantsList = Array.from(new Set([currentUid, partnerId, resolvedBuyerId, resolvedSellerId].filter(Boolean)));

      const chatDocRef = db.collection('chats').doc(chatId);
      const currentUnreadMap = mergedChat?.unreadCount || {};
      const newUnreadMap = { ...currentUnreadMap };
      if (partnerId) {
        newUnreadMap[partnerId] = (newUnreadMap[partnerId] || 0) + 1;
      }
      
      await chatDocRef.set(
        {
          id: chatId,
          partId: part?.id || mergedChat?.partId || '',
          partTitle: part?.title || part?.partTitle || mergedChat?.partTitle || 'Spare Part',
          partImageUrl: part?.imageUrl || part?.partImageUrl || mergedChat?.partImageUrl || '',
          partPrice: Number(part?.price || part?.partPrice || mergedChat?.partPrice) || 0,
          buyerId: resolvedBuyerId,
          buyerName: resolvedBuyerName,
          sellerId: resolvedSellerId,
          sellerName: resolvedSellerName,
          lastMessageText: imageUrl ? '📷 Photo Attachment' : cleanText,
          lastMessageAt: now,
          lastSenderId: currentUid,
          participants: participantsList,
          unread: true,
          unreadCount: newUnreadMap,
        },
        { merge: true }
      );

      // Real-time Chat Notification & Push dispatch
      sendChatMessageNotification({
        chatId,
        recipientId: partnerId,
        senderId: currentUid,
        senderName: currentName,
        senderPhoto: currentUserPhoto,
        text: cleanText || (imageUrl ? '📷 Photo Attachment' : 'New message'),
        partId: part?.id || mergedChat?.partId || '',
        partTitle: part?.title || part?.partTitle || mergedChat?.partTitle || 'Spare Part',
        partPrice: Number(part?.price || part?.partPrice || mergedChat?.partPrice) || 0,
        partImageUrl: part?.imageUrl || part?.partImageUrl || mergedChat?.partImageUrl || '',
        buyerId: resolvedBuyerId,
        buyerName: resolvedBuyerName,
        sellerId: resolvedSellerId,
        sellerName: resolvedSellerName,
      }).catch((e) => console.warn('[ChatRoomScreen] sendChatMessageNotification warning:', e));

    } catch (err: any) {
      console.warn('[ChatRoomScreen] Failed to send message:', err);
      Alert.alert('Message Not Sent', 'Could not send your message. Please check your internet connection.');
    } finally {
      setIsSending(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSendPress = () => {
    if (inputText.trim()) {
      executeSend(inputText);
    }
  };

  // 4. Image Picker via Cloudinary
  const handlePickImage = async () => {
    try {
      const selectedUri = await promptImageSourceDialog(
        translateDynamic('Attach Photo'),
        translateDynamic('Select camera or gallery to share spare part images')
      );

      if (selectedUri) {
        setIsUploadingImage(true);
        try {
          const cloudinaryUrl = await uploadImageToCloudinary(selectedUri, 'chat_attachments');
          if (cloudinaryUrl) {
            await executeSend('', cloudinaryUrl);
          }
        } catch (err) {
          console.warn('[ChatRoomScreen] Image upload error:', err);
          Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
        } finally {
          setIsUploadingImage(false);
        }
      }
    } catch (err) {
      console.warn('[ChatRoomScreen] Image picker dialog error:', err);
    }
  };

  const retrySendMessage = (failedMsg: ChatMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== failedMsg.id));
    executeSend(failedMsg.text || '', failedMsg.imageUrl);
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

  const formatMessageTime = (ts: any) => {
    const millis = parseTimestamp(ts);
    try {
      return new Date(millis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  const getRelativePresenceTime = (lastSeen: number) => {
    if (!lastSeen) return translateDynamic('Offline');
    const diff = Math.floor((Date.now() - lastSeen) / 1000);
    if (diff < 60) return translateDynamic('Active just now');
    if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `Active ${Math.floor(diff / 3600)}h ago`;
    return `Last seen ${Math.floor(diff / 86400)}d ago`;
  };

  const formatPrice = (price: number) => {
    if (!price) return '₹0';
    return `₹${Number(price).toLocaleString('en-IN')}`;
  };

  // Quick reply presets based on language
  const getQuickReplies = () => {
    switch (language) {
      case 'ta':
        return [
          'இது இன்னும் கிடைக்குமா?',
          'விலை குறைக்க முடியுமா?',
          'பொருள் எங்கே இருக்கிறது?',
          'கொரியர் மூலம் அனுப்ப முடியுமா?',
          'உத்தரவாதம் இருக்கிறதா?',
        ];
      case 'hi':
        return [
          'क्या यह अभी उपलब्ध है?',
          'क्या कीमत में छूट हो सकती है?',
          'पार्ट की वर्तमान स्थिति कैसी है?',
          'क्या आप कूरियर से भेज सकते हैं?',
          'क्या इस पर कोई वारंटी है?',
        ];
      default:
        return [
          'Is this still available?',
          'Is the price negotiable?',
          'What is the exact condition?',
          'Can you ship via courier?',
          'Any warranty or testing guarantee?',
        ];
      }
  };

  const handleCallPartner = () => {
    if (!part?.contactPhone) {
      Alert.alert('Contact', 'Phone number not available for this seller.');
      return;
    }
    Alert.alert(
      'Call Seller',
      `Do you want to call ${partnerName || 'the seller'} at ${part.contactPhone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => Linking.openURL(`tel:${part.contactPhone}`),
        },
      ]
    );
  };

  const handleDeleteMessage = (msgItem: ChatMessage) => {
    if (msgItem.senderId !== currentUid) return;
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message for everyone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getFirebaseFirestore();
              if (db && typeof db.collection === 'function' && chatId && msgItem.id) {
                await db
                  .collection('chats')
                  .doc(chatId)
                  .collection('messages')
                  .doc(msgItem.id)
                  .delete();
              }
              setMessages((prev) => prev.filter((m) => m.id !== msgItem.id));
            } catch (err: any) {
              console.warn('[ChatRoomScreen] Delete message error:', err);
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === currentUid;
    const isFailed = item.status === 'failed';
    const isPending = item.status === 'pending';

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.myMessageRow : styles.theirMessageRow,
        ]}
      >
        <View style={[styles.bubbleWrapper, isMe ? styles.myBubbleWrapper : styles.theirBubbleWrapper]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onLongPress={() => isMe && handleDeleteMessage(item)}
            style={[
              styles.bubbleBox,
              isMe
                ? isFailed
                  ? styles.failedBubble
                  : styles.myBubble
                : styles.theirBubble,
            ]}
          >
            {/* Image attachment */}
            {item.imageUrl ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setSelectedPreviewImage(item.imageUrl || null)}
                onLongPress={() => isMe && handleDeleteMessage(item)}
                style={styles.imageAttachmentContainer}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
                <View style={styles.zoomOverlayIcon}>
                  <Icon source="magnify-plus-outline" size={18} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Message text content */}
            {item.text ? (
              <Text
                style={[
                  styles.messageText,
                  isMe ? styles.myMessageText : styles.theirMessageText,
                ]}
              >
                {item.text}
              </Text>
            ) : null}

            {/* Timestamp & Status ticks */}
            <View style={[styles.metaRow, isMe ? styles.myMetaRow : styles.theirMetaRow]}>
              <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.theirTimeText]}>
                {formatMessageTime(item.createdAt)}
              </Text>

              {isMe && (
                <View style={styles.statusTickContainer}>
                  {isPending ? (
                    <ActivityIndicator size={10} color="#A0BEC0" />
                  ) : isFailed ? (
                    <TouchableOpacity
                      onPress={() => retrySendMessage(item)}
                      style={styles.retryBtn}
                    >
                      <Icon source="alert-circle" size={12} color="#EF4444" />
                      <Text style={styles.retryText}>{translateDynamic('Retry')}</Text>
                    </TouchableOpacity>
                  ) : item.status === 'read' ? (
                    <Icon source="check-all" size={14} color="#38BDF8" />
                  ) : item.status === 'delivered' ? (
                    <Icon source="check-all" size={14} color="#A0BEC0" />
                  ) : (
                    <Icon source="check" size={14} color="#A0BEC0" />
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* 1. NATIVE HEADER (Single, Clean Bar) */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 10) }]}>
        {/* Back Button */}
        <Appbar.BackAction color="#FFFFFF" onPress={handleBackNavigation} />

        {/* Partner Info and Presence Status */}
        <TouchableOpacity
          style={styles.partnerHeaderInfo}
          activeOpacity={0.8}
          onPress={() => {
            if (partnerId && partnerId !== 'seller') {
              navigation.navigate('SellerProfile', { sellerId: partnerId, sellerName: partnerName });
            }
          }}
        >
          <View style={styles.partnerHeaderAvatarWrapper}>
            {effectivePartnerPhoto ? (
              <Image source={{ uri: effectivePartnerPhoto }} style={styles.partnerHeaderAvatar} />
            ) : (
              <View style={styles.partnerHeaderAvatarPlaceholder}>
                <Text style={styles.partnerHeaderAvatarInitial}>
                  {(partnerName || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.presenceDot,
                partnerPresence.online ? styles.presenceOnline : styles.presenceOffline,
              ]}
            />
          </View>

          <View style={styles.partnerTextCol}>
            <View style={styles.partnerTitleRow}>
              <Text numberOfLines={1} style={styles.partnerHeaderName}>
                {partnerName}
              </Text>
              <View style={styles.partnerRoleBadge}>
                <Text style={styles.partnerRoleBadgeText}>{partnerRole}</Text>
              </View>
            </View>

            <View style={styles.statusIndicatorRow}>
              {partnerIsTyping ? (
                <Text style={styles.typingStatusText}>
                  {translateDynamic('Typing...')}
                </Text>
              ) : partnerPresence.online ? (
                <Text style={styles.onlineStatusText}>
                  {translateDynamic('Online')}
                </Text>
              ) : (
                <Text style={styles.offlineStatusText}>
                  {getRelativePresenceTime(partnerPresence.lastSeen)}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Header Right Action Buttons */}
        <View style={styles.headerRightActions}>
          {part?.contactPhone ? (
            <TouchableOpacity
              style={styles.phoneCallBtn}
              activeOpacity={0.8}
              onPress={handleCallPartner}
            >
              <Icon source="phone" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.langBtn}
            activeOpacity={0.8}
            onPress={() => setShowLanguageModal(true)}
          >
            <Icon source="translate" size={17} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. OLX STYLE FLUSH PRODUCT AD BANNER */}
      {part ? (
        <TouchableOpacity
          style={styles.productBannerCard}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('ProductDetail', { part })}
        >
          <Image
            source={{
              uri:
                part.imageUrl ||
                part.partImageUrl ||
                'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=200',
            }}
            style={styles.productBannerImage}
          />
          <View style={styles.productBannerInfo}>
            <Text style={styles.inquiryLabel}>
              {translateDynamic('INQUIRY ITEM')}
            </Text>
            <Text numberOfLines={1} style={styles.productBannerTitle}>
              {part.title || part.partTitle || 'Auto Spare Part'}
            </Text>
            <Text style={styles.productBannerPrice}>
              {formatPrice(Number(part.price || part.partPrice) || 0)}
            </Text>
          </View>
          <View style={styles.viewPartBtn}>
            <Text style={styles.viewPartBtnText}>{translateDynamic('VIEW')}</Text>
            <Icon source="chevron-right" size={14} color="#002F34" />
          </View>
        </TouchableOpacity>
      ) : null}

      {/* 3. MESSAGE FEED + COMPOSER */}
      <KeyboardAvoidingView
        style={styles.contentFlex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageListContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyFeedContainer}>
              <View style={styles.emptyFeedIconCircle}>
                <Icon source="chat-processing-outline" size={32} color="#0066FF" />
              </View>
              <Text style={styles.emptyFeedTitle}>
                {translateDynamic('Chat with')} {partnerName}
              </Text>
              <Text style={styles.emptyFeedSub}>
                {translateDynamic('Ask about part condition, negotiate price, or arrange courier delivery.')}
              </Text>
            </View>
          }
          ListFooterComponent={
            <>
              {partnerIsTyping && (
                <View style={styles.typingIndicatorBubble}>
                  <Text style={styles.typingBubbleText}>
                    {partnerName} {translateDynamic('is typing...')}
                  </Text>
                  <ActivityIndicator size={10} color="#0066FF" />
                </View>
              )}
              {isUploadingImage && (
                <View style={styles.uploadingImageBubble}>
                  <ActivityIndicator size={14} color="#0066FF" />
                  <Text style={styles.uploadingImageText}>
                    {translateDynamic('Uploading image...')}
                  </Text>
                </View>
              )}
            </>
          }
        />

        {/* 4. QUICK REPLIES CHIP BAR */}
        <View style={styles.quickRepliesBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRepliesScroll}
          >
            <View style={styles.zapIconContainer}>
              <Icon source="flash" size={14} color="#F59E0B" />
            </View>
            {getQuickReplies().map((replyText, idx) => (
              <TouchableOpacity
                key={`bar-${idx}`}
                style={styles.quickReplyChip}
                onPress={() => executeSend(replyText)}
                disabled={isSending || isUploadingImage}
                activeOpacity={0.7}
              >
                <Text style={styles.quickReplyChipText}>{replyText}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 5. NATIVE MESSAGE COMPOSER */}
        <View style={[styles.composerContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {/* Direct Camera Button */}
          <TouchableOpacity
            style={styles.mediaIconButton}
            onPress={handlePickImage}
            disabled={isUploadingImage || isSending}
            activeOpacity={0.7}
          >
            <Icon source="camera-outline" size={22} color="#002F34" />
          </TouchableOpacity>

          {/* Direct Gallery Button */}
          <TouchableOpacity
            style={styles.mediaIconButton}
            onPress={handlePickImage}
            disabled={isUploadingImage || isSending}
            activeOpacity={0.7}
          >
            <Icon source="image-outline" size={22} color="#002F34" />
          </TouchableOpacity>

          {/* Native Text Input */}
          <View style={styles.inputBubbleWrap}>
            <TextInput
              placeholder={translateDynamic('Type a message...')}
              value={inputText}
              onChangeText={handleInputChange}
              style={styles.nativeInput}
              placeholderTextColor="#7C8B96"
              multiline
              maxLength={1000}
            />
          </View>

          {/* Circular Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim() ? styles.sendButtonActive : styles.sendButtonDisabled,
            ]}
            onPress={handleSendPress}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.8}
          >
            {isSending ? (
              <ActivityIndicator size={16} color="#FFFFFF" />
            ) : (
              <Icon source="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Fullscreen Image Preview Modal */}
      <Modal
        visible={!!selectedPreviewImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPreviewImage(null)}
      >
        <View style={styles.imageModalContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <TouchableOpacity
            style={styles.closeImageModalBtn}
            onPress={() => setSelectedPreviewImage(null)}
          >
            <Icon source="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedPreviewImage && (
            <Image
              source={{ uri: selectedPreviewImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        visible={showLanguageModal}
        onDismiss={() => setShowLanguageModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F2F4F5',
  },
  contentFlex: {
    flex: 1,
  },
  headerBar: {
    backgroundColor: '#002F34',
    paddingBottom: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#002226',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
    borderRadius: 20,
  },
  partnerHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerHeaderAvatarWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  partnerHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#00A599',
  },
  partnerHeaderAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00A599',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#002F34',
  },
  partnerHeaderAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#002F34',
  },
  presenceOnline: {
    backgroundColor: '#10B981',
  },
  presenceOffline: {
    backgroundColor: '#64748B',
  },
  partnerTextCol: {
    flex: 1,
  },
  partnerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partnerHeaderName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    maxWidth: '75%',
  },
  partnerRoleBadge: {
    backgroundColor: 'rgba(0, 165, 153, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 165, 153, 0.5)',
  },
  partnerRoleBadgeText: {
    color: '#2DD4BF',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusIndicatorRow: {
    marginTop: 2,
  },
  typingStatusText: {
    color: '#2DD4BF',
    fontSize: 11,
    fontWeight: '700',
  },
  onlineStatusText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '600',
  },
  offlineStatusText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  langBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  productBannerImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#F2F4F5',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productBannerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  inquiryLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#002F34',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#002F34',
    marginTop: 2,
  },
  productBannerPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#002F34',
    marginTop: 2,
  },
  viewPartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8DFE2',
    gap: 3,
  },
  viewPartBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#002F34',
  },
  messageListContainer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexGrow: 1,
    backgroundColor: '#F2F4F5',
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
    maxWidth: '82%',
  },
  myMessageRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  theirMessageRow: {
    alignSelf: 'flex-start',
  },
  bubbleWrapper: {
    maxWidth: '100%',
  },
  myBubbleWrapper: {
    alignItems: 'flex-end',
  },
  theirBubbleWrapper: {
    alignItems: 'flex-start',
  },
  bubbleBox: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  myBubble: {
    backgroundColor: '#002F34',
    borderTopRightRadius: 2,
  },
  failedBubble: {
    backgroundColor: '#EF4444',
    borderTopRightRadius: 2,
  },
  theirBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageAttachmentContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
    position: 'relative',
  },
  messageImage: {
    width: SCREEN_WIDTH * 0.6,
    height: 160,
    borderRadius: 10,
  },
  zoomOverlayIcon: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 3,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
    fontWeight: '400',
  },
  theirMessageText: {
    color: '#002F34',
    fontWeight: '400',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    paddingHorizontal: 2,
    gap: 4,
  },
  myMetaRow: {
    justifyContent: 'flex-end',
  },
  theirMetaRow: {
    justifyContent: 'flex-start',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  myTimeText: {
    color: '#A0BEC0',
  },
  theirTimeText: {
    color: '#7C8B96',
  },
  statusTickContainer: {
    marginLeft: 2,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  retryText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  typingIndicatorBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  typingBubbleText: {
    fontSize: 11,
    color: '#7C8B96',
    fontWeight: '600',
  },
  uploadingImageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#E6F4F1',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderTopRightRadius: 2,
    borderWidth: 1,
    borderColor: '#00A599',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  uploadingImageText: {
    fontSize: 11,
    color: '#002F34',
    fontWeight: '700',
  },
  emptyFeedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  emptyFeedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyFeedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#002F34',
    textAlign: 'center',
  },
  emptyFeedSub: {
    fontSize: 13,
    color: '#7C8B96',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  quickRepliesBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
  },
  quickRepliesScroll: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  zapIconContainer: {
    paddingRight: 2,
  },
  quickReplyChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8DFE2',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
    elevation: 1,
  },
  quickReplyChipText: {
    color: '#002F34',
    fontSize: 12,
    fontWeight: '600',
  },
  composerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F2F4F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputBubbleWrap: {
    flex: 1,
    backgroundColor: '#F2F4F5',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 100,
    justifyContent: 'center',
  },
  nativeInput: {
    fontSize: 14,
    color: '#002F34',
    padding: 0,
    margin: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#002F34',
    shadowColor: '#002F34',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#D8DFE2',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageModalBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
});
