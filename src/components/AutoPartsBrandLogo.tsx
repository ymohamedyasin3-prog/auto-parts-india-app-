import React from 'react';

interface AutoPartsBrandLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'light' | 'dark' | 'splash' | 'white';
  showText?: boolean;
}

/**
 * Official AutoParts INDIA Vector Brand Logo Component
 * - "Auto" in White (on dark/splash) or Deep Slate (on light)
 * - "Parts" in Signature Automotive Navy Blue
 * - "INDIA" in Vibrant Orange with Dynamic Speed Arrows
 */
export default function AutoPartsBrandLogo({
  className = "",
  size = 280,
  variant = 'splash',
}: AutoPartsBrandLogoProps) {
  // Determine color palette based on background
  const isLightMode = variant === 'dark'; // for rendering on white/light surfaces
  const autoColor = isLightMode ? '#0F172A' : '#FFFFFF';
  const partsColor = isLightMode ? '#0A3B73' : (variant === 'splash' ? '#072E5C' : '#0B4A8E');
  const indiaColor = '#FF6A00';

  const width = typeof size === 'number' ? size : 280;

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`} style={{ width }}>
      <svg
        viewBox="0 0 1000 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-w-full drop-shadow-sm"
      >
        <defs>
          <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        <g filter="url(#logoShadow)">
          {/* "Auto" Wordmark */}
          <text
            x="70"
            y="230"
            fill={autoColor}
            style={{
              fontFamily: "system-ui, -apple-system, 'Montserrat', 'Poppins', 'Segoe UI', sans-serif",
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: "210px",
              letterSpacing: "-4px"
            }}
          >
            Auto
          </text>

          {/* "Parts" Wordmark in Navy Blue */}
          <text
            x="510"
            y="230"
            fill={partsColor}
            style={{
              fontFamily: "system-ui, -apple-system, 'Montserrat', 'Poppins', 'Segoe UI', sans-serif",
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: "210px",
              letterSpacing: "-4px"
            }}
          >
            Parts
          </text>

          {/* Left Speed Arrow / Wing */}
          <polygon
            points="140,298 340,298 340,312 140,298"
            fill={indiaColor}
          />

          {/* "INDIA" Sub-Brand in Orange */}
          <text
            x="500"
            y="316"
            textAnchor="middle"
            fill={indiaColor}
            style={{
              fontFamily: "system-ui, -apple-system, 'Montserrat', 'Poppins', 'Segoe UI', sans-serif",
              fontWeight: 900,
              fontSize: "46px",
              letterSpacing: "18px"
            }}
          >
            INDIA
          </text>

          {/* Right Speed Arrow / Wing */}
          <polygon
            points="680,312 680,298 880,298 680,312"
            fill={indiaColor}
          />
        </g>
      </svg>
    </div>
  );
}
