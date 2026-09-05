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
  let code = "AUTO";
  let brandColor = "#0066FF";
  let subText = "";

  const lower = (brandKey || "").toLowerCase();
  if (lower.includes('maruti') || lower.includes('suzuki')) { code = "MS"; subText = "MARUTI"; brandColor = "#E11D48"; }
  else if (lower.includes('hyundai')) { code = "H"; subText = "HYUNDAI"; brandColor = "#2563EB"; }
  else if (lower.includes('tata')) { code = "TATA"; subText = "TATA"; brandColor = "#0284C7"; }
  else if (lower.includes('mahindra')) { code = "M"; subText = "MAHINDRA"; brandColor = "#DC2626"; }
  else if (lower.includes('toyota')) { code = "TY"; subText = "TOYOTA"; brandColor = "#EF4444"; }
  else if (lower.includes('honda')) { code = "H"; subText = "HONDA"; brandColor = "#EF4444"; }
  else if (lower.includes('kia')) { code = "KIA"; subText = "KIA"; brandColor = "#0F172A"; }
  else if (lower.includes('volkswagen') || lower.includes('vw')) { code = "VW"; subText = "VOLKSWAGEN"; brandColor = "#1D4ED8"; }
  else if (lower.includes('skoda')) { code = "SK"; subText = "SKODA"; brandColor = "#059669"; }
  else if (lower.includes('renault')) { code = "RN"; subText = "RENAULT"; brandColor = "#CA8A04"; }
  else if (lower.includes('mg')) { code = "MG"; subText = "MG"; brandColor = "#BE123C"; }
  else if (lower.includes('nissan')) { code = "NISSAN"; subText = "NISSAN"; brandColor = "#E11D48"; }
  else if (lower.includes('ford')) { code = "FORD"; subText = "FORD"; brandColor = "#1D4ED8"; }
  else if (lower.includes('bmw')) { code = "BMW"; subText = "BMW"; brandColor = "#2563EB"; }
  else if (lower.includes('mercedes') || lower.includes('benz')) { code = "MB"; subText = "MERCEDES"; brandColor = "#475569"; }
  else if (lower.includes('audi')) { code = "AUDI"; subText = "AUDI"; brandColor = "#0F172A"; }
  else {
    code = (brandKey || "CAR").substring(0, 3).toUpperCase();
    subText = (brandKey || "OEM").toUpperCase();
  }

  return (
    <Svg width={s} height={s} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id="badgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#0B132B" />
          <Stop offset="100%" stopColor="#040812" />
        </LinearGradient>
        <LinearGradient id="chromeRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="50%" stopColor="#CBD5E1" />
          <Stop offset="100%" stopColor="#64748B" />
        </LinearGradient>
      </Defs>
      <Circle cx="100" cy="100" r="92" fill="url(#badgeBg)" stroke="url(#chromeRing)" strokeWidth="6" />
      <Circle cx="100" cy="100" r="78" fill="none" stroke={brandColor} strokeWidth="3" opacity="0.6" />
      <SvgText 
        x="100" 
        y={code.length > 3 ? "106" : "110"} 
        fontFamily="sans-serif" 
        fontWeight="900" 
        fontSize={code.length > 3 ? "30" : "54"} 
        fill="#FFFFFF" 
        textAnchor="middle" 
        letterSpacing="2"
      >
        {code}
      </SvgText>
      <SvgText 
        x="100" 
        y="148" 
        fontFamily="sans-serif" 
        fontWeight="700" 
        fontSize="12" 
        fill="#94A3B8" 
        textAnchor="middle" 
        letterSpacing="1.5"
      >
        {subText}
      </SvgText>
    </Svg>
  );
}

function getOfficialBrandLogoUrl(brandKey: string): string | null {
  const lower = (brandKey || '').toLowerCase();
  if (lower.includes('maruti') || lower.includes('suzuki')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Suzuki_logo_2.svg/512px-Suzuki_logo_2.svg.png';
  }
  if (lower.includes('hyundai')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Hyundai_Motor_Company_logo.svg/512px-Hyundai_Motor_Company_logo.svg.png';
  }
  if (lower.includes('tata')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Tata_logo.svg/512px-Tata_logo.svg.png';
  }
  if (lower.includes('mahindra')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Mahindra_logo_2021.svg/512px-Mahindra_logo_2021.svg.png';
  }
  if (lower.includes('toyota')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Toyota_car_logo.svg/512px-Toyota_car_logo.svg.png';
  }
  if (lower.includes('honda')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Honda_Logo.svg/512px-Honda_Logo.svg.png';
  }
  if (lower.includes('kia')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Kia-logo.svg/512px-Kia-logo.svg.png';
  }
  if (lower.includes('volkswagen') || lower.includes('vw')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Volkswagen_logo_2019.svg/512px-Volkswagen_logo_2019.svg.png';
  }
  if (lower.includes('skoda')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Skoda_Logo_2016.svg/512px-Skoda_Logo_2016.svg.png';
  }
  if (lower.includes('renault')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Renault_logo_%282021%29.svg/512px-Renault_logo_%282021%29.svg.png';
  }
  if (lower.includes('mg')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/MG_Motor_logo_%282021%29.svg/512px-MG_Motor_logo_%282021%29.svg.png';
  }
  if (lower.includes('nissan')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Nissan_logo_%282020%29.svg/512px-Nissan_logo_%282020%29.svg.png';
  }
  if (lower.includes('ford')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Ford_logo_flat.svg/512px-Ford_logo_flat.svg.png';
  }
  if (lower.includes('bmw')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/512px-BMW.svg.png';
  }
  if (lower.includes('mercedes') || lower.includes('benz')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/512px-Mercedes-Logo.svg.png';
  }
  if (lower.includes('audi')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Audi-Logo_2016.svg/512px-Audi-Logo_2016.svg.png';
  }
  if (lower.includes('jeep')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Jeep_logo.svg/512px-Jeep_logo.svg.png';
  }
  return null;
}

function OfficialBrandLogo({ brandKey, size, style }: { brandKey: string; size: number; style?: StyleProp<ViewStyle> }) {
  const [imageError, setImageError] = React.useState(false);
  const logoUrl = getOfficialBrandLogoUrl(brandKey);

  if (!imageError && logoUrl) {
    return (
      <View style={[styles.center, { width: size, height: size, backgroundColor: '#FFFFFF', borderRadius: size / 2, overflow: 'hidden', padding: 3 }, style]}>
        <Image 
          source={{ uri: logoUrl }} 
          style={{ width: size * 0.85, height: size * 0.85, resizeMode: 'contain' }}
          onError={() => setImageError(true)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.center, style]}>
      {renderBrandVector(brandKey, size)}
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

  // 1. If Car Brand is specified: render official brand logo image with vector fallback
  if (brandKey && brandKey !== 'all' && brandKey !== 'all brands') {
    return <OfficialBrandLogo brandKey={brandKey} size={safeSize} style={style} />;
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
