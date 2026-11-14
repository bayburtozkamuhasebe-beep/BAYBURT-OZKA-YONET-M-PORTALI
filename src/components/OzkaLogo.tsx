import React from 'react';

interface OzkaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showGlow?: boolean;
}

export const OzkaLogo: React.FC<OzkaLogoProps> = ({
  className = '',
  size = 'md',
  showGlow = true,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-10',
    md: 'w-11 h-14',
    lg: 'w-16 h-20',
    xl: 'w-24 h-32',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${
        sizeClasses[size] || sizeClasses.md
      } ${className}`}
    >
      {showGlow && (
        <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-full -z-10 pointer-events-none scale-110" />
      )}
      <svg
        viewBox="0 0 100 135"
        className="w-full h-full object-contain filter drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="ozkaCircleClip">
            <circle cx="50" cy="76" r="41" />
          </clipPath>
        </defs>

        {/* Dark Indigo-Navy Circle Base */}
        <circle cx="50" cy="76" r="41" fill="#241d49" />

        {/* Left Skyscraper Tower */}
        <polygon
          points="36,25 47,19 47,56 36,56"
          fill="#507fe3"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* Right Skyscraper Tower (Taller) */}
        <polygon
          points="52.5,12 63.5,6 63.5,56 52.5,56"
          fill="#507fe3"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* Geometric Gable, Chevrons and Arch inside circle */}
        <g clipPath="url(#ozkaCircleClip)">
          {/* Outer White Chevron Frame */}
          <path
            d="M 17,105 L 17,70 L 50,49 L 83,70 L 83,105 L 75,105 L 75,74 L 50,58 L 25,74 L 25,105 Z"
            fill="#ffffff"
          />

          {/* Middle Blue Chevron Band */}
          <path
            d="M 23,108 L 23,73 L 50,56 L 77,73 L 77,108 L 69,108 L 69,77 L 50,65 L 31,77 L 31,108 Z"
            fill="#507fe3"
          />

          {/* Inner White Chevron Gap */}
          <path
            d="M 31,110 L 31,77 L 50,65 L 69,77 L 69,110 L 61,110 L 61,81 L 50,74 L 39,81 L 39,110 Z"
            fill="#ffffff"
          />

          {/* Inner Blue Arch / Portal Building */}
          <path
            d="M 39,114 L 39,81 L 50,73 L 61,81 L 61,114 L 54,114 L 54,85 L 50,82 L 46,85 L 46,114 Z"
            fill="#507fe3"
          />

          {/* Inner White Doorway / Portal Opening */}
          <path
            d="M 46,114 L 46,85 L 50,82 L 54,85 L 54,114 Z"
            fill="#ffffff"
          />

          {/* Bottom Outer Rim Blue Arc Accents */}
          <path
            d="M 19,98 C 22,108 30,115 40,117 L 38,111 C 30,109 23,103 21,96 Z"
            fill="#507fe3"
          />
          <path
            d="M 81,98 C 78,108 70,115 60,117 L 62,111 C 70,109 77,103 79,96 Z"
            fill="#507fe3"
          />
        </g>

        {/* Central Ridge Highlight */}
        <polyline
          points="36,56 50,48 63.5,56"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
