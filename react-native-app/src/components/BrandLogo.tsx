import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Image } from 'react-native';
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

const APP_LOGO = require('../assets/logo.png');
const APP_LOGO_ICON = require('../assets/logo.png');

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
 * Features a modern aerodynamic car silhouette combined with a precision minimal gear/wrench element
 * Color direction: Deep professional blue, speed cyan, pure white
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

        {/* Outer Rounded Shield */}
        <Rect x="8" y="8" width="184" height="184" rx="42" fill="url(#apBgGrad)" stroke="url(#apRimGrad)" strokeWidth="3.5" />

        {/* Concentric Mechanical Track */}
        <G opacity="0.25">
          <Circle cx="100" cy="100" r="76" fill="none" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="4 6" />
          <Circle cx="100" cy="100" r="58" fill="none" stroke="#1E293B" strokeWidth="1" />
        </G>

        {/* Core Automotive Symbol: Modern Car Silhouette + Minimal Gear & Wrench */}
        <G transform="translate(10, 8)">
          {/* Gear (Spare Parts Core) */}
          <G transform="translate(68, 108)" fill="url(#apGearGrad)">
            <Path d="M -6,-28 L 6,-28 L 5,-22 C 8,-21 11,-19 14,-17 L 19,-20 L 27,-12 L 24,-7 C 26,-4 28,-1 29,2 L 35,3 L 35,15 L 29,16 C 28,19 26,22 24,25 L 27,30 L 19,38 L 14,35 C 11,37 8,39 5,40 L 6,46 L -6,46 L -5,40 C -8,39 -11,37 -14,35 L -19,38 L -27,30 L -24,25 C -26,22 -28,19 -29,16 L -35,15 L -35,3 L -29,2 C -28,-1 -26,-4 -24,-7 L -27,-12 L -19,-20 L -14,-17 C -11,-19 -8,-21 -5,-22 Z" opacity="0.95" />
            <Circle cx="0" cy="9" r="14" fill="#0A1526" stroke="#38BDF8" strokeWidth="2.5" />
            <Circle cx="0" cy="9" r="6" fill="#38BDF8" />
          </G>

          {/* Wrench (Mechanical Spare Parts Accent) */}
          <G transform="translate(132, 117) rotate(35)">
            <Path d="M -16,-6 L -42,-6 C -44,-6 -46,-4 -46,-2 L -46,2 C -46,4 -44,6 -42,6 L -16,6 C -14,12 -8,16 0,16 C 9,16 16,9 16,0 C 16,-9 9,-16 0,-16 C -8,-16 -14,-12 -16,-6 Z M 0,-8 C 4.4,-8 8,-4.4 8,0 C 8,4.4 4.4,8 0,8 C -3,8 -5.6,6.3 -6.9,3.8 L 3,3.8 L 3,-3.8 L -6.9,-3.8 C -5.6,-6.3 -3,-8 0,-8 Z" fill="#60A5FA" opacity="0.9" />
          </G>

          {/* Car Silhouette (Aerodynamic Roofline & Windshield) */}
          <Path d="M 22 104 C 32 94, 46 64, 76 52 C 102 42, 130 46, 154 78 C 160 86, 168 96, 172 104 C 174 108, 166 110, 158 108 C 138 104, 114 96, 86 96 C 58 96, 38 102, 22 104 Z" fill="url(#apCarStream)" />
          <Path d="M 48 88 C 70 62, 106 56, 142 80" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
          <Path d="M 80 78 L 94 62 C 108 60, 120 62, 128 76 Z" fill="#0A1526" stroke="#38BDF8" strokeWidth="1.2" />
          <Path d="M 132 76 C 138 72, 144 74, 148 78 L 136 80 Z" fill="#0A1526" stroke="#38BDF8" strokeWidth="1.2" />
          <Path d="M 158 98 L 174 102 L 160 106 Z" fill="#38BDF8" opacity="0.95" />
          <Path d="M 18 116 L 38 116" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
          <Path d="M 102 126 L 166 126" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 100% Native Vector AUTO PARTS INDIA Full Horizontal Brand Logo
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

          <LinearGradient id="apHRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="40%" stopColor="#0066FF" />
            <Stop offset="80%" stopColor="#003B95" />
            <Stop offset="100%" stopColor="#0284C7" />
          </LinearGradient>

          <LinearGradient id="apHCarStream" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="50%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#60A5FA" />
          </LinearGradient>

          <LinearGradient id="apHGearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="50%" stopColor="#0066FF" />
            <Stop offset="100%" stopColor="#003B95" />
          </LinearGradient>

          <LinearGradient id="apHCyanBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="100%" stopColor="#0066FF" />
          </LinearGradient>
        </Defs>

        {/* LEFT EMBLEM ICON */}
        <G transform="translate(10, 10)">
          <Rect x="0" y="0" width="110" height="110" rx="26" fill="url(#apHIconBg)" stroke="url(#apHRim)" strokeWidth="2.5" />
          <Circle cx="55" cy="55" r="42" fill="none" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 4" opacity="0.25" />
          
          <G transform="translate(4, 5) scale(0.55)">
            {/* Gear */}
            <G transform="translate(68, 108)" fill="url(#apHGearGrad)">
              <Path d="M -6,-28 L 6,-28 L 5,-22 C 8,-21 11,-19 14,-17 L 19,-20 L 27,-12 L 24,-7 C 26,-4 28,-1 29,2 L 35,3 L 35,15 L 29,16 C 28,19 26,22 24,25 L 27,30 L 19,38 L 14,35 C 11,37 8,39 5,40 L 6,46 L -6,46 L -5,40 C -8,39 -11,37 -14,35 L -19,38 L -27,30 L -24,25 C -26,22 -28,19 -29,16 L -35,15 L -35,3 L -29,2 C -28,-1 -26,-4 -24,-7 L -27,-12 L -19,-20 L -14,-17 C -11,-19 -8,-21 -5,-22 Z" opacity="0.95" />
              <Circle cx="0" cy="9" r="14" fill="#0A1526" stroke="#38BDF8" strokeWidth="2.5" />
              <Circle cx="0" cy="9" r="6" fill="#38BDF8" />
            </G>

            {/* Wrench */}
            <G transform="translate(132, 117) rotate(35)">
              <Path d="M -16,-6 L -42,-6 C -44,-6 -46,-4 -46,-2 L -46,2 C -46,4 -44,6 -42,6 L -16,6 C -14,12 -8,16 0,16 C 9,16 16,9 16,0 C 16,-9 9,-16 0,-16 C -8,-16 -14,-12 -16,-6 Z M 0,-8 C 4.4,-8 8,-4.4 8,0 C 8,4.4 4.4,8 0,8 C -3,8 -5.6,6.3 -6.9,3.8 L 3,3.8 L 3,-3.8 L -6.9,-3.8 C -5.6,-6.3 -3,-8 0,-8 Z" fill="#60A5FA" opacity="0.9" />
            </G>

            {/* Car */}
            <Path d="M 22 104 C 32 94, 46 64, 76 52 C 102 42, 130 46, 154 78 C 160 86, 168 96, 172 104 C 174 108, 166 110, 158 108 C 138 104, 114 96, 86 96 C 58 96, 38 102, 22 104 Z" fill="url(#apHCarStream)" />
            <Path d="M 48 88 C 70 62, 106 56, 142 80" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
            <Path d="M 80 78 L 94 62 C 108 60, 120 62, 128 76 Z" fill="#0A1526" stroke="#38BDF8" strokeWidth="1.2" />
            <Path d="M 132 76 C 138 72, 144 74, 148 78 L 136 80 Z" fill="#0A1526" stroke="#38BDF8" strokeWidth="1.2" />
            <Path d="M 158 98 L 174 102 L 160 106 Z" fill="#38BDF8" opacity="0.95" />
          </G>
        </G>

        {/* RIGHT BRAND TYPOGRAPHY */}
        <G transform="translate(138, 12)">
          {/* AUTO */}
          <SvgText 
            x="0" 
            y="52" 
            fontFamily="sans-serif" 
            fontWeight="900" 
            fontSize="44" 
            fill={isLight ? '#0F172A' : '#FFFFFF'} 
            letterSpacing="-1"
          >
            AUTO
          </SvgText>
          
          {/* PARTS */}
          <SvgText 
            x="135" 
            y="52" 
            fontFamily="sans-serif" 
            fontWeight="900" 
            fontStyle="italic" 
            fontSize="44" 
            fill="url(#apHCyanBlue)" 
            letterSpacing="-0.5"
          >
            PARTS
          </SvgText>

          {/* Micro Tricolor & INDIA Badge */}
          <G transform="translate(310, 22)">
            <Rect x="0" y="0" width="84" height="24" rx="6" fill={isLight ? '#F1F5F9' : '#0F1F38'} stroke={isLight ? '#CBD5E1' : '#0052CC'} strokeWidth="1.2" />
            
            {/* Tricolor */}
            <Rect x="6" y="5" width="4" height="14" rx="1" fill="#FF9933" />
            <Rect x="11" y="5" width="4" height="14" rx="1" fill={isLight ? '#94A3B8' : '#FFFFFF'} />
            <Rect x="16" y="5" width="4" height="14" rx="1" fill="#138808" />

            {/* INDIA Text */}
            <SvgText 
              x="26" 
              y="17" 
              fontFamily="sans-serif" 
              fontWeight="900" 
              fontSize="11" 
              fill={isLight ? '#0052CC' : '#38BDF8'} 
              letterSpacing="1.5"
            >
              INDIA
            </SvgText>
          </G>

          {/* Speed divider line */}
          <Rect x="0" y="66" width="410" height="3" rx="1.5" fill="#1E293B" opacity={isLight ? 0.2 : 0.7} />
          <Rect x="0" y="66" width="120" height="3" rx="1.5" fill="url(#apHCarStream)" />
          <Rect x="124" y="66" width="90" height="3" rx="1.5" fill="#0066FF" />
          <Circle cx="220" cy="67.5" r="3" fill="#38BDF8" />

          {/* Subline */}
          <SvgText 
            x="0" 
            y="88" 
            fontFamily="sans-serif" 
            fontWeight="700" 
            fontSize="11" 
            fill={isLight ? '#475569' : '#94A3B8'} 
            letterSpacing="3.5"
          >
            GENUINE AUTOMOTIVE SPARES MARKETPLACE
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

