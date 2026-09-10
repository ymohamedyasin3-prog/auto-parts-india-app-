import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Platform, 
  StatusBar, 
  TouchableOpacity, 
  Animated, 
  Image,
  Vibration,
  PanResponder
} from 'react-native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFirebaseFirestore, getFirebaseAuth, getCurrentUser } from '../services/firebase';
import { subscribeToUserUnreadCounts, markNotificationAsRead } from '../services/notifications';

import HomeScreen from '../screens/HomeScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import SellPartScreen from '../screens/SellPartScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AuthScreen from '../screens/AuthScreen';
import SellerProfileScreen from '../screens/SellerProfileScreen';
import AdminScreen from '../screens/AdminScreen';
import SplashScreen from '../screens/SplashScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SearchScreen from '../screens/SearchScreen';
import AllCategoriesScreen from '../screens/AllCategoriesScreen';
import MyAdsScreen from '../screens/MyAdsScreen';
import WishlistScreen from '../screens/WishlistScreen';
import RecentlyViewedScreen from '../screens/RecentlyViewedScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import LocationSelectScreen from '../screens/LocationSelectScreen';
import EditListingScreen from '../screens/EditListingScreen';
import { navigationRef, navigate } from './navigationRef';
import { ScalePressable } from '../components/animations';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function CustomSellTabBarButton({ onPress, accessibilityState }: any) {
  const focused = accessibilityState?.selected;
  return (
    <ScalePressable
      scaleTo={0.92}
      onPress={onPress}
      style={tabStyles.customSellButtonTouch}
    >
      <View style={[tabStyles.sellButtonCircle, focused && tabStyles.sellButtonCircleFocused]}>
        <Icon source="plus" color="#FFFFFF" size={30} />
      </View>
      <Text style={tabStyles.sellButtonLabel}>
        SELL
      </Text>
    </ScalePressable>
  );
}

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 6) : insets.bottom;
  const tabHeight = 62 + bottomPadding;

  // Real Presence Heartbeat
  useEffect(() => {
    let interval: any = null;
    const updatePresence = async (isOnline: boolean) => {
      try {
        const user = getCurrentUser();
        const uid = user?.uid || user?.id;
        if (!uid) return;
        const db = getFirebaseFirestore();
        if (db && typeof db.collection === 'function') {
          await db.collection('presence').doc(uid).set({
            online: isOnline,
            lastSeen: Date.now(),
          }, { merge: true });
        }
      } catch (err) {
        console.warn('Presence update error:', err);
      }
    };

    updatePresence(true);
    interval = setInterval(() => {
      updatePresence(true);
    }, 20000);

    return () => {
      if (interval) clearInterval(interval);
      updatePresence(false);
    };
  }, []);

  const [unreadCounts, setUnreadCounts] = useState<{
    unreadChats: number;
    unreadNotifications: number;
    totalUnread: number;
  }>({ unreadChats: 0, unreadNotifications: 0, totalUnread: 0 });

  useEffect(() => {
    let unsubListener = () => {};
    let unsubAuth = () => {};

    try {
      const auth = getFirebaseAuth();
      if (auth && typeof auth.onAuthStateChanged === 'function') {
        unsubAuth = auth.onAuthStateChanged((user: any) => {
          const uid = user?.uid || user?.id;
          unsubListener();
          if (uid) {
            unsubListener = subscribeToUserUnreadCounts(uid, (counts) => {
              setUnreadCounts(counts);
            });
          } else {
            setUnreadCounts({ unreadChats: 0, unreadNotifications: 0, totalUnread: 0 });
          }
        });
      } else {
        const user = getCurrentUser();
        const uid = user?.uid || user?.id;
        if (uid) {
          unsubListener = subscribeToUserUnreadCounts(uid, (counts) => {
            setUnreadCounts(counts);
          });
        }
      }
    } catch (_) {}

    return () => {
      try { unsubAuth(); } catch (_) {}
      try { unsubListener(); } catch (_) {}
    };
  }, []);

  return (
    <Tab.Navigator id="MainTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0066FF',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: Platform.OS === 'android' ? 4 : 0,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
      }}
    >
      {/* 1. HOME TAB */}
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen}
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon source={focused ? "home" : "home-outline"} color={color} size={24} />
          )
        }}
      />

      {/* 2. CHATS TAB - Shows real-time badge when new messages arrive */}
      <Tab.Screen 
        name="ChatsTab" 
        component={ChatsScreen}
        options={{ 
          title: 'Chats',
          tabBarBadge: unreadCounts.unreadChats > 0 ? (unreadCounts.unreadChats > 99 ? '99+' : unreadCounts.unreadChats) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 'bold',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            lineHeight: Platform.OS === 'android' ? 16 : undefined,
          },
          tabBarIcon: ({ color, size, focused }) => (
            <Icon source={focused ? "comment-processing" : "comment-processing-outline"} color={color} size={23} />
          )
        }}
      />

      {/* 3. SELL ACTION TAB (Center elevated blue circle button) */}
      <Tab.Screen 
        name="SellTab" 
        component={SellPartScreen}
        options={{ 
          title: 'SELL',
          tabBarButton: (props) => <CustomSellTabBarButton {...props} />,
        }}
      />

      {/* 4. MY ADS TAB (Clipboard icon matching reference) */}
      <Tab.Screen 
        name="MyAdsTab" 
        component={MyAdsScreen}
        options={{ 
          title: 'My Ads',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon source={focused ? "clipboard-text" : "clipboard-text-outline"} color={color} size={23} />
          )
        }}
      />

      {/* 5. PROFILE TAB */}
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon source={focused ? "account" : "account-outline"} color={color} size={24} />
          )
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Top In-App Floating Notification Banner with Swipe-to-Dismiss Gesture
 */
