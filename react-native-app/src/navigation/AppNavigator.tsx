import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFirebaseFirestore, getFirebaseAuth } from '../services/firebase';

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

      {/* 2. CHATS TAB - No badge, clean icon matching reference */}
      <Tab.Screen 
        name="ChatsTab" 
        component={ChatsScreen}
        options={{ 
          title: 'Chats',
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
        options={{ title: 'Part Details' }}
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
        options={{ title: 'Notifications & Announcements' }}
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

  );
}

const styles = StyleSheet.create({
  iconBtn: {
    margin: 0,
    padding: 0,
  },
});
