import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import { Icon } from 'react-native-paper';

interface FavoriteHeartButtonProps {
  isFavorited: boolean;
  onPress: (event: GestureResponderEvent) => void;
  size?: number;
  containerStyle?: StyleProp<ViewStyle>;
  iconColor?: string;
  inactiveIconColor?: string;
}

/**
 * FavoriteHeartButton
 * High-performance standard button without Animated nodes
 * to prevent screen blinking and app stuck issues in long lists.
 */
export function FavoriteHeartButton({
  isFavorited,
  onPress,
  size = 18,
  containerStyle,
  iconColor = '#EF4444',
  inactiveIconColor = '#334155',
}: FavoriteHeartButtonProps) {
  const handlePress = (e: GestureResponderEvent) => {
    e.stopPropagation?.();
    onPress(e);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPress={handlePress}
      style={[styles.btnWrap, containerStyle]}
    >
      <View style={styles.circle}>
        <Icon
          source={isFavorited ? 'heart' : 'heart-outline'}
          size={size}
          color={isFavorited ? iconColor : inactiveIconColor}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btnWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 3,
  },
});
