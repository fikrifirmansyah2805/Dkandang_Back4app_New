import React from 'react';

interface DKandangLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export default function DKandangLogo({ 
  size = 'md', 
  showText = false,
  className = '' 
}: DKandangLogoProps) {
  const sizeMap = {
    sm: { box: 'w-7 h-7', svg: 'w-6 h-6', text: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'w-9 h-9', svg: 'w-7 h-7', text: 'text-base', sub: 'text-[10px]' },
    lg: { box: 'w-11 h-11', svg: 'w-9 h-9', text: 'text-lg', sub: 'text-xs' },
    xl: { box: 'w-14 h-14', svg: 'w-11 h-11', text: 'text-xl', sub: 'text-xs' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Visual Emblem Badge */}
      <div 
        className={`${currentSize.box} shrink-0 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-0.5 shadow-xs flex items-center justify-center border border-emerald-500/40 relative overflow-hidden group`}
        title="D'Kandang Amazing Farm"
      >
        {/* Subtle decorative glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/20 via-transparent to-emerald-300/30 pointer-events-none" />
        
        <svg 
          viewBox="0 0 100 100" 
          className={`${currentSize.svg} text-white fill-current relative z-10 transition-transform group-hover:scale-105 duration-200`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Farm Green Hills */}
          <path 
            d="M 10 75 Q 35 55 60 70 Q 80 60 90 75 L 90 88 Q 90 90 88 90 L 12 90 Q 10 90 10 88 Z" 
            fill="#059669" 
            opacity="0.9"
          />
          {/* Barn House Silhouette */}
          <path 
            d="M 32 60 L 50 44 L 68 60 L 65 78 L 35 78 Z" 
            fill="#FEF3C7" 
          />
          {/* Barn Roof line & door */}
          <path 
            d="M 28 61 L 50 42 L 72 61 L 68 63 L 50 47 L 32 63 Z" 
            fill="#D97706" 
          />
          <rect x="45" y="65" width="10" height="13" rx="2" fill="#78350F" />

          {/* Friendly Dairy Cow Head / Farm Mascot Emblem */}
          <g transform="translate(50, 40) scale(0.68)">
            {/* Cow Ears */}
            <ellipse cx="-32" cy="-6" rx="14" ry="7" transform="rotate(-25 -32 -6)" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2.5" />
            <ellipse cx="-32" cy="-6" rx="9" ry="4" transform="rotate(-25 -32 -6)" fill="#F472B6" />
            <ellipse cx="32" cy="-6" rx="14" ry="7" transform="rotate(25 32 -6)" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2.5" />
            <ellipse cx="32" cy="-6" rx="9" ry="4" transform="rotate(25 32 -6)" fill="#F472B6" />

            {/* Cow Horns */}
            <path d="M -18 -18 Q -28 -32 -14 -35 Q -10 -25 -8 -16 Z" fill="#F59E0B" />
            <path d="M 18 -18 Q 28 -32 14 -35 Q 10 -25 8 -16 Z" fill="#F59E0B" />

            {/* Cow Head Base */}
            <ellipse cx="0" cy="0" rx="28" ry="26" fill="#FFFFFF" stroke="#1E293B" strokeWidth="3" />

            {/* Cow Black Patch */}
            <path d="M -15 -20 Q 8 -24 14 -10 Q 18 5 5 10 Q -5 -5 -15 -20 Z" fill="#1E293B" />

            {/* Eyes */}
            <circle cx="-11" cy="-4" r="3.5" fill="#0F172A" />
            <circle cx="-12" cy="-5" r="1.2" fill="#FFFFFF" />
            <circle cx="11" cy="-4" r="3.5" fill="#0F172A" />
            <circle cx="10" cy="-5" r="1.2" fill="#FFFFFF" />

            {/* Cute Muzzle / Snout */}
            <ellipse cx="0" cy="14" rx="20" ry="12" fill="#FBCFE8" stroke="#1E293B" strokeWidth="2.5" />
            {/* Nostrils */}
            <ellipse cx="-7" cy="13" rx="2.5" ry="3.5" fill="#9D174D" />
            <ellipse cx="7" cy="13" rx="2.5" ry="3.5" fill="#9D174D" />
            {/* Smile */}
            <path d="M -6 19 Q 0 23 6 19" stroke="#9D174D" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>

          {/* Sprouting Plant Leaf (Organic Farm Badge) */}
          <path 
            d="M 50 16 C 58 10 70 14 72 24 C 62 26 54 22 50 16 Z" 
            fill="#34D399" 
          />
          <path 
            d="M 50 16 C 44 10 32 12 30 22 C 40 24 46 20 50 16 Z" 
            fill="#10B981" 
          />
          <path d="M 50 16 L 50 25" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round" />

          {/* Farm Sun Rays on top */}
          <circle cx="20" cy="22" r="7" fill="#FBBF24" opacity="0.85" />
        </svg>
      </div>

      {/* Brand Text Header */}
      {showText && (
        <div className="min-w-0">
          <span className={`${currentSize.text} font-black text-slate-900 tracking-tight block leading-none`}>
            D'KANDANG AMAZING FARM
          </span>
          <span className={`${currentSize.sub} text-emerald-700 font-bold block mt-0.5 tracking-wide`}>
            Agrowisata Depok • Pasir Putih
          </span>
        </div>
      )}
    </div>
  );
}
