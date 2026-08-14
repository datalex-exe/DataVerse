import React from 'react';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className = '', size = 14 }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label="Verified DataVerse Creator"
      className={`text-brand-500 fill-current flex-shrink-0 inline-block align-middle ml-1.5 ${className}`}
      role="img"
    >
      <title>Verified Creator</title>
      {/* Premium Instagram-style scalloped starburst outline */}
      <path d="M22.87 11.23l-1.78-2.04c-.37-.43-.53-.99-.44-1.55l.28-2.7a1.64 1.64 0 0 0-1.89-1.8l-2.67.57c-.55.12-1.12-.01-1.57-.36L12.92 1.8a1.64 1.64 0 0 0-2.2 0L8.84 3.35c-.45.35-1.02.48-1.57.36L4.6 3.14a1.64 1.64 0 0 0-1.89 1.8l.28 2.7c.09.56-.07 1.12-.44 1.55l-1.78 2.04a1.64 1.64 0 0 0 0 2.2l1.78 2.04c.37.43.53.99.44 1.55l-.28 2.7a1.64 1.64 0 0 0 1.89 1.8l2.67-.57c.55-.12 1.12.01 1.57.36l1.88 1.55c.61.5 1.48.5 2.09 0l1.88-1.55c.45-.35 1.02-.48 1.57-.36l2.67.57c.92.2 1.83-.53 1.89-1.8l-.28-2.7c-.09-.56.07-1.12.44-1.55l1.78-2.04a1.64 1.64 0 0 0 0-2.2z" />
      {/* Stylized capital A inside in white */}
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-sans font-black text-[9px] fill-white select-none"
        style={{ fontWeight: 900 }}
      >
        A
      </text>
    </svg>
  );
};

export default VerifiedBadge;
