import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-16 h-16" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer Glow Ring */}
      <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse"></div>
      
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full relative z-10 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
      >
        <defs>
          <linearGradient id="quadXGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#A033FF" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Outer Tech Circles */}
        <circle 
          cx="50" cy="50" r="45" 
          fill="none" 
          stroke="url(#quadXGradient)" 
          strokeWidth="0.5" 
          strokeDasharray="4 2" 
          className="animate-[spin_10s_linear_infinite]"
        />
        <circle 
          cx="50" cy="50" r="40" 
          fill="none" 
          stroke="url(#quadXGradient)" 
          strokeWidth="1" 
          strokeDasharray="20 10" 
          opacity="0.5"
          className="animate-[spin_15s_linear_infinite_reverse]"
        />

        {/* Core Stylized X */}
        <g filter="url(#glow)">
          {/* Top Left to Bottom Right Stroke */}
          <path 
            d="M25 25 L45 45 L55 55 L75 75" 
            stroke="url(#quadXGradient)" 
            strokeWidth="8" 
            strokeLinecap="round"
            className="transition-all duration-500"
          />
          {/* Bottom Left to Top Right Stroke */}
          <path 
            d="M25 75 L45 55 L55 45 L75 25" 
            stroke="url(#quadXGradient)" 
            strokeWidth="8" 
            strokeLinecap="round"
          />
          
          {/* Central Intersection Detail */}
          <circle cx="50" cy="50" r="3" fill="#FFF" className="animate-pulse" />
          
          {/* Tech Nodes at Ends */}
          <circle cx="25" cy="25" r="2" fill="#00E5FF" />
          <circle cx="75" cy="75" r="2" fill="#A033FF" />
          <circle cx="25" cy="75" r="2" fill="#A033FF" />
          <circle cx="75" cy="25" r="2" fill="#00E5FF" />
        </g>

        {/* Scanner Line Effect */}
        <line 
          x1="10" y1="50" x2="90" y2="50" 
          stroke="rgba(0, 229, 255, 0.2)" 
          strokeWidth="1"
          className="animate-[scanner_3s_ease-in-out_infinite]"
        />
      </svg>

      <style>{`
        @keyframes scanner {
          0%, 100% { transform: translateY(-30px); opacity: 0; }
          50% { transform: translateY(30px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Logo;