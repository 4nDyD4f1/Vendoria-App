import React from 'react';
import { Link } from 'react-router-dom';

export default function VendoriaLogo({ variant = 'dark', size = 'md' }) {
  const isDark = variant === 'dark';

  return (
    <Link to="/" className="inline-flex items-center gap-2.5 select-none shrink-0 group">
      {/* Exact Vendoria Geometric Icon */}
      <svg 
        width="34" 
        height="34" 
        viewBox="0 0 36 36" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <rect width="36" height="36" rx="9" fill={isDark ? "#35261F" : "#FFFFFF"} />
        <path d="M18 7.5L28 25.5H8L18 7.5Z" fill={isDark ? "#FFFFFF" : "#35261F"} />
        <path d="M18 21.5L14 15.5H16.2L18 18.3L19.8 15.5H22L18 21.5Z" fill={isDark ? "#35261F" : "#FFFFFF"} />
      </svg>

      {/* Brand Wordmark */}
      <span className={`text-[23px] font-bold tracking-tight ${isDark ? 'text-[#35261F]' : 'text-white'}`}>
        Vendoria
      </span>
    </Link>
  );
}
