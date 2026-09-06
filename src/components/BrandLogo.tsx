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

const BRAND_IMAGE_MAP: Record<string, string> = {
  'maruti_suzuki': '/assets/brands/maruti_suzuki.png',
  'maruti suzuki': '/assets/brands/maruti_suzuki.png',
  'maruti': '/assets/brands/maruti_suzuki.png',
  'suzuki': '/assets/brands/maruti_suzuki.png',
  'hyundai': '/assets/brands/hyundai.png',
  'tata': '/assets/brands/tata.png',
  'mahindra': '/assets/brands/mahindra.png',
  'toyota': '/assets/brands/toyota.png',
  'honda': '/assets/brands/honda.png',
  'kia': '/assets/brands/kia.png',
  'volkswagen': '/assets/brands/volkswagen.png',
  'vw': '/assets/brands/volkswagen.png',
  'skoda': '/assets/brands/skoda.svg',
  'renault': '/assets/brands/renault.svg',
  'nissan': '/assets/brands/nissan.svg',
  'ford': '/assets/brands/ford.svg',
  'bmw': '/assets/brands/bmw.svg',
  'mercedes': '/assets/brands/mercedes.svg',
  'benz': '/assets/brands/mercedes.svg',
  'audi': '/assets/brands/audi.svg',
  'mg': '/assets/brands/mg.svg',
};

const BRAND_CDN_FALLBACKS: Record<string, string> = {
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
  'volvo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Volvo-Logo.svg/600px-Volvo-Logo.svg.png',
  'porsche': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Porsche_logo.png/600px-Porsche_logo.png'
};

function CarBrandImage({ brandKey, size }: { brandKey: string; size: number }) {
  const lower = (brandKey || "").toLowerCase().trim();
  const cleanKey = lower.replace(/[^a-z0-9]/g, '');

  let matchedSrc: string | null = null;
  let fallbackSrc: string | null = null;

  for (const k of Object.keys(BRAND_IMAGE_MAP)) {
    if (lower.includes(k) || cleanKey.includes(k.replace(/[^a-z0-9]/g, ''))) {
      matchedSrc = BRAND_IMAGE_MAP[k];
      fallbackSrc = BRAND_CDN_FALLBACKS[k] || null;
      break;
    }
  }

  if (!matchedSrc) {
    for (const k of Object.keys(BRAND_CDN_FALLBACKS)) {
      if (lower.includes(k) || cleanKey.includes(k.replace(/[^a-z0-9]/g, ''))) {
        matchedSrc = BRAND_CDN_FALLBACKS[k];
        break;
      }
    }
  }

  const [currentSrc, setCurrentSrc] = React.useState<string | null>(matchedSrc);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setCurrentSrc(matchedSrc);
    setHasError(false);
  }, [matchedSrc]);

  if (!currentSrc || hasError) {
    const code = (brandKey || "CAR").substring(0, 3).toUpperCase();
    return (
      <div 
        className="flex items-center justify-center rounded-xl bg-slate-900 border border-sky-500/30 text-sky-400 font-black text-xs select-none shadow-xs"
        style={{ width: size, height: size }}
      >
        {code}
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={brandKey}
      onError={() => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        } else {
          setHasError(true);
        }
      }}
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

export function BrandLogo({ 
  name = '', 
  brand = '', 
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
        <CarBrandImage brandKey={brandKey} size={safeSize} />
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

