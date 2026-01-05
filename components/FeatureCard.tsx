
import React from 'react';

interface FeatureCardProps {
  title: string;
  icon: string;
  gradient: string;
  desc?: string;
  onClick: () => void;
  className?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, icon, gradient, desc, onClick, className = '' }) => {
  return (
    <button 
      onClick={onClick}
      className={`
        relative group overflow-hidden rounded-[2.5rem] p-6 flex flex-col items-start justify-end
        bg-gradient-to-br ${gradient} shadow-xl transition-all duration-500
        hover:scale-[1.03] hover:-translate-y-2 hover:shadow-2xl
        active:scale-95 text-white ${className}
      `}
    >
      {/* Dynamic Glow Overlay */}
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
      
      {/* Animated Background Icon */}
      <div className="absolute top-4 right-4 opacity-10 transform scale-150 group-hover:scale-[2] group-hover:rotate-12 transition-transform duration-700 ease-out">
        <i className={`fa-solid ${icon} text-6xl`}></i>
      </div>
      
      {/* Icon Container with Glassmorphism */}
      <div className="relative z-10 w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/30 shadow-inner group-hover:bg-white/30 transition-colors">
        <i className={`fa-solid ${icon} text-xl group-hover:scale-110 transition-transform`}></i>
      </div>
      
      {/* Text Content */}
      <div className="relative z-10 text-left">
        <h3 className="font-extrabold text-xl tracking-tight leading-none mb-1 group-hover:translate-x-1 transition-transform">{title}</h3>
        {desc && <p className="text-white/70 text-[10px] font-medium uppercase tracking-wider group-hover:translate-x-1 transition-transform delay-75">{desc}</p>}
      </div>

      {/* Shine effect on hover */}
      <div className="absolute -inset-full h-full w-1/2 z-20 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
      
      <style>{`
        @keyframes shine {
          100% {
            left: 200%;
          }
        }
        .group-hover\\:animate-shine {
          animation: shine 0.8s;
        }
      `}</style>
    </button>
  );
};

export default FeatureCard;
