import React from 'react';

// Cute vintage daisy flower
export function DaisyFlower({ className = 'w-6 h-6', petalColor = '#FFE8EE', centerColor = '#F9E79F' }: { className?: string; petalColor?: string; centerColor?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 8 petals */}
      <circle cx="50" cy="20" r="15" fill={petalColor} />
      <circle cx="50" cy="80" r="15" fill={petalColor} />
      <circle cx="20" cy="50" r="15" fill={petalColor} />
      <circle cx="80" cy="50" r="15" fill={petalColor} />
      <circle cx="29" cy="29" r="15" fill={petalColor} />
      <circle cx="71" cy="71" r="15" fill={petalColor} />
      <circle cx="29" cy="71" r="15" fill={petalColor} />
      <circle cx="71" cy="29" r="15" fill={petalColor} />
      {/* Center core */}
      <circle cx="50" cy="50" r="14" fill={centerColor} stroke="#E59866" strokeWidth="1.5" />
    </svg>
  );
}

// Cute vintage butterfly
export function Butterfly({ className = 'w-6 h-6', wingColor = '#FAD2E1', accentColor = '#88A764' }: { className?: string; wingColor?: string; accentColor?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Upper Wings */}
      <path
        d="M50 48 C42 20, 10 15, 12 45 C13 60, 42 62, 50 54"
        fill={wingColor}
        stroke="#E899B0"
        strokeWidth="2"
      />
      <path
        d="M50 48 C58 20, 90 15, 88 45 C87 60, 58 62, 50 54"
        fill={wingColor}
        stroke="#E899B0"
        strokeWidth="2"
      />
      {/* Lower Wings */}
      <path
        d="M50 54 C40 58, 22 66, 26 82 C30 92, 46 82, 50 62"
        fill="#FFE8EE"
        stroke="#E899B0"
        strokeWidth="1.5"
      />
      <path
        d="M50 54 C60 58, 78 66, 74 82 C70 92, 54 82, 50 62"
        fill="#FFE8EE"
        stroke="#E899B0"
        strokeWidth="1.5"
      />
      {/* Wing dots */}
      <circle cx="32" cy="38" r="4" fill="#FFFFFF" opacity="0.8" />
      <circle cx="68" cy="38" r="4" fill="#FFFFFF" opacity="0.8" />
      {/* Body & Antennae */}
      <ellipse cx="50" cy="52" rx="3.5" ry="16" fill={accentColor} />
      <path d="M48 38 C45 30, 38 25, 34 26" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
      <path d="M52 38 C55 30, 62 25, 66 26" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Cute vintage bow / ribbon
export function CuteBow({ className = 'w-6 h-6', color = '#F4ACB7' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M50 45 C40 30, 10 32, 18 55 C24 68, 44 54, 50 48"
        fill={color}
        stroke="#D97288"
        strokeWidth="2"
      />
      <path
        d="M50 45 C60 30, 90 32, 82 55 C76 68, 56 54, 50 48"
        fill={color}
        stroke="#D97288"
        strokeWidth="2"
      />
      {/* Tails */}
      <path d="M46 52 C40 68, 30 85, 24 90 C34 86, 42 76, 48 56" fill={color} stroke="#D97288" strokeWidth="1.5" />
      <path d="M54 52 C60 68, 70 85, 76 90 C66 86, 58 76, 52 56" fill={color} stroke="#D97288" strokeWidth="1.5" />
      {/* Center knot */}
      <ellipse cx="50" cy="48" rx="6" ry="5" fill="#E88299" stroke="#C55B73" strokeWidth="1.5" />
    </svg>
  );
}

// Matcha Cup Graphic representation tailored for the 4 types
interface DrinkCupProps {
  type: 'classic' | 'cloudy' | 'mango' | 'strawberry';
  size?: 'regular' | 'large';
  className?: string;
}

export function DrinkCupGraphic({ type, size = 'regular', className = 'w-24 h-28' }: DrinkCupProps) {
  const isLarge = size === 'large';

  // Layer colors based on drink type
  let bottomLayer = '#7BA05B';
  let middleLayer = '#EAF2D7';
  let topLayer = '#88A764';
  let foamColor = '#FFFFFF';
  let hasSpecialFruit = false;
  let fruitColor = '';

  if (type === 'classic') {
    bottomLayer = '#6E934F';
    middleLayer = '#E4EFD0';
    topLayer = '#85A660';
    foamColor = '#F7FAF0';
  } else if (type === 'cloudy') {
    bottomLayer = '#5E8040';
    middleLayer = '#EAF4D3';
    topLayer = '#7EA158';
    foamColor = '#FFFFFF'; // Cloud-like fluffy foam
  } else if (type === 'mango') {
    bottomLayer = '#FFB830'; // Mango puree base
    middleLayer = '#FFF3D1';
    topLayer = '#7BA05B';
    foamColor = '#FDFBE7';
    hasSpecialFruit = true;
    fruitColor = '#FFA500';
  } else if (type === 'strawberry') {
    bottomLayer = '#F47C9E'; // Strawberry puree base
    middleLayer = '#FDE2EC';
    topLayer = '#7EA158';
    foamColor = '#FFF0F5';
    hasSpecialFruit = true;
    fruitColor = '#E63946';
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 120 160"
        className="w-full h-full drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`cup-body-${type}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id={`drink-gradient-${type}-${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={topLayer} />
            <stop offset="50%" stopColor={middleLayer} />
            <stop offset="100%" stopColor={bottomLayer} />
          </linearGradient>

          <clipPath id={`cup-clip-${type}-${size}`}>
            <path d="M26 40 L34 140 C35 145, 85 145, 86 140 L94 40 Z" />
          </clipPath>
        </defs>

        {/* Straw */}
        <line
          x1="52"
          y1="8"
          x2="70"
          y2="135"
          stroke="#F8B195"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="8 6"
        />

        {/* Cup Glass Background */}
        <path
          d="M26 40 L34 140 C35 145, 85 145, 86 140 L94 40 Z"
          fill="#F5F9F1"
          stroke="#D1E0C4"
          strokeWidth="2"
        />

        {/* Inside Drink Content (Clipped to cup) */}
        <g clipPath={`url(#cup-clip-${type}-${size})`}>
          {/* Main drink gradient */}
          <rect x="20" y="42" width="80" height="105" fill={`url(#drink-gradient-${type}-${size})`} />

          {/* Liquid swirl/layers */}
          {type === 'cloudy' && (
            <>
              {/* Fluffy clouds of foam */}
              <circle cx="45" cy="55" r="16" fill={foamColor} opacity="0.95" />
              <circle cx="65" cy="52" r="18" fill={foamColor} opacity="0.95" />
              <circle cx="82" cy="58" r="14" fill={foamColor} opacity="0.95" />
              <circle cx="36" cy="62" r="12" fill={foamColor} opacity="0.9" />
              <path d="M24 64 Q60 52 96 64 L96 40 L24 40 Z" fill={foamColor} opacity="0.9" />
            </>
          )}

          {type === 'mango' && (
            <>
              {/* Mango chunks / sauce drizzle at bottom */}
              <path
                d="M30 115 Q45 105 60 120 T90 115 L90 145 L30 145 Z"
                fill="#F39C12"
              />
              <circle cx="48" cy="130" r="4" fill="#E67E22" opacity="0.8" />
              <circle cx="72" cy="128" r="5" fill="#E67E22" opacity="0.8" />
            </>
          )}

          {type === 'strawberry' && (
            <>
              {/* Strawberry puree drizzle at bottom */}
              <path
                d="M30 112 Q45 125 60 110 T90 118 L90 145 L30 145 Z"
                fill="#E91E63"
                opacity="0.85"
              />
              <circle cx="45" cy="132" r="4" fill="#C2185B" opacity="0.8" />
              <circle cx="70" cy="127" r="4" fill="#C2185B" opacity="0.8" />
              {/* cute mini strawberry seeds */}
              <circle cx="58" cy="136" r="1.5" fill="#FFEBEE" />
              <circle cx="38" cy="124" r="1.5" fill="#FFEBEE" />
              <circle cx="78" cy="134" r="1.5" fill="#FFEBEE" />
            </>
          )}

          {/* Ice Cubes floating inside */}
          <rect
            x="40"
            y="70"
            width="14"
            height="14"
            rx="3"
            fill="#FFFFFF"
            opacity="0.45"
            transform="rotate(12 40 70)"
          />
          <rect
            x="64"
            y="85"
            width="13"
            height="13"
            rx="3"
            fill="#FFFFFF"
            opacity="0.4"
            transform="rotate(-15 64 85)"
          />
          <rect
            x="48"
            y="100"
            width="12"
            height="12"
            rx="3"
            fill="#FFFFFF"
            opacity="0.35"
            transform="rotate(8 48 100)"
          />

          {/* Glass shine reflection */}
          <path d="M30 45 L36 135 L33 135 L28 45 Z" fill="#FFFFFF" opacity="0.5" />
        </g>

        {/* Cup Rim & Lid */}
        <ellipse cx="60" cy="40" rx="36" ry="6" fill="#FFFFFF" stroke="#C5DAC1" strokeWidth="2" />
        <ellipse cx="60" cy="38" rx="30" ry="4" fill="#FFFFFF" opacity="0.9" />

        {/* Cute heart/leaf badge on cup */}
        <circle cx="60" cy="88" r="12" fill="#FFFFFF" opacity="0.9" />
        {type === 'strawberry' ? (
          <path
            d="M60 93 C56 89 54 86 54 84 C54 82 56 80 58 80 C59 80 60 81 60 82 C60 81 61 80 62 80 C64 80 66 82 66 84 C66 86 64 89 60 93 Z"
            fill="#E91E63"
          />
        ) : type === 'mango' ? (
          <ellipse cx="60" cy="87" rx="5" ry="6" fill="#F39C12" />
        ) : (
          <path
            d="M60 82 C63 85 64 89 60 92 C56 89 57 85 60 82 Z"
            fill="#6E934F"
          />
        )}

        {/* Size Indicator ribbon if large */}
        {isLarge && (
          <g transform="translate(76, 32)">
            <rect x="0" y="0" width="34" height="16" rx="8" fill="#F4ACB7" />
            <text
              x="17"
              y="11"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="9"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              كبير
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
