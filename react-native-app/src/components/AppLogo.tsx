import React from 'react';
import Svg, { Path, Text as SvgText, G, Line } from 'react-native-svg';

export const AppLogo = ({ width = 200, height = 200 }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200">
      <G transform="translate(0, -10)">
        {/* Dark Blue Gear Top Half */}
        <Path
          d="M 60 80 L 50 60 L 70 50 L 80 65 A 50 50 0 0 1 120 65 L 130 50 L 150 60 L 140 80 A 50 50 0 0 1 150 100 L 170 105 L 165 125 L 145 120 Z"
          fill="#001F4D"
        />
        <Path
          d="M 50 110 A 50 50 0 0 1 150 110 Z"
          fill="#001F4D"
        />

        {/* White Car Silhouette */}
        <Path
          d="M 30 110 C 50 90 150 90 170 110 C 180 120 180 130 170 135 L 30 135 C 20 130 20 120 30 110 Z"
          fill="#FFFFFF"
        />

        {/* AutoParts Text */}
        <SvgText x="100" y="160" fill="#FFFFFF" fontSize="36" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
          AutoParts
        </SvgText>

        {/* INDIA Text with Orange Lines */}
        <Line x1="30" y1="180" x2="65" y2="180" stroke="#FF5722" strokeWidth="4" />
        <SvgText x="100" y="188" fill="#FF5722" fontSize="24" fontWeight="bold" textAnchor="middle" letterSpacing="3" fontFamily="sans-serif">
          INDIA
        </SvgText>
        <Line x1="135" y1="180" x2="170" y2="180" stroke="#FF5722" strokeWidth="4" />
      </G>
    </Svg>
  );
};
