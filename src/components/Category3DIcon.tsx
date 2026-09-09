import React, { useState } from 'react';

export interface CategoryIconProps {
  type?: string;
  categoryName?: string;
  iconUrl?: string;
  size?: number;
  className?: string;
  active?: boolean;
}

export const Category3DIcon: React.FC<CategoryIconProps> = ({
  type,
  categoryName,
  iconUrl,
  size = 52,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const effectiveUrl = iconUrl;

  if (effectiveUrl && !imgError) {
    return (
      <div 
        className={`flex items-center justify-center transition-transform duration-200 ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={effectiveUrl}
          alt={categoryName || type || 'Category'}
          style={{ width: size, height: size, objectFit: 'contain' }}
          className="drop-shadow-xs"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  const label = (categoryName || type || 'CAT').trim();
  const initial = label.length > 0 ? label.charAt(0).toUpperCase() : '•';

  return (
    <div 
      className={`flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-extrabold border border-blue-100 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(14, Math.round(size * 0.4)) }}
    >
      {initial}
    </div>
  );
};

export default Category3DIcon;

