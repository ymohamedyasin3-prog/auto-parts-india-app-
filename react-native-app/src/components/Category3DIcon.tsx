import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Image } from 'react-native';

export interface CategoryIconProps {
  type?: string;
  categoryName?: string;
  iconUrl?: string;
  size?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

// 3D Category PNG Assets matching the reference design
const CATEGORY_3D_IMAGES: Record<string, any> = {
  engine: require('../assets/categories/engine.png'),
  body: require('../assets/categories/body.png'),
  electrical: require('../assets/categories/electricals.png'),
  electricals: require('../assets/categories/electricals.png'),
  suspension: require('../assets/categories/suspension.png'),
  exhaust: require('../assets/categories/exhaust.png'),
  brakes: require('../assets/categories/brakes.png'),
  filters: require('../assets/categories/filters.png'),
  more: require('../assets/categories/more.png'),
};

/**
 * 3D Isometric Automotive Category Icon Renderer
 * Renders high-definition, realistic 3D assets for all home categories.
 */
export const Category3DIcon: React.FC<CategoryIconProps> = ({
  type = 'more',
  categoryName,
  iconUrl,
  size = 46,
  active = false,
  style,
}) => {
  const normType = String(categoryName || type || '').toLowerCase().trim();

  // Find corresponding 3D image asset
  let imageSource = CATEGORY_3D_IMAGES[normType];
  if (!imageSource) {
    if (normType.includes('engine') || normType.includes('motor')) imageSource = CATEGORY_3D_IMAGES.engine;
    else if (normType.includes('body') || normType.includes('door') || normType.includes('bumper')) imageSource = CATEGORY_3D_IMAGES.body;
    else if (normType.includes('elect') || normType.includes('light') || normType.includes('battery')) imageSource = CATEGORY_3D_IMAGES.electrical;
    else if (normType.includes('susp') || normType.includes('shock') || normType.includes('strut')) imageSource = CATEGORY_3D_IMAGES.suspension;
    else if (normType.includes('exh') || normType.includes('muffler') || normType.includes('pipe')) imageSource = CATEGORY_3D_IMAGES.exhaust;
    else if (normType.includes('brake') || normType.includes('rotor') || normType.includes('pad')) imageSource = CATEGORY_3D_IMAGES.brakes;
    else if (normType.includes('filter')) imageSource = CATEGORY_3D_IMAGES.filters;
    else imageSource = CATEGORY_3D_IMAGES.more;
  }

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image
        source={imageSource}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
};

export default Category3DIcon;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
