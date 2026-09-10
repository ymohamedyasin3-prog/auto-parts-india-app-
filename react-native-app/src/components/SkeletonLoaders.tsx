import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, StyleProp, ViewStyle } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Universal Shimmer Box with smooth pulsating opacity
 */
export function ShimmerBox({
  style,
  borderRadius = 8,
}: {
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}) {
  const shimmerAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [shimmerAnim]);

  return (
    <Animated.View
      style={[
        styles.shimmerBase,
        { borderRadius },
        style,
        { opacity: shimmerAnim },
      ]}
    />
  );
}

/**
 * 1. Category Skeleton (Matches screenshot 4-column grid with 2 sub-lines)
 */
export function CategoryCardSkeleton({
  cardWidth,
  isMoreSlot = false,
}: {
  cardWidth: number;
  isMoreSlot?: boolean;
}) {
  return (
    <View style={[styles.categorySkeletonItem, { width: cardWidth }]}>
      {/* Category Square / Rounded Box */}
      <View style={[styles.categoryCardBox, { width: cardWidth, height: cardWidth }]}>
        <ShimmerBox style={styles.fullFill} borderRadius={16} />
        {isMoreSlot && (
          <View style={styles.moreDotsContainer}>
            <View style={styles.moreDot} />
            <View style={styles.moreDot} />
            <View style={styles.moreDot} />
          </View>
        )}
      </View>

      {/* Two Text placeholder lines below card */}
      <View style={styles.categoryTextLines}>
        <ShimmerBox
          style={[styles.categoryTitleLine, { width: Math.round(cardWidth * 0.8) }]}
          borderRadius={5}
        />
        <ShimmerBox
          style={[styles.categorySubLine, { width: Math.round(cardWidth * 0.55) }]}
          borderRadius={4}
        />
      </View>
    </View>
  );
}

/**
 * 4-column x 2-row Category Grid Skeleton (8 total cards matching reference image)
 */
export function CategoryGridSkeleton({
  cardWidth,
  count = 8,
}: {
  cardWidth: number;
  count?: number;
}) {
  return (
    <View style={styles.categoriesGrid}>
      {Array.from({ length: count }).map((_, idx) => (
        <CategoryCardSkeleton
          key={`cat-skel-${idx}`}
          cardWidth={cardWidth}
          isMoreSlot={idx === 7}
        />
      ))}
    </View>
  );
}

/**
 * 2. Popular Brands Horizontal Skeleton Pill
 */
export function BrandPillSkeleton({ width = 110 }: { width?: number }) {
  return (
    <View style={[styles.brandPillSkeleton, { width }]}>
      <ShimmerBox style={styles.brandIconShimmer} borderRadius={12} />
      <ShimmerBox style={styles.brandTextShimmer} borderRadius={6} />
    </View>
  );
}

export function BrandListSkeleton({ count = 5 }: { count?: number }) {
  const widths = [110, 95, 120, 105, 115];
  return (
    <View style={styles.brandsScroll}>
      {Array.from({ length: count }).map((_, idx) => (
        <BrandPillSkeleton key={`brand-skel-${idx}`} width={widths[idx % widths.length]} />
      ))}
    </View>
  );
}

/**
 * 3. Part Listing Card Skeleton (Matches screenshot 2-column feed with top-right fav circle)
 */
export function PartCardSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <View style={[styles.productCardSkeleton, { width: cardWidth }]}>
      {/* Product Image Area */}
      <View style={styles.productImageSkeletonWrap}>
        <ShimmerBox style={styles.fullFill} borderRadius={14} />
        {/* Heart / Favorite Circle Skeleton */}
        <View style={styles.favCircleSkeleton}>
          <ShimmerBox style={styles.fullFill} borderRadius={14} />
        </View>
      </View>

      {/* Details Container */}
      <View style={styles.productDetailsWrap}>
        <ShimmerBox style={styles.productTitleLine} borderRadius={6} />
        <ShimmerBox style={styles.productSubLine} borderRadius={5} />
        <ShimmerBox style={styles.productPriceLine} borderRadius={6} />
        <ShimmerBox style={styles.productLocLine} borderRadius={5} />
      </View>
    </View>
  );
}

/**
 * Horizontal List Card Skeleton (Used in My Ads, Wishlist, Search List View)
 */
