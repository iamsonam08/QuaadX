
import React, { useState, useMemo } from 'react';
import { AppData } from '../../types';

interface EventInfoProps {
  data: AppData;
  onBack: () => void;
}

const EventInfo: React.FC<EventInfoProps> = ({ data, onBack }) => {
  const categories = ['General', 'Comp', 'IT', 'Civil', 'Mech', 'Elect', 'AIDS', 'E&TC'];
  const [activeCat, setActiveCat] = useState('General');

  const filteredEvents = useMemo(() => {
    return data.events.filter(e => e.category === activeCat);
  }, [data.events, activeCat]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 className="text-2xl font-black text-pink-600 tracking-tighter">College Events</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            className={`px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap
              ${activeCat === cat ? 'bg-pink-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 shadow-sm'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {filteredEvents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-16 rounded-[3rem] text-center border border-slate-100 dark:border-slate-800 shadow-sm">
            <i className="fa-solid fa-calendar-minus text-4xl text-slate-200 mb-4"></i>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">No Events</h3>
            <p className="text-[9px] mt-1 text-slate-500 font-bold uppercase tracking-widest">Nothing for {activeCat} right now.</p>
          </div>
        ) : (
          filteredEvents.map((ev, i) => (
            <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-sm border border-pink-50 dark:border-slate-800 animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
              <img src={`https://picsum.photos/seed/${ev.id}/600/300`} className="w-full h-40 object-cover opacity-90" alt="" />
              <div className="p-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[8px] font-black text-pink-500 bg-pink-50 dark:bg-pink-900/20 px-2 py-1 rounded-full uppercase tracking-widest">{activeCat}</span>
                  <span className="text-[9px] text-slate-400 font-black uppercase">{ev.date}</span>
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-2 leading-none">{ev.title}</h3>
                <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase leading-relaxed tracking-tight">{ev.description}</p>
                <div className="flex items-center gap-2 text-slate-400 text-[9px] font-black uppercase">
                  <i className="fa-solid fa-location-dot"></i> {ev.venue}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventInfo;
