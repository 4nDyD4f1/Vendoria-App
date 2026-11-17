import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

export default function ImagePlaceholder({ 
  className = "w-full h-full", 
  label = "", 
  dark = false,
  iconSize = 24 
}) {
  return (
    <div 
      className={`flex flex-col items-center justify-center select-none transition-colors ${
        dark 
          ? 'bg-[#2A1E18] text-[#D4C4AE]/40 border border-white/5' 
          : 'bg-[#EBE2D9] text-[#8C7A6B]/50 border border-[#E0D5C9]'
      } ${className}`}
    >
      <ImageIcon size={iconSize} className="stroke-[1.5]" />
      {label && (
        <span className="text-[10px] font-medium tracking-wide mt-1 opacity-70">
          {label}
        </span>
      )}
    </div>
  );
}
