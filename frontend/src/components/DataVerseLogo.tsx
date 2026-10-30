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

  return (
    <img 
      src="/logo.png?v=10" 
      alt="DataVerse Logo" 
      width={size} 
      height={size} 
      className={`${roundClass} ${className} select-none object-contain`}
      loading="eager"
      decoding="sync"
    />
  );
};
