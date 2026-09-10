import React from 'react';
import {
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';

interface ScalePressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  scaleTo?: number; // Ignored for performance
  disabled?: boolean;
  activeOpacity?: number;
  hitSlop?: { top?: number; bottom?: number; left?: number; right?: number };
}

/**
 * ScalePressable
 * Fallback to high-performance TouchableOpacity to prevent memory leaks and UI thread blocking
 * which was causing screen blinking and app sticking.
 */
export function ScalePressable({
  children,
  style,
  onPress,
  onLongPress,
  disabled = false,
  activeOpacity = 0.7, // Standard touchable opacity
  hitSlop,
}: ScalePressableProps) {
  return (
    <TouchableOpacity
      style={style}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={activeOpacity}
      hitSlop={hitSlop}
    >
      {children}
    </TouchableOpacity>
  );
}
