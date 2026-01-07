
import React, { useState } from 'react';
import { AppData } from '../../types';

interface CampusMapProps {
  data: AppData;
  onBack: () => void;
}

const CampusMap: React.FC<CampusMapProps> = ({ data, onBack }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [viewMode, setViewMode] = useState<'STYLIZED' | 'ORIGINAL'>(data.stylizedMapImage ? 'STYLIZED' : 'ORIGINAL');
  
  const mapImage = viewMode === 'STYLIZED' ? data.stylizedMapImage : data.campusMapImage;
  const fallbackImage = "https://picsum.photos/seed/quadxmap/1000/1000";
  const currentImage = mapImage || fallbackImage;

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  return (
    <div className="flex flex-col h-full space-y-6 animate-fadeIn">
      {/* Header */}
      {!isFullScreen && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm active:scale-90 transition-all">
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-lime-600 dark:text-lime-400 tracking-tighter leading-none">Campus Map</h2>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">QuadX Intelligent View</span>
            </div>
          </div>
          {data.stylizedMapImage && (
            <button 
              onClick={() => setViewMode(viewMode === 'STYLIZED' ? 'ORIGINAL' : 'STYLIZED')}
              className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-700 active:scale-95 transition-all"
            >
              {viewMode === 'STYLIZED' ? 'Show Real' : 'Show Animated'}
            </button>
          )}
        </div>
      )}

      {/* Map Display Container */}
      <div className={`
        relative overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${isFullScreen 
          ? 'fixed inset-0 z-[999] bg-slate-950 flex flex-col' 
          : 'rounded-[3.5rem] h-[70vh] shadow-3xl border-4 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-900'
        }
      `}>
        {/* Visual Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(#84cc16 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }}>
        </div>

        {/* Map Rendering Layer */}
        <div className={`
          w-full h-full flex items-center justify-center overflow-hidden
          ${viewMode === 'STYLIZED' ? 'animate-mapFloat' : ''}
        `}>
          <img 
            src={currentImage} 
            className={`
              w-full h-full object-contain transition-all duration-700
              ${isFullScreen ? 'p-6' : 'scale-105 hover:scale-115 cursor-zoom-in'}
            `} 
            alt="Campus Map Layout" 
          />
        </div>

        {/* HUD Controls */}
        <div className="absolute top-8 right-8 flex flex-col gap-4">
          <button 
            onClick={toggleFullScreen}
            className="w-14 h-14 bg-white/10 dark:bg-black/60 backdrop-blur-3xl border border-white/20 text-white rounded-2xl flex items-center justify-center shadow-2xl active:scale-90 transition-all hover:bg-white/20"
            title={isFullScreen ? "Minimize" : "Maximize"}
          >
            <i className={`fa-solid ${isFullScreen ? 'fa-compress' : 'fa-expand'} text-xl`}></i>
          </button>
          {!isFullScreen && (
            <button 
              className="w-14 h-14 bg-lime-500 text-white rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all hover:shadow-lime-500/30"
              onClick={() => alert("GPS initialization in progress...")}
            >
              <i className="fa-solid fa-location-crosshairs text-xl"></i>
            </button>
          )}
        </div>

        {/* Immersive View Overlays */}
        {isFullScreen ? (
          <div className="p-10 flex justify-between items-end bg-gradient-to-t from-slate-950 to-transparent">
            <div>
              <h3 className="text-3xl font-black text-white tracking-tighter">Campus Navigator</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.25em] mt-2">Rendering accurate satellite coordinates</p>
            </div>
            <button 
              onClick={toggleFullScreen}
              className="px-12 py-5 bg-lime-500 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all"
            >
              Return to App
            </button>
          </div>
        ) : (
          <div className="absolute bottom-8 left-8 right-8 z-10 pointer-events-none">
            <div className="bg-white/10 dark:bg-black/60 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] p-6 flex items-center justify-center shadow-3xl pointer-events-auto">
              <div className="flex items-center gap-4">
                <i className="fa-solid fa-circle-info text-lime-400 animate-pulse text-lg"></i>
                <p className="text-[10px] text-white font-black uppercase tracking-widest">
                  {viewMode === 'STYLIZED' ? 'AI Animated Visualization Active' : 'Real-time Layout Display'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isFullScreen && (
        <div className="px-4">
          <p className="text-center text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
            The map is converted into an animated simplified version using QuadX AI. <br/> 
            Only information provided by the admin or the original source is displayed.
          </p>
        </div>
      )}

      <style>{`
        @keyframes mapFloat {
          0%, 100% { transform: translateY(0px) rotateX(2deg) rotateY(-2deg); }
          50% { transform: translateY(-12px) rotateX(0deg) rotateY(0deg); }
        }
        .animate-mapFloat {
          perspective: 1000px;
          animation: mapFloat 10s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default CampusMap;
