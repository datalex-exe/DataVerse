import React from 'react';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className = '', size = 14 }) => {
  return (
    <img
      src="/verified.png?v=2"
      alt="Verified Creator"
      width={size}
      height={size}
      className={`flex-shrink-0 inline-block align-middle ml-1 object-contain ${className}`}
    />
  );
};

export default VerifiedBadge;
