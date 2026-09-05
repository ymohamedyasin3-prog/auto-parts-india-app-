import React from 'react';

export interface BrandLogoProps {
  name?: string;
  brand?: string;
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

function renderBrandVector(brandKey: string, size: number) {
  const s = size;
  const lower = (brandKey || "").toLowerCase();

  if (lower.includes('maruti') || lower.includes('suzuki')) {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="select-none">
        <circle cx="100" cy="100" r="94" fill="#0A0F1D" stroke="#E11D48" strokeWidth="4" />
        <path d="M 68 55 C 90 45, 135 55, 125 78 C 115 100, 75 95, 85 125 C 95 145, 135 135, 142 120" fill="none" stroke="#E11D48" strokeWidth="16" strokeLinecap="round" />
        <path d="M 68 55 C 90 45, 135 55, 125 78 C 115 100, 75 95, 85 125 C 95 145, 135 135, 142 120" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        <text x="100" y="165" fontFamily="sans-serif" fontWeight="900" fontSize="14" fill="#E11D48" textAnchor="middle" letterSpacing="3">MARUTI SUZUKI</text>
      </svg>
    );
  }
  if (lower.includes('hyundai')) {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="select-none">
        <circle cx="100" cy="100" r="94" fill="#0A0F1D" stroke="#2563EB" strokeWidth="4" />
        <ellipse cx="100" cy="100" rx="76" ry="46" fill="none" stroke="#2563EB" strokeWidth="8" transform="rotate(-15 100 100)" />
        <path d="M 75 70 L 85 130 M 125 70 L 115 130 M 78 100 L 122 100" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" />
        <text x="100" y="168" fontFamily="sans-serif" fontWeight="900" fontSize="15" fill="#38BDF8" textAnchor="middle" letterSpacing="3">HYUNDAI</text>
      </svg>
    );
  }
  if (lower.includes('tata')) {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="select-none">
        <circle cx="100" cy="100" r="94" fill="#0A0F1D" stroke="#0284C7" strokeWidth="4" />
        <path d="M 60 110 C 80 135, 120 135, 140 110 C 120 85, 80 85, 60 110 Z" fill="#38BDF8" />
        <text x="100" y="168" fontFamily="sans-serif" fontWeight="900" fontSize="18" fill="#FFFFFF" textAnchor="middle" letterSpacing="4">TATA</text>
      </svg>
    );
  }
  if (lower.includes('mahindra')) {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="select-none">
        <circle cx="100" cy="100" r="94" fill="#0A0F1D" stroke="#DC2626" strokeWidth="4" />
        <path d="M 65 135 L 100 70 L 135 135 Z" fill="none" stroke="#DC2626" strokeWidth="14" strokeLinejoin="round" />
        <path d="M 65 135 L 100 70 L 135 135 Z" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinejoin="round" />
        <text x="100" y="168" fontFamily="sans-serif" fontWeight="900" fontSize="14" fill="#DC2626" textAnchor="middle" letterSpacing="3">MAHINDRA</text>
      </svg>
    );
  }
  if (lower.includes('toyota')) {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="select-none">
        <circle cx="100" cy="100" r="94" fill="#0A0F1D" stroke="#EF4444" strokeWidth="4" />
        <ellipse cx="100" cy="100" rx="65" ry="40" fill="none" stroke="#FFFFFF" strokeWidth="6" />
        <ellipse cx="100" cy="90" rx="35" ry="25" fill="none" stroke="#FFFFFF" strokeWidth="5" />
        <text x="100" y="168" fontFamily="sans-serif" fontWeight="900" fontSize="16" fill="#EF4444" textAnchor="middle" letterSpacing="3">TOYOTA</text>
      </svg>
    );
  }
  if (lower.includes('honda')) {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="select-none">
        <circle cx="100" cy="100" r="94" fill="#0A0F1D" stroke="#EF4444" strokeWidth="4" />
        <path d="M 75 60 L 75 140 M 125 60 L 125 140 M 75 100 L 125 100" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" />
        <text x="100" y="168" fontFamily="sans-serif" fontWeight="900" fontSize="16" fill="#EF4444" textAnchor="middle" letterSpacing="3">HONDA</text>
      </svg>
    );
  }
  if (lower.includes('kia')) {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="select-none">
        <circle cx="100" cy="100" r="94" fill="#0A0F1D" stroke="#38BDF8" strokeWidth="4" />
        <text x="100" y="112" fontFamily="sans-serif" fontWeight="900" fontSize="48" fill="#FFFFFF" textAnchor="middle" letterSpacing="2">KIA</text>
        <text x="100" y="152" fontFamily="sans-serif" fontWeight="700" fontSize="12" fill="#38BDF8" textAnchor="middle" letterSpacing="3">MOVEMENT</text>
      </svg>
    );
  }
  if (lower.includes('volkswagen') || lower.includes('vw')) {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="select-none">
        <circle cx="100" cy="100" r="94" fill="#0A0F1D" stroke="#3B82F6" strokeWidth="4" />
        <circle cx="100" cy="100" r="68" fill="none" stroke="#3B82F6" strokeWidth="6" />
        <path d="M 68 75 L 85 125 L 100 95 L 115 125 L 132 75 M 62 105 L 138 105" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <text x="100" y="168" fontFamily="sans-serif" fontWeight="900" fontSize="14" fill="#60A5FA" textAnchor="middle" letterSpacing="3">VOLKSWAGEN</text>
      </svg>
    );
  }
  if (lower.includes('skoda')) {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="select-none">
        <circle cx="100" cy="100" r="94" fill="#0A0F1D" stroke="#059669" strokeWidth="4" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="#059669" strokeWidth="6" />
        <text x="100" y="110" fontFamily="sans-serif" fontWeight="900" fontSize="26" fill="#10B981" textAnchor="middle" letterSpacing="2">SKODA</text>
        <text x="100" y="150" fontFamily="sans-serif" fontWeight="700" fontSize="12" fill="#94A3B8" textAnchor="middle" letterSpacing="2">AUTO</text>
      </svg>
    );
  }
  if (lower.includes('bmw')) {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="select-none">
        <circle cx="100" cy="100" r="94" fill="#0A0F1D" stroke="#FFFFFF" strokeWidth="5" />
        <circle cx="100" cy="100" r="74" fill="#1E293B" stroke="#38BDF8" strokeWidth="4" />
        <path d="M 100 26 A 74 74 0 0 1 174 100 L 100 100 Z" fill="#3B82F6" />
        <path d="M 100 174 A 74 74 0 0 1 26 100 L 100 100 Z" fill="#3B82F6" />
        <text x="100" y="70" fontFamily="sans-serif" fontWeight="900" fontSize="14" fill="#FFFFFF" textAnchor="middle" letterSpacing="5">BMW</text>
      </svg>
    );
  }
  if (lower.includes('mercedes') || lower.includes('benz')) {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="select-none">
        <circle cx="100" cy="100" r="94" fill="#0A0F1D" stroke="#CBD5E1" strokeWidth="5" />
        <path d="M 100 40 L 100 100 M 100 100 L 145 130 M 100 100 L 55 130" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />
        <text x="100" y="165" fontFamily="sans-serif" fontWeight="900" fontSize="13" fill="#E2E8F0" textAnchor="middle" letterSpacing="2">MERCEDES</text>
      </svg>
    );
  }
  if (lower.includes('audi')) {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" className="select-none">
        <circle cx="100" cy="100" r="94" fill="#0A0F1D" stroke="#94A3B8" strokeWidth="4" />
        <circle cx="70" cy="95" r="22" fill="none" stroke="#FFFFFF" strokeWidth="8" />
        <circle cx="90" cy="95" r="22" fill="none" stroke="#FFFFFF" strokeWidth="8" />
        <circle cx="110" cy="95" r="22" fill="none" stroke="#FFFFFF" strokeWidth="8" />
        <circle cx="130" cy="95" r="22" fill="none" stroke="#FFFFFF" strokeWidth="8" />
        <text x="100" y="160" fontFamily="sans-serif" fontWeight="900" fontSize="18" fill="#FFFFFF" textAnchor="middle" letterSpacing="5">AUDI</text>
      </svg>
    );
  }

  const code = (brandKey || "CAR").substring(0, 3).toUpperCase();
  const subText = (brandKey || "OEM").toUpperCase();
  return (
    <svg width={s} height={s} viewBox="0 0 200 200" className="select-none">
      <circle cx="100" cy="100" r="92" fill="#0B132B" stroke="#38BDF8" strokeWidth="5" />
      <text x="100" y="110" fontFamily="sans-serif" fontWeight="900" fontSize="42" fill="#FFFFFF" textAnchor="middle" letterSpacing="2">{code}</text>
      <text x="100" y="148" fontFamily="sans-serif" fontWeight="700" fontSize="12" fill="#94A3B8" textAnchor="middle" letterSpacing="2">{subText}</text>
    </svg>
  );
}

export function BrandLogo({ 
  name = '', 
  brand = '', 
  size = 32, 
  className = '', 
  active,
  variant = 'full',
  theme = 'dark',
  showTagline = true 
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
        {renderBrandVector(brandKey, safeSize)}
      </div>
    );
  }

  // APP BRANDING LOGO: Use Official Auto Parts India Logo
  if (variant === 'icon') {
    return (
      <div className={`flex items-center justify-center shrink-0 ${className}`}>
        <img
          src="/assets/logo_icon.svg"
          alt="Auto Parts India"
          style={{ width: safeSize, height: safeSize, objectFit: 'contain' }}
          className="drop-shadow-sm select-none"
        />
      </div>
    );
  }

  // Full / Horizontal / Default App Logo
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <img
        src="/assets/logo.svg"
        alt="Auto Parts India"
        style={{ 
          height: safeSize, 
          width: 'auto', 
          maxHeight: safeSize,
          objectFit: 'contain' 
        }}
        className="drop-shadow-md transition-transform duration-200 hover:scale-[1.02]"
      />
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
