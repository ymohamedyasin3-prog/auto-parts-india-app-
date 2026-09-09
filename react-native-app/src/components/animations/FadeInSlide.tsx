import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

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
 * Delivers staggered, silky-smooth fade-in and slide transitions on screen load
 * without breaking component structure or triggering layout jumps.
 */
export function FadeInSlide({
  children,
  style,
  delay = 0,
  duration = 320,
  slideDistance = 14,
  direction = 'up',
}: FadeInSlideProps) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(slideDistance)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.spring(translateAnim, {
          toValue: 0,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, duration, opacityAnim, translateAnim]);

  const getTransform = () => {
    if (direction === 'none') return [];
    if (direction === 'up') return [{ translateY: translateAnim }];
    if (direction === 'down') {
      return [
        {
          translateY: translateAnim.interpolate({
            inputRange: [0, slideDistance],
            outputRange: [0, -slideDistance],
          }),
        },
      ];
    }
    if (direction === 'left') return [{ translateX: translateAnim }];
    if (direction === 'right') {
      return [
        {
          translateX: translateAnim.interpolate({
            inputRange: [0, slideDistance],
            outputRange: [0, -slideDistance],
          }),
        },
      ];
    }
    return [{ translateY: translateAnim }];
  };

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: opacityAnim,
          transform: getTransform(),
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
