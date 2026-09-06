import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, Image } from 'react-native';
import { getFirebaseFirestore } from '../services/firebase';
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
  imageUrl?: string;
  logoUrl?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
  variant?: 'icon' | 'full' | 'horizontal' | string;
  theme?: 'dark' | 'light' | string;
}

// In-memory cache for dynamic logos set by Admin in Firestore `carBrands`
const dynamicBrandLogos: Record<string, string> = {};

export function updateBrandLogosCache(brands: Array<{ name: string; imageUrl?: string; logoUrl?: string }>) {
  brands.forEach((b) => {
    const url = b.imageUrl || b.logoUrl;
    if (b.name && url) {
      dynamicBrandLogos[b.name.toLowerCase().trim()] = url;
      dynamicBrandLogos[b.name.toLowerCase().replace(/[^a-z0-9]/g, '')] = url;
    }
  });
}

// Automatically subscribe once to carBrands collection if Firestore is initialized
let hasSubscribedToCarBrands = false;
function ensureCarBrandsSubscription() {
  if (hasSubscribedToCarBrands) return;
  try {
    const db = getFirebaseFirestore();
    if (db) {
      hasSubscribedToCarBrands = true;
      db.collection('carBrands').onSnapshot((snap: any) => {
        snap.forEach((doc: any) => {
          const data = doc.data();
          const url = data?.imageUrl || data?.logoUrl;
          if (data?.name && url) {
            const rawKey = data.name.toLowerCase().trim();
            const cleanKey = rawKey.replace(/[^a-z0-9]/g, '');
            dynamicBrandLogos[rawKey] = url;
            dynamicBrandLogos[cleanKey] = url;
          }
        });
      }, () => {
        // Silently ignore if offline or loading
      });
    }
  } catch (_) {}
}

