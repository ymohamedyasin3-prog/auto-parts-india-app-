import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Platform, 
  StatusBar, 
  TouchableOpacity, 
  Animated, 
  Image,
  Vibration 
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
import { navigationRef, navigate } from './navigationRef';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function CustomSellTabBarButton({ onPress, accessibilityState }: any) {
  const focused = accessibilityState?.selected;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={tabStyles.customSellButtonTouch}
    >
      <View style={[tabStyles.sellButtonCircle, focused && tabStyles.sellButtonCircleFocused]}>
        <Icon source="plus" color="#FFFFFF" size={30} />
      </View>
      <Text style={tabStyles.sellButtonLabel}>
        SELL
      </Text>
    </TouchableOpacity>
  );
}

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 6) : insets.bottom;
  const tabHeight = 62 + bottomPadding;

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
 * Top In-App Floating Notification Banner Component
 */
function InAppNotificationBanner() {
  const insets = useSafeAreaInsets();
  const [activeNotification, setActiveNotification] = useState<any | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
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
      Vibration.vibrate(100);
    } catch (_) {}

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      hideBanner();
    }, 6000);
  };

  const hideBanner = () => {
    Animated.timing(translateY, {
      toValue: -140,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setActiveNotification(null);
    });
  };

  const handleBannerPress = () => {
    if (!activeNotification) return;
    const notif = activeNotification;
    hideBanner();

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
      style={[
        bannerStyles.bannerContainer,
        {
          top: Platform.OS === 'ios' ? insets.top + 6 : 12,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={bannerStyles.bannerCard}
        onPress={handleBannerPress}
      >
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

        <TouchableOpacity onPress={hideBanner} style={bannerStyles.closeBtn}>
          <Icon source="close" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </TouchableOpacity>
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
    backgroundColor: '#0F1E36',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#0066FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  bannerThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#1E293B',
  },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0066FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    flex: 1,
  },
  bannerTag: {
    backgroundColor: '#0066FF',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bannerPartTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  bannerText: {
    color: '#E2E8F0',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 6,
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
          options={{ title: 'Sell Spare Part' }}
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
          options={{ title: 'Seller Profile' }}
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
      </Stack.Navigator>
    </View>
  );
}
