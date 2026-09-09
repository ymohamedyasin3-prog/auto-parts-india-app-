import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

interface PulseBadgeProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  minScale?: number;
  maxScale?: number;
  duration?: number;
}

/**
 * PulseBadge
 * Continuous breathing animation for notifications, live badges, and attention-grabbing chips.
 */
export function PulseBadge({
  children,
  style,
  minScale = 0.95,
  maxScale = 1.06,
  duration = 1200,
}: PulseBadgeProps) {
  const pulseAnim = useRef(new Animated.Value(minScale)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: maxScale,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: minScale,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [duration, maxScale, minScale, pulseAnim]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
