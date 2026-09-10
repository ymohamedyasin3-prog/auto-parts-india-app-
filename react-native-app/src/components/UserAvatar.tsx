import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { useUserProfile } from '../hooks/useUserProfile';

interface UserAvatarProps {
  photoUrl?: string | null;
  name?: string;
  size?: number;
  borderWidth?: number;
  borderColor?: string;
  backgroundColor?: string;
  showOnlineDot?: boolean;
  isOnline?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  fallbackIcon?: string;
  iconColor?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoUrl,
  name,
  size = 32,
  borderWidth = 0,
  borderColor = 'transparent',
  backgroundColor,
  showOnlineDot = false,
  isOnline = false,
  onPress,
  style,
  fallbackIcon = 'account',
  iconColor = '#64748B',
}) => {
  const currentUser = useUserProfile();
  const [hasImgError, setHasImgError] = useState(false);

  // If photoUrl prop is explicitly provided, use it; otherwise fallback to the current authenticated user's photo
  const effectivePhoto = photoUrl !== undefined ? photoUrl : currentUser.photoURL;
  const effectiveName = name !== undefined ? name : currentUser.displayName;

  // Reset error when URL changes
  useEffect(() => {
    setHasImgError(false);
  }, [effectivePhoto]);

  const isValidPhoto =
    !hasImgError &&
    typeof effectivePhoto === 'string' &&
    effectivePhoto.trim().length > 5 &&
    (effectivePhoto.startsWith('http') || effectivePhoto.startsWith('data:') || effectivePhoto.startsWith('file:')) &&
    !effectivePhoto.includes('photo-1534528741775-53994a69daeb');

  const borderRadius = size / 2;
  const initial = (effectiveName || 'U').trim().charAt(0).toUpperCase();

  const content = (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          borderWidth,
          borderColor,
          backgroundColor: backgroundColor || (isValidPhoto ? '#F1F5F9' : '#EFF6FF'),
        },
        style,
      ]}
    >
      {isValidPhoto ? (
        <Image
          source={{ uri: effectivePhoto }}
          style={{ width: '100%', height: '100%', borderRadius }}
          resizeMode="cover"
          onError={() => setHasImgError(true)}
        />
      ) : size <= 26 ? (
        <Icon source={fallbackIcon} size={Math.round(size * 0.75)} color={iconColor} />
      ) : (
        <Text
          style={[
            styles.initialText,
            {
              fontSize: Math.round(size * 0.42),
              color: '#0066FF',
            },
          ]}
        >
          {initial}
        </Text>
      )}

      {showOnlineDot && (
        <View
          style={[
            styles.onlineDot,
            {
              backgroundColor: isOnline ? '#22C55E' : '#94A3B8',
              width: Math.max(8, Math.round(size * 0.28)),
              height: Math.max(8, Math.round(size * 0.28)),
              borderRadius: Math.max(4, Math.round(size * 0.14)),
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  initialText: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  onlineDot: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});

export default UserAvatar;