function InAppNotificationBanner() {
  const insets = useSafeAreaInsets();
  const [activeNotification, setActiveNotification] = useState<any | null>(null);
  const translateY = useRef(new Animated.Value(-160)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const lastNotifIdRef = useRef<string>('');
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    let unsub = () => {};
    let unsubAuth = () => {};

    try {
      const auth = getFirebaseAuth();
      if (auth && typeof auth.onAuthStateChanged === 'function') {
        unsubAuth = auth.onAuthStateChanged((user: any) => {
          const uid = user?.uid || user?.id;
          unsub();
          if (uid) {
            unsub = subscribeToUserUnreadCounts(uid, (counts) => {
              if (counts.latestNotification && counts.latestNotification.id !== lastNotifIdRef.current) {
                lastNotifIdRef.current = counts.latestNotification.id;
                
                // Do not pop banner if user is currently inside this specific chat room
                try {
                  if (navigationRef.isReady()) {
                    const currentRoute = navigationRef.getCurrentRoute();
                    if (currentRoute?.name === 'ChatRoom' && (currentRoute.params as any)?.chatId === counts.latestNotification.chatId) {
                      return;
                    }
                  }
                } catch (_) {}

                // Only show if it's within 1 minute
                const age = Date.now() - (counts.latestNotification.createdAt || 0);
                if (age < 60000) {
                  showBanner(counts.latestNotification);
                }
              }
            });
          }
        });
      }
    } catch (_) {}

    return () => {
      try { unsubAuth(); } catch (_) {}
      try { unsub(); } catch (_) {}
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const showBanner = (notif: any) => {
    setActiveNotification(notif);
    try {
      Vibration.vibrate([0, 80, 50, 80]);
    } catch (_) {}

    translateY.setValue(-160);
    translateX.setValue(0);
    opacity.setValue(1);

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 45,
    }).start();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      dismissUp();
    }, 6000);
  };

  const dismissUp = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -180,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setActiveNotification(null);
    });
  };

  const dismissHorizontal = (direction: 'left' | 'right') => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction === 'left' ? -400 : 400,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      })
    ]).start(() => {
      setActiveNotification(null);
    });
  };

  // PanResponder to handle smooth Swipe Up and Swipe Horizontal gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5 || Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          // Pulling up
          translateY.setValue(gestureState.dy);
        } else {
          // Slight resistance pulling down
          translateY.setValue(gestureState.dy * 0.2);
        }
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped UP significantly -> dismiss
        if (gestureState.dy < -30 || gestureState.vy < -0.5) {
          dismissUp();
        } 
        // If swiped LEFT significantly -> dismiss left
        else if (gestureState.dx < -80 || gestureState.vx < -0.5) {
          dismissHorizontal('left');
        }
        // If swiped RIGHT significantly -> dismiss right
        else if (gestureState.dx > 80 || gestureState.vx > 0.5) {
          dismissHorizontal('right');
        }
        // If it was just a quick TAP (no substantial drag) -> Open chat
        else if (Math.abs(gestureState.dx) < 8 && Math.abs(gestureState.dy) < 8) {
          handleBannerPress();
        } 
        // Otherwise restore position
        else {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              friction: 7,
            }),
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              friction: 7,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const handleBannerPress = () => {
    if (!activeNotification) return;
    const notif = activeNotification;
    dismissUp();

    if (notif.id) {
      markNotificationAsRead(notif.id);
    }

    if (notif.type === 'chat_message' || notif.chatId) {
      navigate('ChatRoom', {
        chatId: notif.chatId,
        part: {
          id: notif.partId,
          title: notif.partTitle,
          imageUrl: notif.partImageUrl,
          price: notif.partPrice,
          sellerId: notif.sellerId,
          sellerName: notif.sellerName,
        },
        chat: {
          id: notif.chatId,
          partId: notif.partId,
          partTitle: notif.partTitle,
          partImageUrl: notif.partImageUrl,
          partPrice: notif.partPrice,
          buyerId: notif.buyerId,
          buyerName: notif.buyerName,
          sellerId: notif.sellerId,
          sellerName: notif.sellerName,
        }
      });
    }
  };

  if (!activeNotification) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        bannerStyles.bannerContainer,
        {
          top: Platform.OS === 'ios' ? insets.top + 6 : 12,
          opacity,
          transform: [
            { translateY },
            { translateX }
          ],
        },
      ]}
    >
      <View style={bannerStyles.bannerCard}>
        {activeNotification.partImageUrl ? (
          <Image source={{ uri: activeNotification.partImageUrl }} style={bannerStyles.bannerThumb} />
        ) : (
          <View style={bannerStyles.bannerIconBox}>
            <Icon source="comment-text" size={22} color="#FFFFFF" />
          </View>
        )}

        <View style={bannerStyles.bannerInfo}>
          <View style={bannerStyles.bannerHeaderRow}>
            <Text style={bannerStyles.bannerSender} numberOfLines={1}>
              {activeNotification.senderName || 'New Message'}
            </Text>
            <Text style={bannerStyles.bannerTag}>Chat</Text>
          </View>
          <Text style={bannerStyles.bannerPartTitle} numberOfLines={1}>
            🚗 {activeNotification.partTitle || 'Auto Spare Part'}
          </Text>
          <Text style={bannerStyles.bannerText} numberOfLines={1}>
            {activeNotification.text || 'Sent you a message'}
          </Text>
        </View>

        {/* Minimalist Swipe Dismiss Indicator */}
        <View style={bannerStyles.swipeIndicatorBox}>
          <Icon source="chevron-up" size={16} color="#64748B" />
        </View>
      </View>
    </Animated.View>
  );
}

