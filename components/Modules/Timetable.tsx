
import React, { useState, useMemo } from 'react';
import { AppData } from '../../types';

interface TimetableProps {
  data: AppData;
  onBack: () => void;
}

const Timetable: React.FC<TimetableProps> = ({ data, onBack }) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const branches = ['Comp', 'IT', 'Civil', 'Mech', 'Elect', 'AIDS', 'E&TC'];
  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const divisions = ['A', 'B'];

  const [activeDay, setActiveDay] = useState('Monday');
  const [selBranch, setSelBranch] = useState(branches[0]);
  const [selYear, setSelYear] = useState(years[0]);
  const [selDiv, setSelDiv] = useState(divisions[0]);

  const currentSlots = useMemo(() => {
    return data.timetable.find(t => 
      t.day === activeDay && 
      t.branch === selBranch && 
      t.year === selYear && 
      t.division === selDiv
    )?.slots || [];
  }, [data.timetable, activeDay, selBranch, selYear, selDiv]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm active:scale-90 transition-all">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 className="text-2xl font-black text-indigo-600 tracking-tighter">Academic Timetable</h2>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch</label>
          <select value={selBranch} onChange={(e) => setSelBranch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-2 text-[10px] font-black outline-none border-none">
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
          <select value={selYear} onChange={(e) => setSelYear(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-2 text-[10px] font-black outline-none border-none">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Div</label>
          <select value={selDiv} onChange={(e) => setSelDiv(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-2 text-[10px] font-black outline-none border-none">
            {divisions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {days.map(day => (
          <button key={day} onClick={() => setActiveDay(day)}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
              ${activeDay === day ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 shadow-sm'}`}>
            {day}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {currentSlots.length > 0 ? (
          currentSlots.map((slot, i) => (
            <div key={slot.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border-l-[10px] border-indigo-500 flex items-center gap-5 animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="text-center min-w-[60px]">
                <div className="text-[18px] font-black text-slate-800 dark:text-white leading-none">{slot.time.split(' ')[0]}</div>
                <div className="text-[8px] font-black text-indigo-500 uppercase">{slot.time.split(' ')[1] || 'HR'}</div>
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm truncate">{slot.subject}</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Room {slot.room} • {selBranch}</p>
              </div>
              <div className="w-2 h-8 rounded-full bg-indigo-500/20"></div>
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-slate-900 p-16 rounded-[3rem] text-center border border-slate-100 dark:border-slate-800 shadow-sm">
            <i className="fa-solid fa-mug-hot text-4xl text-slate-200 mb-4"></i>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">No Lectures</h3>
            <p className="text-[9px] mt-1 text-slate-500 font-bold uppercase tracking-widest">Enjoy your break!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Timetable;
