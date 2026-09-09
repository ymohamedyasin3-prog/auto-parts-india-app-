import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

interface AppLogoProps {
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
}

export const AppLogo = ({
  width = 220,
  height = 140,
  style,
  resizeMode = 'contain',
}: AppLogoProps) => {
  return (
    <Image
      source={require('../assets/app_logo.png')}
      style={[{ width, height }, style]}
      resizeMode={resizeMode}
    />
  );
};

