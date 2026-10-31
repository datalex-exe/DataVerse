import React from 'react';
import dataverseLogoSrc from '../assets/logo.png';

interface DataVerseLogoProps {
  size?: number;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  style?: React.CSSProperties;
}

export const DataVerseLogo: React.FC<DataVerseLogoProps> = ({ 
  size = 40, 
  className = '', 
  rounded = 'full',
  style
}) => {
  const roundClass = 
    rounded === 'full' ? 'rounded-full' : 
    rounded === '2xl' ? 'rounded-2xl' : 
    rounded === 'xl' ? 'rounded-xl' : 
    rounded === 'lg' ? 'rounded-lg' : 
    rounded === 'md' ? 'rounded-md' : 
    rounded === 'sm' ? 'rounded-sm' : '';

  return (
    <img 
      src={dataverseLogoSrc} 
      alt="DataVerse Logo" 
      width={size} 
      height={size} 
      style={{
        width: size ? `${size}px` : undefined,
        height: size ? `${size}px` : undefined,
        maxWidth: '100%',
        maxHeight: '100%',
        ...style
      }}
      className={`${roundClass} ${className} select-none object-contain`}
      loading="eager"
      decoding="sync"
    />
  );
};
