import React, { useEffect, useRef } from 'react';
import { 
  Animated, 
  View, 
  StatusBar, 
  StyleSheet, 
  SafeAreaView, 
  Image,
  Dimensions
} from 'react-native';
import { Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from '../services/firebase';
import { AppLogo } from '../components/AppLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SplashScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const footerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(footerFade, {
        toValue: 1,
        duration: 700,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Check persistent login state: if already signed in, enter MainTabs; otherwise show Auth
    const checkAuthAndNavigate = async () => {
      try {
        let user = getCurrentUser();
        if (!user || (!user.uid && !user.id)) {
          const rawStored = await AsyncStorage.getItem('@autoparts_current_user');
          if (rawStored) {
            try {
              user = JSON.parse(rawStored);
            } catch (_) {}
          }
        }

        const targetScreen = (user && (user.uid || user.id)) ? 'MainTabs' : 'Auth';

        if (navigation?.reset) {
          navigation.reset({
            index: 0,
            routes: [{ name: targetScreen }],
          });
        } else if (navigation?.replace) {
          navigation.replace(targetScreen);
        } else if (navigation?.navigate) {
          navigation.navigate(targetScreen);
        }
      } catch (e) {
        try {
          navigation?.navigate('Auth');
        } catch (_) {}
      }
    };

    const timer = setTimeout(() => {
      checkAuthAndNavigate();
    }, 1400);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0075FF" translucent={false} />

      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1 }} />

        {/* CENTER EMBLEM & TYPOGRAPHY MATCHING REFERENCE IMAGE */}
        <Animated.View 
          style={[
            styles.centerBrandBlock, 
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          {/* Crisp High-Res Brand Mark that exactly matches reference image with no collapse */}
          <AppLogo width={Math.min(SCREEN_WIDTH * 0.72, 260)} height={Math.round(Math.min(SCREEN_WIDTH * 0.72, 260) * 0.72)} />
        </Animated.View>

        <View style={{ flex: 1 }} />

        {/* FOOTER TAGLINE MATCHING EXACT REFERENCE IMAGE */}
        <Animated.View style={[styles.footerBlock, { opacity: footerFade }]}>
          <Text style={styles.footerTagline}>India’s leading marketplace</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0075FF', // Vibrant Electric Royal Blue matching reference image
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 44,
  },
  centerBrandBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  brandLogoImage: {
    width: Math.min(SCREEN_WIDTH * 0.72, 260),
    height: Math.min(SCREEN_WIDTH * 0.72, 260),
  },
  footerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  footerTagline: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.2,
    opacity: 0.96,
  },
});

