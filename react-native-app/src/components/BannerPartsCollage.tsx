import React from 'react';
import { View, StyleSheet, Image, DimensionValue } from 'react-native';

/**
 * 3D Composite Automotive Parts Graphic for Hero Promo Banner
 * Matches the reference mockup:
 * - Shock absorber / coilover damper (black/silver)
 * - Drilled brake rotor disc
 * - Chrome alternator
 * - Yellow pleated oil filter canister
 * - Motor Oil bottle
 * - Deep navy/blue studio illumination
 */
export const BannerPartsCollage: React.FC<{ height?: number; width?: DimensionValue }> = ({ height = 130, width = '100%' }) => {
  return (
    <View style={[styles.container, { height, width }]}>
      <Image
        source={require('../assets/banner/hero_parts_collage.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
};

export default BannerPartsCollage;

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
