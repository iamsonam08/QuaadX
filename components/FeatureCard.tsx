
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
        bg-gradient-to-br ${gradient} shadow-xl transition-all duration-700
        hover:scale-[1.02] hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]
        active:scale-[0.97] text-white ${className}
      `}
    >
      {/* Dynamic Glow Overlays */}
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
      
      {/* Animated Background Icon */}
      <div className="absolute top-4 right-4 opacity-10 transform scale-150 group-hover:scale-[2.5] group-hover:rotate-12 transition-transform duration-1000 ease-out pointer-events-none">
        <i className={`fa-solid ${icon} text-6xl`}></i>
      </div>
      
      {/* Icon Container with Glassmorphism */}
      <div className="relative z-10 w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-4 border border-white/30 shadow-[inset_0_0_10px_rgba(255,255,255,0.2)] group-hover:bg-white/40 group-hover:border-white/50 transition-all duration-500">
        <i className={`fa-solid ${icon} text-xl group-hover:scale-125 transition-transform duration-500`}></i>
      </div>
      
      {/* Text Content */}
      <div className="relative z-10 text-left">
        <h3 className="font-extrabold text-xl tracking-tight leading-none mb-1.5 group-hover:translate-x-1 transition-transform duration-500">{title}</h3>
        {desc && (
          <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider group-hover:translate-x-2 transition-transform duration-700 delay-75 opacity-70 group-hover:opacity-100">
            {desc}
          </p>
        )}
      </div>

      {/* Shine effect on hover */}
      <div className="absolute -inset-full h-full w-1/2 z-20 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-0 group-hover:opacity-20 group-hover:animate-shine" />
      
      <style>{`
        @keyframes shine {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        .group-hover\\:animate-shine {
          animation: shine 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </button>
  );
};

export default FeatureCard;
