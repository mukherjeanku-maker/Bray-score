import React from 'react';

interface PlayerAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: string;
  onClick?: () => void;
  editable?: boolean;
}

export function PlayerAvatar({ name, avatarUrl, size = "w-12 h-12", onClick, editable }: PlayerAvatarProps) {
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';

  return (
    <div 
      className={`relative group shrink-0 ${onClick ? 'cursor-pointer' : ''}`} 
      onClick={onClick}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className={`${size} rounded-full overflow-hidden border border-editorial-gold/45 bg-[#0f0e0c] flex flex-col items-center justify-center relative transition-all duration-300 group-hover:border-editorial-gold shadow-lg`}>
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={name || "Player"} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-editorial-gold select-none">
            <span 
              className="font-serif font-black tracking-tight text-center leading-none mt-0.5" 
              style={{ 
                fontSize: size.includes('w-8') ? '11px' : size.includes('w-10') ? '13px' : size.includes('w-12') ? '16px' : size.includes('w-14') ? '18px' : '20px' 
              }}
            >
              {initial}
            </span>
            <span className="text-[5px] tracking-[0.15em] font-mono font-bold text-editorial-gold/50 uppercase leading-none mt-0.5">
              1947
            </span>
          </div>
        )}
        
        {/* Overlay for editable state */}
        {editable && (
          <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center">
            <span className="text-[7px] text-editorial-gold font-bold tracking-[0.15em] font-mono uppercase text-center px-1 leading-tight">
              {avatarUrl ? 'CHANGE' : 'ADD DP'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
