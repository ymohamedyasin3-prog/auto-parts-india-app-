import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Image, Text } from 'react-native';

export interface CategoryIconProps {
  type?: string;
  categoryName?: string;
  iconUrl?: string;
  size?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Category Icon Renderer:
 * Strictly renders Admin-uploaded icon URL without any hardcoded/unsolicited fallback images.
 */
export const Category3DIcon: React.FC<CategoryIconProps> = ({
  categoryName,
  iconUrl,
  size = 46,
  style,
}) => {
  const [imageError, setImageError] = React.useState(false);

  if (iconUrl && !imageError) {
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        <Image
          source={{ uri: iconUrl }}
          style={{ width: size, height: size }}
          resizeMode="contain"
          onError={() => setImageError(true)}
        />
      </View>
    );
  }

  // Clean, neutral placeholder when no icon was uploaded by Admin
  const label = (categoryName || 'CAT').trim();
  const initial = label.length > 0 ? label.charAt(0).toUpperCase() : '•';

  return (
    <View 
      style={[
        styles.container, 
        styles.neutralPlaceholder, 
        { width: size, height: size, borderRadius: Math.round(size * 0.28) }, 
        style
      ]}
    >
      <Text style={[styles.initialText, { fontSize: Math.max(12, Math.round(size * 0.42)) }]}>
        {initial}
      </Text>
    </View>
  );
};

export default Category3DIcon;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  neutralPlaceholder: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  initialText: {
    fontWeight: '800',
    color: '#0066FF',
  },
});

