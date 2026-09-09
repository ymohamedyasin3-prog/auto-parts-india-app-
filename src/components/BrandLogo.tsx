import React from 'react';

export interface BrandLogoProps {
  name?: string;
  brand?: string;
  logoUrl?: string;
  imageUrl?: string;
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | string;
  className?: string;
  active?: boolean;
  variant?: 'icon' | 'full' | 'horizontal' | string;
  theme?: 'dark' | 'light' | string;
  showTagline?: boolean;
}

const SIZE_MAP: Record<string, number> = {
  xs: 20,
  sm: 32,
  md: 44,
  lg: 64,
  xl: 96,
  '2xl': 128,
};

function CarBrandImage({ brandKey, logoUrl, size }: { brandKey: string; logoUrl?: string; size: number }) {
  const [hasError, setHasError] = React.useState(false);

  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={brandKey}
        onError={() => setHasError(true)}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
        }}
        className="select-none pointer-events-none p-0.5 max-w-full max-h-full"
        draggable={false}
      />
    );
  }

  const code = (brandKey || "CAR").substring(0, 3).toUpperCase();
  return (
    <div 
      className="flex items-center justify-center rounded-lg bg-blue-50 border border-blue-200 text-blue-600 font-extrabold text-[11px] select-none shadow-2xs"
      style={{ width: size, height: size }}
    >
      {code}
    </div>
  );
}


export function AutoPartsRoundLogo({
  size = 40,
  className = '',
  border = true,
  bgColor = '#0075FF',
}: {
  size?: number;
  className?: string;
  border?: boolean;
  bgColor?: string;
}) {
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-md select-none ${
        border ? 'ring-2 ring-white/40' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
      }}
    >
      <svg width={size * 0.88} height={size * 0.88} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(0, -10)">
          {/* White Gear (Outline + Teeth) */}
          <circle cx="100" cy="75" r="32" stroke="white" strokeWidth="8" fill="none" />
          <circle cx="100" cy="75" r="12" stroke="white" strokeWidth="4" fill="none" />
          
          {/* Gear Teeth rotated systematically */}
          <g transform="translate(100, 75)">
            <path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" />
            <path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(45)" />
            <path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(90)" />
            <path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(135)" />
            <path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(180)" />
            <path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(225)" />
            <path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(270)" />
            <path d="M-6,-40 L6,-40 L4,-32 L-4,-32 Z" fill="white" transform="rotate(315)" />
          </g>

          {/* White Car Front View Silhouette */}
          {/* Main Body */}
          <path
            d="M60,92 C63,78 68,70 100,70 C132,70 137,78 140,92 C150,95 156,100 156,110 C156,121 148,123 138,123 L62,123 C52,123 44,121 44,110 C44,100 50,95 60,92 Z"
            fill="white"
          />
          {/* Windshield Cutout - matching the deep brand royal blue background (#0075FF) */}
          <path d="M68,91 C70,81 75,74 100,74 C125,74 130,81 132,91 Z" fill="#0075FF" />
          {/* Headlights */}
          <ellipse cx="56" cy="108" rx="8" ry="4" fill="#FFE082" />
          <ellipse cx="144" cy="108" rx="8" ry="4" fill="#FFE082" />
          {/* Side Mirrors */}
          <path d="M44,100 C38,100 36,97 39,94 C41,92 45,93 46,96 Z" fill="white" />
          <path d="M156,100 C162,100 164,97 161,94 C159,92 155,93 154,96 Z" fill="white" />

          {/* Auto Parts Text */}
          <text
            x="100"
            y="155"
            fill="white"
            fontSize="26"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            Auto Parts
          </text>

          {/* INDIA Text with Orange Color */}
          <text
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
          </text>
        </g>
      </svg>
    </div>
  );
}

export function BrandLogo({ 
  name = '', 
  brand = '', 
  logoUrl,
  imageUrl,
  size = 32, 
  className = '', 
  variant = 'full'
}: BrandLogoProps) {

  const numericSize = typeof size === 'number' 
    ? size 
    : (SIZE_MAP[size] || 32);
  const safeSize = Number.isFinite(numericSize) && numericSize > 0 ? numericSize : 32;
  const brandKey = String(brand || name || '').toLowerCase().trim();

  // If a car brand is specified
  if (brandKey && brandKey !== 'all' && brandKey !== 'all brands') {
    return (
      <div className={`flex items-center justify-center shrink-0 ${className}`} style={{ width: safeSize, height: safeSize }}>
        <CarBrandImage brandKey={brandKey} logoUrl={logoUrl || imageUrl} size={safeSize} />
      </div>
    );
  }


  // Round Brand Emblem
  if (variant === 'round') {
    return <AutoPartsRoundLogo size={safeSize} className={className} />;
  }

  // APP BRANDING LOGO: Use Official Auto Parts India Logo
  if (variant === 'icon') {
    return <AutoPartsRoundLogo size={safeSize} className={className} border={false} />;
  }

  // Full / Horizontal / Default App Logo
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <AutoPartsRoundLogo size={Math.min(safeSize, 36)} border={true} />
      <div className="flex flex-col justify-center leading-none">
        <span className="font-black text-xs sm:text-sm tracking-tight text-white font-sans">AUTO PARTS</span>
        <span className="font-extrabold text-[9px] sm:text-[10px] tracking-widest text-sky-400 font-sans">INDIA</span>
      </div>
    </div>
  );
}

export function CarBrandBadge(props: BrandLogoProps) {
  return <BrandLogo {...props} />;
}

export function GearSpeedLogoIcon({ size = 48 }: { size?: number }) {
  return (
    <img
      src="/assets/logo_icon.svg"
      alt="Auto Parts Logo"
      style={{ width: size, height: size, objectFit: 'contain' }}
      className="drop-shadow-lg select-none"
    />
  );
}

export default BrandLogo;

