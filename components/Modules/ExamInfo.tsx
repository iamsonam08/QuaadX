
import React, { useState, useMemo } from 'react';
import { AppData } from '../../types';

interface ExamInfoProps {
  data: AppData;
  onBack: () => void;
}

const ExamInfo: React.FC<ExamInfoProps> = ({ data, onBack }) => {
  const branches = ['Comp', 'IT', 'Civil', 'Mech', 'Elect', 'AIDS', 'E&TC'];
  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const divisions = ['A', 'B'];

  const [selBranch, setSelBranch] = useState(branches[0]);
  const [selYear, setSelYear] = useState(years[0]);
  const [selDiv, setSelDiv] = useState(divisions[0]);

  const filteredExams = useMemo(() => {
    return data.exams.filter(exam => 
      exam.branch === selBranch && 
      exam.year === selYear && 
      exam.division === selDiv
    );
  }, [data.exams, selBranch, selYear, selDiv]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 className="text-2xl font-black text-rose-600 tracking-tighter">Exam Portal</h2>
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

      <div className="space-y-4">
        {filteredExams.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-16 rounded-[3rem] text-center border border-slate-100 dark:border-slate-800 shadow-sm">
            <i className="fa-solid fa-calendar-check text-4xl text-slate-200 mb-4"></i>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">No Exams</h3>
            <p className="text-[9px] mt-1 text-slate-500 font-bold uppercase tracking-widest">Selection is clear for now.</p>
          </div>
        ) : (
          filteredExams.map((exam, i) => (
            <div key={exam.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-rose-50 dark:border-slate-800 flex justify-between items-center group animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex-1 pr-4">
                <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase leading-tight">{exam.subject}</h4>
                <div className="flex flex-wrap gap-4 mt-2">
                  <span className="text-[9px] text-slate-400 font-black uppercase flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar text-rose-500"></i> {exam.date}
                  </span>
                  <span className="text-[9px] text-slate-400 font-black uppercase flex items-center gap-1.5">
                    <i className="fa-solid fa-clock text-rose-500"></i> {exam.time}
                  </span>
                </div>
              </div>
              <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest">
                {exam.venue}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExamInfo;