const BRAND_IMAGES: Record<string, any> = {
  'maruti_suzuki': require('../assets/brands/maruti_suzuki.png'),
  'maruti': require('../assets/brands/maruti_suzuki.png'),
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

const BRAND_URLS: Record<string, string> = {
  'maruti_suzuki': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2021.svg/600px-Suzuki_logo_2021.svg.png',
  'maruti suzuki': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2021.svg/600px-Suzuki_logo_2021.svg.png',
  'maruti': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2021.svg/600px-Suzuki_logo_2021.svg.png',
  'suzuki': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2021.svg/600px-Suzuki_logo_2021.svg.png',
  'hyundai': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Hyundai_Motor_Company_logo.svg/600px-Hyundai_Motor_Company_logo.svg.png',
  'tata': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Tata_logo.svg/600px-Tata_logo.svg.png',
  'mahindra': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Mahindra_Rise_logo.svg/600px-Mahindra_Rise_logo.svg.png',
  'toyota': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Toyota_logo.svg/600px-Toyota_logo.svg.png',
  'honda': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Honda_Logo.svg/600px-Honda_Logo.svg.png',
  'kia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/KIA_logo2021.svg/600px-KIA_logo2021.svg.png',
  'volkswagen': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Volkswagen_logo_2019.svg/600px-Volkswagen_logo_2019.svg.png',
  'vw': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Volkswagen_logo_2019.svg/600px-Volkswagen_logo_2019.svg.png',
  'skoda': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Skoda_Auto_logo_%282022%29.svg/600px-Skoda_Auto_logo_%282022%29.svg.png',
  'renault': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Renault_2021.svg/600px-Renault_2021.svg.png',
  'nissan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Nissan_2020_logo.svg/600px-Nissan_2020_logo.svg.png',
  'ford': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Ford_Motor_Company_Logo.svg/600px-Ford_Motor_Company_Logo.svg.png',
  'bmw': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/600px-BMW.svg.png',
  'mercedes': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/600px-Mercedes-Logo.svg.png',
  'benz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/600px-Mercedes-Logo.svg.png',
  'audi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Audi-Logo_2016.svg/600px-Audi-Logo_2016.svg.png',
  'mg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/MG_Motor_logo.svg/600px-MG_Motor_logo.svg.png',
  'jeep': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Jeep_logo.svg/600px-Jeep_logo.svg.png',
  'chevrolet': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Chevrolet-logo.png/600px-Chevrolet-logo.png',
  'datsun': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Datsun_logo.svg/600px-Datsun_logo.svg.png',
  'fiat': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/FIAT_logo.svg/600px-FIAT_logo.svg.png',
  'force': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Force_Motors_logo.svg/600px-Force_Motors_logo.svg.png',
  'jaguar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Jaguar_2021_logo.svg/600px-Jaguar_2021_logo.svg.png',
  'landrover': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Land_Rover_logo.svg/600px-Land_Rover_logo.svg.png',
  'range_rover': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Land_Rover_logo.svg/600px-Land_Rover_logo.svg.png',
  'volvo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Volvo-Logo.svg/600px-Volvo-Logo.svg.png',
  'isuzu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Isuzu_logo.svg/600px-Isuzu_logo.svg.png',
  'mitsubishi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Mitsubishi_logo.svg/600px-Mitsubishi_logo.svg.png',
  'porsche': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Porsche_logo.png/600px-Porsche_logo.png',
  'lexus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Lexus_logo.svg/600px-Lexus_logo.svg.png',
  'tesla': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Tesla_Motors_logo.svg/600px-Tesla_Motors_logo.svg.png',
  'ferrari': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Ferrari-Logo.png/600px-Ferrari-Logo.png',
  'lamborghini': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Lamborghini_Logo.svg/600px-Lamborghini_Logo.svg.png',
  'citroen': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Citro%C3%ABn_2022_logo.svg/600px-Citro%C3%ABn_2022_logo.svg.png',
  'peugeot': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Peugeot_2021_Logo.svg/600px-Peugeot_2021_Logo.svg.png',
  'mini': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/MINI_logo.svg/600px-MINI_logo.svg.png',
};

/**
 * 100% Native Vector & High-Res Auto Parts India Round Circular Brand Emblem
 */
export function AutoPartsRoundLogo({
  size = 40,
  style,
  border = true,
  bgColor = '#0075FF',
  showText = true,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
  border?: boolean;
  bgColor?: string;
  showText?: boolean;
}) {
  const s = size;
  const radius = s / 2;

  return (
    <View
      style={[
        styles.roundLogoWrapper,
        {
          width: s,
          height: s,
          borderRadius: radius,
          backgroundColor: bgColor,
          borderColor: border ? 'rgba(255, 255, 255, 0.4)' : 'transparent',
          borderWidth: border ? 1.5 : 0,
        },
        style,
      ]}
    >
      <Image
        source={require('../assets/logo.png')}
        style={{
          width: s * 0.88,
          height: s * 0.88,
          resizeMode: 'contain',
        }}
      />
    </View>
  );
}

/**
 * 100% Native Vector Auto Parts India Square App Icon
 */
export function AutoPartsIcon({ size = 48, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return <AutoPartsRoundLogo size={size} style={style} />;
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
  const isLight = theme === 'light';
  const logoHeight = height;
  const logoWidth = height * 3.4;

  return (
    <View style={[styles.horizontalLogoRow, { height: logoHeight }, style]}>
      <AutoPartsRoundLogo size={logoHeight} border={false} />
      <View style={styles.horizontalLogoTextCol}>
        <Text style={[styles.horizontalLogoTitle, { color: isLight ? '#0B1220' : '#FFFFFF' }]}>
          AUTO PARTS
        </Text>
        <Text style={[styles.horizontalLogoSubtitle, { color: isLight ? '#0066FF' : '#38BDF8' }]}>
          INDIA
        </Text>
      </View>
    </View>
  );
}

/**
 * Authentic Official OEM Brand Logo Renderer
 */
function renderBrandVector(brandKey: string, size: number, directImage?: string) {
  const s = size;
  const rawKey = (brandKey || "").toLowerCase().trim();
  const cleanKey = rawKey.replace(/[^a-z0-9]/g, '');

  // 1. Direct custom image URL passed via props (Highest priority)
  if (directImage && directImage.trim().length > 0) {
    return (
      <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        <Image 
          source={{ uri: directImage.trim() }} 
          style={{ width: '100%', height: '100%', resizeMode: 'contain' }} 
        />
      </View>
    );
  }

  // 2. Custom logo URL uploaded by Admin in Firestore `carBrands`
  const dynamicUrl = dynamicBrandLogos[rawKey] || dynamicBrandLogos[cleanKey];
  if (dynamicUrl) {
    return (
      <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        <Image 
          source={{ uri: dynamicUrl }} 
          style={{ width: '100%', height: '100%', resizeMode: 'contain' }} 
        />
      </View>
    );
  }

  // 3. Fallback bundled local brand assets
  let matchedImage = null;
  for (const key of Object.keys(BRAND_IMAGES)) {
    if (rawKey.includes(key) || cleanKey.includes(key.replace(/[^a-z0-9]/g, ''))) {
      matchedImage = BRAND_IMAGES[key];
      break;
    }
  }

  if (matchedImage) {
    return (
      <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        <Image 
          source={matchedImage} 
          style={{ width: '100%', height: '100%', resizeMode: 'contain' }} 
        />
      </View>
    );
  }

  // 4. Fallback remote brand URLs
  let matchedUrl = null;
  for (const key of Object.keys(BRAND_URLS)) {
    if (rawKey.includes(key) || cleanKey.includes(key.replace(/[^a-z0-9]/g, ''))) {
      matchedUrl = BRAND_URLS[key];
      break;
    }
  }

  if (matchedUrl) {
    return (
      <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        <Image 
          source={{ uri: matchedUrl }} 
          style={{ width: '100%', height: '100%', resizeMode: 'contain' }} 
        />
      </View>
    );
  }

  let displayName = (brandKey || "CAR").toUpperCase();
  let code = displayName.length > 4 ? displayName.substring(0, 3) : displayName;

  return (
    <View style={{ 
      width: s, 
      height: s, 
      borderRadius: s * 0.25, 
      backgroundColor: '#0F172A', 
      borderWidth: 1.5,
      borderColor: '#0284C7',
      alignItems: 'center', 
      justifyContent: 'center',
      paddingHorizontal: 2
    }}>
      <Text numberOfLines={1} style={{ fontSize: Math.max(9, s * 0.32), fontWeight: '900', color: '#38BDF8', letterSpacing: 0.5 }}>
        {code}
      </Text>
    </View>
  );
}

/**
 * Modern BrandLogo Component
 */
export function BrandLogo({ 
  name = '', 
  brand = '', 
  imageUrl = '',
  logoUrl = '',
  size = 32, 
  style, 
  active, 
  variant = 'full',
  theme = 'dark'
}: BrandLogoProps) {
  useEffect(() => {
    ensureCarBrandsSubscription();
  }, []);

  const safeSize = Number.isFinite(size) && size > 0 ? size : 32;
  const brandKey = String(brand || name || '').toLowerCase().trim();
  const directImage = imageUrl || logoUrl;

  if (brandKey && brandKey !== 'all' && brandKey !== 'all brands') {
    return (
      <View style={[styles.center, style]}>
        {renderBrandVector(brandKey, safeSize, directImage)}
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
  roundLogoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  horizontalLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  horizontalLogoTextCol: {
    justifyContent: 'center',
  },
  horizontalLogoTitle: {
    fontFamily: 'sans-serif',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: -0.3,
    lineHeight: 16,
  },
  horizontalLogoSubtitle: {
    fontFamily: 'sans-serif',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 2.2,
    lineHeight: 12,
  },
});
