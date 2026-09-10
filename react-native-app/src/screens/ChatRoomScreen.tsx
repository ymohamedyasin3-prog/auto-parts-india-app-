import React, { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { getFirebaseFirestore, getCurrentUser, getFirebaseAuth } from '../services/firebase';
import { sendChatMessageNotification, markNotificationAsRead } from '../services/notifications';
import { promptImageSourceDialog } from '../services/imagePickerService';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinary';
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
  isDeleted?: boolean;
  deletedFor?: string[];
}

export default function ChatRoomScreen({ route, navigation, user: initialUser }: any) {
  const insets = useSafeAreaInsets();
  const { language, t, translateDynamic } = useLanguage();

  const {
    chatId: routeChatId,
    part: routePart,
    chat: routeChat,
    partnerId: routePartnerId,
    partnerPhoto: routePartnerPhoto,
    partnerName: routePartnerName,
  } = route.params || {};

  const [activeUser, setActiveUser] = useState<any>(initialUser || getCurrentUser());

  useEffect(() => {
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
          if (u) setActiveUser(u);
        });
      }
    } catch (_) {}

    return () => {
      try { unsubAuth(); } catch (_) {}
    };
  }, []);

  const currentUid = activeUser?.uid || activeUser?.id || 'guest';
  const currentName = activeUser?.displayName || activeUser?.name || activeUser?.email?.split('@')[0] || 'User';
  const currentUserPhoto = activeUser?.photoURL || activeUser?.profilePhoto || '';

  const getCleanId = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.id || val.uid || val._id || '';
    return String(val);
  };

  // Determine item & chatId
  const part = routePart || (routeChat ? {
    id: routeChat.partId,
    title: routeChat.partTitle,
    imageUrl: routeChat.partImageUrl,
    price: routeChat.partPrice,
    sellerId: routeChat.sellerId,
    sellerName: routeChat.sellerName,
    sellerPhoto: routeChat.sellerPhoto,
    contactPhone: routeChat.contactPhone,
  } : null);

  const chatId = routeChatId || (part && currentUid ? `${currentUid}_${getCleanId(part.sellerId) || 'seller'}_${part.id || 'item'}` : 'default_chat');

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

  const buyerId = getCleanId(mergedChat?.buyerId);
  const sellerId = getCleanId(mergedChat?.sellerId) || getCleanId(part?.sellerId);

  // Partner Identification logic
  const isCurrentUserBuyer = sellerId
    ? sellerId !== currentUid
    : (buyerId ? buyerId === currentUid : true);

  // Compute partnerId accurately
  let resolvedPartnerId = getCleanId(routePartnerId);
  if (!resolvedPartnerId || resolvedPartnerId === 'seller' || resolvedPartnerId === 'buyer') {
    if (sellerId && sellerId !== currentUid) {
      resolvedPartnerId = sellerId;
    } else if (buyerId && buyerId !== currentUid) {
      resolvedPartnerId = buyerId;
    } else if (Array.isArray(mergedChat?.participants)) {
      const other = mergedChat.participants.find((p: any) => {
        const pid = getCleanId(p);
        return pid && pid !== currentUid && pid !== 'seller' && pid !== 'buyer';
      });
      if (other) resolvedPartnerId = getCleanId(other);
    }
  }

  const partnerId = resolvedPartnerId || (isCurrentUserBuyer ? sellerId : buyerId) || 'seller';

  const partnerName = routePartnerName || (mergedChat
    ? (isCurrentUserBuyer ? (mergedChat.sellerName || 'Verified Seller') : (mergedChat.buyerName || 'Buyer'))
    : (part ? (part.sellerName || 'Verified Seller') : 'Seller'));
  const partnerRole = isCurrentUserBuyer ? 'Seller' : 'Buyer';

  const partnerPhoto = (
    routePartnerPhoto ||
    mergedChat?.partnerPhoto ||
    (isCurrentUserBuyer
      ? (mergedChat?.sellerPhoto || mergedChat?.sellerPhotoURL || mergedChat?.sellerAvatar)
      : (mergedChat?.buyerPhoto || mergedChat?.buyerPhotoURL || mergedChat?.buyerAvatar)) ||
    part?.sellerPhoto ||
    part?.sellerPhotoURL ||
    ''
  );

  const [livePartnerPhoto, setLivePartnerPhoto] = useState<string | null>(partnerPhoto || null);

  useEffect(() => {
    if (!partnerId || partnerId === 'seller' || partnerId === 'buyer') return;
    let unsub = () => {};
    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        unsub = db.collection('users').doc(partnerId).onSnapshot((docSnap: any) => {
          const exists = typeof docSnap?.exists === 'function' ? docSnap.exists() : Boolean(docSnap?.exists);
          if (exists) {
            const uData = typeof docSnap?.data === 'function' ? docSnap.data() : docSnap?.data;
            const photo =
              uData?.photoURL ||
              uData?.profilePhoto ||
              uData?.profileImageUrl ||
              uData?.avatarUrl ||
              uData?.photo ||
              uData?.customPhoto ||
              null;
            if (photo) {
              setLivePartnerPhoto(photo);
            }
          }
        }, () => {});
      }
    } catch (_) {}
    return () => { try { unsub(); } catch (_) {} };
  }, [partnerId]);

  const effectivePartnerPhoto = livePartnerPhoto || partnerPhoto || null;

  // State Management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [uploadingImageUri, setUploadingImageUri] = useState<string | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Unified Back Navigation Logic
  const handleBackNavigation = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs', { screen: 'ChatsTab' });
    }
    return true; // Prevent default behavior
  }, [navigation]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackNavigation);
    return () => backHandler.remove();
  }, [handleBackNavigation]);

  // Presence & Typing State
  const [partnerPresence, setPartnerPresence] = useState<{ online: boolean; lastSeen: number }>({
    online: false,
    lastSeen: 0,
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
            const data = docSnap?.data ? docSnap.data() : (docSnap?.exists ? docSnap.data() : null);
            if (data && typeof data === 'object') {
              const lastSeen = data.lastSeen || 0;
              const active = data.online === true && (Date.now() - lastSeen < 60000);
              setPartnerPresence({
                online: active,
                lastSeen: lastSeen,
              });
            } else {
              // Try fallback to users/{partnerId} collection if presence doc doesn't exist
              db.collection('users').doc(partnerId).get().then((userSnap: any) => {
                const uData = userSnap?.data ? userSnap.data() : null;
                if (uData && uData.online === true && (Date.now() - (uData.lastSeen || 0) < 60000)) {
                  setPartnerPresence({
                    online: true,
                    lastSeen: uData.lastSeen || Date.now(),
                  });
                } else {
                  setPartnerPresence({
                    online: false,
                    lastSeen: uData?.lastSeen || 0,
                  });
                }
              }).catch(() => {
                setPartnerPresence({ online: false, lastSeen: 0 });
              });
            }
          },
          (err: any) => {
            console.warn('[ChatRoomScreen] Presence error:', err);
            setPartnerPresence({ online: false, lastSeen: 0 });
          }
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
      
      const resolvedBuyerPhoto = isCurrentUserBuyer
        ? (currentUserPhoto || mergedChat?.buyerPhoto || '')
        : (effectivePartnerPhoto || mergedChat?.buyerPhoto || '');
      const resolvedSellerPhoto = !isCurrentUserBuyer
        ? (currentUserPhoto || mergedChat?.sellerPhoto || '')
        : (effectivePartnerPhoto || mergedChat?.sellerPhoto || '');

      await chatDocRef.set(
        {
          id: chatId,
          partId: part?.id || mergedChat?.partId || '',
          partTitle: part?.title || part?.partTitle || mergedChat?.partTitle || 'Spare Part',
          partImageUrl: part?.imageUrl || part?.partImageUrl || mergedChat?.partImageUrl || '',
          partPrice: Number(part?.price || part?.partPrice || mergedChat?.partPrice) || 0,
          buyerId: resolvedBuyerId,
          buyerName: resolvedBuyerName,
          buyerPhoto: resolvedBuyerPhoto,
          sellerId: resolvedSellerId,
          sellerName: resolvedSellerName,
          sellerPhoto: resolvedSellerPhoto,
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

  // 4. Instant WhatsApp-Style Image Attachment with Real-time Optimistic Preview
  const handlePickImage = async () => {
    try {
      const selectedUri = await promptImageSourceDialog(
        translateDynamic('Attach Photo'),
        translateDynamic('Select camera or gallery to share spare part images')
      );

      if (selectedUri) {
        // Show instant preview bubble right away (WhatsApp Experience)
        setUploadingImageUri(selectedUri);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        try {
          const cloudinaryUrl = await uploadImageToCloudinary(selectedUri, 'chat_attachments');
          // Send either the secure cloudinary URL or the base64/URI directly
          await executeSend('', cloudinaryUrl || selectedUri);
        } catch (err) {
          console.warn('[ChatRoomScreen] Image upload error:', err);
          // Still attempt to send with local/direct URI rather than completely failing
          try {
            await executeSend('', selectedUri);
          } catch (_) {
            Alert.alert('Upload Failed', 'Could not send photo. Please try again.');
          }
        } finally {
          setUploadingImageUri(null);
        }
      }
    } catch (err) {
      console.warn('[ChatRoomScreen] Image picker dialog error:', err);
      setUploadingImageUri(null);
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
    const phone = part?.contactPhone || mergedChat?.partnerPhone || mergedChat?.sellerPhone || mergedChat?.contactPhone;
    if (phone) {
      Alert.alert(
        'Call ' + (partnerName || 'Partner'),
        `Do you want to call ${partnerName || 'the partner'} at ${phone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call Now',
            onPress: () => Linking.openURL(`tel:${phone}`),
          },
        ]
      );
    } else {
      Alert.alert(
        'Contact ' + (partnerName || 'Seller'),
        `Phone number is kept private by ${partnerName || 'this user'}. You can ask for their contact number in this chat or visit their profile.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Ask for Phone',
            onPress: () => executeSend('Could you please share your contact phone number?'),
          },
        ]
      );
    }
  };

  const isSameDay = (ts1: any, ts2: any) => {
    const d1 = new Date(parseTimestamp(ts1));
    const d2 = new Date(parseTimestamp(ts2));
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const getDisplayDateLabel = (ts: any) => {
    const d = new Date(parseTimestamp(ts));
    const now = new Date();
    if (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    ) {
      return translateDynamic('Today');
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate()
    ) {
      return translateDynamic('Yesterday');
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  // Local deleted messages state for current chat
  const [localDeletedMsgIds, setLocalDeletedMsgIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!chatId) return;
    let isMounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(`@autoparts_deleted_messages_${chatId}`);
        if (raw && isMounted) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            setLocalDeletedMsgIds(new Set<string>(arr));
          }
        }
      } catch (_) {}
    })();
    return () => { isMounted = false; };
  }, [chatId]);

  const clearedAtTimestamp = mergedChat?.clearedAt?.[currentUid] || remoteChatDoc?.clearedAt?.[currentUid] || 0;
  const visibleMessages = messages.filter((msg) => {
    if (!msg || !msg.id) return false;
    if (localDeletedMsgIds.has(msg.id)) return false;
    if (Array.isArray(msg.deletedFor) && msg.deletedFor.some((id: any) => String(id) === String(currentUid) || String(id) === String(activeUser?.uid) || String(id) === String(activeUser?.id))) {
      return false;
    }
    const msgTime = parseTimestamp(msg.createdAt);
    if (clearedAtTimestamp > 0 && msgTime <= clearedAtTimestamp) {
      return false;
    }
    return true;
  });

  const handleMessageAction = (msgItem: ChatMessage) => {
    if (msgItem.isDeleted) return;

    const myUid = activeUser?.uid || activeUser?.id || currentUid;
    const myEmail = (activeUser?.email || '').toLowerCase();
    const isMe =
      msgItem.senderId === myUid ||
      msgItem.senderId === currentUid ||
      (myEmail && (msgItem.senderId || '').toLowerCase() === myEmail);
    const msgTime = parseTimestamp(msgItem.createdAt);
    const isWithin15Min = Date.now() - msgTime <= 15 * 60 * 1000;

    const buttons: any[] = [];

    // Copy text if present
    if (msgItem.text) {
      buttons.push({
        text: translateDynamic('Copy Text'),
        onPress: () => {
          Alert.alert(translateDynamic('Copied'), translateDynamic('Message text copied to clipboard'));
        },
      });
    }

    // Delete for Me (always available)
    buttons.push({
      text: translateDynamic('Delete for Me'),
      onPress: async () => {
        try {
          if (msgItem.id && chatId) {
            setLocalDeletedMsgIds((prev) => {
              const next = new Set(prev);
              next.add(msgItem.id);
              AsyncStorage.setItem(`@autoparts_deleted_messages_${chatId}`, JSON.stringify(Array.from(next))).catch(() => {});
              return next;
            });
          }
          const db = getFirebaseFirestore();
          if (db && typeof db.collection === 'function' && chatId && msgItem.id) {
            const msgRef = db.collection('chats').doc(chatId).collection('messages').doc(msgItem.id);
            const docSnap = await msgRef.get();
            const currentDeletedFor = docSnap?.exists ? (docSnap.data()?.deletedFor || []) : [];
            const nextDeletedFor = Array.from(new Set([...currentDeletedFor, currentUid, activeUser?.uid, activeUser?.id].filter(Boolean)));
            await msgRef.set({ deletedFor: nextDeletedFor }, { merge: true });
          }
          setMessages((prev) => prev.filter((m) => m.id !== msgItem.id));
        } catch (err) {
          console.warn('[ChatRoomScreen] Delete for me error:', err);
        }
      },
    });

    // Delete for Everyone (if sent by current user and within 15 minutes)
    if (isMe) {
      if (isWithin15Min) {
        buttons.push({
          text: translateDynamic('Delete for Everyone'),
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getFirebaseFirestore();
              if (db && typeof db.collection === 'function' && chatId && msgItem.id) {
                
                // If it's an image message, delete from Cloudinary backend first
                if (msgItem.imageUrl) {
                  try {
                    await deleteImageFromCloudinary(msgItem.imageUrl);
                    console.log('[ChatRoomScreen] Image deleted from backend');
                  } catch (imgError) {
                    console.warn('[ChatRoomScreen] Failed to delete image from backend', imgError);
                  }
                }

                await db
                  .collection('chats')
                  .doc(chatId)
                  .collection('messages')
                  .doc(msgItem.id)
                  .set({
                    isDeleted: true,
                    text: 'This message was deleted',
                    imageUrl: null,
                  }, { merge: true });

                await db.collection('chats').doc(chatId).set({
                  lastMessageText: 'This message was deleted',
                }, { merge: true });
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgItem.id
                    ? { ...m, isDeleted: true, text: 'This message was deleted', imageUrl: null }
                    : m
                )
              );
            } catch (err: any) {
              console.warn('[ChatRoomScreen] Delete for everyone error:', err);
            }
          },
        });
      } else {
        buttons.push({
          text: translateDynamic('Delete for Everyone (15m Limit Expired)'),
          onPress: () => {
            Alert.alert(
              translateDynamic('15-Minute Limit Expired'),
              translateDynamic('Delete for everyone is only available within 15 minutes of sending.')
            );
          },
        });
      }
    }

    buttons.push({ text: translateDynamic('Cancel'), style: 'cancel' });

    Alert.alert(translateDynamic('Message Options'), undefined, buttons);
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const myUid = activeUser?.uid || activeUser?.id || currentUid;
    const myEmail = (activeUser?.email || '').toLowerCase();
    const isMe =
      item.senderId === myUid ||
      item.senderId === currentUid ||
      (myEmail && (item.senderId || '').toLowerCase() === myEmail);
    const isFailed = item.status === 'failed';
    const isPending = item.status === 'pending';

    const prevMessage = index > 0 ? visibleMessages[index - 1] : null;
    const showDatePill = !prevMessage || !isSameDay(prevMessage.createdAt, item.createdAt);

    return (
      <View key={item.id}>
        {showDatePill && (
          <View style={styles.dateSeparatorWrap}>
            <View style={styles.dateSeparatorPill}>
              <Text style={styles.dateSeparatorText}>
                {getDisplayDateLabel(item.createdAt)}
              </Text>
            </View>
          </View>
        )}

        <View
          style={[
            styles.messageRow,
            isMe ? styles.myMessageRow : styles.theirMessageRow,
          ]}
        >
          {!isMe && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (partnerId && partnerId !== 'seller' && partnerId !== 'buyer') {
                  navigation.navigate('SellerProfile', { sellerId: partnerId, sellerName: partnerName });
                }
              }}
              style={styles.messageSenderAvatarWrap}
            >
              {effectivePartnerPhoto ? (
                <Image source={{ uri: effectivePartnerPhoto }} style={styles.messageSenderAvatar} />
              ) : (
                <View style={styles.messageSenderAvatarPlaceholder}>
                  <Text style={styles.messageSenderAvatarInitial}>
                    {(partnerName || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <View style={[styles.bubbleWrapper, isMe ? styles.myBubbleWrapper : styles.theirBubbleWrapper]}>
            <TouchableOpacity
              activeOpacity={0.88}
              onLongPress={() => handleMessageAction(item)}
              style={[
                styles.bubbleBox,
                item.isDeleted
                  ? styles.deletedBubble
                  : isMe
                    ? isFailed
                      ? styles.failedBubble
                      : item.imageUrl && !item.text
                        ? styles.imageOnlyBubble
                        : styles.myBubble
                    : styles.theirBubble,
                item.imageUrl && !item.text && { padding: 0, overflow: 'hidden' },
              ]}
            >
              {item.isDeleted ? (
                <View style={styles.deletedMessageRow}>
                  <Icon source="cancel" size={14} color="#64748B" />
                  <Text style={styles.deletedMessageText}>
                    {translateDynamic('This message was deleted')}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Image attachment */}
                  {item.imageUrl ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setSelectedPreviewImage(item.imageUrl || null)}
                      onLongPress={() => handleMessageAction(item)}
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
                </>
              )}

              {/* Timestamp & Status ticks */}
              <View style={[styles.metaRow, isMe && !item.isDeleted ? styles.myMetaRow : styles.theirMetaRow]}>
                <Text style={[styles.timeText, isMe && !item.isDeleted ? styles.myTimeText : styles.theirTimeText]}>
                  {formatMessageTime(item.createdAt)}
                </Text>

                {isMe && !item.isDeleted && (
                  <View style={styles.statusTickContainer}>
                    {isPending ? (
                      <ActivityIndicator size={10} color="#BAE6FD" />
                    ) : isFailed ? (
                      <TouchableOpacity
                        onPress={() => retrySendMessage(item)}
                        style={styles.retryBtn}
                      >
                        <Icon source="alert-circle" size={12} color="#EF4444" />
                        <Text style={styles.retryText}>{translateDynamic('Retry')}</Text>
                      </TouchableOpacity>
                    ) : item.status === 'read' ? (
                      <Icon source="check-all" size={14} color="#FFFFFF" />
                    ) : item.status === 'delivered' ? (
                      <Icon source="check-all" size={14} color="rgba(255,255,255,0.7)" />
                    ) : (
                      <Icon source="check" size={14} color="rgba(255,255,255,0.7)" />
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />

      {/* 1. ROYAL BLUE HEADER */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 10) }]}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBackNavigation}
          activeOpacity={0.7}
        >
          <Icon source="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Partner Info and Presence Status */}
        <TouchableOpacity
          style={styles.partnerHeaderInfo}
          activeOpacity={0.8}
          onPress={() => {
            if (partnerId && partnerId !== 'seller' && partnerId !== 'buyer') {
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
          </View>

          <View style={styles.partnerTextCol}>
            <Text numberOfLines={1} style={styles.partnerHeaderName}>
              {partnerName}
            </Text>

            <View style={styles.statusIndicatorRow}>
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: partnerPresence.online ? '#22C55E' : '#94A3B8' },
                ]}
              />
              {partnerIsTyping ? (
                <Text style={styles.onlineStatusText}>
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

        {/* Header Right Action Buttons: Phone & 3-Dots */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerRightBtn}
            activeOpacity={0.7}
            onPress={handleCallPartner}
          >
            <Icon source="phone" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerRightBtn}
            activeOpacity={0.7}
            onPress={() => setShowOptionsMenu(true)}
          >
            <Icon source="dots-vertical" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. PRODUCT INQUIRY CARD BANNER */}
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
            <Text numberOfLines={1} style={styles.productBannerTitle}>
              {part.title || part.partTitle || 'Auto Spare Part'}
            </Text>
            <Text style={styles.productBannerPrice}>
              {formatPrice(Number(part.price || part.partPrice) || 0)}
            </Text>
          </View>
          <Icon source="chevron-right" size={24} color="#64748B" />
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
          data={visibleMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageListContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyFeedContainer}>
              <View style={styles.emptyFeedIconCircle}>
                <Icon source="chat-processing-outline" size={32} color="#0072F5" />
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
                  <ActivityIndicator size={10} color="#0072F5" />
                </View>
              )}
              {uploadingImageUri && (
                <View style={styles.uploadingImageCard}>
                  <Image source={{ uri: uploadingImageUri }} style={styles.uploadingImageThumb} resizeMode="cover" />
                  <View style={styles.uploadingImageOverlay}>
                    <View style={styles.uploadingSpinnerCircle}>
                      <ActivityIndicator size={20} color="#FFFFFF" />
                    </View>
                    <Text style={styles.uploadingImageOverlayText}>
                      {translateDynamic('Sending photo...')}
                    </Text>
                  </View>
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
                disabled={isSending || !!uploadingImageUri}
                activeOpacity={0.7}
              >
                <Text style={styles.quickReplyChipText}>{replyText}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Emoji Picker Drawer if opened */}
        {showEmojiPicker && (
          <View style={styles.emojiPickerBar}>
            {['👍', '👌', '🤝', '🚗', '🔧', '✅', '🙏', '😊', '💰', '📦'].map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiItem}
                onPress={() => {
                  setInputText((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                }}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 5. NATIVE MESSAGE COMPOSER */}
        <View style={[styles.composerContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {/* Paperclip Attachment Button */}
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handlePickImage}
            disabled={!!uploadingImageUri || isSending}
            activeOpacity={0.7}
          >
            <Icon source="paperclip" size={24} color="#64748B" />
          </TouchableOpacity>

          {/* Capsule Text Input */}
          <View style={styles.inputBubbleWrap}>
            <TextInput
              placeholder={translateDynamic('Type a message...')}
              value={inputText}
              onChangeText={handleInputChange}
              style={styles.nativeInput}
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={styles.emojiBtn}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              activeOpacity={0.7}
            >
              <Icon source="emoticon-happy-outline" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Circular Blue Send Button */}
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

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsCard}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>{partnerName}</Text>
              <TouchableOpacity onPress={() => setShowOptionsMenu(false)}>
                <Icon source="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                handleCallPartner();
              }}
            >
              <Icon source="phone-outline" size={20} color="#0072F5" />
              <Text style={styles.optionItemText}>{translateDynamic('Call Partner')}</Text>
            </TouchableOpacity>

            {partnerId && partnerId !== 'seller' && (
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  navigation.navigate('SellerProfile', { sellerId: partnerId, sellerName: partnerName });
                }}
              >
                <Icon source="account-circle-outline" size={20} color="#0072F5" />
                <Text style={styles.optionItemText}>{translateDynamic('View Profile')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowLanguageModal(true);
              }}
            >
              <Icon source="translate" size={20} color="#0072F5" />
              <Text style={styles.optionItemText}>{translateDynamic('Change Chat Language')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                Alert.alert(
                  translateDynamic('Clear Chat History'),
                  translateDynamic('Are you sure you want to clear all messages in this conversation for you?'),
                  [
                    { text: translateDynamic('Cancel'), style: 'cancel' },
                    {
                      text: translateDynamic('Clear Chat'),
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const db = getFirebaseFirestore();
                          if (db && typeof db.collection === 'function' && chatId) {
                            await db.collection('chats').doc(chatId).set({
                              clearedAt: {
                                ...(remoteChatDoc?.clearedAt || {}),
                                [currentUid]: Date.now(),
                              },
                            }, { merge: true });
                          }
                          setMessages([]);
                        } catch (err) {
                          console.warn('Error clearing chat:', err);
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Icon source="delete-sweep-outline" size={20} color="#EF4444" />
              <Text style={[styles.optionItemText, { color: '#EF4444' }]}>
                {translateDynamic('Clear Chat History')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                Alert.alert(
                  'Report or Block',
                  `Do you want to report or block ${partnerName}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Block User',
                      style: 'destructive',
                      onPress: () => Alert.alert('User Blocked', 'You will no longer receive messages from this user.'),
                    },
                  ]
                );
              }}
            >
              <Icon source="alert-octagon-outline" size={20} color="#EF4444" />
              <Text style={[styles.optionItemText, { color: '#EF4444' }]}>
                {translateDynamic('Block / Report User')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
    backgroundColor: '#F4F6F9',
  },
  contentFlex: {
    flex: 1,
  },
  headerBar: {
    backgroundColor: '#0066FF',
    paddingBottom: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#0052CC',
    elevation: 4,
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
    borderRadius: 20,
  },
  partnerHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerHeaderAvatarWrapper: {
    marginRight: 10,
  },
  partnerHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  partnerHeaderAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0072F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  partnerHeaderAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  partnerTextCol: {
    flex: 1,
  },
  partnerHeaderName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
    marginRight: 5,
  },
  onlineStatusText: {
    color: '#E0F2FE',
    fontSize: 11,
    fontWeight: '500',
  },
  offlineStatusText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '400',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerRightBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  productBannerImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productBannerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  productBannerPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0066FF',
    marginTop: 2,
  },
  messageListContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexGrow: 1,
    backgroundColor: '#F4F6F9',
  },
  dateSeparatorWrap: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateSeparatorPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
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
    alignItems: 'flex-end',
  },
  messageSenderAvatarWrap: {
    marginRight: 8,
    marginBottom: 4,
    alignSelf: 'flex-end',
  },
  messageSenderAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  messageSenderAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0072F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageSenderAvatarInitial: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#0072F5',
    borderTopRightRadius: 4,
  },
  imageOnlyBubble: {
    backgroundColor: 'transparent',
  },
  failedBubble: {
    backgroundColor: '#EF4444',
    borderTopRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
  },
  deletedBubble: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  deletedMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  deletedMessageText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#64748B',
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
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
    fontWeight: '400',
  },
  theirMessageText: {
    color: '#1E293B',
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
    color: 'rgba(255,255,255,0.85)',
  },
  theirTimeText: {
    color: '#94A3B8',
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
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  typingBubbleText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  uploadingImageCard: {
    alignSelf: 'flex-end',
    width: 140,
    height: 140,
    borderRadius: 14,
    borderTopRightRadius: 2,
    marginVertical: 4,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  uploadingImageThumb: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  uploadingImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingSpinnerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadingImageOverlayText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
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
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyFeedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptyFeedSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  quickRepliesBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  emojiPickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  emojiItem: {
    padding: 6,
  },
  emojiText: {
    fontSize: 22,
  },
  composerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputBubbleWrap: {
    flex: 1,
    backgroundColor: '#F1F4F8',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    flexDirection: 'row',
    alignItems: 'center',
    maxHeight: 100,
  },
  nativeInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    padding: 0,
    margin: 0,
  },
  emojiBtn: {
    padding: 4,
    marginLeft: 4,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#0072F5',
    shadowColor: '#0072F5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  optionsCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  optionItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
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
