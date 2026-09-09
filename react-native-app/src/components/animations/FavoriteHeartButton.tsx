import React, { useRef, useEffect } from 'react';
import {
  Animated,
  TouchableOpacity,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import { Icon } from 'react-native-paper';

interface FavoriteHeartButtonProps {
  isFavorited: boolean;
  onPress: (event: GestureResponderEvent) => void;
  size?: number;
  containerStyle?: StyleProp<ViewStyle>;
  iconColor?: string;
  inactiveIconColor?: string;
}

/**
 * FavoriteHeartButton
 * High-performance animated favorite button with a playful spring pop when liked.
 */
export function FavoriteHeartButton({
  isFavorited,
  onPress,
  size = 18,
  containerStyle,
  iconColor = '#EF4444',
  inactiveIconColor = '#334155',
}: FavoriteHeartButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isFavorited) {
      // Pop scale bounce on like
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.35,
          friction: 4,
          tension: 140,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Subtle pulse on unlike
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFavorited, scaleAnim]);

  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation?.();
    onPress(e);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPress={handlePress}
      style={[styles.btnWrap, containerStyle]}
    >
      <View style={styles.circle}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Icon
            source={isFavorited ? 'heart' : 'heart-outline'}
            size={size}
            color={isFavorited ? iconColor : inactiveIconColor}
          />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btnWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 3,
  },
});
