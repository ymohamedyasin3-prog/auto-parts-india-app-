import React from 'react';
import Svg, { Path, Text as SvgText, G, Circle, Line, Ellipse } from 'react-native-svg';

export const AppLogo = ({ width = 200, height = 200 }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200">
      <G transform="translate(0, -10)">
        {/* White Gear (Outline + Teeth) */}
        <Circle cx="100" cy="75" r="32" stroke="white" strokeWidth="8" fill="none" />
        <Circle cx="100" cy="75" r="12" stroke="white" strokeWidth="4" fill="none" />
        
        {/* Gear Teeth rotated systematically */}
        <G transform="translate(100, 75)">
          <Path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" />
          <Path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(45)" />
          <Path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(90)" />
          <Path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(135)" />
          <Path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(180)" />
          <Path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(225)" />
          <Path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(270)" />
          <Path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(315)" />
        </G>

        {/* White Car Front View Silhouette */}
        {/* Main Body */}
        <Path
          d="M60,92 C63,78 68,70 100,70 C132,70 137,78 140,92 C150,95 156,100 156,110 C156,121 148,123 138,123 L62,123 C52,123 44,121 44,110 C44,100 50,95 60,92 Z"
          fill="white"
        />
        {/* Windshield Cutout - matching the deep brand royal blue background (#0075FF) */}
        <Path d="M68,91 C70,81 75,74 100,74 C125,74 130,81 132,91 Z" fill="#0075FF" />
        {/* Headlights */}
        <Ellipse cx="56" cy="108" rx="8" ry="4" fill="#FFE082" />
        <Ellipse cx="144" cy="108" rx="8" ry="4" fill="#FFE082" />
        {/* Side Mirrors */}
        <Path d="M44,100 C38,100 36,97 39,94 C41,92 45,93 46,96 Z" fill="white" />
        <Path d="M156,100 C162,100 164,97 161,94 C159,92 155,93 154,96 Z" fill="white" />

        {/* Auto Parts Text */}
        <SvgText
          x="100"
          y="155"
          fill="white"
          fontSize="26"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="sans-serif"
        >
          Auto Parts
        </SvgText>

        {/* INDIA Text with Orange Color */}
        <SvgText
          x="100"
          y="182"
          fill="#FF5722"
          fontSize="21"
          fontWeight="bold"
          textAnchor="middle"
          letterSpacing="8"
          fontFamily="sans-serif"
        >
          INDIA
        </SvgText>
      </G>
    </Svg>
  );
};
