import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

interface FadeInSlideProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
  slideDistance?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

/**
 * FadeInSlide
 * Fallback to standard View for high performance inside lists.
 * Bypasses Animated memory leaks to prevent screen blinking and stuck issues.
 */
export function FadeInSlide({ children, style }: FadeInSlideProps) {
  return (
    <View style={style}>
      {children}
    </View>
  );
}
