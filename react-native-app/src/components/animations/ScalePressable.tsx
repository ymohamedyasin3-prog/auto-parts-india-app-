import React, { useRef } from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';

interface ScalePressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  scaleTo?: number;
  disabled?: boolean;
  activeOpacity?: number;
  hitSlop?: { top?: number; bottom?: number; left?: number; right?: number };
}

/**
 * ScalePressable
 * Delivers silky-smooth native spring tactile press animations on cards, tiles, and buttons
 * without altering any existing layout or styles.
 */
export function ScalePressable({
  children,
  style,
  onPress,
  onLongPress,
  scaleTo = 0.96,
  disabled = false,
  activeOpacity = 0.92,
  hitSlop,
}: ScalePressableProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: scaleTo,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: activeOpacity,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <TouchableWithoutFeedback
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={hitSlop}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