export function ListCardSkeleton() {
  return (
    <View style={styles.listCardSkeleton}>
      <View style={styles.listCardImageWrap}>
        <ShimmerBox style={styles.fullFill} borderRadius={10} />
      </View>
      <View style={styles.listCardInfoWrap}>
        <View style={styles.rowBetween}>
          <ShimmerBox style={{ width: '45%', height: 16 }} borderRadius={6} />
          <ShimmerBox style={{ width: 24, height: 24 }} borderRadius={12} />
        </View>
        <ShimmerBox style={{ width: '85%', height: 14, marginTop: 6 }} borderRadius={6} />
        <ShimmerBox style={{ width: '60%', height: 11, marginTop: 4 }} borderRadius={5} />
        <View style={[styles.rowBetween, { marginTop: 'auto' }]}>
          <ShimmerBox style={{ width: '40%', height: 10 }} borderRadius={5} />
          <ShimmerBox style={{ width: '30%', height: 10 }} borderRadius={5} />
        </View>
      </View>
    </View>
  );
}

export function ListFeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.listFeedWrap}>
      {Array.from({ length: count }).map((_, idx) => (
        <ListCardSkeleton key={`list-skel-${idx}`} />
      ))}
    </View>
  );
}

/**
 * 2-column Product Feed Skeleton Grid
 */
export function ProductGridSkeleton({
  cardWidth,
  count = 4,
}: {
  cardWidth: number;
  count?: number;
}) {
  return (
    <View style={styles.productGrid}>
      {Array.from({ length: count }).map((_, idx) => (
        <PartCardSkeleton key={`part-skel-${idx}`} cardWidth={cardWidth} />
      ))}
    </View>
  );
}

/**
 * 4. Product Detail Screen Skeleton
 */
export function ProductDetailSkeleton() {
  return (
    <View style={styles.detailContainer}>
      {/* Big Hero Image Banner */}
      <View style={styles.detailImageBanner}>
        <ShimmerBox style={styles.fullFill} borderRadius={0} />
      </View>

      <View style={styles.detailBody}>
        {/* Price & Title Card */}
        <View style={styles.detailSectionCard}>
          <ShimmerBox style={{ width: '45%', height: 26, marginBottom: 10 }} borderRadius={6} />
          <ShimmerBox style={{ width: '90%', height: 20, marginBottom: 8 }} borderRadius={6} />
          <ShimmerBox style={{ width: '60%', height: 14, marginBottom: 12 }} borderRadius={6} />
          <View style={styles.rowGap8}>
            <ShimmerBox style={{ width: 80, height: 24 }} borderRadius={12} />
            <ShimmerBox style={{ width: 100, height: 24 }} borderRadius={12} />
          </View>
        </View>

        {/* Seller Info Card */}
        <View style={styles.detailSectionCard}>
          <View style={styles.rowAlign}>
            <ShimmerBox style={{ width: 48, height: 48, marginRight: 12 }} borderRadius={24} />
            <View style={{ flex: 1, gap: 6 }}>
              <ShimmerBox style={{ width: '60%', height: 16 }} borderRadius={6} />
              <ShimmerBox style={{ width: '40%', height: 12 }} borderRadius={6} />
            </View>
          </View>
        </View>

        {/* Specifications Grid Card */}
        <View style={styles.detailSectionCard}>
          <ShimmerBox style={{ width: '40%', height: 18, marginBottom: 14 }} borderRadius={6} />
          <View style={styles.specGridRow}>
            <ShimmerBox style={styles.specBox} borderRadius={10} />
            <ShimmerBox style={styles.specBox} borderRadius={10} />
          </View>
          <View style={styles.specGridRow}>
            <ShimmerBox style={styles.specBox} borderRadius={10} />
            <ShimmerBox style={styles.specBox} borderRadius={10} />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * 5. Chat List Skeleton
 */
export function ChatListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.chatListWrap}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={`chat-skel-${idx}`} style={styles.chatItemSkeleton}>
          <ShimmerBox style={styles.chatAvatar} borderRadius={25} />
          <View style={styles.chatContentWrap}>
            <View style={styles.chatHeaderRow}>
              <ShimmerBox style={{ width: '45%', height: 15 }} borderRadius={6} />
              <ShimmerBox style={{ width: 45, height: 11 }} borderRadius={4} />
            </View>
            <ShimmerBox style={{ width: '80%', height: 12, marginTop: 6 }} borderRadius={5} />
            <ShimmerBox style={{ width: '50%', height: 10, marginTop: 4 }} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * 6. Notifications List Skeleton
 */
export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.notificationListWrap}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={`notif-skel-${idx}`} style={styles.notifItemSkeleton}>
          <ShimmerBox style={styles.notifIcon} borderRadius={20} />
          <View style={{ flex: 1, gap: 6 }}>
            <ShimmerBox style={{ width: '70%', height: 14 }} borderRadius={6} />
            <ShimmerBox style={{ width: '95%', height: 12 }} borderRadius={5} />
            <ShimmerBox style={{ width: '30%', height: 10, marginTop: 2 }} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * 7. Profile Screen Skeleton
 */
