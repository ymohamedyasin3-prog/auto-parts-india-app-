import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  useWindowDimensions,
  Platform,
  Animated,
  Image
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { signInWithGoogleNative } from '../services/googleAuth';
import Svg, { Path } from 'react-native-svg';

export default function AuthScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { width: screenWidth } = useWindowDimensions();

  // Gentle entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Google Sign-In Native (Firebase Auth)
  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const user = await signInWithGoogleNative();
      if (!user || !user.uid) {
        throw new Error('Unable to complete sign-in. Please try again.');
      }
      if (navigation?.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    } catch (err: any) {
      console.warn('[AuthScreen] Google Sign-In failed:', err);
      const msg = err?.message || 'Unable to sign in with Google. Please check your network and try again.';
      setErrorMessage(msg);
      Alert.alert('Sign In', msg);
    } finally {
      setLoading(false);
    }
  };

  const logoWidth = Math.min(screenWidth * 0.82, 320);
  const logoHeight = 140;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0075FF" translucent={false} />

      {/* Optional Top Left Close/Back Button if opened from navigation */}
      {navigation?.canGoBack && navigation.canGoBack() && (
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon source="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <SafeAreaView style={styles.safeArea}>
        {/* UPPER SPACER */}
        <View style={{ flex: 1 }} />

        {/* CENTER ACTION: COMPACT BRAND LOGO + SIGN IN WITH GOOGLE PILL */}
        <Animated.View 
          style={[
            styles.centerActionContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          {/* Brand Logo perfectly fitted and compact */}
          <View style={styles.logoWrapper}>
            <Image
              source={require('../assets/logo.png')}
              style={{ width: logoWidth, height: logoHeight }}
              resizeMode="contain"
            />
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Icon source="alert-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* White Pill Button */}
          <TouchableOpacity
            style={[styles.googlePillButton, loading && styles.googleBtnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <View style={styles.buttonInnerRow}>
                <ActivityIndicator color="#0075FF" size="small" />
                <Text style={styles.buttonText}>Signing in...</Text>
              </View>
            ) : (
              <View style={styles.buttonInnerRow}>
                {/* Official Multi-Color Google G Icon */}
                <Svg width={26} height={26} viewBox="0 0 24 24">
                  <Path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <Path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <Path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <Path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </Svg>
                <Text style={styles.buttonText}>Sign in with Google</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* LOWER SPACER */}
        <View style={{ flex: 1.2 }} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0075FF', // Pure vibrant royal blue matching reference image
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 16 : 48,
    left: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerActionContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googlePillButton: {
    width: '100%',
    maxWidth: 320,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 28, // Full capsule curve
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  googleBtnDisabled: {
    opacity: 0.75,
  },
  buttonInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  buttonText: {
    color: '#1F2937',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    maxWidth: 320,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
});
