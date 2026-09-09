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
}: AutoPartsBrandLogoProps) {
  const width = typeof size === 'number' ? size : 280;

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`} style={{ width }}>
      <img
        src="/assets/app_logo.png"
        alt="Auto Parts INDIA"
        className="w-full h-auto max-w-full object-contain drop-shadow-sm"
      />
    </div>
  );
}