export function ProfileSkeleton() {
  return (
    <View style={styles.profileContainer}>
      {/* User Header */}
      <View style={styles.profileHeaderCard}>
        <ShimmerBox style={{ width: 80, height: 80, alignSelf: 'center', marginBottom: 12 }} borderRadius={40} />
        <ShimmerBox style={{ width: 140, height: 20, alignSelf: 'center', marginBottom: 6 }} borderRadius={6} />
        <ShimmerBox style={{ width: 180, height: 14, alignSelf: 'center', marginBottom: 14 }} borderRadius={6} />
        <View style={styles.statsRow}>
          <ShimmerBox style={styles.statBox} borderRadius={12} />
          <ShimmerBox style={styles.statBox} borderRadius={12} />
          <ShimmerBox style={styles.statBox} borderRadius={12} />
        </View>
      </View>

      {/* Menu items */}
      <View style={styles.profileMenuCard}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <View key={`menu-skel-${idx}`} style={styles.menuItemRow}>
            <ShimmerBox style={{ width: 24, height: 24, marginRight: 12 }} borderRadius={6} />
            <ShimmerBox style={{ width: '60%', height: 16 }} borderRadius={6} />
            <ShimmerBox style={{ width: 14, height: 14, marginLeft: 'auto' }} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * 8. Search Screen / All Categories Filter Skeleton
 */
export function SearchFilterSkeleton() {
  return (
    <View style={styles.searchSkeletonWrap}>
      <View style={styles.filterPillsRow}>
        <ShimmerBox style={{ width: 70, height: 32 }} borderRadius={16} />
        <ShimmerBox style={{ width: 90, height: 32 }} borderRadius={16} />
        <ShimmerBox style={{ width: 100, height: 32 }} borderRadius={16} />
        <ShimmerBox style={{ width: 80, height: 32 }} borderRadius={16} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shimmerBase: {
    backgroundColor: '#CBD5E1',
  },
  fullFill: {
    width: '100%',
    height: '100%',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowGap8: {
    flexDirection: 'row',
    gap: 8,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // 1. Categories
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  categorySkeletonItem: {
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryCardBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  moreDotsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  moreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  categoryTextLines: {
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
    width: '100%',
  },
  categoryTitleLine: {
    height: 9,
    backgroundColor: '#CBD5E1',
  },
  categorySubLine: {
    height: 7,
    backgroundColor: '#E2E8F0',
  },

  // 2. Brands
  brandsScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  brandPillSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    height: 42,
  },
  brandIconShimmer: {
    width: 24,
    height: 24,
    backgroundColor: '#CBD5E1',
  },
  brandTextShimmer: {
    flex: 1,
    height: 12,
    backgroundColor: '#E2E8F0',
  },

  // 3. Products
  listFeedWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  listCardSkeleton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 12,
    height: 110,
  },
  listCardImageWrap: {
    width: 90,
    height: '100%',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  listCardInfoWrap: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  productCardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageSkeletonWrap: {
    width: '100%',
    height: 125,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  favCircleSkeleton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
  },
  productDetailsWrap: {
    padding: 10,
    gap: 6,
  },
  productTitleLine: {
    width: '88%',
    height: 12,
    backgroundColor: '#CBD5E1',
  },
  productSubLine: {
    width: '60%',
    height: 10,
    backgroundColor: '#E2E8F0',
  },
  productPriceLine: {
    width: '45%',
    height: 14,
    backgroundColor: '#94A3B8',
    marginTop: 2,
  },
  productLocLine: {
    width: '70%',
    height: 9,
    backgroundColor: '#E2E8F0',
  },

  // 4. Detail Screen
  detailContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  detailImageBanner: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: '#E2E8F0',
  },
  detailBody: {
    padding: 16,
    gap: 14,
  },
  detailSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specGridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  specBox: {
    flex: 1,
    height: 60,
    backgroundColor: '#F1F5F9',
  },

  // 5. Chats
  chatListWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  chatItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    backgroundColor: '#E2E8F0',
  },
  chatContentWrap: {
    flex: 1,
    marginLeft: 14,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // 6. Notifications
  notificationListWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  notifItemSkeleton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
    gap: 12,
  },
  notifIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#E2E8F0',
  },

  // 7. Profile
  profileContainer: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    height: 55,
    backgroundColor: '#F1F5F9',
  },
  profileMenuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },

  // 8. Search Filter
  searchSkeletonWrap: {
    paddingVertical: 10,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
});
