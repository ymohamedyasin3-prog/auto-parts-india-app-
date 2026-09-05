import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar } from "react-native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import { navigationRef } from './src/navigation/navigationRef';
import { getFirebaseAuth, getCurrentUser } from './src/services/firebase';
import { 
  saveFcmTokenToFirestore, 
  removeFcmTokenFromFirestore, 
  setupFcmListeners 
} from './src/services/fcm';
import { LanguageProvider } from './src/context/LanguageContext';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SafeErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn('[SafeErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0B1220', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: '#ef4444', fontSize: 16, marginBottom: 10, fontWeight: 'bold' }}>App Crashed</Text>
          <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 10, textAlign: 'left' }}>
            {this.state.error?.stack || ''}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(true);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cleanupFcm: (() => void) | null = null;
    let unsubscribeAuth = () => {};

    try {
      const authInst = getFirebaseAuth();
      if (authInst && typeof authInst.onAuthStateChanged === 'function') {
        unsubscribeAuth = authInst.onAuthStateChanged(async (user: any) => {
          try {
            if (cleanupFcm) {
              cleanupFcm();
              cleanupFcm = null;
            }

            if (user) {
              setCurrentUser(user);
              previousUserIdRef.current = user.uid;

              try {
                await saveFcmTokenToFirestore(user.uid);
              } catch (err) {
                console.warn('[App] Error saving FCM token:', err);
              }
              try {
                cleanupFcm = setupFcmListeners(user.uid);
              } catch (err) {
                console.warn('[App] Error setting up FCM listeners:', err);
              }
            } else {
              if (previousUserIdRef.current) {
                try {
                  await removeFcmTokenFromFirestore(previousUserIdRef.current);
                } catch (err) {
                  console.warn('[App] Error removing FCM token:', err);
                }
                previousUserIdRef.current = null;
              }
              setCurrentUser(null);
              try {
                cleanupFcm = setupFcmListeners();
              } catch (err) {
                console.warn('[App] Error setting up FCM listeners:', err);
              }
            }
          } catch (innerErr) {
            console.warn('[App] Auth listener inner handler error:', innerErr);
          }
        });
      } else {
        try {
          cleanupFcm = setupFcmListeners();
        } catch (_) {}
      }
    } catch (authErr) {
      console.warn('[App] Error initiating onAuthStateChanged:', authErr);
      try {
        cleanupFcm = setupFcmListeners();
      } catch (_) {}
    }

    return () => {
      try { unsubscribeAuth(); } catch (_) {}
      try { if (cleanupFcm) cleanupFcm(); } catch (_) {}
    };
  }, []);

  return (
    <SafeErrorBoundary>
      <GestureHandlerRootView style={styles.container as any}>
        <SafeAreaProvider>
          <LanguageProvider>
            <StatusBar barStyle="light-content" backgroundColor="#0B1220" />
            <PaperProvider theme={theme}>
              {showSplash ? (
                <SplashScreen />
              ) : (
                <NavigationContainer ref={navigationRef}>
                  <AppNavigator user={currentUser} />
                </NavigationContainer>
              )}
            </PaperProvider>
          </LanguageProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </SafeErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
});