const bannerStyles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 99,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  bannerThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  bannerInfo: {
    flex: 1,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerSender: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13,
    flex: 1,
  },
  bannerTag: {
    backgroundColor: '#EFF6FF',
    color: '#0066FF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  bannerPartTitle: {
    color: '#0066FF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  bannerText: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  swipeIndicatorBox: {
    paddingLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const tabStyles = StyleSheet.create({
  customSellButtonTouch: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  sellButtonCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0066FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  sellButtonCircleFocused: {
    backgroundColor: '#0052CC',
    transform: [{ scale: 1.05 }],
  },
  sellButtonLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0066FF',
    marginTop: 2,
    letterSpacing: 0.5,
  },
});

export default function AppNavigator({ user }: { user?: any } = {}) {
  return (
    <View style={{ flex: 1 }}>
      <InAppNotificationBanner />
      <Stack.Navigator id="MainStack"
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: { backgroundColor: '#0B1220' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {
                duration: 140,
              },
            },
            close: {
              animation: 'timing',
              config: {
                duration: 120,
              },
            },
          },
        }}
      >
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="Auth" 
          component={AuthScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="MainTabs" 
          component={TabNavigator}
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="SellPart" 
          component={SellPartScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="ProductDetail" 
          component={ProductDetailScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="ChatRoom" 
          component={ChatRoomScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="SellerProfile" 
          component={SellerProfileScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="Admin" 
          component={AdminScreen}
          options={{ title: 'Admin Moderation' }}
        />

        <Stack.Screen 
          name="Notifications" 
          component={NotificationsScreen}
          options={{ title: 'Notifications & Alerts' }}
        />

        <Stack.Screen 
          name="Search" 
          component={SearchScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="AllCategories" 
          component={AllCategoriesScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="MyAds" 
          component={MyAdsScreen}
          options={{ title: 'My Ads' }}
        />

        <Stack.Screen 
          name="WishlistScreen" 
          component={WishlistScreen}
          options={{ title: 'Saved Parts' }}
        />

        <Stack.Screen 
          name="RecentlyViewedScreen" 
          component={RecentlyViewedScreen}
          options={{ title: 'Recently Viewed' }}
        />

        <Stack.Screen 
          name="SettingsScreen" 
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />

        <Stack.Screen 
          name="HelpSupportScreen" 
          component={HelpSupportScreen}
          options={{ title: 'Help & Support', headerShown: false }}
        />

        <Stack.Screen 
          name="LocationSelectScreen" 
          component={LocationSelectScreen}
          options={{ 
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
          }}
        />

        <Stack.Screen 
          name="EditListing" 
          component={EditListingScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </View>
  );
}
