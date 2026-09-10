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

export {
  ShimmerBox,
  CategoryCardSkeleton,
  CategoryGridSkeleton,
  BrandPillSkeleton,
  BrandListSkeleton,
  PartCardSkeleton,
  ProductGridSkeleton,
  ProductDetailSkeleton,
  ChatListSkeleton,
  NotificationListSkeleton,
  ProfileSkeleton,
  SearchFilterSkeleton,
} from './SkeletonLoaders';

const styles = StyleSheet.create({
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  imageSkeleton: {
    width: '100%',
    height: 130,
    backgroundColor: '#E2E8F0',
  },
  contentWrap: {
    padding: 12,
    gap: 8,
  },
  titleLine: {
    width: '85%',
    height: 14,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
  },
  subLine: {
    width: '55%',
    height: 10,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  priceLine: {
    width: '40%',
    height: 16,
    borderRadius: 6,
    backgroundColor: '#94A3B8',
    marginTop: 2,
  },
  locLine: {
    width: '70%',
    height: 10,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
});
