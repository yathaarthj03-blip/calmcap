import React, { useState } from 'react';

interface CorridorMarkProps {
  className?: string;
  size?: number;
}

export const CorridorMark: React.FC<CorridorMarkProps> = ({ className = '', size = 32 }) => {
  const [imageError, setImageError] = useState(false);

  if (!imageError) {
    return (
      <img
        src="./calmcap-logo.png"
        alt="CalmCap Logo"
        width={size}
        height={size}
        onError={() => setImageError(true)}
        className={`rounded-full object-contain shrink-0 shadow-sm ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // Crisp gold vector SVG fallback
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="CalmCap logo"
    >
      <circle cx="50" cy="50" r="44" stroke="#C89D4B" strokeWidth="8" fill="none" />
      <path
        d="M65 34 C50 22, 30 30, 30 50 C30 70, 50 78, 65 66 C48 70, 38 62, 38 50 C38 38, 48 30, 65 34 Z"
        fill="#C89D4B"
      />
    </svg>
  );
};
