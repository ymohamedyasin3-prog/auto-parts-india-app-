import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';

interface EmptyListingsIllustrationProps {
  size?: number;
}

export const EmptyListingsIllustration: React.FC<EmptyListingsIllustrationProps> = ({ size = 180 }) => {
  return (
    <View style={styles.container}>
      <Svg width={size} height={size * 0.9} viewBox="0 0 200 180" fill="none">
        <Defs>
          {/* Box gradients */}
          <LinearGradient id="boxFront" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1E6BEB" />
            <Stop offset="100%" stopColor="#0D47A1" />
          </LinearGradient>
          <LinearGradient id="boxLeft" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#2575FC" />
            <Stop offset="100%" stopColor="#1557CD" />
          </LinearGradient>
          <LinearGradient id="boxFlap" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#60A5FA" />
            <Stop offset="100%" stopColor="#2563EB" />
          </LinearGradient>
          {/* Spring / Shock gradient */}
          <LinearGradient id="shockSpring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="100%" stopColor="#0284C7" />
          </LinearGradient>
          {/* Gear gradient */}
          <LinearGradient id="gearGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#CBD5E1" />
            <Stop offset="100%" stopColor="#64748B" />
          </LinearGradient>
          {/* Shadow gradient */}
          <LinearGradient id="groundShadow" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#E2E8F0" stopOpacity="0" />
            <Stop offset="50%" stopColor="#CBD5E1" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#E2E8F0" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Soft Background Radial Light */}
        <Circle cx="100" cy="95" r="65" fill="#EFF6FF" />

        {/* Action Sparks / Burst rays above */}
        <Path d="M98 12 L102 24" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
        <Path d="M108 16 L118 26" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
        <Path d="M88 20 L78 28" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />

        {/* 1. Car Tire (Tread & Rim) inside the box */}
        <G transform="translate(68, 48)">
          {/* Outer Black Tire with tread notches */}
          <Circle cx="22" cy="22" r="22" fill="#1E293B" />
          <Circle cx="22" cy="22" r="16" fill="#334155" />
          <Circle cx="22" cy="22" r="14" fill="#64748B" />
          {/* Rim spokes */}
          <Circle cx="22" cy="22" r="9" fill="#0F172A" />
          <Circle cx="22" cy="22" r="5" fill="#94A3B8" />
          <Circle cx="22" cy="22" r="2.5" fill="#F8FAFC" />
          {/* Rim slots */}
          <Rect x="20.5" y="8" width="3" height="5" rx="1" fill="#0F172A" />
          <Rect x="20.5" y="31" width="3" height="5" rx="1" fill="#0F172A" />
          <Rect x="8" y="20.5" width="5" height="3" rx="1" fill="#0F172A" />
          <Rect x="31" y="20.5" width="5" height="3" rx="1" fill="#0F172A" />
        </G>

        {/* 2. Blue Coil Spring / Shock Absorber */}
        <G transform="translate(102, 38) rotate(22)">
          {/* Shock central piston shaft */}
          <Rect x="6" y="0" width="4" height="42" rx="2" fill="#94A3B8" />
          <Circle cx="8" cy="2" r="3" fill="#475569" />
          <Circle cx="8" cy="2" r="1.5" fill="#FFFFFF" />
          {/* Coils */}
          <Rect x="1" y="8" width="14" height="4" rx="2" fill="url(#shockSpring)" />
          <Rect x="1" y="14" width="14" height="4" rx="2" fill="url(#shockSpring)" />
          <Rect x="1" y="20" width="14" height="4" rx="2" fill="url(#shockSpring)" />
          <Rect x="1" y="26" width="14" height="4" rx="2" fill="url(#shockSpring)" />
          <Rect x="1" y="32" width="14" height="4" rx="2" fill="url(#shockSpring)" />
          <Rect x="3" y="38" width="10" height="4" rx="2" fill="#0369A1" />
        </G>

        {/* 3. Metallic Gears */}
        <G transform="translate(112, 72)">
          <Circle cx="12" cy="12" r="11" fill="url(#gearGrad)" />
          {/* Gear teeth */}
          <Rect x="10" y="0" width="4" height="3" rx="0.5" fill="#64748B" />
          <Rect x="10" y="21" width="4" height="3" rx="0.5" fill="#64748B" />
          <Rect x="0" y="10" width="3" height="4" rx="0.5" fill="#64748B" />
          <Rect x="21" y="10" width="3" height="4" rx="0.5" fill="#64748B" />
          <Circle cx="12" cy="12" r="5" fill="#F8FAFC" />
          <Circle cx="12" cy="12" r="2.5" fill="#64748B" />
        </G>

        {/* Smaller secondary gear */}
        <G transform="translate(94, 82)">
          <Circle cx="8" cy="8" r="7.5" fill="url(#gearGrad)" />
          <Rect x="6.5" y="0" width="3" height="2" rx="0.5" fill="#64748B" />
          <Rect x="6.5" y="14" width="3" height="2" rx="0.5" fill="#64748B" />
          <Circle cx="8" cy="8" r="3" fill="#F8FAFC" />
        </G>

        {/* 4. Open Storage Box (Isometric Blue Container) */}
        {/* Left Flap open */}
        <Polygon points="54,82 66,74 76,86 62,94" fill="url(#boxFlap)" />
        {/* Right Flap open */}
        <Polygon points="144,82 132,74 122,86 136,94" fill="url(#boxFlap)" />

        {/* Main Box Front & Left Faces */}
        {/* Left Side Face */}
        <Polygon points="60,94 100,114 100,154 60,134" fill="url(#boxLeft)" />
        {/* Right / Front Face */}
        <Polygon points="100,114 142,94 142,134 100,154" fill="url(#boxFront)" />

        {/* Box Top Lip Highlights */}
        <Polygon points="60,94 100,114 98,116 59,96" fill="#93C5FD" opacity="0.6" />
        <Polygon points="100,114 142,94 141,96 100,116" fill="#60A5FA" opacity="0.6" />

        {/* Subtle center crease line on the box */}
        <Path d="M100 114 L100 154" stroke="#0B3C8A" strokeWidth="1.5" />

        {/* Ground shadow beneath the box */}
        <Path d="M45 152 Q100 172 155 152 Q100 162 45 152" fill="url(#groundShadow)" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
