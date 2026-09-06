import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, Image } from 'react-native';
import Svg, { 
  Path, 
  Circle, 
  Rect, 
  Ellipse, 
  Polygon, 
  Line, 
  G, 
  Defs, 
  LinearGradient, 
  Stop, 
  Text as SvgText 
} from 'react-native-svg';

export interface BrandLogoProps {
  name?: string;
  brand?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
  variant?: 'icon' | 'full' | 'horizontal' | string;
  theme?: 'dark' | 'light' | string;
}

const BRAND_IMAGES: Record<string, any> = {
  'maruti': require('../assets/brands/maruti_suzuki.png'),
  'maruti_suzuki': require('../assets/brands/maruti_suzuki.png'),
  'suzuki': require('../assets/brands/suzuki.png'),
  'hyundai': require('../assets/brands/hyundai.png'),
  'tata': require('../assets/brands/tata.png'),
  'mahindra': require('../assets/brands/mahindra.png'),
  'toyota': require('../assets/brands/toyota.png'),
  'honda': require('../assets/brands/honda.png'),
  'kia': require('../assets/brands/kia.png'),
  'volkswagen': require('../assets/brands/volkswagen.png'),
  'vw': require('../assets/brands/volkswagen.png'),
  'skoda': require('../assets/brands/skoda.png'),
  'renault': require('../assets/brands/renault.png'),
  'nissan': require('../assets/brands/nissan.png'),
  'ford': require('../assets/brands/ford.png'),
  'bmw': require('../assets/brands/bmw.png'),
  'mercedes': require('../assets/brands/mercedes.png'),
  'benz': require('../assets/brands/mercedes.png'),
  'audi': require('../assets/brands/audi.png'),
  'mg': require('../assets/brands/mg.png'),
  'jeep': require('../assets/brands/jeep.png'),
};

/**
 * 100% Native Vector Auto Parts India Square App Icon
 */
export function AutoPartsIcon({ size = 48, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const s = size;
  return (
    <View style={[styles.center, { width: s, height: s }, style]}>
      <Svg width={s} height={s} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="apBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0F1F38" />
            <Stop offset="50%" stopColor="#0A1526" />
            <Stop offset="100%" stopColor="#050B14" />
          </LinearGradient>
          <LinearGradient id="apRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="40%" stopColor="#0066FF" />
            <Stop offset="80%" stopColor="#003B95" />
            <Stop offset="100%" stopColor="#0284C7" />
          </LinearGradient>
          <LinearGradient id="apCarStream" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="50%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#60A5FA" />
          </LinearGradient>
          <LinearGradient id="apGearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="50%" stopColor="#0066FF" />
            <Stop offset="100%" stopColor="#003B95" />
          </LinearGradient>
        </Defs>
        <Rect x="8" y="8" width="184" height="184" rx="42" fill="url(#apBgGrad)" stroke="url(#apRimGrad)" strokeWidth="3.5" />
      </Svg>
    </View>
  );
}

/**
 * AUTO PARTS INDIA Full Horizontal Brand Logo
 */
export function AutoPartsLogo({ 
  height = 40, 
  theme = 'dark',
  style 
}: { 
  height?: number; 
  theme?: 'dark' | 'light';
  style?: StyleProp<ViewStyle>; 
}) {
  const width = height * 4.6;
  const isLight = theme === 'light';

  return (
    <View style={[styles.center, { width, height }, style]}>
      <Svg width={width} height={height} viewBox="0 0 580 130">
        <Defs>
          <LinearGradient id="apHIconBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0F1F38" />
            <Stop offset="50%" stopColor="#0A1526" />
            <Stop offset="100%" stopColor="#050B14" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="580" height="130" rx="20" fill={isLight ? '#FFFFFF' : '#0B1220'} />
        <SvgText x="50" y="75" fontFamily="sans-serif" fontWeight="900" fontSize="48" fill={isLight ? '#0F172A' : '#FFFFFF'}>AUTO PARTS</SvgText>
      </Svg>
    </View>
  );
}

/**
 * Authentic Official OEM Brand Logo Renderer
 */
function renderBrandVector(brandKey: string, size: number) {
  const s = size;
  const lower = (brandKey || "").toLowerCase();

  let matchedImage = null;
  for (const key of Object.keys(BRAND_IMAGES)) {
    if (lower.includes(key)) {
      matchedImage = BRAND_IMAGES[key];
      break;
    }
  }

  if (matchedImage) {
    return (
      <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        <Image 
          source={matchedImage} 
          style={{ width: s * 0.9, height: s * 0.9, resizeMode: 'contain' }} 
        />
      </View>
    );
  }

  let code = (brandKey || "CAR").substring(0, 3).toUpperCase();
  return (
    <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: s * 0.35, fontWeight: '800', color: '#0F172A' }}>{code}</Text>
    </View>
  );
}

/**
 * Modern BrandLogo Component
 */
export function BrandLogo({ 
  name = '', 
  brand = '', 
  size = 32, 
  style, 
  active, 
  variant = 'full',
  theme = 'dark'
}: BrandLogoProps) {
  const safeSize = Number.isFinite(size) && size > 0 ? size : 32;
  const brandKey = String(brand || name || '').toLowerCase().trim();

  if (brandKey && brandKey !== 'all' && brandKey !== 'all brands') {
    return (
      <View style={[styles.center, style]}>
        {renderBrandVector(brandKey, safeSize)}
      </View>
    );
  }

  if (variant === 'icon') {
    return <AutoPartsIcon size={safeSize} style={style} />;
  }

  return <AutoPartsLogo height={safeSize} theme={theme as any} style={style} />;
}

export function CarBrandBadge(props: BrandLogoProps) {
  return <BrandLogo {...props} />;
}

export function GearSpeedLogoIcon({ size = 48, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return <AutoPartsIcon size={size} style={style} />;
}

export default BrandLogo;

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
