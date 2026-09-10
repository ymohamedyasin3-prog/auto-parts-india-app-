import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useUserProfile } from '../hooks/useUserProfile';

interface UserProfileTabIconProps {
  focused: boolean;
  color: string;
  size?: number;
}

export const UserProfileTabIcon: React.FC<UserProfileTabIconProps> = ({
  focused,
  color,
  size = 24,
}) => {
  const { photoURL } = useUserProfile();
  const [loadError, setLoadError] = useState(false);

  if (photoURL && !loadError) {
    return (
      <View
        style={[
          styles.photoWrap,
          {
            borderColor: focused ? '#0066FF' : '#CBD5E1',
            borderWidth: focused ? 2 : 1.2,
          },
        ]}
      >
        <Image
          source={{ uri: photoURL }}
          style={styles.avatarImg}
          resizeMode="cover"
          onError={() => setLoadError(true)}
        />
      </View>
    );
  }

  return <Icon source={focused ? 'account' : 'account-outline'} color={color} size={size} />;
};

const styles = StyleSheet.create({
  photoWrap: {
    width: 25,
    height: 25,
    borderRadius: 13,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
});

export default UserProfileTabIcon;
