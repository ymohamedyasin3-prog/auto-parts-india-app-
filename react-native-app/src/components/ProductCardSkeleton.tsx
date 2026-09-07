import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export function ProductCardSkeleton({ cardWidth }: { cardWidth: number }) {
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [shimmerAnim]);

  return (
    <View style={[styles.skeletonCard, { width: cardWidth }]}>
      {/* Image Skeleton */}
      <Animated.View style={[styles.imageSkeleton, { opacity: shimmerAnim }]} />

      {/* Details Skeleton */}
      <View style={styles.contentWrap}>
        <Animated.View style={[styles.titleLine, { opacity: shimmerAnim }]} />
        <Animated.View style={[styles.subLine, { opacity: shimmerAnim }]} />
        <Animated.View style={[styles.priceLine, { opacity: shimmerAnim }]} />
        <Animated.View style={[styles.locLine, { opacity: shimmerAnim }]} />
      </View>
    </View>
  );
}

export function ProductFeedSkeletonList({ cardWidth, count = 4 }: { cardWidth: number; count?: number }) {
  return (
    <View style={styles.gridWrap}>
      {Array.from({ length: count }).map((_, idx) => (
        <ProductCardSkeleton key={idx} cardWidth={cardWidth} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  skeletonCard: {
    backgroundColor: '#0F1E36',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    marginBottom: 14,
  },
  imageSkeleton: {
    width: '100%',
    height: 120,
    backgroundColor: '#1E293B',
  },
  contentWrap: {
    padding: 10,
    gap: 6,
  },
  titleLine: {
    width: '85%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#1E293B',
  },
  subLine: {
    width: '55%',
    height: 10,
    borderRadius: 4,
    backgroundColor: '#1E293B',
  },
  priceLine: {
    width: '40%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#1E293B',
    marginTop: 4,
  },
  locLine: {
    width: '70%',
    height: 10,
    borderRadius: 4,
    backgroundColor: '#1E293B',
  },
});
