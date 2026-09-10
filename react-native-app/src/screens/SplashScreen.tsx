import React, { useEffect, useRef, useState } from 'react';
import { 
  Animated, 
  View, 
  StatusBar, 
  StyleSheet, 
  SafeAreaView, 
  Image,
  Dimensions,
  Alert,
  Linking
} from 'react-native';
import { Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, getFirebaseFirestore } from '../services/firebase';
import { AppLogo } from '../components/AppLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Current Hardcoded Version for this app build
const CURRENT_APP_VERSION = '1.0.0';

function isVersionLower(current: string, required: string) {
  const cParts = current.split('.').map(Number);
  const rParts = required.split('.').map(Number);
  for (let i = 0; i < Math.max(cParts.length, rParts.length); i++) {
    const c = cParts[i] || 0;
    const r = rParts[i] || 0;
    if (c < r) return true;
    if (c > r) return false;
  }
  return false;
}

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

    const proceedToApp = async () => {
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
          navigation.reset({ index: 0, routes: [{ name: targetScreen }] });
        } else if (navigation?.replace) {
          navigation.replace(targetScreen);
        } else if (navigation?.navigate) {
          navigation.navigate(targetScreen);
        }
      } catch (e) {
        try { navigation?.navigate('Auth'); } catch (_) {}
      }
    };

    const checkAppUpdate = async () => {
      let hasProceeded = false;
      const safeProceed = () => {
        if (!hasProceeded) {
          hasProceeded = true;
          proceedToApp();
        }
      };

      // Fallback timer in case network / Firestore check hangs indefinitely
      const fallbackTimer = setTimeout(() => {
        safeProceed();
      }, 3500);

      try {
        const db = getFirebaseFirestore();
        if (!db) {
          clearTimeout(fallbackTimer);
          safeProceed();
          return;
        }

        const snap = await Promise.race([
          db.collection('app_version').doc('config').get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]) as any;

        clearTimeout(fallbackTimer);

        if (snap && snap.exists) {
          const config = snap.data();
          const minVersion = config?.minimumSupportedVersion || '1.0.0';
          const forceUpdate = config?.forceUpdate === true;
          const apkUrl = config?.apkDownloadUrl || config?.playStoreUrl || '';
          
          if (isVersionLower(CURRENT_APP_VERSION, minVersion)) {
            // Needs Update
            const promptUpdate = () => {
              Alert.alert(
                'Update Required',
                'A new version of the app is available. Please update to continue using the app.',
                [
                  {
                    text: 'Update Now',
                    onPress: () => {
                      if (apkUrl) Linking.openURL(apkUrl).catch(() => {});
                      if (forceUpdate) {
                        setTimeout(promptUpdate, 1000);
                      } else {
                        safeProceed();
                      }
                    }
                  },
                  ...(forceUpdate ? [] : [{ text: 'Later', onPress: safeProceed, style: 'cancel' }])
                ],
                { cancelable: !forceUpdate }
              );
            };
            promptUpdate();
            return;
          }
        }
      } catch (err) {
        console.warn('Update check failed or timed out:', err);
      }
      safeProceed();
    };

    const timer = setTimeout(() => {
      checkAppUpdate();
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