/**
 * Authentic, Official Automotive OEM Brand Emblems (100% Vector, Sharp & Real)
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
      <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: '#334155' }}>
        <Image 
          source={matchedImage} 
          style={{ width: s * 0.78, height: s * 0.78, resizeMode: 'contain' }} 
        />
      </View>
    );
  }

  let code = (brandKey || "CAR").substring(0, 3).toUpperCase();
  let subText = (brandKey || "OEM").toUpperCase();
  return (
    <Svg width={s} height={s} viewBox="0 0 200 200">
      <Circle cx="100" cy="100" r="92" fill="#0B132B" stroke="#38BDF8" strokeWidth="5" />
      <SvgText x="100" y="110" fontFamily="sans-serif" fontWeight="900" fontSize="42" fill="#FFFFFF" textAnchor="middle" letterSpacing="2">{code}</SvgText>
      <SvgText x="100" y="148" fontFamily="sans-serif" fontWeight="700" fontSize="12" fill="#94A3B8" textAnchor="middle" letterSpacing="2">{subText}</SvgText>
    </Svg>
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

  // 1. If Car Brand is specified: render clean official vector badge
  if (brandKey && brandKey !== 'all' && brandKey !== 'all brands') {
    return (
      <View style={[styles.center, style]}>
        {renderBrandVector(brandKey, safeSize)}
      </View>
    );
  }

  // 2. Square App Icon
  if (variant === 'icon') {
    return <AutoPartsIcon size={safeSize} style={style} />;
  }

  // 3. Full / Horizontal App Logo
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
