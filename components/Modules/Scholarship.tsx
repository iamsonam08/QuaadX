import React from 'react';
import { AppData, ScholarshipItem } from '../../types';

interface ScholarshipProps {
  data: AppData;
  onBack: () => void;
}

const Scholarship: React.FC<ScholarshipProps> = ({ data, onBack }) => {
  const girlsList = data.scholarships.filter(s => s.category === 'GIRLS');
  const generalList = data.scholarships.filter(s => s.category === 'GENERAL' || !s.category);

  const renderCard = (s: ScholarshipItem, i: number) => (
    <div key={s.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-amber-50 dark:border-slate-800 animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600">
          <i className="fa-solid fa-award"></i>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-slate-400 font-black uppercase">Amount</div>
          <div className="text-base font-black text-amber-600">{s.amount}</div>
        </div>
      </div>
      <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-1 leading-tight">{s.name}</h3>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mb-4">{s.eligibility}</p>
      <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-800">
        <span className="text-[9px] text-rose-500 font-black uppercase tracking-tighter">Ends: {s.deadline}</span>
        <button className="bg-amber-500 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all">
          Apply
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 className="text-2xl font-black text-amber-600 tracking-tighter">Scholarship Hub</h2>
      </div>

      <section className="space-y-4">
        <div className="px-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-pink-500 rounded-full"></div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Girls Scholarships</h3>
        </div>
        {girlsList.length > 0 ? (
          <div className="space-y-4">{girlsList.map((s, i) => renderCard(s, i))}</div>
        ) : (
          <div className="p-8 bg-slate-100 dark:bg-slate-800/50 rounded-[2.5rem] text-center italic text-slate-400 text-[9px] font-bold uppercase tracking-widest">No active girls scholarships</div>
        )}
      </section>

      <section className="space-y-4">
        <div className="px-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">General Scholarships</h3>
        </div>
        {generalList.length > 0 ? (
          <div className="space-y-4">{generalList.map((s, i) => renderCard(s, i))}</div>
        ) : (
          <div className="p-8 bg-slate-100 dark:bg-slate-800/50 rounded-[2.5rem] text-center italic text-slate-400 text-[9px] font-bold uppercase tracking-widest">No general scholarships listed</div>
        )}
      </section>
    </div>
  );
};

export default Scholarship;