import React from 'react';

interface DataVerseLogoProps {
  size?: number;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export const DataVerseLogo: React.FC<DataVerseLogoProps> = ({ 
  size = 40, 
  className = '', 
  rounded = 'full' 
}) => {
  const roundClass = 
    rounded === 'full' ? 'rounded-full' : 
    rounded === '2xl' ? 'rounded-2xl' : 
    rounded === 'xl' ? 'rounded-xl' : 
    rounded === 'lg' ? 'rounded-lg' : 
    rounded === 'md' ? 'rounded-md' : 
    rounded === 'sm' ? 'rounded-sm' : '';

  const borderRx = 
    rounded === 'full' ? 254 : 
    rounded === '2xl' ? 120 : 
    rounded === 'xl' ? 96 : 
    rounded === 'lg' ? 64 : 
    rounded === 'md' ? 48 : 
    rounded === 'sm' ? 24 : 0;

  return (
    <svg 
      viewBox="0 0 512 512" 
      width={size} 
      height={size} 
      className={`${roundClass} ${className} select-none`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="DataVerse Logo"
    >
      <defs>
        <radialGradient id="dvLogoBg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#0a262d" />
          <stop offset="60%" stopColor="#051519" />
          <stop offset="100%" stopColor="#03090b" />
        </radialGradient>
        <linearGradient id="dvLogoBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5eead4" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#0d9488" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="dvLogoDGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="35%" stopColor="#2dd4bf" />
          <stop offset="85%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="dvLogoVGrad" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <filter id="dvLogoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Full bleed background */}
      <rect x="0" y="0" width="512" height="512" fill="url(#dvLogoBg)" />
      {/* Subtle border highlight */}
      <rect x="2" y="2" width="508" height="508" rx={borderRx} fill="none" stroke="url(#dvLogoBorder)" strokeWidth="4" />

      {/* Backlight Glow */}
      <circle cx="256" cy="256" r="140" fill="#2dd4bf" opacity="0.16" />

      {/* Monogram */}
      <g id="dvMonogram">
        {/* D Loop */}
        <path 
          d="M152 148 H254 C322 148 368 192 368 256 C368 320 322 364 254 364 H152 V148 Z" 
          fill="none" 
          stroke="url(#dvLogoDGrad)" 
          strokeWidth="38" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        {/* V Chevron */}
        <path 
          d="M228 208 L284 324 L380 178" 
          fill="none" 
          stroke="url(#dvLogoVGrad)" 
          strokeWidth="36" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          filter="url(#dvLogoGlow)" 
        />
        {/* Spark Node */}
        <circle cx="284" cy="324" r="12" fill="#ffffff" />
        <circle cx="284" cy="324" r="20" fill="#5eead4" opacity="0.45" />
      </g>
    </svg>
  );
};
